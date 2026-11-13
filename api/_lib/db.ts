import postgres from 'postgres';

// Vercel stores values literally, so a value pasted as "postgresql://..." (with quotes)
// or with a leading "psql " keeps those characters. Clean them before connecting.
export function databaseUrl(): string {
  const strip = (v: string) => v.trim().replace(/^['"]+|['"]+$/g, '').trim();
  let value = strip(process.env.DATABASE_URL || '');
  value = strip(value.replace(/^psql\s+/i, ''));
  return value;
}

// A few connections per warm serverless instance (so the archive queries can really run in parallel). `prepare: false` is required by
// Supabase's transaction pooler (port 6543), which does not support prepared statements.
let client: ReturnType<typeof postgres> | undefined;
let clientUrl = '';

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not configured.');
  if (!client || clientUrl !== url) {
    client = postgres(url, { ssl: 'require', prepare: false, max: 4, idle_timeout: 20, connect_timeout: 5 });
    clientUrl = url;
  }
  return client;
}

export type ApiError = { status: number; error: string; code: string; detail?: string };

// Remove anything that could leak credentials or hosts before a message is returned to the browser.
function sanitize(message: string): string {
  return message
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[url]')
    .replace(/\bpassword\s*[=:]\s*\S+/gi, 'password=[hidden]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

// Short, non-sensitive description of a failure, safe to return to the browser.
// Known configuration problems get an actionable Arabic message; anything else
// returns the SQLSTATE/error name plus a sanitized detail so the cause is visible.
export function describeError(error: unknown, fallback = 'Authentication service failed.'): ApiError {
  const err = error as { code?: string; message?: string; name?: string };
  const message = String(err?.message || '');
  const code = String(err?.code || err?.name || 'UNKNOWN');
  const haystack = `${message} ${code}`;

  if (code === 'QUERY_TIMEOUT') return { status: 504, code, error: 'استغرق الاستعلام وقتاً أطول من المسموح. تحقق من سرعة الاتصال بقاعدة البيانات (منطقة Vercel مقابل منطقة Supabase).' };
  if (['42P01', '42883', '42703', '42P10'].includes(code)) return { status: 503, code, error: 'قاعدة البيانات غير مهيأة أو قديمة: شغّل scripts/schema.sql في SQL Editor الخاص بقاعدة البيانات.' };
  if (message.includes('ARMS_SESSION_SECRET')) return { status: 500, code, error: 'ARMS_SESSION_SECRET غير مضبوط أو أقل من 32 حرفاً في Vercel.' };
  if (message.includes('ARMS_ADMIN')) return { status: 500, code, error: 'إعدادات ARMS_ADMIN_USERNAME / ARMS_ADMIN_PASSWORD غير صحيحة (الباسورد 8 أحرف على الأقل).' };
  if (message.includes('DATABASE_URL') || /connection string|invalid url|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|CONNECT_TIMEOUT|CONNECTION_|fetch failed|password authentication failed|tenant or user not found|28P01|3D000/i.test(haystack)) {
    return { status: 503, code, error: 'تعذر الاتصال بقاعدة البيانات: راجع قيمة DATABASE_URL في Vercel (بدون علامات تنصيص، ورابط Supabase Pooler الصحيح).' };
  }
  return { status: 500, code, error: fallback, detail: sanitize(message) || undefined };
}
