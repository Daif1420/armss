/**
 * ARMS - API client helpers.
 * Network wrapper plus the chunked archive loader (keeps every request small and fast).
 */

export type ApiResult<T = any> = { ok: boolean; status: number; body: T | null; notJson: boolean; text: string };

const NOT_JSON_MESSAGE = 'الخادم لم يرد بصيغة JSON: واجهة /api غير متاحة. على الجهاز شغّل المشروع بـ "npm run dev:api" (Vercel CLI) وليس "npm run dev"، أو افتح رابط Vercel بعد النشر.';

/** Builds a user-facing message from an API error body, appending the error code/detail when present. */
export const apiErrorMessage = (body: { error?: string; code?: string; detail?: string } | null, fallback: string) => {
  const extra = [body?.code, body?.detail].filter(Boolean).join(' — ');
  return `${body?.error || fallback}${extra ? ` [${extra}]` : ''}`;
};

/** Always times out, always returns parsed JSON (or null) and never throws on non-JSON bodies. Throws only on network failure/timeout. */
export async function apiFetch<T = any>(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { credentials: 'same-origin', ...init, signal: init.signal ?? controller.signal });
    const text = await response.text();
    let body: T | null = null;
    let notJson = false;
    try { body = text ? JSON.parse(text) : null; } catch { notJson = true; }
    return { ok: response.ok, status: response.status, body, notJson, text: notJson ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '' };
  } catch {
    if (controller.signal.aborted) throw new Error('انتهت مهلة الاتصال بالخادم. تحقق من الإنترنت أو من إعدادات قاعدة البيانات (DATABASE_URL).');
    throw new Error('تعذر الوصول إلى الخادم. تحقق من الاتصال بالإنترنت.');
  } finally {
    window.clearTimeout(timer);
  }
}

export const errorFrom = (r: ApiResult, fallback: string) => {
  if (!r.notJson) return apiErrorMessage(r.body, `${fallback} (${r.status})`);
  // 404/200 with a non-JSON body means /api is not running at all (plain `npm run dev`).
  // Any other non-JSON reply is a Vercel platform error (timeout, crash, or response over 4.5 MB).
  if (r.status === 404 || r.status === 200) return NOT_JSON_MESSAGE;
  return `${fallback}: رد الخادم برمز ${r.status} بدل JSON${r.text ? ` — ${r.text}` : ''}. غالباً انتهت مهلة الدالة أو تجاوز حجم الرد 4.5MB؛ راجع Logs في Vercel.`;
};

// ---- Chunked archive loading -------------------------------------------------------------------

const PAGE_SIZE = 1500;
const AUDIT_PAGE_SIZE = 500;
const PARALLEL_REQUESTS = 3;
const ATTEMPTS = 3;

export type ArchiveSnapshot = {
  boxes: any[]; dossiers: any[]; projects: any[]; uploadHistory: any[]; notifications: any[]; auditLogs: any[];
  users: any[]; currentUser: any; _revision: number;
};

class RevisionChanged extends Error {}

/** One GET with retries on transient failures (platform timeouts, 5xx, network). Auth/permission errors are not retried. */
async function getPart(query: string, label: string) {
  let lastError: Error = new Error(label);
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const r = await apiFetch(`/api/state?${query}`, {}, 25000);
      if (r.ok && r.body) return r.body;
      lastError = new Error(errorFrom(r, label));
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 503) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(label);
    }
    if (attempt < ATTEMPTS) await new Promise(resolve => setTimeout(resolve, 400 * attempt));
  }
  throw lastError;
}

/** Runs async jobs with a fixed concurrency and returns results in input order. */
async function runPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

async function loadOnce(): Promise<ArchiveSnapshot> {
  const core = await getPart('part=core', 'تعذر تحميل بيانات الأرشيف');
  const revision = Number(core._revision || 0);
  const pages = (part: 'projects' | 'audit', total: number, size: number) =>
    Array.from({ length: Math.ceil((total || 0) / size) }, (_, i) => ({ part, offset: i * size, size }));

  const jobs = [
    ...pages('projects', core.counts?.projects, PAGE_SIZE),
    ...pages('audit', core.counts?.auditLogs, AUDIT_PAGE_SIZE),
  ];
  const loaded = await runPool(jobs, PARALLEL_REQUESTS, async job => {
    const body = await getPart(`part=${job.part}&offset=${job.offset}&limit=${job.size}`, 'تعذر تحميل بيانات الأرشيف');
    if (Number(body._revision) !== revision) throw new RevisionChanged();
    return { part: job.part, items: body.items as any[] };
  });

  const collect = (part: string) => loaded.filter(l => l.part === part).flatMap(l => l.items);
  return {
    boxes: core.boxes || [], dossiers: core.dossiers || [], uploadHistory: core.uploadHistory || [], notifications: core.notifications || [],
    projects: collect('projects'), auditLogs: collect('audit'),
    users: core.users || [], currentUser: core.currentUser, _revision: revision,
  };
}

/** Loads the whole archive in small parallel requests. Restarts once if another user saved while pages were loading. */
export async function loadArchiveSnapshot(): Promise<ArchiveSnapshot> {
  for (let attempt = 1; ; attempt++) {
    try { return await loadOnce(); }
    catch (error) { if (!(error instanceof RevisionChanged) || attempt >= 3) throw error instanceof RevisionChanged ? new Error('تغيّرت البيانات أثناء التحميل. أعد المحاولة.') : error; }
  }
}
