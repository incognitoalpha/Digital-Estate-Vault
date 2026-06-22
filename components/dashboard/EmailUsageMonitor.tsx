'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmailQuota {
  emails_sent_today: number;
  daily_limit_reached: boolean;
  daily_warning: boolean;
  emails_sent_this_month: number;
  monthly_limit_reached: boolean;
  monthly_warning: boolean;
}

export function EmailUsageMonitor() {
  const [quota, setQuota] = useState<EmailQuota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuota();
  }, []);

  async function loadQuota() {
    try {
      const supabase = createClient();

      const [dailyResult, monthlyResult] = await Promise.all([
        supabase.rpc('check_daily_email_quota'),
        supabase.rpc('check_monthly_email_quota'),
      ]);

      if (dailyResult.data && monthlyResult.data) {
        const daily = dailyResult.data[0];
        const monthly = monthlyResult.data[0];

        setQuota({
          emails_sent_today: daily.emails_sent_today,
          daily_limit_reached: daily.limit_reached,
          daily_warning: daily.warning,
          emails_sent_this_month: monthly.emails_sent_this_month,
          monthly_limit_reached: monthly.limit_reached,
          monthly_warning: monthly.warning,
        });
      }
    } catch (error) {
      console.error('Failed to load email quota:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null; // Silent loading - this is a non-critical monitoring widget
  }

  if (!quota) {
    return null;
  }

  // Only show if there's a warning or limit reached
  const showDailyAlert = quota.daily_warning || quota.daily_limit_reached;
  const showMonthlyAlert = quota.monthly_warning || quota.monthly_limit_reached;

  if (!showDailyAlert && !showMonthlyAlert) {
    return null; // Don't show anything if usage is fine
  }

  const dailyPercent = (quota.emails_sent_today / 100) * 100;
  const monthlyPercent = (quota.emails_sent_this_month / 3000) * 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            Email Usage Alert
          </h3>

          {showDailyAlert && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Daily usage
                </span>
                <span
                  className={
                    quota.daily_limit_reached
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 font-semibold'
                  }
                >
                  {quota.emails_sent_today} / 100
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className={
                    quota.daily_limit_reached
                      ? 'bg-red-600 h-2 rounded-full'
                      : 'bg-amber-500 h-2 rounded-full'
                  }
                  style={{ width: `${Math.min(dailyPercent, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {showMonthlyAlert && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Monthly usage
                </span>
                <span
                  className={
                    quota.monthly_limit_reached
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 font-semibold'
                  }
                >
                  {quota.emails_sent_this_month} / 3,000
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className={
                    quota.monthly_limit_reached
                      ? 'bg-red-600 h-2 rounded-full'
                      : 'bg-amber-500 h-2 rounded-full'
                  }
                  style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {(quota.daily_limit_reached || quota.monthly_limit_reached) && (
            <p className="text-sm text-red-800 dark:text-red-200 mt-3">
              <strong>Limit reached:</strong> No more emails can be sent until
              the limit resets. Consider upgrading your Resend plan.
            </p>
          )}

          {(quota.daily_warning || quota.monthly_warning) &&
            !quota.daily_limit_reached &&
            !quota.monthly_limit_reached && (
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-3">
                You're approaching Resend's free tier limits. Consider
                monitoring your usage or upgrading if needed.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
