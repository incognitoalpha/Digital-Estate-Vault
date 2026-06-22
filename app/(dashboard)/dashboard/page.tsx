import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime } from '@/lib/utils';
import { CheckinButton } from '@/components/dashboard/CheckinButton';
import { EmailUsageMonitor } from '@/components/dashboard/EmailUsageMonitor';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, checkin_interval_days, grace_period_days')
    .eq('id', user.id)
    .single();

  // Get last check-in
  const { data: lastCheckin } = await supabase
    .from('checkins')
    .select('checked_in_at')
    .eq('owner_id', user.id)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .single();

  // Get dead man's switch state
  const { data: dmsState } = await supabase
    .from('dead_man_switch_state')
    .select('status, last_checkin_at')
    .eq('owner_id', user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Welcome, {profile?.display_name || 'User'}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your vault is secure and ready
        </p>
      </div>

      {/* Email Usage Alert */}
      <EmailUsageMonitor />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Status
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${dmsState?.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white capitalize">
              {dmsState?.status?.replace('_', ' ') || 'Active'}
            </span>
          </div>
        </div>

        {/* Last Check-in Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Last Check-in
          </h2>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {lastCheckin
              ? formatRelativeTime(lastCheckin.checked_in_at)
              : 'Never'}
          </p>
        </div>

        {/* Next Check-in Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Check-in Interval
          </h2>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            Every {profile?.checkin_interval_days || 14} days
          </p>
        </div>
      </div>

      {/* Check-in Button */}
      <CheckinButton
        lastCheckin={dmsState?.last_checkin_at || null}
        status={dmsState?.status || 'active'}
      />

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
            <div className="text-2xl mb-2">✓</div>
            <div className="font-medium text-slate-900 dark:text-white">
              Check In
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              I&apos;m still here
            </div>
          </button>

          <a
            href="/vault"
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left block"
          >
            <div className="text-2xl mb-2">🔐</div>
            <div className="font-medium text-slate-900 dark:text-white">
              My Vault
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Manage assets
            </div>
          </a>

          <a
            href="/trustees"
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left block"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-slate-900 dark:text-white">
              Trustees
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Manage trustees
            </div>
          </a>

          <button className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium text-slate-900 dark:text-white">
              Settings
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Account settings
            </div>
          </button>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Getting Started
        </h2>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>• Add your first asset to the vault (Phase 3)</li>
          <li>• Invite trustees to receive access (Phase 4)</li>
          <li>• Perform regular check-ins (Phase 5)</li>
        </ul>
      </div>
    </div>
  );
}
