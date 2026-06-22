'use client';

import { useState } from 'react';
import { useVault } from './VaultContext';

interface VaultUnlockProps {
  salt: string;
  onUnlock: () => void;
}

export function VaultUnlock({ salt, onUnlock }: VaultUnlockProps) {
  const { unlock } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await unlock(passphrase, salt);

      if (success) {
        setPassphrase('');
        onUnlock();
      } else {
        setError('Incorrect passphrase');
      }
    } catch (err) {
      console.error('Unlock error:', err);
      setError('Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Vault Locked
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your vault passphrase to access your encrypted assets
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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
              onChange={(e) => setPassphrase(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              placeholder="Enter your passphrase"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This is NOT your login password
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !passphrase}
            aria-busy={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Unlocking...' : 'Unlock Vault'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Your vault will automatically lock after 15 minutes of inactivity
          </p>
        </div>
      </div>
    </div>
  );
}
