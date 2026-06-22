import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrusteePortalClient } from './TrusteePortalClient';

export default async function TrusteePortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get trustee record for this user
  const { data: trusteeRecord } = await supabase
    .from('trustees')
    .select('id, owner_id, name, email, invite_status')
    .eq('trustee_user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  if (!trusteeRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            No Trustee Access
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            You don&apos;t have access to any vaults yet.
          </p>
        </div>
      </div>
    );
  }

  // Check if owner's dead man switch is released
  const { data: dmsState } = await supabase
    .from('dead_man_switch_state')
    .select('status, owner_id')
    .eq('owner_id', trusteeRecord.owner_id)
    .single();

  if (!dmsState || dmsState.status !== 'released') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Access Not Yet Available
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Assets have not been released yet. You will be notified when access
            becomes available.
          </p>
          {dmsState?.status === 'trustees_notified' && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Release is pending final confirmation period.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Get granted assets
  const { data: grantsData } = await supabase
    .from('asset_trustee_grants')
    .select(
      `
      id,
      release_mode,
      quorum_required,
      wrapped_key,
      asset_id,
      assets!inner (
        id,
        title,
        category,
        ciphertext,
        iv,
        created_at
      )
    `
    )
    .eq('trustee_id', trusteeRecord.id);

  // Transform data - Supabase returns assets as array, flatten to single object
  const grants =
    grantsData?.map((g: any) => ({
      id: g.id,
      release_mode: g.release_mode,
      quorum_required: g.quorum_required,
      wrapped_key: g.wrapped_key,
      assets: Array.isArray(g.assets) ? g.assets[0] : g.assets,
    })) || [];

  // Get owner profile for salt
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name, vault_salt')
    .eq('id', trusteeRecord.owner_id)
    .single();

  return (
    <TrusteePortalClient
      ownerName={ownerProfile?.display_name || 'Owner'}
      grants={grants || []}
      salt={ownerProfile?.vault_salt || ''}
      trusteeId={trusteeRecord.id}
    />
  );
}
