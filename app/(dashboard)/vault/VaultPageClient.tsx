'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VaultProvider, useVault } from '@/components/vault/VaultContext';
import { VaultUnlock } from '@/components/vault/VaultUnlock';
import { AssetList } from '@/components/vault/AssetList';
import { AssetForm } from '@/components/vault/AssetForm';
import { AssetGrantsDialog } from '@/components/vault/AssetGrantsDialog';

interface Asset {
  id: string;
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

interface VaultPageClientProps {
  assets: Asset[];
  salt: string;
}

function VaultContent({ assets: initialAssets, salt }: VaultPageClientProps) {
  const router = useRouter();
  const { isUnlocked, lock } = useVault();
  const [assets, setAssets] = useState(initialAssets);
  const [showAddForm, setShowAddForm] = useState(false);
  const [grantsDialog, setGrantsDialog] = useState<{
    assetId: string;
    assetTitle: string;
  } | null>(null);

  const handleAssetAdded = (newAsset: Asset) => {
    setShowAddForm(false);
    setAssets((prev) => [newAsset, ...prev]);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('assets').delete().eq('id', id);

    if (!error) {
      setAssets(assets.filter((a) => a.id !== id));
    }
  };

  const handleManageAccess = (assetId: string, assetTitle: string) => {
    setGrantsDialog({ assetId, assetTitle });
  };

  const handleGrantsSaved = () => {
    router.refresh();
  };

  if (!isUnlocked) {
    return <VaultUnlock salt={salt} onUnlock={() => { /* state already updated in VaultContext */ }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            My Vault
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Your encrypted assets
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Asset'}
          </button>
          <button
            onClick={lock}
            className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            🔒 Lock Vault
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Add New Asset
          </h2>
          <AssetForm
            onSuccess={handleAssetAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <AssetList
          assets={assets}
          salt={salt}
          onDelete={handleDelete}
          onManageAccess={handleManageAccess}
        />
      </div>

      {grantsDialog && (
        <AssetGrantsDialog
          assetId={grantsDialog.assetId}
          assetTitle={grantsDialog.assetTitle}
          onClose={() => setGrantsDialog(null)}
          onSaved={handleGrantsSaved}
        />
      )}
    </div>
  );
}

export function VaultPageClient(props: VaultPageClientProps) {
  return (
    <VaultProvider>
      <VaultContent {...props} />
    </VaultProvider>
  );
}
