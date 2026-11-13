/**
 * ARMS - Dossier Detail View
 * Section 7: Strictly renders all 50 expected project slots:
 * - Green = Archived
 * - Red = Missing (proven gap)
 * - Muted Neutral/Amber = Pending
 */

import React, { useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

import { ActiveTab } from '../navigation/TopNav';

interface DossierDetailViewProps {
  dossierId: string;
  onNavigate: (tab: ActiveTab, param?: string) => void;
  onSelectProject: (jobId: number) => void;
}

export const DossierDetailView: React.FC<DossierDetailViewProps> = ({
  dossierId,
  onNavigate,
  onSelectProject,
}) => {
  const { dossiers, projects, language } = useArchive();
  const [filterStatus, setFilterStatus] = useState<'all' | 'Archived' | 'Missing' | 'Pending'>('all');

  const dossier = dossiers.find(d => d.id === dossierId);
  if (!dossier) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Dossier not found.</p>
        <button onClick={() => onNavigate('dossiers')} className="mt-3 text-xs font-semibold underline">
          Back to Dossiers
        </button>
      </div>
    );
  }

  // Get all 50 projects for this dossier
  const dossierProjects = projects
    .filter(p => p.boxId === dossier.boxId && p.dossierNumber === dossier.dossierNumber)
    .sort((a, b) => a.jobId - b.jobId);

  const percent = ((dossier.archivedCount / 50) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('box-detail', dossier.boxId)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {language === 'ar'
                  ? `تفاصيل دوسيه ${dossier.dossierNumber} (بوكس ${dossier.boxId})`
                  : `Dossier ${dossier.dossierNumber} (Box ${dossier.boxId})`}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  dossier.status === 'Archived'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                }`}
              >
                {dossier.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar'
                ? `النطاق التسلسلي: من #${dossier.fromJobId} إلى #${dossier.toJobId} (50 مشروع)`
                : `Sequence Range: #${dossier.fromJobId} → #${dossier.toJobId} (50 Project Slots)`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('labels', `${dossier.boxId}:${dossier.dossierNumber}`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'طباعة ليبل هذا الدوسيه' : 'Print Dossier Label'}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] text-slate-500">{language === 'ar' ? 'المشاريع المؤرشفة' : 'Archived'}</span>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">
            {dossier.archivedCount} / 50
          </div>
          <span className="text-[10px] text-slate-400">{percent}% {language === 'ar' ? 'مكتمل' : 'completed'}</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500">{language === 'ar' ? 'المشاريع المفقودة' : 'Missing (Gaps)'}</span>
          <div className="text-xl font-bold text-rose-600 tabular-nums">
            {dossier.missingCount}
          </div>
          <span className="text-[10px] text-rose-500">{language === 'ar' ? 'فجوات مثبتة' : 'Proven gaps'}</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</span>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {dossier.pendingCount}
          </div>
          <span className="text-[10px] text-slate-400">{language === 'ar' ? 'لم تستورد' : 'Awaiting delivery'}</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500">{language === 'ar' ? 'إجمالي السعة' : 'Total Slots'}</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            50
          </div>
          <span className="text-[10px] text-slate-400">Strictly 50 slots</span>
        </div>
      </div>

      {/* 50 Project Slots Matrix & Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'مخطط الـ 50 خانة مشروع (50 Slots Matrix)' : '50 Project Slots Matrix'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {language === 'ar' ? 'اضغط على أي خانة لعرض تفاصيل المشروع' : 'Click any slot to inspect project metadata'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'Archived', 'Missing', 'Pending'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === s
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {s === 'all' && (language === 'ar' ? 'الكل (50)' : 'All (50)')}
                {s === 'Archived' && (language === 'ar' ? `مؤرشف (${dossier.archivedCount})` : `Archived (${dossier.archivedCount})`)}
                {s === 'Missing' && (language === 'ar' ? `مفقود (${dossier.missingCount})` : `Missing (${dossier.missingCount})`)}
                {s === 'Pending' && (language === 'ar' ? `قيد الانتظار (${dossier.pendingCount})` : `Pending (${dossier.pendingCount})`)}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density 50 Slots Visual Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {dossierProjects.map((p, idx) => {
            const isMatch = filterStatus === 'all' || p.status === filterStatus;
            return (
              <button
                key={p.jobId}
                disabled={!isMatch}
                onClick={() => {
                  onSelectProject(p.jobId);
                  onNavigate('projects', String(p.jobId));
                }}
                className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative ${
                  !isMatch ? 'opacity-20' : 'hover:scale-105 hover:shadow-xs cursor-pointer'
                } ${
                  p.status === 'Archived'
                    ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : p.status === 'Missing'
                    ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                <span className="text-xs font-bold font-mono tabular-nums leading-tight mt-0.5">
                  {p.jobId}
                </span>
                <span
                  className={`text-[9px] font-semibold mt-1 px-1 rounded ${
                    p.status === 'Archived'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : p.status === 'Missing'
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-slate-400'
                  }`}
                >
                  {p.status}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span>{language === 'ar' ? 'مؤرشف (Archived - مستورد)' : 'Archived (Imported)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
            <span>{language === 'ar' ? 'مفقود (Missing - فجوة مثبتة)' : 'Missing (Proven Gap)'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />
            <span>{language === 'ar' ? 'قيد الانتظار (Pending - لم يستورد)' : 'Pending (Awaiting)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
