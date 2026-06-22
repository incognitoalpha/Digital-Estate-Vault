'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { encrypt } from '@/lib/crypto';

export default function VaultSetupPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStrength, setShowStrength] = useState(false);

  const calculateStrength = (pass: string): number => {
    let strength = 0;
    if (pass.length >= 12) strength += 25;
    if (pass.length >= 16) strength += 25;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength += 20;
    if (/\d/.test(pass)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pass)) strength += 15;
    return Math.min(strength, 100);
  };

  const strength = calculateStrength(passphrase);
  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Moderate';
    return 'Strong';
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (passphrase.length < 12) {
      setError('Passphrase must be at least 12 characters');
      return;
    }

    if (!understood) {
      setError('Please confirm you understand this passphrase cannot be recovered');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Generate a salt for this user's vault
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = btoa(String.fromCharCode(...salt));

      // Test encryption to ensure passphrase works
      const testData = 'vault-initialized';
      await encrypt(testData, passphrase);

      // Store the salt in the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ vault_salt: saltBase64 })
        .eq('id', user.id);

      if (updateError) {
        setError('Failed to set up vault. Please try again.');
        console.error(updateError);
        return;
      }

      // Proceed to check-in settings
      router.push('/onboarding/settings');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-2">
          Create Your Vault Passphrase
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          This is separate from your login password
        </p>
      </div>

      <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
          Important: Read Carefully
        </h3>
        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <li>• Your vault passphrase encrypts all your stored secrets</li>
          <li>• This passphrase is NOT your login password</li>
          <li>• We cannot recover this passphrase if you forget it</li>
          <li>• Without it, your encrypted data cannot be accessed</li>
          <li>• Choose something memorable but secure</li>
        </ul>
      </div>

      <form onSubmit={handleSetup} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="passphrase"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Vault Passphrase
          </label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              setShowStrength(e.target.value.length > 0);
            }}
            required
            minLength={12}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            placeholder="At least 12 characters"
            autoComplete="new-password"
          />
          {showStrength && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${strength}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {getStrengthText()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassphrase"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Confirm Vault Passphrase
          </label>
          <input
            id="confirmPassphrase"
            type="password"
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            required
            minLength={12}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            placeholder="Enter the same passphrase"
            autoComplete="new-password"
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              I understand that this passphrase cannot be recovered. If I forget it, I will permanently lose access to my encrypted data.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !understood}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting up vault...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
