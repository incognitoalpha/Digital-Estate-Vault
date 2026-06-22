'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  generateTrusteeKeypair,
  storeTrusteePrivateKey,
} from '@/lib/crypto-asymmetric';

interface TrusteeAcceptanceFlowProps {
  trusteeId: string;
  trusteeEmail: string;
  trusteeName: string;
  ownerName: string;
  isAuthenticated: boolean;
  authenticatedEmail?: string;
}

export function TrusteeAcceptanceFlow({
  trusteeId,
  trusteeEmail,
  trusteeName,
  ownerName,
  isAuthenticated,
  authenticatedEmail,
}: TrusteeAcceptanceFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'auth' | 'keypair' | 'complete'>(
    isAuthenticated ? 'intro' : 'auth'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleAcceptInvitation = async () => {
    if (!isAuthenticated) {
      setStep('auth');
      return;
    }

    setStep('keypair');
  };

  const handleGenerateKeypair = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to accept this invitation');
        return;
      }

      // Check email matches
      if (user.email !== trusteeEmail) {
        setError(
          `You must sign in with ${trusteeEmail} to accept this invitation. You are currently signed in as ${user.email}.`
        );
        return;
      }

      // Generate keypair
      const { publicKey, privateKey } = await generateTrusteeKeypair();

      // Store private key in browser localStorage
      const stored = storeTrusteePrivateKey(trusteeId, privateKey);
      if (!stored) {
        setError('Failed to store private key. Please try again.');
        return;
      }

      // Update trustee record with public key and link to user
      const { error: updateError } = await supabase
        .from('trustees')
        .update({
          trustee_user_id: user.id,
          public_key_jwk: publicKey,
          keypair_generated_at: new Date().toISOString(),
          invite_status: 'accepted',
        })
        .eq('id', trusteeId);

      if (updateError) {
        setError('Failed to save acceptance. Please try again.');
        console.error(updateError);
        return;
      }

      // Log audit entry
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'trustee',
        action: 'trustee_accepted',
        target_table: 'trustees',
        target_id: trusteeId,
      });

      setPrivateKey(privateKey);
      setStep('complete');
    } catch (err) {
      console.error('Keypair generation error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPrivateKey = () => {
    if (!privateKey) return;

    const blob = new Blob([privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustee-private-key-${trusteeId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setHasDownloaded(true);
  };

  const handleContinue = () => {
    router.push('/portal');
  };

  if (step === 'auth') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
          Sign In Required
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          To accept this trustee invitation, you need to sign in or create an
          account with the email address <strong>{trusteeEmail}</strong>.
        </p>
        <div className="space-y-3">
          <a
            href={`/signup?email=${encodeURIComponent(trusteeEmail)}&redirect=/trustees/accept?token=${trusteeId}`}
            className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            Create Account
          </a>
          <a
            href={`/login?redirect=/trustees/accept?token=${trusteeId}`}
            className="block w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium py-3 px-4 rounded-lg text-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
          Trustee Invitation
        </h1>

        <div className="mb-6">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Hi {trusteeName || trusteeEmail},
          </p>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            <strong>{ownerName}</strong> has invited you to be a trusted
            contact in their Digital Estate Vault.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            What does this mean?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li>
              • You&apos;ll receive access to specific digital assets if{' '}
              {ownerName} becomes unreachable
            </li>
            <li>
              • You&apos;ll only be notified after multiple missed check-ins
            </li>
            <li>
              • A secure encryption key will be generated for you to access
              assets
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleAcceptInvitation}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Accept Invitation
        </button>
      </div>
    );
  }

  if (step === 'keypair') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-xl w-full">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
          Generate Your Security Key
        </h1>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            Important: About Your Private Key
          </h3>
          <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
            <li>
              • A unique encryption keypair will be generated in your browser
            </li>
            <li>
              • Your <strong>private key</strong> will be stored securely in
              this browser
            </li>
            <li>
              • You&apos;ll need this key to decrypt assets when they&apos;re
              released to you
            </li>
            <li>
              • <strong>If you lose your private key, you cannot recover
              it</strong> — you&apos;ll be unable to access released assets
            </li>
            <li>
              • After generation, you&apos;ll have the option to download a
              backup
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerateKeypair}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Security Key'}
        </button>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Invitation Accepted
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your security key has been generated and stored
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-green-800 dark:text-green-300 space-y-2">
            <li>
              • Your private key is stored securely in this browser&apos;s
              localStorage
            </li>
            <li>
              • You&apos;ll be notified by email if {ownerName} misses their
              check-ins
            </li>
            <li>
              • Access to assets will only be granted after the configured time
              period
            </li>
            <li>• You can view your trustee portal now</li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            ⚠ Backup Your Private Key
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            It&apos;s strongly recommended to download a backup of your private
            key. Store it in a secure location (password manager, encrypted
            drive, or safe).
          </p>
          <button
            onClick={handleDownloadPrivateKey}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Download Private Key Backup
          </button>
          {hasDownloaded && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
              ✓ Backup downloaded
            </p>
          )}
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Continue to Trustee Portal
        </button>
      </div>
    );
  }

  return null;
}
