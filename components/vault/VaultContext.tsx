'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { decrypt, encrypt } from '@/lib/crypto';

interface VaultContextType {
  isUnlocked: boolean;
  passphrase: string | null;
  unlock: (passphrase: string, salt: string) => Promise<boolean>;
  lock: () => void;
  encryptAsset: (plaintext: string) => Promise<{ ciphertext: string; iv: string; salt: string }>;
  decryptAsset: (ciphertext: string, iv: string, salt: string) => Promise<string>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [vaultSalt, setVaultSalt] = useState<string | null>(null);
  const [lockTimer, setLockTimer] = useState<NodeJS.Timeout | null>(null);

  const lock = useCallback(() => {
    setPassphrase(null);
    setVaultSalt(null);
    setIsUnlocked(false);
    if (lockTimer) {
      clearTimeout(lockTimer);
      setLockTimer(null);
    }
  }, [lockTimer]);

  const resetLockTimer = useCallback(() => {
    if (lockTimer) {
      clearTimeout(lockTimer);
    }

    // Auto-lock after 15 minutes of inactivity
    const timer = setTimeout(() => {
      lock();
    }, 15 * 60 * 1000);

    setLockTimer(timer);
  }, [lockTimer, lock]);

  const unlock = useCallback(
    async (pass: string, salt: string): Promise<boolean> => {
      // Accept any non-empty passphrase.
      // Real validation occurs when assets are decrypted — if the passphrase is
      // wrong, the decrypt() call inside AssetList will throw and display an error.
      if (!pass) return false;

      setPassphrase(pass);
      setVaultSalt(salt);
      setIsUnlocked(true);
      resetLockTimer();
      return true;
    },
    [resetLockTimer]
  );

  const encryptAsset = async (plaintext: string) => {
    if (!passphrase || !vaultSalt) {
      throw new Error('Vault is locked');
    }

    resetLockTimer();
    // Pass vaultSalt so every asset uses the same deterministic salt for key
    // derivation — matching the salt used in decryptAsset.
    return await encrypt(plaintext, passphrase, vaultSalt);
  };

  const decryptAsset = async (ciphertext: string, iv: string, salt: string) => {
    if (!passphrase) {
      throw new Error('Vault is locked');
    }

    resetLockTimer();
    return await decrypt(ciphertext, iv, salt, passphrase);
  };

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        passphrase,
        unlock,
        lock,
        encryptAsset,
        decryptAsset,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
