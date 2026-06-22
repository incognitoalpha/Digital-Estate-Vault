import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { ChangePassphraseForm } from '@/components/settings/ChangePassphraseForm';

export default async function SettingsPage() {
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

  // Get dead man's switch state
  const { data: dmsState } = await supabase
    .from('dead_man_switch_state')
    .select('status')
    .eq('owner_id', user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Account Settings
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Manage your check-in schedule and account preferences
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Account Information
        </h2>
        <SettingsForm
          initialDisplayName={profile?.display_name || ''}
          initialCheckinInterval={profile?.checkin_interval_days || 14}
          initialGracePeriod={profile?.grace_period_days || 7}
          userEmail={user.email || ''}
          currentStatus={dmsState?.status || 'active'}
        />
      </div>

      <ChangePassphraseForm />

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-red-800 dark:text-red-300 mb-4">
          These actions are permanent and cannot be undone.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-200">
                Delete Account
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">
                Permanently delete your account, all assets, and trustee
                relationships
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Account
            </button>
          </div>
          <p className="text-xs text-red-700 dark:text-red-400">
            Account deletion is currently disabled. Contact support if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
