import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  digestToken,
  equalText,
  validPassword,
} from '../lib/auth-crypto';

void test('password hashes use unique salts and reject incorrect passwords', async () => {
  const password = 'A test passphrase for Soul 2026!';
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('incorrect-password', hash), false);
  assert.equal(await verifyPassword(password, 'scrypt-v1:bad:bad'), false);
  assert.equal(hash.includes(password), false);
});

void test('session tokens contain 256 bits of random data and are stored as digests', () => {
  const token = newSessionToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, newSessionToken());
  assert.notEqual(token, digestToken(token));
  assert.equal(equalText('souladmin', 'souladmin'), true);
  assert.equal(equalText('souladmin', 'SoulCRM'), false);
});

void test('password policy accepts long phrases without truncation', () => {
  assert.equal(validPassword('una frase larga segura'), true);
  assert.equal(validPassword('short'), false);
  assert.equal(validPassword(' '.repeat(20)), false);
  assert.equal(validPassword('x'.repeat(129)), false);
  assert.equal(validPassword(null), false);
});
