import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const KEYS_PATH = path.join(__dirname, '../../.keys.json');

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

let keyPair: KeyPair | null = null;

export const getOrGenerateKeys = (): KeyPair => {
  if (keyPair) return keyPair;

  // Try to load from environment first
  if (process.env.RSA_PRIVATE_KEY && process.env.RSA_PUBLIC_KEY) {
    keyPair = {
      privateKey: process.env.RSA_PRIVATE_KEY,
      publicKey: process.env.RSA_PUBLIC_KEY
    };
    return keyPair;
  }

  // Try to load from local file
  if (fs.existsSync(KEYS_PATH)) {
    try {
      const data = fs.readFileSync(KEYS_PATH, 'utf-8');
      keyPair = JSON.parse(data);
      if (keyPair?.privateKey && keyPair?.publicKey) {
        return keyPair;
      }
    } catch (err) {
      console.warn('[KEYS] Failed to read .keys.json, generating new pair.');
    }
  }

  // Generate new RSA keys (2048-bit)
  console.log('[KEYS] Generating new RSA 2048-bit key pair for digital signatures...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  keyPair = { publicKey, privateKey };
  
  // Persist to disk so restarts don't invalidate existing signatures
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keyPair, null, 2));
  console.log(`[KEYS] Key pair saved to ${KEYS_PATH}`);

  return keyPair;
};

// Auto-initialize
getOrGenerateKeys();
