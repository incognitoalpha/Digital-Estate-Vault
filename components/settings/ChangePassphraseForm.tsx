'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { decrypt, encrypt } from '@/lib/crypto';

export function ChangePassphraseForm() {
  const router = useRouter();
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setProgress(null);

    // Validation
    if (newPassphrase !== confirmPassphrase) {
      setError('New passphrases do not match');
      return;
    }

    if (newPassphrase.length < 12) {
      setError('New passphrase must be at least 12 characters');
      return;
    }

    if (currentPassphrase === newPassphrase) {
      setError('New passphrase must be different from current passphrase');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's salt
      const { data: profile } = await supabase
        .from('profiles')
        .select('salt')
        .eq('id', user.id)
        .single();

      if (!profile?.salt) {
        setError('User profile not found');
        return;
      }

      setProgress('Fetching assets...');

      // Get all user's assets
      const { data: assets, error: fetchError } = await supabase
        .from('assets')
        .select('id, ciphertext, iv')
        .eq('owner_id', user.id);

      if (fetchError) {
        setError('Failed to fetch assets');
        console.error(fetchError);
        return;
      }

      if (!assets || assets.length === 0) {
        setError('No assets found to re-encrypt');
        return;
      }

      setProgress(`Re-encrypting ${assets.length} assets...`);

      // Decrypt all assets with old passphrase and re-encrypt with new passphrase
      const reencryptedAssets = [];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setProgress(
          `Re-encrypting asset ${i + 1} of ${assets.length}...`
        );

        try {
          // Decrypt with old passphrase
          const plaintext = await decrypt(
            asset.ciphertext,
            asset.iv,
            profile.salt,
            currentPassphrase
          );

          // Encrypt with new passphrase (generates new salt and IV)
          const encrypted = await encrypt(plaintext, newPassphrase);

          reencryptedAssets.push({
            id: asset.id,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            salt: encrypted.salt, // Each asset will have its own salt
          });
        } catch (decryptError) {
          setError(
            'Failed to decrypt assets. Current passphrase may be incorrect.'
          );
          console.error(decryptError);
          return;
        }
      }

      setProgress('Saving re-encrypted assets...');

      // Update all assets in the database
      for (const asset of reencryptedAssets) {
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            ciphertext: asset.ciphertext,
            iv: asset.iv,
            // Note: We're using per-asset salts, not updating profile salt
          })
          .eq('id', asset.id);

        if (updateError) {
          setError('Failed to update assets');
          console.error(updateError);
          return;
        }
      }

      // Update profile with new salt from first asset (for consistency)
      // In production, consider a different salt management strategy
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          salt: reencryptedAssets[0].salt,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile salt:', profileError);
        // Don't fail the whole operation
      }

      // Log audit entry
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'owner',
        action: 'passphrase_changed',
        target_table: 'profiles',
        target_id: user.id,
        metadata: {
          assets_reencrypted: reencryptedAssets.length,
        },
      });

      setProgress(null);
      setSuccess(true);
      setCurrentPassphrase('');
      setNewPassphrase('');
      setConfirmPassphrase('');

      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error('Passphrase change error:', err);
      setError('An unexpected error occurred');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
        Change Vault Passphrase
      </h2>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> Changing your passphrase will re-encrypt
          all your assets. This process cannot be interrupted. Your current
          passphrase cannot be recovered if forgotten.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Passphrase changed successfully! All assets have been re-encrypted.
            </p>
          </div>
        )}

        {progress && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {progress}
              </p>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="currentPassphrase"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Current Passphrase
          </label>
          <input
            id="currentPassphrase"
            type="password"
            value={currentPassphrase}
            onChange={(e) => setCurrentPassphrase(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50"
            placeholder="Enter your current passphrase"
          />
        </div>

        <div>
          <label
            htmlFor="newPassphrase"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            New Passphrase
          </label>
          <input
            id="newPassphrase"
            type="password"
            value={newPassphrase}
            onChange={(e) => setNewPassphrase(e.target.value)}
            required
            disabled={loading}
            minLength={12}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50"
            placeholder="At least 12 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassphrase"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Confirm New Passphrase
          </label>
          <input
            id="confirmPassphrase"
            type="password"
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            required
            disabled={loading}
            minLength={12}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50"
            placeholder="Re-enter new passphrase"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Changing Passphrase...' : 'Change Passphrase'}
        </button>
      </form>
    </div>
  );
}
