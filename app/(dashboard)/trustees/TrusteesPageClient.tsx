'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrusteeForm } from '@/components/trustee/TrusteeForm';
import { TrusteeList } from '@/components/trustee/TrusteeList';

interface Trustee {
  id: string;
  name: string | null;
  email: string;
  invite_status: string;
  created_at: string;
  trustee_user_id: string | null;
}

interface Asset {
  id: string;
  title: string;
  category: string;
}

interface TrusteesPageClientProps {
  trustees: Trustee[];
  assets: Asset[];
}

export function TrusteesPageClient({
  trustees: initialTrustees,
  assets,
}: TrusteesPageClientProps) {
  const router = useRouter();
  const [trustees, setTrustees] = useState(initialTrustees);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleTrusteeAdded = () => {
    setShowAddForm(false);
    router.refresh();
  };

  const handleRevoke = (id: string) => {
    setTrustees(
      trustees.map((t) =>
        t.id === id ? { ...t, invite_status: 'revoked' } : t
      )
    );
  };

  const handleDelete = (id: string) => {
    setTrustees(trustees.filter((t) => t.id !== id));
  };

  const acceptedTrustees = trustees.filter(
    (t) => t.invite_status === 'accepted'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Trustees
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            People who will receive access to your assets
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Invite Trustee'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Invite a Trustee
          </h2>
          <TrusteeForm
            onSuccess={handleTrusteeAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Your Trustees
        </h2>
        <TrusteeList trustees={trustees} onRevoke={handleRevoke} onDelete={handleDelete} />
      </div>

      {acceptedTrustees.length > 0 && assets.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Next Step: Grant Asset Access
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
            You have {acceptedTrustees.length} accepted trustee
            {acceptedTrustees.length === 1 ? '' : 's'} and {assets.length}{' '}
            asset{assets.length === 1 ? '' : 's'}. Grant them access to
            specific assets from your vault.
          </p>
          <a
            href="/vault"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Vault
          </a>
        </div>
      )}

      {trustees.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">
            Get Started with Trustees
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Trustees are trusted individuals who will receive access to your
            designated assets if you become unreachable. Start by inviting at
            least one trustee.
          </p>
        </div>
      )}
    </div>
  );
}
