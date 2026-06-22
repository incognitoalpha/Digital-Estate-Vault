'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TrusteeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TrusteeForm({ onSuccess, onCancel }: TrusteeFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

      // Check if trustee already exists
      const { data: existing } = await supabase
        .from('trustees')
        .select('id, invite_status')
        .eq('owner_id', user.id)
        .eq('email', email)
        .single();

      if (existing) {
        if (existing.invite_status === 'revoked') {
          setError(
            'This trustee was previously revoked. Please use a different email.'
          );
        } else {
          setError('A trustee with this email already exists.');
        }
        return;
      }

      // Create trustee invitation
      const { data: trustee, error: insertError } = await supabase
        .from('trustees')
        .insert({
          owner_id: user.id,
          email,
          name,
          invite_status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        setError('Failed to create trustee invitation');
        console.error(insertError);
        return;
      }

      // Log audit entry
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'owner',
        action: 'trustee_invited',
        target_table: 'trustees',
        target_id: trustee.id,
        metadata: { email, name },
      });

      // Send invitation email
      try {
        const inviteResponse = await fetch('/api/trustees/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trustee_id: trustee.id }),
        });

        if (!inviteResponse.ok) {
          const errData = await inviteResponse.json().catch(() => ({}));
          console.error('Failed to send invitation email:', errData);
          setError(
            `Trustee added, but the invitation email could not be sent. ` +
              `Please check your email configuration. ` +
              (errData?.details?.message ? `Resend error: ${errData.details.message}` : '')
          );
          // Don't block success — the trustee row was created
          onSuccess?.();
          return;
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        setError('Trustee added, but the invitation email could not be delivered. Please retry later.');
        onSuccess?.();
        return;
      }

      // Reset form
      setEmail('');
      setName('');

      onSuccess?.();
    } catch (err) {
      console.error('Trustee invitation error:', err);
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

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Trustees will receive access to assets you designate if you become
          unreachable for your configured period.
        </p>
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          placeholder="e.g., John Smith"
        />
      </div>

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          placeholder="trustee@example.com"
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          They will receive an invitation to create an account (Phase 7)
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending invitation...' : 'Invite Trustee'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
