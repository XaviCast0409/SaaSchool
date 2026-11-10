import { randomInt } from 'crypto';

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para facilitar el dictado y la impresión.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Genera una contraseña temporal aleatoria criptográficamente segura. */
export const generateTemporaryPassword = (length = 10): string => {
  let password = '';
  while (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    password = Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  }
  return password;
};

/** Regla de contraseña: mínimo 8 caracteres, al menos una letra y un número. */
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir letras y números.';
