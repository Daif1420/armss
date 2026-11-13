import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, describeError } from './_lib/db.js';
import { readSession } from './_lib/auth.js';

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const QUERY_TIMEOUT_MS = 20000; // stay below the function limit so the client gets a JSON error, not a platform 504
const DEFAULT_PAGE = 1500;
const MAX_PAGE = 3000;

type SqlClient = ReturnType<typeof getSql>;
type DbUser = { id: string; username: string; email: string | null; name: string; role: string; active: boolean; last_login: string | null };

const publicUser = (u: DbUser) => ({ id: u.id, username: u.username, email: u.email || '', name: u.name, role: u.role, active: u.active, lastLogin: u.last_login || 'Never' });

function withTimeout<T>(work: PromiseLike<T>, ms = QUERY_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('Database query timed out.'), { code: 'QUERY_TIMEOUT' })), ms);
    Promise.resolve(work).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

const toInt = (value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, max) : fallback;
};

// Sends JSON that was already serialized by PostgreSQL (no parse/stringify round trip in Node).
function sendRawJson(res: VercelResponse, rawJson: string) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(rawJson);
}

// Archive data is loaded in small independent requests (see src/utils/archiveApi.ts) so that no single
// invocation has to run for long or return more than Vercel's 4.5 MB response limit:
//   ?part=core                        -> boxes, dossiers, history, notifications, users, counts, revision
//   ?part=projects&offset=0&limit=N   -> one page of projects
//   ?part=audit&offset=0&limit=N      -> one page of audit logs
async function readState(req: VercelRequest, res: VercelResponse, sql: SqlClient, user: DbUser) {
  const part = String(Array.isArray(req.query.part) ? req.query.part[0] : req.query.part || 'core');
  const [{ revision }] = await withTimeout(sql`SELECT COALESCE((SELECT revision FROM arms_app_state WHERE id = 1), 0)::text AS revision`);

  if (part === 'projects' || part === 'audit') {
    const limit = Math.max(1, toInt(req.query.limit, DEFAULT_PAGE, MAX_PAGE));
    const offset = toInt(req.query.offset, 0);
    const rows = part === 'projects'
      ? await withTimeout(sql`SELECT COALESCE(jsonb_agg(t.data ORDER BY t.job_id), '[]'::jsonb)::text AS items FROM (SELECT job_id, data FROM arms_projects ORDER BY job_id OFFSET ${offset} LIMIT ${limit}) t`)
      : await withTimeout(sql`SELECT COALESCE(jsonb_agg(t.data ORDER BY t.created_at DESC, t.id), '[]'::jsonb)::text AS items FROM (SELECT id, created_at, data FROM arms_audit_logs ORDER BY created_at DESC, id OFFSET ${offset} LIMIT ${limit}) t`);
    return sendRawJson(res, `{"_revision":${Number(revision)},"items":${rows[0].items}}`);
  }
  if (part !== 'core') return res.status(400).json({ error: 'Unknown state part.' });

  const agg = (table: string, order: string) => sql.unsafe(`SELECT COALESCE(jsonb_agg(data ORDER BY ${order}), '[]'::jsonb)::text AS items FROM ${table}`);
  const [boxes, dossiers, uploadHistory, notifications, counts, userList] = await withTimeout(Promise.all([
    agg('arms_boxes', 'first_job_id ASC'),
    agg('arms_dossiers', 'box_code ASC, dossier_number ASC'),
    agg('arms_upload_history', 'created_at DESC, id'),
    agg('arms_notifications', 'created_at DESC, id'),
    sql`SELECT (SELECT COUNT(*) FROM arms_projects)::int AS projects, (SELECT COUNT(*) FROM arms_audit_logs)::int AS audit`,
    user.role === 'System Admin'
      ? sql<DbUser[]>`SELECT id, username, email, name, role, active, last_login FROM arms_users ORDER BY created_at ASC`
      : Promise.resolve([] as DbUser[]),
  ]));
  const body = {
    users: userList.map(publicUser),
    currentUser: publicUser(user),
    counts: { projects: counts[0].projects, auditLogs: counts[0].audit },
  };
  // Splice the pre-serialized arrays into the JSON object.
  const rawJson = JSON.stringify(body).slice(0, -1)
    + `,"boxes":${boxes[0].items},"dossiers":${dossiers[0].items},"uploadHistory":${uploadHistory[0].items},"notifications":${notifications[0].items},"_revision":${Number(revision)}}`;
  return sendRawJson(res, rawJson);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً.' });
  try {
    const sql = getSql();
    const userRows = await withTimeout(sql<DbUser[]>`SELECT id, username, email, name, role, active, last_login FROM arms_users WHERE id = ${session.sub} LIMIT 1`);
    const user = userRows[0];
    if (!user || !user.active) return res.status(401).json({ error: 'الحساب غير نشط أو لم يعد موجوداً.' });
    if (req.method === 'GET') return await readState(req, res, sql, user);
    if (req.method === 'PUT') {
      if (!['System Admin', 'Archive Manager'].includes(user.role)) return res.status(403).json({ error: 'ليس لديك صلاحية تعديل بيانات الأرشيف.' });
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return res.status(413).json({ error: 'Payload too large.' });
      const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const expectedRevision = Number(parsed?._revision);
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return res.status(428).json({ error: 'Missing database revision. Reload the application.' });
      const requiredArrays = ['boxes', 'dossiers', 'projects', 'uploadHistory', 'notifications', 'auditLogs'];
      if (requiredArrays.some(key => !Array.isArray(parsed?.[key]))) return res.status(400).json({ error: 'Invalid archive state payload.' });
      const state = {
        boxes: parsed.boxes,
        dossiers: parsed.dossiers,
        projects: parsed.projects,
        uploadHistory: parsed.uploadHistory,
        notifications: parsed.notifications,
        auditLogs: parsed.auditLogs,
      };
      const expectedBox = (boxCode: string, firstJobId: number) => {
        const match = /^D(\d+)$/.exec(boxCode || '');
        if (!match || !Number.isInteger(firstJobId) || firstJobId < 35500 || (firstJobId - 35500) % 300 !== 0) return false;
        return Number(match[1]) === 42 + (firstJobId - 35500) / 300;
      };
      const boxCodes = new Set(state.boxes.filter((b: any) => b && typeof b.boxCode === 'string').map((b: any) => b.boxCode));
      if (boxCodes.size !== state.boxes.length || state.boxes.some((b: any) => !b || !expectedBox(b.boxCode, b.firstJobId) || b.lastJobId !== b.firstJobId + 299)) return res.status(400).json({ error: 'Invalid box range. D42 must start at 35500 and each box contains exactly 300 consecutive IDs.' });
      for (const b of state.boxes as any[]) {
        const n = Number(String(b.boxCode).slice(1));
        if (n > 42 && !boxCodes.has(`D${n - 1}`)) return res.status(400).json({ error: `Missing previous box D${n - 1}; box sequence cannot skip.` });
      }
      const seenIds = new Set<number>();
      for (const p of state.projects as any[]) {
        if (!p || !Number.isInteger(p.jobId) || p.jobId < 35500 || !['Archived', 'Missing', 'Pending'].includes(p.status)) return res.status(400).json({ error: 'Invalid project record.' });
        const index = Math.floor((p.jobId - 35500) / 300);
        const expectedCode = `D${42 + index}`;
        const expectedDossier = Math.floor(((p.jobId - 35500) % 300) / 50) + 1;
        if (!p || p.boxId !== expectedCode || p.dossierNumber !== expectedDossier || p.slotIndex !== ((p.jobId - 35500) % 50) || !boxCodes.has(expectedCode) || seenIds.has(p.jobId)) return res.status(400).json({ error: `Project ${p.jobId} does not match its fixed box/dossier slot.` });
        seenIds.add(p.jobId);
      }
      const dossierIds = new Set<string>();
      for (const d of state.dossiers as any[]) {
        if (!d || !d.id || d.id !== `${d.boxId}-${d.dossierNumber}` || !boxCodes.has(d.boxId) || !Number.isInteger(d.dossierNumber) || d.dossierNumber < 1 || d.dossierNumber > 6 || dossierIds.has(d.id)) return res.status(400).json({ error: 'Invalid dossier-to-box relationship.' });
        dossierIds.add(d.id);
      }
      if ([...state.uploadHistory, ...state.notifications, ...state.auditLogs].some((r: any) => !r || typeof r.id !== 'string' || !r.id)) return res.status(400).json({ error: 'Invalid history or notification record.' });
      for (const b of state.boxes as any[]) {
        const count = (state.projects as any[]).filter(p => p.boxId === b.boxCode).length;
        const dossierCount = (state.dossiers as any[]).filter(d => d.boxId === b.boxCode).length;
        if (count !== 300 || dossierCount !== 6) return res.status(400).json({ error: `Box ${b.boxCode} must contain exactly 300 project slots and 6 dossiers.` });
      }
      try {
        const saved = await sql`SELECT public.arms_save_state(${JSON.stringify(state)}::text::jsonb, ${expectedRevision}) AS revision`;
        return res.status(200).json({ ok: true, revision: Number(saved[0].revision), updatedAt: new Date().toISOString() });
      } catch (error: any) {
        if (error?.code === '40001' || String(error?.message || '').includes('ARMS_REVISION_CONFLICT')) return res.status(409).json({ error: 'تم تعديل البيانات من مستخدم آخر. أعد تحميل الصفحة قبل الحفظ مرة أخرى.' });
        throw error;
      }
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('ARMS API error:', error);
    const info = describeError(error, 'Database operation failed.');
    return res.status(info.status).json({ error: info.error, code: info.code, detail: info.detail });
  }
}
