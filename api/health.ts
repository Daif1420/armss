import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, describeError } from './_lib/db.js';

// Diagnostics for deployment problems. Returns only booleans / short codes, never secret values.
// Open /api/health in the browser to see which setting is missing.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    ARMS_SESSION_SECRET: (process.env.ARMS_SESSION_SECRET || '').length >= 32,
    ARMS_ADMIN_USERNAME: Boolean(process.env.ARMS_ADMIN_USERNAME),
    ARMS_ADMIN_PASSWORD: (process.env.ARMS_ADMIN_PASSWORD || '').length >= 8,
    ARMS_SETUP_SECRET: Boolean(process.env.ARMS_SETUP_SECRET),
  };
  const result: Record<string, unknown> = { env, database: 'unchecked', schema: 'unchecked', users: null };
  try {
    const sql = getSql();
    const host = (() => { try { return new URL((process.env.DATABASE_URL || '').trim().replace(/^['"]+|['"]+$/g, '')).host.replace(/^[^@]*@/, ''); } catch { return 'unparsable URL'; } })();
    result.dbHost = host;
    const t0 = Date.now();
    await sql`SELECT 1`;
    result.database = 'ok';
    result.firstQueryMs = Date.now() - t0; // includes connect + TLS
    const t1 = Date.now();
    await sql`SELECT 1`;
    result.roundTripMs = Date.now() - t1; // pure round trip: this is the cost of EACH query
    result.vercelRegion = process.env.VERCEL_REGION || 'unknown';
    const tables = await sql`SELECT to_regclass('public.arms_users') IS NOT NULL AS users, to_regclass('public.arms_app_state') IS NOT NULL AS state, to_regprocedure('public.arms_save_state(jsonb,bigint)') IS NOT NULL AS save_fn`;
    result.schema = tables[0].users && tables[0].state && tables[0].save_fn ? 'ok' : 'missing — run scripts/schema.sql';
    if (tables[0].users) result.users = (await sql`SELECT COUNT(*)::int AS count FROM arms_users`)[0].count;
    return res.status(200).json(result);
  } catch (error) {
    const info = describeError(error);
    result.database = 'error';
    result.error = info.error;
    result.code = info.code;
    return res.status(200).json(result);
  }
}
