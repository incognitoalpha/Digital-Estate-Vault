'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { wrapKeyForTrustee } from '@/lib/crypto-asymmetric';

interface Trustee {
  id: string;
  name: string | null;
  email: string;
  invite_status: string;
}

interface Grant {
  id: string;
  trustee_id: string;
  release_mode: 'on_trigger' | 'immediate' | 'requires_quorum';
  quorum_required: number;
}

interface AssetGrantsDialogProps {
  assetId: string;
  assetTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AssetGrantsDialog({
  assetId,
  assetTitle,
  onClose,
  onSaved,
}: AssetGrantsDialogProps) {
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedTrustees, setSelectedTrustees] = useState<Set<string>>(
    new Set()
  );
  const [releaseMode, setReleaseMode] = useState<
    'on_trigger' | 'immediate' | 'requires_quorum'
  >('on_trigger');
  const [quorumRequired, setQuorumRequired] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [showPassphrasePrompt, setShowPassphrasePrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, [assetId]);

  async function loadData() {
    const supabase = createClient();

    const [trusteesResult, grantsResult] = await Promise.all([
      supabase
        .from('trustees')
        .select('*')
        .eq('invite_status', 'accepted')
        .order('name'),
      supabase
        .from('asset_trustee_grants')
        .select('*')
        .eq('asset_id', assetId),
    ]);

    if (trusteesResult.data) {
      setTrustees(trusteesResult.data);
    }

    if (grantsResult.data) {
      setGrants(grantsResult.data);
      const trusteeIds = new Set(grantsResult.data.map((g) => g.trustee_id));
      setSelectedTrustees(trusteeIds);

      if (grantsResult.data.length > 0) {
        setReleaseMode(grantsResult.data[0].release_mode);
        setQuorumRequired(grantsResult.data[0].quorum_required);
      }
    }

    setLoading(false);
  }

  async function handleSave() {
    // Check if we need passphrase for new grants
    const newGrants = Array.from(selectedTrustees).filter(
      (id) => !grants.find((g) => g.trustee_id === id)
    );

    if (newGrants.length > 0 && !vaultPassphrase) {
      setShowPassphrasePrompt(true);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const existingTrusteeIds = new Set(grants.map((g) => g.trustee_id));
    const toAdd = Array.from(selectedTrustees).filter(
      (id) => !existingTrusteeIds.has(id)
    );
    const toRemove = grants
      .filter((g) => !selectedTrustees.has(g.trustee_id))
      .map((g) => g.id);
    const toUpdate = grants.filter((g) => selectedTrustees.has(g.trustee_id));

    const errors = [];

    // Remove revoked grants
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('asset_trustee_grants')
        .delete()
        .in('id', toRemove);
      if (error) errors.push(error);
    }

    // Add new grants with wrapped keys
    if (toAdd.length > 0) {
      // Get trustee public keys
      const { data: trusteesWithKeys } = await supabase
        .from('trustees')
        .select('id, public_key_jwk')
        .in('id', toAdd);

      if (!trusteesWithKeys || trusteesWithKeys.length === 0) {
        errors.push(new Error('No trustees with public keys found'));
      } else {
        const grantsToInsert = [];

        for (const trustee of trusteesWithKeys) {
          if (!trustee.public_key_jwk) {
            errors.push(
              new Error(
                `Trustee ${trustee.id} has not accepted their invitation yet`
              )
            );
            continue;
          }

          try {
            // Wrap the vault passphrase with trustee's public key
            const wrappedKey = await wrapKeyForTrustee(
              vaultPassphrase,
              trustee.public_key_jwk
            );

            grantsToInsert.push({
              asset_id: assetId,
              trustee_id: trustee.id,
              release_mode: releaseMode,
              quorum_required: quorumRequired,
              wrapped_key: wrappedKey,
            });
          } catch (err) {
            console.error('Key wrapping error:', err);
            errors.push(new Error(`Failed to wrap key for trustee ${trustee.id}`));
          }
        }

        if (grantsToInsert.length > 0) {
          const { error } = await supabase
            .from('asset_trustee_grants')
            .insert(grantsToInsert);
          if (error) errors.push(error);
        }
      }
    }

    // Update existing grants (release mode, quorum)
    if (toUpdate.length > 0) {
      for (const grant of toUpdate) {
        const { error } = await supabase
          .from('asset_trustee_grants')
          .update({
            release_mode: releaseMode,
            quorum_required: quorumRequired,
          })
          .eq('id', grant.id);
        if (error) errors.push(error);
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'owner',
        action: 'asset_grants_modified',
        target_table: 'asset_trustee_grants',
        target_id: assetId,
      });
    }

    setSaving(false);

    if (errors.length === 0) {
      onSaved();
      onClose();
    } else {
      alert('Error saving grants: ' + errors.map((e) => e.message).join(', '));
    }
  }

  function toggleTrustee(trusteeId: string) {
    const newSelected = new Set(selectedTrustees);
    if (newSelected.has(trusteeId)) {
      newSelected.delete(trusteeId);
    } else {
      newSelected.add(trusteeId);
    }
    setSelectedTrustees(newSelected);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Manage Access
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Asset
          </p>
          <p className="font-medium text-slate-900 dark:text-white">
            {assetTitle}
          </p>
        </div>

        {trustees.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You haven't invited any trustees yet. Visit the Trustees page to
              invite someone first.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Select Trustees
              </label>
              <div className="space-y-2">
                {trustees.map((trustee) => (
                  <label
                    key={trustee.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTrustees.has(trustee.id)}
                      onChange={() => toggleTrustee(trustee.id)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {trustee.name || trustee.email}
                      </p>
                      {trustee.name && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {trustee.email}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedTrustees.size > 0 && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Release Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="release_mode"
                        value="on_trigger"
                        checked={releaseMode === 'on_trigger'}
                        onChange={(e) =>
                          setReleaseMode(
                            e.target.value as
                              | 'on_trigger'
                              | 'immediate'
                              | 'requires_quorum'
                          )
                        }
                        className="w-4 h-4 text-teal-600 mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          On Trigger (Recommended)
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Release when the dead man's switch activates after
                          missed check-ins
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="release_mode"
                        value="immediate"
                        checked={releaseMode === 'immediate'}
                        onChange={(e) =>
                          setReleaseMode(
                            e.target.value as
                              | 'on_trigger'
                              | 'immediate'
                              | 'requires_quorum'
                          )
                        }
                        className="w-4 h-4 text-teal-600 mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Immediate
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Trustee has access now (useful for shared resources)
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="release_mode"
                        value="requires_quorum"
                        checked={releaseMode === 'requires_quorum'}
                        onChange={(e) =>
                          setReleaseMode(
                            e.target.value as
                              | 'on_trigger'
                              | 'immediate'
                              | 'requires_quorum'
                          )
                        }
                        className="w-4 h-4 text-teal-600 mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Requires Quorum
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Multiple trustees must agree before access is granted
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {releaseMode === 'requires_quorum' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Number of Trustees Required
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedTrustees.size}
                      value={quorumRequired}
                      onChange={(e) =>
                        setQuorumRequired(parseInt(e.target.value))
                      }
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    />
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {quorumRequired} of {selectedTrustees.size} selected
                      trustees must approve
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || trustees.length === 0}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Passphrase Prompt Modal */}
      {showPassphrasePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Vault Passphrase Required
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              To grant access to trustees, your vault passphrase will be encrypted with
              each trustee&apos;s public key. This allows them to decrypt assets when released.
            </p>
            <div className="mb-4">
              <label
                htmlFor="vaultPassphrase"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Enter your vault passphrase
              </label>
              <input
                id="vaultPassphrase"
                type="password"
                value={vaultPassphrase}
                onChange={(e) => setVaultPassphrase(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="Your vault passphrase"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPassphrasePrompt(false);
                  setVaultPassphrase('');
                }}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPassphrasePrompt(false);
                  handleSave();
                }}
                disabled={!vaultPassphrase}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
