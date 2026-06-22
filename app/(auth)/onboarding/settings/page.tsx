'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingSettingsPage() {
  const router = useRouter();
  const [checkinInterval, setCheckinInterval] = useState(14);
  const [gracePeriod, setGracePeriod] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (checkinInterval < 1) {
      setError('Check-in interval must be at least 1 day');
      return;
    }

    if (gracePeriod < 1) {
      setError('Grace period must be at least 1 day');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Update profile with check-in settings
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          checkin_interval_days: checkinInterval,
          grace_period_days: gracePeriod,
        })
        .eq('id', user.id);

      if (updateError) {
        setError('Failed to save settings. Please try again.');
        console.error(updateError);
        return;
      }

      // Create initial check-in
      await supabase.from('checkins').insert({
        owner_id: user.id,
        method: 'app',
      });

      // Onboarding complete, redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalDays = checkinInterval + gracePeriod;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-2">
          Configure Check-In Schedule
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          How often should we expect to hear from you?
        </p>
      </div>

      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Regular check-ins let us know you&apos;re okay. If you miss a check-in, we&apos;ll send a reminder. After your grace period ends, we&apos;ll begin notifying your trustees.
        </p>
      </div>

      <form onSubmit={handleComplete} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="checkinInterval"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Check-in Interval
          </label>
          <div className="flex items-center gap-4">
            <input
              id="checkinInterval"
              type="range"
              min="7"
              max="90"
              step="7"
              value={checkinInterval}
              onChange={(e) => setCheckinInterval(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-24 text-right">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                {checkinInterval}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                days
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            We&apos;ll expect to hear from you every {checkinInterval} days
          </p>
        </div>

        <div>
          <label
            htmlFor="gracePeriod"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Grace Period
          </label>
          <div className="flex items-center gap-4">
            <input
              id="gracePeriod"
              type="range"
              min="1"
              max="30"
              step="1"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-24 text-right">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                {gracePeriod}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                days
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            After a missed check-in, you&apos;ll have {gracePeriod} days to respond before trustees are notified
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
            Timeline Summary
          </h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Check-in expected every:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {checkinInterval} days
              </span>
            </div>
            <div className="flex justify-between">
              <span>Grace period:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {gracePeriod} days
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2">
              <span>Total time before trustee notification:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {totalDays} days
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Completing setup...' : 'Complete Setup'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        You can change these settings anytime from your dashboard
      </p>
    </div>
  );
}
