'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Trustee {
  id: string;
  name: string | null;
  email: string;
  invite_status: string;
  created_at: string;
  trustee_user_id: string | null;
}

interface TrusteeListProps {
  trustees: Trustee[];
  onRevoke?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  revoked: 'Revoked',
};

export function TrusteeList({ trustees, onRevoke }: TrusteeListProps) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (trustee: Trustee) => {
    if (
      !confirm(
        `Are you sure you want to revoke access for ${trustee.name || trustee.email}? They will lose access to all assets.`
      )
    ) {
      return;
    }

    setRevoking(trustee.id);

    try {
      const supabase = createClient();

      // Update trustee status
      const { error: updateError } = await supabase
        .from('trustees')
        .update({ invite_status: 'revoked' })
        .eq('id', trustee.id);

      if (updateError) {
        console.error('Failed to revoke trustee:', updateError);
        alert('Failed to revoke trustee access');
        return;
      }

      // Log audit entry
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          actor_id: user.id,
          actor_role: 'owner',
          action: 'trustee_revoked',
          target_table: 'trustees',
          target_id: trustee.id,
        });
      }

      onRevoke?.(trustee.id);
    } catch (err) {
      console.error('Revoke error:', err);
      alert('An unexpected error occurred');
    } finally {
      setRevoking(null);
    }
  };

  if (trustees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No trustees yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Invite someone you trust to receive access to your assets
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trustees.map((trustee) => (
        <div
          key={trustee.id}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {trustee.name || 'Unnamed Trustee'}
                </h4>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    STATUS_COLORS[trustee.invite_status] ||
                    'bg-slate-100 text-slate-800'
                  }`}
                >
                  {STATUS_LABELS[trustee.invite_status] || trustee.invite_status}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {trustee.email}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invited {new Date(trustee.created_at).toLocaleDateString()}
              </p>

              {trustee.invite_status === 'pending' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Waiting for them to accept the invitation
                </p>
              )}
            </div>

            {trustee.invite_status !== 'revoked' && (
              <button
                onClick={() => handleRevoke(trustee)}
                disabled={revoking === trustee.id}
                className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revoking === trustee.id ? 'Revoking...' : 'Revoke Access'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
