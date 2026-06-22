import { createClient } from '@/lib/supabase/server';
import { TrusteeAcceptanceFlow } from '@/components/trustee/TrusteeAcceptanceFlow';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: { token?: string };
}

export default async function TrusteeAcceptPage({
  searchParams,
}: PageProps) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Invalid Invitation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This invitation link is invalid or expired. Please contact the
            person who invited you.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get trustee details
  const { data: trustee, error: trusteeError } = await supabase
    .from('trustees')
    .select('id, email, name, owner_id, invite_status, trustee_user_id, public_key_jwk')
    .eq('id', token)
    .single();

  if (trusteeError || !trustee) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Invitation Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This invitation could not be found. It may have been revoked or
            expired.
          </p>
        </div>
      </div>
    );
  }

  // Check if already accepted
  if (trustee.invite_status === 'accepted' && trustee.public_key_jwk) {
    redirect('/portal');
  }

  // Check if revoked
  if (trustee.invite_status === 'revoked') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Invitation Revoked
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This invitation has been revoked by the owner.
          </p>
        </div>
      </div>
    );
  }

  // Get owner name
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', trustee.owner_id)
    .single();

  const ownerName = ownerProfile?.display_name || 'the owner';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <TrusteeAcceptanceFlow
        trusteeId={trustee.id}
        trusteeEmail={trustee.email}
        trusteeName={trustee.name || ''}
        ownerName={ownerName}
        isAuthenticated={!!user}
        authenticatedEmail={user?.email}
      />
    </div>
  );
}
