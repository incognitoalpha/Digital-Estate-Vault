/**
 * Asymmetric cryptography utilities for trustee key management
 * Uses Web Crypto API with RSA-OAEP for key wrapping
 */

/**
 * Generate an RSA keypair for a trustee
 * Public key will be stored in database
 * Private key must be securely stored by trustee (localStorage with warnings)
 */
export async function generateTrusteeKeypair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keypair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Export keys to JWK format for storage
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);

  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

/**
 * Wrap (encrypt) a symmetric key with a trustee's RSA public key
 * This allows the trustee to decrypt the asset's encryption key
 */
export async function wrapKeyForTrustee(
  symmetricKey: string,
  publicKeyJwk: string
): Promise<string> {
  try {
    // Import trustee's public key
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(publicKeyJwk),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );

    // Convert symmetric key to bytes
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(symmetricKey);

    // Encrypt the symmetric key with the public key
    const wrappedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      keyBytes
    );

    // Return as base64
    return bufferToBase64(wrappedKey);
  } catch (error) {
    console.error('Key wrapping failed:', error);
    throw new Error('Failed to wrap key for trustee');
  }
}

/**
 * Unwrap (decrypt) a symmetric key with trustee's RSA private key
 * Allows trustee to decrypt assets after release
 */
export async function unwrapKeyForTrustee(
  wrappedKey: string,
  privateKeyJwk: string
): Promise<string> {
  try {
    // Import trustee's private key
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(privateKeyJwk),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['decrypt']
    );

    // Convert wrapped key from base64
    const wrappedKeyBytes = base64ToBuffer(wrappedKey);

    // Decrypt the symmetric key
    const unwrappedKeyBytes = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      wrappedKeyBytes as BufferSource
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(unwrappedKeyBytes);
  } catch (error) {
    console.error('Key unwrapping failed:', error);
    throw new Error('Failed to unwrap key. Invalid private key or corrupted data.');
  }
}

/**
 * Store trustee private key in browser localStorage
 * Returns true if successful
 */
export function storeTrusteePrivateKey(trusteeId: string, privateKey: string): boolean {
  try {
    const storageKey = `trustee_private_key_${trusteeId}`;
    localStorage.setItem(storageKey, privateKey);
    return true;
  } catch (error) {
    console.error('Failed to store private key:', error);
    return false;
  }
}

/**
 * Retrieve trustee private key from browser localStorage
 */
export function retrieveTrusteePrivateKey(trusteeId: string): string | null {
  try {
    const storageKey = `trustee_private_key_${trusteeId}`;
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.error('Failed to retrieve private key:', error);
    return null;
  }
}

/**
 * Delete trustee private key from browser localStorage
 */
export function deleteTrusteePrivateKey(trusteeId: string): void {
  try {
    const storageKey = `trustee_private_key_${trusteeId}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to delete private key:', error);
  }
}

/**
 * Check if trustee has a private key stored
 */
export function hasTrusteePrivateKey(trusteeId: string): boolean {
  return retrieveTrusteePrivateKey(trusteeId) !== null;
}

// Helper functions

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
