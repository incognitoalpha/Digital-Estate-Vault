import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime } from '@/lib/utils';

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get audit log entries for this user
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*')
    .or(`actor_id.eq.${user.id},target_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Audit Log
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          View your account activity and security events
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No activity yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Your activity log will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {log.actor_role === 'system'
                          ? 'System'
                          : log.actor_role === 'owner'
                            ? 'You'
                            : 'Trustee'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-white">
                      {getActionDescription(log)}
                    </p>
                    {log.metadata && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                          Details
                        </summary>
                        <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 ml-4">
                    {formatRelativeTime(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {auditLogs && auditLogs.length >= 100 && (
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          Showing most recent 100 entries
        </div>
      )}
    </div>
  );
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getActionBadgeColor(action: string): string {
  if (action.includes('delete') || action.includes('revoke')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
  if (action.includes('create') || action.includes('invite')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
  if (action.includes('update') || action.includes('modify')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
  if (action.includes('transition')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
}

interface AuditLog {
  action: string;
  target_table?: string;
  metadata?: Record<string, unknown>;
}

function getActionDescription(log: AuditLog): string {
  const table = log.target_table || 'resource';
  const action = log.action;

  if (action === 'asset_created') return 'Created a new asset';
  if (action === 'asset_updated') return 'Updated an asset';
  if (action === 'asset_deleted') return 'Deleted an asset';
  if (action === 'asset_grants_modified')
    return 'Modified trustee access grants for an asset';

  if (action === 'trustee_invited') return 'Invited a new trustee';
  if (action === 'trustee_accepted') return 'Trustee accepted invitation';
  if (action === 'trustee_revoked') return 'Revoked trustee access';

  if (action === 'checkin_performed') return 'Performed check-in';
  if (action === 'state_transition') {
    const from = log.metadata?.from || 'unknown';
    const to = log.metadata?.to || 'unknown';
    return `Status changed from ${from} to ${to}`;
  }

  if (action === 'vault_unlocked') return 'Unlocked vault';
  if (action === 'vault_locked') return 'Locked vault';

  return `${formatAction(action)} on ${table}`;
}
