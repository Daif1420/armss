import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, describeError } from './_lib/db.js';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { readSession } from './_lib/auth.js';
const scrypt = promisify(scryptCallback);
async function hashPassword(password: string) { const salt = randomBytes(16); const key = await scrypt(password, salt, 64) as Buffer; return `${salt.toString('hex')}:${key.toString('hex')}`; }
const mapUser = (u: any) => ({ id: u.id, username: u.username, email: u.email || '', name: u.name, role: u.role, active: u.active, lastLogin: u.last_login || 'Never' });
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const sql = getSql();
    const current = await sql`SELECT role, active FROM arms_users WHERE id = ${session.sub} LIMIT 1`;
    if (!current[0]?.active || current[0].role !== 'System Admin') return res.status(403).json({ error: 'System Admin permission required.' });
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, username, email, name, role, active, last_login FROM arms_users ORDER BY created_at ASC`;
      return res.status(200).json({ users: rows.map(mapUser) });
    }
    if (req.method === 'POST') {
      const { username, name, email = '', role, password } = req.body || {};
      if (!username || !name || !['System Admin', 'Archive Manager', 'Data Entry', 'Viewer'].includes(role) || typeof password !== 'string' || password.length < 12) return res.status(400).json({ error: 'Required: username, name, valid role and password of at least 12 characters.' });
      const id = `usr_${randomBytes(16).toString('hex')}`;
      const passwordHash = await hashPassword(password);
      const rows = await sql`INSERT INTO arms_users (id, username, email, name, role, active, password_hash) VALUES (${id}, ${String(username).trim().toLowerCase()}, ${String(email).trim()}, ${String(name).trim()}, ${role}, TRUE, ${passwordHash}) RETURNING id, username, email, name, role, active, last_login`;
      return res.status(201).json({ user: mapUser(rows[0]) });
    }
    if (req.method === 'PATCH') {
      const { id, role, active } = req.body || {};
      if (!id || (role !== undefined && !['System Admin', 'Archive Manager', 'Data Entry', 'Viewer'].includes(role)) || (active !== undefined && typeof active !== 'boolean')) return res.status(400).json({ error: 'Invalid user update.' });
      if (id === session.sub && active === false) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
      if (id === session.sub && role && role !== 'System Admin') return res.status(400).json({ error: 'You cannot lower your own administrator role.' });
      const rows = await sql`UPDATE arms_users SET role = COALESCE(${role ?? null}, role), active = COALESCE(${active ?? null}, active), updated_at = NOW() WHERE id = ${id} RETURNING id, username, email, name, role, active, last_login`;
      if (!rows.length) return res.status(404).json({ error: 'User not found.' });
      return res.status(200).json({ user: mapUser(rows[0]) });
    }
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل.' });
    console.error('ARMS users API error:', error);
    const info = describeError(error, 'User management operation failed.');
    return res.status(info.status).json({ error: info.error, code: info.code, detail: info.detail });
  }
}
