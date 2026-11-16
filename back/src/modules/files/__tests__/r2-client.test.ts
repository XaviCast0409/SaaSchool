import { describe, it, expect } from 'vitest';
import { isValidR2AccountId, normalizeR2AccountId, readR2Config } from '../r2-client';

const ID = '0123456789abcdef0123456789abcdef';

describe('normalizeR2AccountId', () => {
  it('deja el ID tal cual', () => {
    expect(normalizeR2AccountId(ID)).toBe(ID);
  });

  it('quita la URL completa del endpoint o el sufijo del host', () => {
    expect(normalizeR2AccountId(`https://${ID}.r2.cloudflarestorage.com`)).toBe(ID);
    expect(normalizeR2AccountId(`${ID}.r2.cloudflarestorage.com`)).toBe(ID);
    expect(normalizeR2AccountId(`https://${ID}.eu.r2.cloudflarestorage.com/`)).toBe(ID);
    expect(normalizeR2AccountId(`  ${ID.toUpperCase()}\n`)).toBe(ID);
  });

  it('valida el formato de 32 hexadecimales', () => {
    expect(isValidR2AccountId(ID)).toBe(true);
    expect(isValidR2AccountId(`${ID}.r2`)).toBe(false);
    expect(isValidR2AccountId('abc')).toBe(false);
  });

  it('readR2Config usa el ID normalizado', () => {
    const config = readR2Config({
      R2_ACCOUNT_ID: `https://${ID}.r2.cloudflarestorage.com`,
      R2_ACCESS_KEY_ID: 'k',
      R2_SECRET_ACCESS_KEY: 's',
      R2_BUCKET: 'b',
    });
    expect(config?.accountId).toBe(ID);
  });
});
