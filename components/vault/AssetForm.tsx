'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVault } from './VaultContext';

interface Asset {
  id: string;
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

interface AssetFormProps {
  onSuccess?: (newAsset: Asset) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: 'account', label: 'Account', emoji: '👤' },
  { value: 'crypto_wallet', label: 'Crypto Wallet', emoji: '💰' },
  { value: 'cloud_doc', label: 'Cloud Document', emoji: '📄' },
  { value: 'note', label: 'Note', emoji: '📝' },
  { value: 'other', label: 'Other', emoji: '📦' },
] as const;

export function AssetForm({ onSuccess, onCancel }: AssetFormProps) {
  const { encryptAsset, isUnlocked } = useVault();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('account');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isUnlocked) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Please unlock your vault to add assets
        </p>
      </div>
    );
  }

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
        window.location.href = '/login';
        return;
      }

      // Encrypt the content
      const { ciphertext, iv } = await encryptAsset(content);

      // Save to database
      const { data: newAsset, error: insertError } = await supabase
        .from('assets')
        .insert({
          owner_id: user.id,
          category,
          title,
          ciphertext,
          iv,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        setError(`Failed to save asset: ${insertError.message} (code: ${insertError.code})`);
        return;
      }

      // Reset form
      setTitle('');
      setCategory('account');
      setContent('');

      onSuccess?.(newAsset);
    } catch (err) {
      console.error('Asset creation error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error: ${msg}`);
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

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          placeholder="e.g., Gmail Account, Bitcoin Wallet"
        />
      </div>

      <div>
        <label
          id="category-label"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Category
        </label>
        <div role="radiogroup" aria-labelledby="category-label" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              role="radio"
              aria-checked={category === cat.value}
              onClick={() => setCategory(cat.value)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                category === cat.value
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
              }`}
            >
              <div className="text-2xl mb-1" aria-hidden="true">{cat.emoji}</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {cat.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Secret Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white font-mono text-sm"
          placeholder="Enter sensitive information (passwords, seed phrases, instructions, etc.)"
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          This content will be encrypted before being saved
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Asset'}
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
