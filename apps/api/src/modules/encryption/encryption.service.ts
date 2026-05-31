import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly hmacSecret: string;
  private readonly encryptionKey: Buffer;

  constructor() {
    const hmacSecret = process.env.RUT_HMAC_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!hmacSecret) throw new Error('RUT_HMAC_SECRET is required');
    if (!encryptionKey || encryptionKey.length !== 64)
      throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    this.hmacSecret = hmacSecret;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  normalizeRut(rut: string): string {
    return rut.replace(/[.\-\s]/g, '').toUpperCase();
  }

  hashRut(rut: string): string {
    const normalized = this.normalizeRut(rut);
    return crypto.createHmac('sha256', this.hmacSecret).update(normalized).digest('hex');
  }

  encryptRut(rut: string): string {
    const normalized = this.normalizeRut(rut);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
  }

  decryptRut(cipherText: string): string {
    const [ivHex, encryptedHex, authTagHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  }
}
