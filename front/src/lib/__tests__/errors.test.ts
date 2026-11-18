import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, getApiErrorCode, getApiErrorMessageFromBlob } from '../errors';

describe('getApiErrorMessage', () => {
  it('extracts message from axios error response', () => {
    const error = { response: { data: { message: 'DNI duplicado' } } };
    expect(getApiErrorMessage(error)).toBe('DNI duplicado');
  });

  it('falls back to default message when error is standard Error', () => {
    expect(getApiErrorMessage(new Error('Network error'))).toBe('No se pudo completar la acción.');
  });

  it('falls back to default message when error is null or string', () => {
    expect(getApiErrorMessage(null)).toBe('No se pudo completar la acción.');
    expect(getApiErrorMessage('texto')).toBe('No se pudo completar la acción.');
  });

  it('respects custom fallback when message is not present', () => {
    expect(getApiErrorMessage({}, 'Error personalizado')).toBe('Error personalizado');
  });
});

describe('getApiErrorCode', () => {
  it('extracts code from axios error response', () => {
    const error = { response: { data: { code: 'SELECT_SCHOOL' } } };
    expect(getApiErrorCode(error)).toBe('SELECT_SCHOOL');
  });

  it('returns undefined when code is not present', () => {
    expect(getApiErrorCode(new Error('fail'))).toBeUndefined();
    expect(getApiErrorCode(null)).toBeUndefined();
  });
});

describe('getApiErrorMessageFromBlob', () => {
  it('extracts message from json inside a Blob', async () => {
    const blob = new Blob([JSON.stringify({ message: 'Archivo inválido' })], { type: 'application/json' });
    const error = { response: { data: blob } };
    await expect(getApiErrorMessageFromBlob(error, 'Fallback')).resolves.toBe('Archivo inválido');
  });

  it('returns fallback when blob content is not valid json', async () => {
    const blob = new Blob(['no-json-plain-text'], { type: 'text/plain' });
    const error = { response: { data: blob } };
    await expect(getApiErrorMessageFromBlob(error, 'Fallback')).resolves.toBe('Fallback');
  });

  it('delegates to getApiErrorMessage when response.data is not a Blob', async () => {
    const error = { response: { data: { message: 'Error regular' } } };
    await expect(getApiErrorMessageFromBlob(error, 'Fallback')).resolves.toBe('Error regular');
  });
});
