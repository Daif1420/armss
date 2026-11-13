import React, { useEffect, useState } from 'react';
import { Archive, KeyRound, LockKeyhole, LogIn, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { IntercomLogo } from '../common/IntercomLogo';

const THEME_KEY = 'arms_theme';
const readTheme = () => {
  try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; }
};

const inputClass =
  'mt-1.5 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
const iconClass = 'absolute start-3 top-3 w-4 h-4 text-slate-400 pointer-events-none';
const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300';

export const LoginView: React.FC = () => {
  const { login, setupRequired, authError, language, setLanguage } = useArchive();
  const ar = language === 'ar';
  const t = (arabic: string, english: string) => (ar ? arabic : english);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(readTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }, [darkMode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return; // ignore double submits
    setBusy(true);
    setError('');
    try {
      await login({ action: setupRequired ? 'setup' : 'login', username, password, name, email, setupSecret });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
      setBusy(false); // on success this component unmounts, so only reset on failure
    }
  };

  const buttonLabel = busy
    ? t('جارٍ التحقق...', 'Please wait...')
    : setupRequired ? t('إنشاء حساب المسؤول', 'Create administrator') : t('دخول', 'Sign in');

  return (
    <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <section className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-7 sm:p-9">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <IntercomLogo size="md" variant="dark" />
            <div className="border-s border-slate-200 dark:border-slate-700 ps-3">
              <div className="font-black tracking-wide text-slate-900 dark:text-white">ARMS</div>
              <div className="text-[10px] text-slate-500">Archive Reports Management</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDarkMode(v => !v)} aria-label="Toggle dark mode" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => setLanguage(ar ? 'en' : 'ar')} className="text-xs text-slate-500 hover:text-blue-600">
              {ar ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>

        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-5">
          {setupRequired ? <ShieldCheck /> : <LockKeyhole />}
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {setupRequired ? t('إعداد حساب مدير النظام', 'Create System Administrator') : t('تسجيل الدخول', 'Sign in')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
          {setupRequired
            ? t('أنشئ أول حساب مسؤول لتأمين النظام. مفتاح الإعداد متاح لمسؤول النشر فقط.', 'Create the first administrator account. The setup key is available only to the deployment owner.')
            : t('سجّل الدخول للوصول إلى نظام إدارة الأرشيف.', 'Sign in to access the archive management system.')}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {setupRequired && (
            <>
              <label className={labelClass}>
                {t('مفتاح الإعداد الأولي', 'Initial setup key')}
                <div className="relative mt-1.5">
                  <KeyRound className={iconClass} />
                  <input required type="password" value={setupSecret} onChange={e => setSetupSecret(e.target.value)} className={`${inputClass} ps-9 !mt-0`} />
                </div>
              </label>
              <label className={labelClass}>
                {t('الاسم بالكامل', 'Full name')}
                <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </label>
              <label className={labelClass}>
                {t('البريد الإلكتروني (اختياري)', 'Email (optional)')}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
              </label>
            </>
          )}

          <label className={labelClass}>
            {t('اسم المستخدم', 'Username')}
            <div className="relative mt-1.5">
              <UserRound className={iconClass} />
              <input required autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} className={`${inputClass} ps-9 !mt-0`} />
            </div>
          </label>

          <label className={labelClass}>
            {t('كلمة المرور', 'Password')}
            <div className="relative mt-1.5">
              <LockKeyhole className={iconClass} />
              <input required type="password" minLength={setupRequired ? 12 : 1} autoComplete={setupRequired ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} ps-9 !mt-0`} />
            </div>
            {setupRequired && <span className="block mt-1 text-[10px] text-slate-400">{t('12 حرفاً على الأقل', 'At least 12 characters')}</span>}
          </label>

          {(error || authError) && (
            <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs p-3 break-words">
              {error || authError}
            </div>
          )}

          <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm py-3">
            <LogIn className="w-4 h-4" />
            {buttonLabel}
          </button>
        </form>

        <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <Archive className="w-3.5 h-3.5" /> Intercom Archive Operations
        </div>
      </section>
    </main>
  );
};
