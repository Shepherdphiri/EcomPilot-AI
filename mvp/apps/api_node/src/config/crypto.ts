import crypto from 'node:crypto';
import { MarketplaceCredentials } from '@ecompilot/connectors';
import { env } from './env.js';

function getKeyBuffer(): Buffer {
  const hex = env.credentialsEncryptionKey.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptCredentials(creds: MarketplaceCredentials): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(creds);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(payload: string): MarketplaceCredentials {
  const key = getKeyBuffer();
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted credentials envelope.');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as MarketplaceCredentials;
}
