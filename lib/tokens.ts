import { customAlphabet } from 'nanoid';

const TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const TOKEN_LENGTH = 8;

const generate = customAlphabet(TOKEN_ALPHABET, TOKEN_LENGTH);

export function generateInvitationToken(): string {
  return generate();
}

export function isValidTokenShape(token: string): boolean {
  if (token.length !== TOKEN_LENGTH) return false;
  for (const c of token) {
    if (!TOKEN_ALPHABET.includes(c)) return false;
  }
  return true;
}

export const TOKEN_SHAPE = {
  alphabet: TOKEN_ALPHABET,
  length: TOKEN_LENGTH,
} as const;
