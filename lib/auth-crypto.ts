import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return ['scrypt-v1', salt, key.toString('hex')].join(':');
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash, extra] = encoded.split(':');
  if (
    algorithm !== 'scrypt-v1' ||
    extra ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(hash ?? '')
  )
    return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

export function digestToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function equalText(actual: string, expected: string) {
  return timingSafeEqual(
    Buffer.from(digestToken(actual), 'hex'),
    Buffer.from(digestToken(expected), 'hex'),
  );
}

export function newSessionToken() {
  return randomBytes(32).toString('hex');
}

export function validPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 12 &&
    value.length <= 128 &&
    value.trim().length >= 12
  );
}
