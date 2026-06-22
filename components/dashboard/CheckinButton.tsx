'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';

interface CheckinButtonProps {
  lastCheckin: string | null;
  status: string;
}

export function CheckinButton({ lastCheckin, status }: CheckinButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCheckin = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 429) {
          setError(`Too many check-in attempts. Please try again in ${data.retryAfter} seconds.`);
        } else {
          setError(data.error || 'Failed to record check-in');
        }
        return;
      }

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      console.error('Check-in error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const needsAttention = ['warning_sent', 'grace_period', 'trustees_notified'].includes(status);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            Check-In Status
          </h2>
          {lastCheckin && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Last check-in: {formatRelativeTime(lastCheckin)}
            </p>
          )}
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'active'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
          }`}
        >
          {status === 'active' ? '✓ Active' : '⚠ Needs Attention'}
        </div>
      </div>

      {needsAttention && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {status === 'warning_sent' && 'We haven\'t heard from you recently. Please check in to let us know you\'re okay.'}
            {status === 'grace_period' && 'You\'re in the grace period. Check in now to prevent trustee notification.'}
            {status === 'trustees_notified' && 'Your trustees have been notified. Check in to cancel the release process.'}
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div role="status" className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <span aria-hidden="true">✓ </span>Check-in recorded successfully!
          </p>
        </div>
      )}

      <button
        onClick={handleCheckin}
        disabled={loading || success}
        aria-busy={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Recording check-in...' : success ? <><span aria-hidden="true">✓ </span>Checked In</> : 'I\'m Still Here'}
      </button>

      <p className="mt-3 text-xs text-center text-slate-500 dark:text-slate-400">
        Regular check-ins let your trustees know you&apos;re okay
      </p>
    </div>
  );
}
