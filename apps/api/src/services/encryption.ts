import crypto from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt clinical note text using AES-256-GCM.
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encryptNote(plaintext: string): string {
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // iv (16) + authTag (16) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt clinical note text.
 * Input: base64(iv + authTag + ciphertext)
 */
export function decryptNote(encryptedBase64: string): string {
    const key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
    const combined = Buffer.from(encryptedBase64, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

/**
 * Hash sensitive data (DOB, ID card, passport) using SHA-256 with salt.
 * Used for identity verification — never store plain text.
 */
export function hashSensitiveData(data: string, salt: string = 'nbu-mh-v1'): string {
    return crypto
        .createHash('sha256')
        .update(salt + ':' + data)
        .digest('hex');
}
