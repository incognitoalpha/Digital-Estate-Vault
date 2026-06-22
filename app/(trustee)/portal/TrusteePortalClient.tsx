'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  retrieveTrusteePrivateKey,
  unwrapKeyForTrustee,
  hasTrusteePrivateKey,
} from '@/lib/crypto-asymmetric';
import { decrypt } from '@/lib/crypto';

interface Asset {
  id: string;
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  created_at: string;
}

interface Grant {
  id: string;
  release_mode: string;
  quorum_required: number;
  wrapped_key: string | null;
  assets: Asset;
}

interface TrusteePortalClientProps {
  ownerName: string;
  grants: Grant[];
  salt: string;
  trusteeId: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  account: '👤',
  crypto_wallet: '💰',
  cloud_doc: '📄',
  note: '📝',
  other: '📦',
};

export function TrusteePortalClient({
  ownerName,
  grants,
  salt,
  trusteeId,
}: TrusteePortalClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<
    Record<string, string>
  >({});
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasPrivateKey = hasTrusteePrivateKey(trusteeId);

  const handleToggle = async (grant: Grant) => {
    const grantId = grant.id;

    if (expandedId === grantId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(grantId);

    // Log access
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'trustee',
        action: 'asset_accessed',
        target_table: 'assets',
        target_id: grant.assets.id,
      });
    }

    // If already decrypted, don't decrypt again
    if (decryptedContent[grantId]) {
      return;
    }

    // Check if wrapped key exists
    if (!grant.wrapped_key) {
      setErrors((prev) => ({
        ...prev,
        [grantId]:
          'Encryption key not available. The owner has not completed the key sharing setup for this asset.',
      }));
      return;
    }

    // Try to decrypt
    await handleDecrypt(grant);
  };

  const handleDecrypt = async (grant: Grant) => {
    const grantId = grant.id;
    setDecrypting(grantId);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[grantId];
      return newErrors;
    });

    try {
      // Retrieve trustee's private key
      const privateKey = retrieveTrusteePrivateKey(trusteeId);
      if (!privateKey) {
        setErrors((prev) => ({
          ...prev,
          [grantId]:
            'Your private key is not found in this browser. You may need to accept the invitation again or restore your key from backup.',
        }));
        return;
      }

      // Unwrap the asset encryption key using trustee's private key
      const assetKey = await unwrapKeyForTrustee(
        grant.wrapped_key!,
        privateKey
      );

      // Decrypt the asset using the unwrapped key
      const plaintext = await decrypt(
        grant.assets.ciphertext,
        grant.assets.iv,
        salt,
        assetKey
      );

      setDecryptedContent((prev) => ({ ...prev, [grantId]: plaintext }));
    } catch (err) {
      console.error('Decryption error:', err);
      setErrors((prev) => ({
        ...prev,
        [grantId]:
          'Failed to decrypt asset. Your private key may be invalid or the data may be corrupted.',
      }));
    } finally {
      setDecrypting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Trustee Portal
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {!hasPrivateKey && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                ⚠ Private Key Not Found
              </h2>
              <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                Your private key is not stored in this browser. You won&apos;t
                be able to decrypt assets without it.
              </p>
              <p className="text-sm text-red-800 dark:text-red-300">
                If you have a backup of your private key, you can restore it.
                Otherwise, you may need to contact the vault owner.
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Access Granted
            </h2>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              You have been granted access to {grants.length} asset
              {grants.length === 1 ? '' : 's'} from {ownerName}&apos;s vault.
              These assets were designated for you in case of emergency.
            </p>
          </div>

          {grants.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No Assets Available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                No assets have been released to you yet.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Available Assets
              </h2>

              <div className="space-y-3">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => handleToggle(grant)}
                      className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {CATEGORY_EMOJIS[grant.assets.category]}
                          </span>
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {grant.assets.title}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Added{' '}
                              {new Date(
                                grant.assets.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {expandedId === grant.id ? '▼' : '▶'}
                        </div>
                      </div>
                    </button>

                    {expandedId === grant.id && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                        {decrypting === grant.id ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              Decrypting...
                            </p>
                          </div>
                        ) : errors[grant.id] ? (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              {errors[grant.id]}
                            </p>
                          </div>
                        ) : decryptedContent[grant.id] ? (
                          <div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4">
                              <pre className="whitespace-pre-wrap break-words text-sm font-mono text-slate-900 dark:text-white">
                                {decryptedContent[grant.id]}
                              </pre>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    decryptedContent[grant.id]
                                  );
                                }}
                                className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                              >
                                Copy to clipboard
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
