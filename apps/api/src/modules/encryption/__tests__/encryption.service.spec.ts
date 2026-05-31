import { EncryptionService } from '../encryption.service';

// Set env vars before instantiating
process.env.RUT_HMAC_SECRET = 'test-hmac-secret-key-for-jest-do-not-use-in-prod-xx';
process.env.ENCRYPTION_KEY = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('normalizeRut', () => {
    it('strips dots, dash and spaces', () => {
      expect(service.normalizeRut('12.345.678-9')).toBe('123456789');
    });

    it('handles RUT with no formatting', () => {
      expect(service.normalizeRut('123456789')).toBe('123456789');
    });

    it('uppercases the verification digit K', () => {
      expect(service.normalizeRut('9.999.999-k')).toBe('9999999K');
    });
  });

  describe('hashRut', () => {
    it('produces consistent output for same input', () => {
      const h1 = service.hashRut('12.345.678-9');
      const h2 = service.hashRut('12.345.678-9');
      expect(h1).toBe(h2);
    });

    it('normalizes before hashing', () => {
      expect(service.hashRut('12.345.678-9')).toBe(service.hashRut('123456789'));
    });

    it('produces different hashes for different RUTs', () => {
      expect(service.hashRut('12.345.678-9')).not.toBe(service.hashRut('9.876.543-2'));
    });

    it('returns a 64-char hex string', () => {
      expect(service.hashRut('12.345.678-9')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('encryptRut / decryptRut', () => {
    it('roundtrip returns original normalized RUT', () => {
      const rut = '12.345.678-9';
      const cipher = service.encryptRut(rut);
      expect(service.decryptRut(cipher)).toBe('123456789');
    });

    it('produces different ciphertext each call (random IV)', () => {
      const c1 = service.encryptRut('12.345.678-9');
      const c2 = service.encryptRut('12.345.678-9');
      expect(c1).not.toBe(c2);
    });
  });
});
