'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SettingsFormProps {
  initialDisplayName: string;
  initialCheckinInterval: number;
  initialGracePeriod: number;
  userEmail: string;
  currentStatus: string;
}

export function SettingsForm({
  initialDisplayName,
  initialCheckinInterval,
  initialGracePeriod,
  userEmail,
  currentStatus,
}: SettingsFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [checkinInterval, setCheckinInterval] = useState(
    initialCheckinInterval
  );
  const [gracePeriod, setGracePeriod] = useState(initialGracePeriod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges =
    displayName !== initialDisplayName ||
    checkinInterval !== initialCheckinInterval ||
    gracePeriod !== initialGracePeriod;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          checkin_interval_days: checkinInterval,
          grace_period_days: gracePeriod,
        })
        .eq('id', user.id);

      if (updateError) {
        setError('Failed to update settings');
        console.error(updateError);
        return;
      }

      // Log audit entry
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'owner',
        action: 'settings_updated',
        target_table: 'profiles',
        target_id: user.id,
        metadata: {
          display_name: displayName,
          checkin_interval_days: checkinInterval,
          grace_period_days: gracePeriod,
        },
      });

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Settings update error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div role="status" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            Settings updated successfully
          </p>
        </div>
      )}

      {currentStatus !== 'active' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Your dead man's switch is currently in{' '}
            <strong>{currentStatus.replace('_', ' ')}</strong> status. Changing
            your check-in interval won't reset the current state. Check in to
            reset your status first.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={userEmail}
          disabled
          aria-disabled="true"
          aria-describedby="email-hint"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
        />
        <p id="email-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Email cannot be changed
        </p>
      </div>

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="checkinInterval"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Check-in Interval (days)
        </label>
        <input
          id="checkinInterval"
          type="number"
          min="1"
          max="365"
          value={checkinInterval}
          onChange={(e) => setCheckinInterval(parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          How often you need to check in to confirm you're still active
        </p>
      </div>

      <div>
        <label
          htmlFor="gracePeriod"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Grace Period (days)
        </label>
        <input
          id="gracePeriod"
          type="number"
          min="1"
          max="90"
          value={gracePeriod}
          onChange={(e) => setGracePeriod(parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Additional time before notifying trustees after a missed check-in
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          How this works
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>
            • If you miss a check-in, you'll receive a warning email after{' '}
            <strong>{checkinInterval} days</strong>
          </li>
          <li>
            • You'll have a <strong>{gracePeriod}-day grace period</strong> to
            respond
          </li>
          <li>
            • After the grace period, your trustees will be notified and assets
            will be released
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !hasChanges}
          aria-busy={loading}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={() => {
              setDisplayName(initialDisplayName);
              setCheckinInterval(initialCheckinInterval);
              setGracePeriod(initialGracePeriod);
            }}
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </form>
  );
}
