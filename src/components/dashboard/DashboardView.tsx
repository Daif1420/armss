/**
 * ARMS - Dashboard View
 * Section 6: Dynamic KPI metrics, Recharts trends, recent uploads, missing alerts, quick actions.
 */

import React from 'react';
import { FileSpreadsheet, Printer, AlertTriangle, CheckCircle2, Clock, Archive, FolderArchive, ArrowRight, FileCheck, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useArchive } from '../../context/ArchiveContext';
import { ActiveTab } from '../navigation/TopNav';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab, param?: string) => void;
  onOpenForceCloseModal?: (boxId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { boxes, dossiers, projects, uploadHistory, language } =
    useArchive();

  // Metrics calculations
  const totalProjects = projects.length;
  const archivedProjects = projects.filter(p => p.status === 'Archived').length;
  const missingProjects = projects.filter(p => p.status === 'Missing').length;
  const pendingProjects = projects.filter(p => p.status === 'Pending').length;

  const totalBoxes = boxes.length;
  const archivedBoxes = boxes.filter(b => b.status === 'Archived').length;
  const inprogressBoxes = boxes.filter(b => b.status === 'Inprogress').length;
  const forceClosedBoxes = boxes.filter(b => b.isForceClosed).length;

  const totalDossiers = dossiers.length;
  const archivedDossiers = dossiers.filter(d => d.status === 'Archived').length;
  const inprogressDossiers = dossiers.filter(d => d.status === 'Inprogress').length;
  const pendingDossiers = dossiers.filter(d => d.status === 'Pending').length;

  const completionRate =
    totalProjects > 0 ? ((archivedProjects / totalProjects) * 100).toFixed(1) : '0.0';

  // Chart 1: Project Status Breakdown
  const projectStatusData = [
    { name: language === 'ar' ? 'مؤرشف' : 'Archived', value: archivedProjects, color: '#16A34A' },
    { name: language === 'ar' ? 'مفقود (فجوة)' : 'Missing', value: missingProjects, color: '#DC2626' },
    { name: language === 'ar' ? 'قيد الانتظار' : 'Pending', value: pendingProjects, color: '#94A3B8' },
  ];

  // Chart 2: Progress by Box
  const boxProgressData = boxes.map(b => ({
    name: b.boxCode,
    Archived: b.archivedProjects,
    Missing: b.missingProjects,
    Pending: b.pendingProjects,
    isForceClosed: b.isForceClosed,
  }));

  // Missing projects list (top 5 for alert widget)
  const recentMissing = projects.filter(p => p.status === 'Missing').slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {language === 'ar' ? 'لوحة المتابعة والتحكم' : 'Archive Operations Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'متابعة حركة 300 مشروع لكل بوكس، 50 لكل دوسيه، واكتشاف الفجوات تلقائيًا.'
              : 'Real-time 300-project box capacity, 50-project dossiers, and automated gap detection.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('import')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'استيراد Excel' : 'Import Excel'}</span>
          </button>

          <button
            onClick={() => onNavigate('labels')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'طباعة الليبلات' : 'Print Labels'}</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition-colors shadow-sm"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'التقارير الشاملة' : 'Full Reports'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Projects */}
        <button
          onClick={() => onNavigate('projects')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{language === 'ar' ? 'إجمالي المشاريع' : 'Total Projects'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {totalProjects.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span>{totalBoxes} {language === 'ar' ? 'بوكس' : 'Boxes'}</span>
            <span>·</span>
            <span>{totalDossiers} {language === 'ar' ? 'دوسيه' : 'Dossiers'}</span>
          </div>
        </button>

        {/* Archived Projects */}
        <button
          onClick={() => onNavigate('projects', 'Archived')}
          className="p-4 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 rounded-xl text-left hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>{language === 'ar' ? 'المشاريع المؤرشفة' : 'Archived Projects'}</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {archivedProjects.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium tabular-nums">
            {completionRate}% {language === 'ar' ? 'نسبة الإنجاز الإجمالي' : 'Completion Rate'}
          </div>
        </button>

        {/* Missing Projects (proven gaps) */}
        <button
          onClick={() => onNavigate('projects', 'Missing')}
          className="p-4 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 rounded-xl text-left hover:border-rose-300 dark:hover:border-rose-800 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>{language === 'ar' ? 'المشاريع المفقودة (فجوات)' : 'Missing Projects (Gaps)'}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {missingProjects.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
            {language === 'ar' ? 'فجوات تسلسل مثبتة' : 'Proven sequence gaps'}
          </div>
        </button>

        {/* Pending Projects */}
        <button
          onClick={() => onNavigate('projects', 'Pending')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{language === 'ar' ? 'مشاريع قيد الانتظار' : 'Pending Projects'}</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
            {pendingProjects.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {language === 'ar' ? 'لم تستورد بعد' : 'Awaiting delivery'}
          </div>
        </button>

        {/* Total Boxes & Status */}
        <button
          onClick={() => onNavigate('boxes')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{language === 'ar' ? 'البوكسات (Boxes)' : 'Boxes'}</span>
            <FolderArchive className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {totalBoxes}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{archivedBoxes} {language === 'ar' ? 'مكتمل' : 'archived'}</span>
            <span>·</span>
            <span className="text-amber-600 font-semibold">{inprogressBoxes} {language === 'ar' ? 'جاري' : 'in-prog'}</span>
            {forceClosedBoxes > 0 && (
              <>
                <span>·</span>
                <span className="text-purple-600 font-semibold">{forceClosedBoxes} {language === 'ar' ? 'مغلق إداريًا' : 'closed'}</span>
              </>
            )}
          </div>
        </button>

        {/* Total Dossiers & Status */}
        <button
          onClick={() => onNavigate('dossiers')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{language === 'ar' ? 'الدوسيهات (Dossiers)' : 'Dossiers'}</span>
            <Archive className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {totalDossiers}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{archivedDossiers} {language === 'ar' ? 'مكتمل' : 'archived'}</span>
            <span>·</span>
            <span className="text-amber-600 font-semibold">{inprogressDossiers} {language === 'ar' ? 'جاري' : 'in-prog'}</span>
            <span>·</span>
            <span className="text-slate-400">{pendingDossiers} {language === 'ar' ? 'فارغ' : 'pending'}</span>
          </div>
        </button>

        {/* Overall Completion Progress */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'نسبة الإنجاز والأرشفة الكلية' : 'Overall Archiving Progress'}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
              {archivedProjects} / {totalProjects} ({completionRate}%)
            </span>
          </div>

          <div className="my-2">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(archivedProjects / (totalProjects || 1)) * 100}%` }}
                title={`Archived: ${archivedProjects}`}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${(missingProjects / (totalProjects || 1)) * 100}%` }}
                title={`Missing: ${missingProjects}`}
              />
              <div
                className="bg-slate-300 dark:bg-slate-700 h-full transition-all"
                style={{ width: `${(pendingProjects / (totalProjects || 1)) * 100}%` }}
                title={`Pending: ${pendingProjects}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
                <span>{language === 'ar' ? 'مؤرشف' : 'Archived'}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />
                <span>{language === 'ar' ? 'مفقود' : 'Missing'}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />
                <span>{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</span>
              </span>
            </div>
            <span className="font-mono text-[10px]">300 slots / box</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Project Status Donut */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'توزيع حالات المشاريع' : 'Project Status Distribution'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'تحليل النواقص والمكتمل' : 'Archived vs Missing vs Pending'}
              </p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} projects`, '']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            {projectStatusData.map(item => (
              <div key={item.name} className="flex flex-col">
                <span className="text-[10px] text-slate-400 truncate">{item.name}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Progress by Box */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'حالة البوكسات الحالية (300 مشروع)' : 'Box Completion Overview (300 Slots)'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'مقارنة المشاريع المؤرشفة والمفقودة في كل بوكس' : 'Archived, missing, and pending projects per box'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('boxes')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1"
            >
              <span>{language === 'ar' ? 'كل البوكسات' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boxProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 300]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Archived" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Missing" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span>{language === 'ar' ? 'مؤرشف' : 'Archived'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
              <span>{language === 'ar' ? 'مفقود (فجوة)' : 'Missing'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
              <span>{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Operational Sections Grid: Alerts, Uploads, Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Missing Projects Alert Section */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{language === 'ar' ? 'تنبيهات المشاريع المفقودة' : 'Missing Projects Alerts'}</span>
              </div>
              <span className="text-[11px] font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded font-semibold tabular-nums">
                {missingProjects} {language === 'ar' ? 'ناقص' : 'missing'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              {language === 'ar'
                ? 'مشاريع غير موجودة في ملفات Excel ووجد بعدها مشاريع أخرى في نفس التسلسل:'
                : 'Projects missing from Excel where subsequent numbers exist in sequence:'}
            </p>

            <div className="space-y-2">
              {recentMissing.length > 0 ? (
                recentMissing.map(p => (
                  <div
                    key={p.jobId}
                    onClick={() => onNavigate('projects', String(p.jobId))}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                        Job #{p.jobId}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.boxId} · Dossier {p.dossierNumber}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded">
                      {language === 'ar' ? 'فجوة مثبتة' : 'Proven Gap'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  {language === 'ar' ? 'لا توجد مشاريع مفقودة حالياً' : 'No missing projects detected'}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('projects', 'Missing')}
            className="mt-4 w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg transition-colors text-center"
          >
            {language === 'ar' ? 'عرض كافة المشاريع المفقودة' : 'View all missing projects'}
          </button>
        </div>

        {/* Recent Excel Uploads */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'آخر عمليات استيراد Excel' : 'Recent Excel Upload History'}</span>
              </div>
              <button
                onClick={() => onNavigate('import')}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <span>{language === 'ar' ? 'رفع ملف جديد' : 'Upload File'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-3 py-2">{language === 'ar' ? 'الملف' : 'File Name'}</th>
                    <th className="px-3 py-2">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th className="px-3 py-2">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-3 py-2 text-right">{language === 'ar' ? 'المستورد' : 'Imported'}</th>
                    <th className="px-3 py-2 text-right">{language === 'ar' ? 'التكرار' : 'Duplicates'}</th>
                    <th className="px-3 py-2">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {uploadHistory.slice(0, 4).map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white max-w-[180px] truncate">
                        {u.fileName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{u.userName}</td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{u.timestamp}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                        {u.importedCount}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">
                        {u.duplicateCount}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              {language === 'ar'
                ? 'يتم قراءة فقط عمودي Job ID و Date Approved وتجاهل باقي الأعمدة.'
                : 'Engine strictly extracts Job ID & Date Approved only; extraneous columns ignored.'}
            </span>
            <button
              onClick={() => onNavigate('import')}
              className="text-xs font-semibold text-slate-900 dark:text-white hover:underline"
            >
              {language === 'ar' ? 'سجل الرفع الكامل' : 'View full history'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
