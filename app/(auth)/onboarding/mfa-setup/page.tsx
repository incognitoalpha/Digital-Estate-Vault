'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'qrcode';

export default function MFASetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const enrollMFA = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Enroll TOTP factor
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (enrollError) {
        setError(enrollError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setSecret(data.totp.secret);

        // Generate QR code
        const qrCodeUrl = data.totp.qr_code;
        const qr = await QRCode.toDataURL(qrCodeUrl);
        setQrCode(qr);
      }

      setLoading(false);
    } catch (err) {
      console.error('MFA enrollment error:', err);
      setError('Failed to set up MFA');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch MFA enrollment data on component mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    enrollMFA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnrolling(true);

    try {
      const supabase = createClient();

      // Verify the TOTP code
      const { data, error: verifyError } = await supabase.auth.mfa.challenge({
        factorId: secret,
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      if (data) {
        const { error: verifyCodeError } = await supabase.auth.mfa.verify({
          factorId: secret,
          challengeId: data.id,
          code: verifyCode,
        });

        if (verifyCodeError) {
          setError('Invalid verification code. Please try again.');
          return;
        }

        // MFA setup complete, proceed to vault passphrase setup
        router.push('/onboarding/vault-setup');
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Failed to verify MFA code');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Setting up MFA...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-2">
          Secure Your Account
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Two-factor authentication is required for vault access
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Step 1: Scan QR Code
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Use an authenticator app like Google Authenticator, Authy, or 1Password to scan this QR code.
          </p>
          {qrCode && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="MFA QR Code" className="w-64 h-64" />
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
            Step 2: Save Recovery Code
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Store this secret in a safe place. You&apos;ll need it if you lose access to your authenticator app.
          </p>
          <code className="block bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-600 text-sm font-mono break-all">
            {secret}
          </code>
        </div>

        <form onSubmit={verifyAndComplete} className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
              Step 3: Verify Setup
            </h2>
            <label
              htmlFor="verifyCode"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Enter the 6-digit code from your authenticator app
            </label>
            <input
              id="verifyCode"
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={enrolling || verifyCode.length !== 6}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrolling ? 'Verifying...' : 'Verify and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
