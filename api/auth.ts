import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createSession, readSession, sessionCookie } from './_lib/auth.js';
import { getSql, describeError } from './_lib/db.js';

const scrypt = promisify(scryptCallback);
// Well-formed hash of a random password, used only to equalize timing for unknown usernames.
const DUMMY_HASH = `${'00'.repeat(16)}:${'00'.repeat(64)}`;
const safeUser = (u: any) => ({ id: u.id, username: u.username, email: u.email || '', name: u.name, role: u.role, active: u.active, lastLogin: u.last_login || 'Never' });

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}
async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = (stored || '').split(':');
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64) as Buffer;
  const expected = Buffer.from(keyHex, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Create the deployment-provided administrator when its username is not present.
// Credentials are read server-side from Vercel Environment Variables and are
// never returned to the browser. The password is immediately scrypt-hashed.
let adminEnsured = false; // once per warm instance: avoids an extra DB round trip on every request
async function ensureEnvironmentAdmin(sql: any) {
  if (adminEnsured) return;
  const configuredUsername = process.env.ARMS_ADMIN_USERNAME;
  const configuredPassword = process.env.ARMS_ADMIN_PASSWORD;
  if (!configuredUsername && !configuredPassword) { adminEnsured = true; return; }
  if (!configuredUsername || !configuredPassword) {
    throw new Error('Both ARMS_ADMIN_USERNAME and ARMS_ADMIN_PASSWORD must be configured together.');
  }
  const username = configuredUsername.trim().toLowerCase();
  if (!username || username.length > 80 || configuredPassword.length < 8 || configuredPassword.length > 256) {
    throw new Error('ARMS_ADMIN_USERNAME is invalid or ARMS_ADMIN_PASSWORD must be 8–256 characters.');
  }
  // Cheap existence check first so the scrypt hash is only computed when the admin is actually missing.
  const existing = await sql`SELECT 1 FROM arms_users WHERE username = ${username} LIMIT 1`;
  if (existing.length > 0) { adminEnsured = true; return; }

  const id = `usr_${randomBytes(16).toString('hex')}`;
  const passwordHash = await hashPassword(configuredPassword);
  const name = (process.env.ARMS_ADMIN_NAME || 'System Administrator').trim().slice(0, 120);
  await sql`INSERT INTO arms_users (id, username, email, name, role, active, password_hash)
    VALUES (${id}, ${username}, '', ${name}, 'System Admin', TRUE, ${passwordHash})
    ON CONFLICT (username) DO NOTHING`;
  adminEnsured = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const body = req.method === 'POST' ? (req.body || {}) : {};
    // Logout needs no database; bootstrap problems must never block sign-in either.
    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', sessionCookie('', 0));
      return res.status(200).json({ ok: true });
    }
    const sql = getSql();
    try { await ensureEnvironmentAdmin(sql); } catch (e) { console.error('ARMS admin bootstrap skipped:', e); }
    if (req.method === 'GET') {
      const session = readSession(req);
      if (!session) {
        const count = await sql`SELECT COUNT(*)::int AS count FROM arms_users`;
        return res.status(200).json({ user: null, setupRequired: count[0].count === 0 });
      }
      const rows = await sql`SELECT id, username, email, name, role, active, last_login FROM arms_users WHERE id = ${session.sub} LIMIT 1`;
      if (!rows[0] || !rows[0].active) return res.status(200).json({ user: null, setupRequired: false });
      return res.status(200).json({ user: safeUser(rows[0]), setupRequired: false });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
    if (body.action === 'setup') {
      const setupSecret = process.env.ARMS_SETUP_SECRET;
      if (!setupSecret || body.setupSecret !== setupSecret) return res.status(403).json({ error: 'Invalid initial setup key.' });
      const count = await sql`SELECT COUNT(*)::int AS count FROM arms_users`;
      if (count[0].count !== 0) return res.status(409).json({ error: 'Initial setup has already been completed.' });
      const { username, name, email = '', password } = body;
      if (!username || !name || typeof password !== 'string' || password.length < 12) return res.status(400).json({ error: 'Enter username, full name and a password of at least 12 characters.' });
      const id = `usr_${randomBytes(16).toString('hex')}`;
      const passwordHash = await hashPassword(password);
      const inserted = await sql`INSERT INTO arms_users (id, username, email, name, role, active, password_hash, last_login) VALUES (${id}, ${String(username).trim().toLowerCase()}, ${String(email).trim()}, ${String(name).trim()}, 'System Admin', TRUE, ${passwordHash}, NOW()) RETURNING id, username, email, name, role, active, last_login`;
      const session = createSession({ id, username: inserted[0].username });
      res.setHeader('Set-Cookie', sessionCookie(session.value, session.maxAge));
      return res.status(201).json({ user: safeUser(inserted[0]) });
    }
    if (body.action === 'change-password') {
      const session = readSession(req);
      if (!session) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً.' });
      const { currentPassword, newPassword } = body;
      if (typeof newPassword !== 'string' || newPassword.length < 12) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 12 حرفاً.' });
      const rows = await sql`SELECT password_hash FROM arms_users WHERE id = ${session.sub} AND active = TRUE LIMIT 1`;
      if (!rows[0] || !(await verifyPassword(String(currentPassword || ''), rows[0].password_hash))) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      const passwordHash = await hashPassword(newPassword);
      await sql`UPDATE arms_users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${session.sub}`;
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'login') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!username || username.length > 80 || String(body.password || '').length > 256) return res.status(400).json({ error: 'بيانات الدخول غير صالحة.' });
      const password = String(body.password || '');
      const [attempts, rows] = await Promise.all([
        sql`SELECT locked_until FROM arms_login_attempts WHERE username = ${username} LIMIT 1`,
        sql`SELECT id, username, email, name, role, active, password_hash FROM arms_users WHERE username = ${username} LIMIT 1`,
      ]);
      if (attempts[0]?.locked_until && new Date(attempts[0].locked_until).getTime() > Date.now()) return res.status(429).json({ error: 'تم إيقاف محاولات الدخول مؤقتاً. حاول بعد 15 دقيقة.' });
      const user = rows[0];
      // Always run scrypt (against a dummy hash when the user is missing) so response time does not reveal valid usernames.
      const valid = await verifyPassword(password, user?.password_hash || DUMMY_HASH);
      if (!user || !user.active || !valid) {
        await sql`INSERT INTO arms_login_attempts (username, attempts, locked_until, updated_at) VALUES (${username}, 1, NULL, NOW()) ON CONFLICT (username) DO UPDATE SET attempts = CASE WHEN arms_login_attempts.locked_until IS NOT NULL AND arms_login_attempts.locked_until <= NOW() THEN 1 ELSE arms_login_attempts.attempts + 1 END, locked_until = CASE WHEN (CASE WHEN arms_login_attempts.locked_until IS NOT NULL AND arms_login_attempts.locked_until <= NOW() THEN 1 ELSE arms_login_attempts.attempts + 1 END) >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END, updated_at = NOW()`;
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
      }
      const [, updated] = await Promise.all([
        attempts.length ? sql`DELETE FROM arms_login_attempts WHERE username = ${username}` : Promise.resolve(),
        sql`UPDATE arms_users SET last_login = NOW() WHERE id = ${user.id} RETURNING id, username, email, name, role, active, last_login`,
      ]);
      const session = createSession({ id: user.id, username: user.username });
      res.setHeader('Set-Cookie', sessionCookie(session.value, session.maxAge));
      return res.status(200).json({ user: safeUser(updated[0]) });
    }
    return res.status(400).json({ error: 'Unknown authentication action.' });
  } catch (error) {
    console.error('ARMS auth error:', error);
    const info = describeError(error);
    return res.status(info.status).json({ error: info.error, code: info.code, detail: info.detail });
  }
}
