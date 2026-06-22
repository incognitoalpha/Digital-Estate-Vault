'use client';

import { useState } from 'react';
import { useVault } from './VaultContext';

interface Asset {
  id: string;
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

interface AssetListProps {
  assets: Asset[];
  salt: string;
  onDelete?: (id: string) => void;
  onManageAccess?: (assetId: string, assetTitle: string) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  account: '👤',
  crypto_wallet: '💰',
  cloud_doc: '📄',
  note: '📝',
  other: '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  account: 'Account',
  crypto_wallet: 'Crypto Wallet',
  cloud_doc: 'Cloud Document',
  note: 'Note',
  other: 'Other',
};

export function AssetList({ assets, salt, onDelete, onManageAccess }: AssetListProps) {
  const { decryptAsset, isUnlocked } = useVault();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [decrypting, setDecrypting] = useState<string | null>(null);

  const handleToggleExpand = async (asset: Asset) => {
    if (expandedId === asset.id) {
      setExpandedId(null);
      return;
    }

    if (!isUnlocked) {
      return;
    }

    setExpandedId(asset.id);

    // If already decrypted, no need to decrypt again
    if (decryptedContent[asset.id]) {
      return;
    }

    setDecrypting(asset.id);

    try {
      const plaintext = await decryptAsset(asset.ciphertext, asset.iv, salt);
      setDecryptedContent((prev) => ({ ...prev, [asset.id]: plaintext }));
    } catch (err) {
      console.error('Decryption error:', err);
      setExpandedId(null);
    } finally {
      setDecrypting(null);
    }
  };

  const groupedAssets = assets.reduce(
    (acc, asset) => {
      const category = asset.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    },
    {} as Record<string, Asset[]>
  );

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No assets yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Add your first asset to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">{CATEGORY_EMOJIS[category]}</span>
            {CATEGORY_LABELS[category]}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              ({categoryAssets.length})
            </span>
          </h3>

          <div className="space-y-3">
            {categoryAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => handleToggleExpand(asset)}
                  disabled={!isUnlocked}
                  className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {asset.title}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Added{' '}
                        {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-slate-400">
                      {expandedId === asset.id ? '▼' : '▶'}
                    </div>
                  </div>
                </button>

                {expandedId === asset.id && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                    {decrypting === asset.id ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Decrypting...
                        </p>
                      </div>
                    ) : decryptedContent[asset.id] ? (
                      <div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4">
                          <pre className="whitespace-pre-wrap break-words text-sm font-mono text-slate-900 dark:text-white">
                            {decryptedContent[asset.id]}
                          </pre>
                        </div>
                        <div className="mt-3 flex gap-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                decryptedContent[asset.id]
                              );
                            }}
                            className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            Copy to clipboard
                          </button>
                          {onManageAccess && (
                            <button
                              onClick={() => onManageAccess(asset.id, asset.title)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Manage Access
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(asset.id)}
                              className="text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
