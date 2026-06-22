import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';

describe('Encryption Utilities', () => {
  describe('encrypt', () => {
    it('should encrypt plaintext data', async () => {
      const plaintext = 'sensitive information';
      const passphrase = 'test-passphrase';

      const result = await encrypt(plaintext, passphrase);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
      expect(result.ciphertext).not.toBe(plaintext);
      expect(result.ciphertext.length).toBeGreaterThan(0);
      expect(result.iv.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('should generate unique IV and salt for each encryption', async () => {
      const plaintext = 'same data';
      const passphrase = 'test-passphrase';

      const result1 = await encrypt(plaintext, passphrase);
      const result2 = await encrypt(plaintext, passphrase);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });

    it('should handle empty strings', async () => {
      const result = await encrypt('', 'passphrase');

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
    });

    it('should handle special characters and unicode', async () => {
      const plaintext = '🔐 Special chars: @#$%^&*() 中文 العربية';
      const passphrase = 'test-passphrase';

      const result = await encrypt(plaintext, passphrase);

      expect(result.ciphertext).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.salt).toBeDefined();
    });

    it('should produce different ciphertext for different passphrases', async () => {
      const plaintext = 'same data';

      const result1 = await encrypt(plaintext, 'passphrase1');
      const result2 = await encrypt(plaintext, 'passphrase2');

      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data back to plaintext', async () => {
      const plaintext = 'sensitive information';
      const passphrase = 'test-passphrase';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.salt,
        passphrase
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should preserve unicode and special characters', async () => {
      const plaintext = '🔐 Test: @#$%^&*() 中文 العربية\nNewline\tTab';
      const passphrase = 'test-passphrase';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.salt,
        passphrase
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong passphrase', async () => {
      const plaintext = 'sensitive information';
      const encrypted = await encrypt(plaintext, 'correct-passphrase');

      await expect(
        decrypt(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.salt,
          'wrong-passphrase'
        )
      ).rejects.toThrow('Decryption failed');
    });

    it('should fail with tampered ciphertext', async () => {
      const plaintext = 'sensitive information';
      const passphrase = 'test-passphrase';
      const encrypted = await encrypt(plaintext, passphrase);
      const tamperedCiphertext = encrypted.ciphertext + 'AAAA';

      await expect(
        decrypt(tamperedCiphertext, encrypted.iv, encrypted.salt, passphrase)
      ).rejects.toThrow();
    });

    it('should fail with wrong IV', async () => {
      const plaintext = 'sensitive information';
      const passphrase = 'test-passphrase';

      const encrypted1 = await encrypt(plaintext, passphrase);
      const encrypted2 = await encrypt('other data', passphrase);

      await expect(
        decrypt(
          encrypted1.ciphertext,
          encrypted2.iv,
          encrypted1.salt,
          passphrase
        )
      ).rejects.toThrow();
    });

    it('should fail with wrong salt', async () => {
      const plaintext = 'sensitive information';
      const passphrase = 'test-passphrase';

      const encrypted1 = await encrypt(plaintext, passphrase);
      const encrypted2 = await encrypt('other data', passphrase);

      await expect(
        decrypt(
          encrypted1.ciphertext,
          encrypted1.iv,
          encrypted2.salt,
          passphrase
        )
      ).rejects.toThrow();
    });
  });

  describe('End-to-end encryption flow', () => {
    it('should handle complete encrypt-decrypt cycle', async () => {
      const passphrase = 'my-secure-passphrase';
      const plaintext = `
        Username: admin@example.com
        Password: SuperSecret123!
        Recovery codes:
        - ABCD-1234-EFGH-5678
        - IJKL-9012-MNOP-3456
      `.trim();

      const { ciphertext, iv, salt } = await encrypt(plaintext, passphrase);

      expect(ciphertext).not.toContain('admin@example.com');
      expect(ciphertext).not.toContain('SuperSecret123!');

      const decrypted = await decrypt(ciphertext, iv, salt, passphrase);

      expect(decrypted).toBe(plaintext);
      expect(decrypted).toContain('admin@example.com');
      expect(decrypted).toContain('SuperSecret123!');
    });

    it('should handle multiple assets with same passphrase', async () => {
      const passphrase = 'vault-passphrase';
      const asset1 = 'Gmail: user@gmail.com / pass123';
      const asset2 = 'Bank: account456 / secret789';
      const asset3 = 'Crypto: seed phrase here';

      const enc1 = await encrypt(asset1, passphrase);
      const enc2 = await encrypt(asset2, passphrase);
      const enc3 = await encrypt(asset3, passphrase);

      const dec1 = await decrypt(enc1.ciphertext, enc1.iv, enc1.salt, passphrase);
      const dec2 = await decrypt(enc2.ciphertext, enc2.iv, enc2.salt, passphrase);
      const dec3 = await decrypt(enc3.ciphertext, enc3.iv, enc3.salt, passphrase);

      expect(dec1).toBe(asset1);
      expect(dec2).toBe(asset2);
      expect(dec3).toBe(asset3);
    });
  });
});
