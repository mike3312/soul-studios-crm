import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const dbUrl = new URL(process.env.DATABASE_URL);
if (dbUrl.hostname !== '127.0.0.1' || dbUrl.pathname !== '/soul_crm_local') throw new Error('Esta prueba modifica solo la base local dedicada.');
const base = 'http://localhost:3000';
const prisma = new PrismaClient();
const username = process.env.CRM_ADMIN_USER;
const originalPassword = process.env.CRM_ADMIN_PASSWORD;
const temporaryPassword = randomBytes(24).toString('hex');
const results = [];
let changed = false;
let changedCookie = '';
async function request(path, method = 'GET', body, cookie = '', origin = base) {
  return fetch(base + path, {
    method, redirect: 'manual',
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function login(password = originalPassword) {
  return request('/api/auth/login', 'POST', { username, password });
}
function cookieOf(response) {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie?.includes('HttpOnly'));
  assert.ok(cookie?.includes('SameSite=lax'));
  return cookie.split(';')[0];
}
async function countData() {
  return Promise.all([prisma.user.count(), prisma.service.count(), prisma.lead.count(), prisma.conversation.count(), prisma.message.count(), prisma.aISettings.count()]);
}
try {
  const before = await countData();
  await prisma.authRateLimit.deleteMany({ where: { id: { in: ['login', 'password'] } } });
  const publicLogin = await request('/login');
  assert.equal(publicLogin.status, 200);
  assert.equal(publicLogin.headers.has('www-authenticate'), false);
  assert.equal((await request('/dashboard')).status, 307);
  assert.equal((await request('/api/leads')).status, 401);
  assert.equal((await request('/api/leads', 'GET', undefined, 'soul-session=forged')).status, 401);
  results.push('Login page, page redirect, protected API and forged cookie');
  assert.equal((await request('/api/auth/login', 'POST', { username, password: originalPassword }, '', 'https://evil.example')).status, 403);
  assert.equal((await login('incorrect-password')).status, 401);
  const signedIn = await login();
  assert.equal(signedIn.status, 200);
  const firstCookie = cookieOf(signedIn);
  for (const path of ['/dashboard', '/conversations', '/services', '/leads', '/settings/ai', '/settings/security', '/api/leads']) assert.equal((await request(path, 'GET', undefined, firstCookie)).status, 200, path);
  results.push('Valid login and all administrative pages');
  assert.equal((await request('/api/auth/logout', 'POST', undefined, firstCookie, 'https://evil.example')).status, 403);
  assert.equal((await request('/api/auth/logout', 'POST', undefined, firstCookie)).status, 200);
  assert.equal((await request('/api/leads', 'GET', undefined, firstCookie)).status, 401);
  results.push('CSRF rejection and logout revocation');
  const secondCookie = cookieOf(await login());
  const otherCookie = cookieOf(await login());
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'incorrect', newPassword: temporaryPassword, confirmPassword: temporaryPassword }, secondCookie)).status, 400);
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: originalPassword, newPassword: temporaryPassword, confirmPassword: 'different' }, secondCookie)).status, 400);
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: originalPassword, newPassword: temporaryPassword, confirmPassword: temporaryPassword }, secondCookie)).status, 200);
  changed = true;
  assert.equal((await request('/api/leads', 'GET', undefined, otherCookie)).status, 401);
  assert.equal((await request('/api/leads', 'GET', undefined, secondCookie)).status, 401);
  assert.equal((await login(originalPassword)).status, 401);
  const nextLogin = await login(temporaryPassword);
  assert.equal(nextLogin.status, 200);
  changedCookie = cookieOf(nextLogin);
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: temporaryPassword, newPassword: originalPassword, confirmPassword: originalPassword }, changedCookie)).status, 200);
  changed = false;
  results.push('Password change, old password rejected, all sessions revoked, original local password restored');
  const current = await prisma.adminCredential.findUniqueOrThrow({ where: { id: 1 } });
  const expiredToken = randomBytes(32).toString('hex');
  const expiredHash = createHash('sha256').update(expiredToken).digest('hex');
  await prisma.adminSession.create({ data: { tokenHash: expiredHash, adminId: 1, version: current.version, expiresAt: new Date(Date.now() - 60000) } });
  assert.equal((await request('/api/leads', 'GET', undefined, 'soul-session=' + expiredToken)).status, 401);
  await prisma.adminSession.deleteMany({ where: { tokenHash: expiredHash } });
  const webhook = await request('/api/webhooks/whatsapp');
  assert.notEqual(webhook.status, 307);
  assert.equal(webhook.headers.has('www-authenticate'), false);
  results.push('Expired session rejected and webhook remains outside administrative login');
  let limited = false;
  for (let i = 0; i < 21; i++) {
    const response = await login('invalid-test-value');
    if (response.status === 429) { limited = true; break; }
    assert.equal(response.status, 401);
  }
  assert.equal(limited, true);
  assert.deepEqual(await countData(), before);
  results.push('Persistent login rate limit and unchanged commercial data');
  console.log(JSON.stringify({ passed: results, counts: before }, null, 2));
} finally {
  if (changed) {
    if (!changedCookie) changedCookie = cookieOf(await login(temporaryPassword));
    const restored = await request('/api/auth/password', 'POST', { currentPassword: temporaryPassword, newPassword: originalPassword, confirmPassword: originalPassword }, changedCookie);
    if (restored.status !== 200) throw new Error('Debe restaurarse la contraseña local de prueba.');
  }
  await prisma.authRateLimit.deleteMany({ where: { id: { in: ['login', 'password'] } } });
  await prisma.$disconnect();
}
