/**
 * ARMS - Dossiers List View
 * Displays all dossiers across all boxes with filters and quick access to the 50 slots.
 */

import React, { useState } from 'react';
import { Archive, Search, ArrowRight } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { ActiveTab } from '../navigation/TopNav';

interface DossiersViewProps {
  onNavigate: (tab: ActiveTab, param?: string) => void;
  onSelectDossier: (dossierId: string) => void;
}

export const DossiersView: React.FC<DossiersViewProps> = ({ onNavigate, onSelectDossier }) => {
  const { dossiers, boxes, language } = useArchive();
  const [searchTerm, setSearchTerm] = useState('');
  const [boxFilter, setBoxFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Archived' | 'Inprogress' | 'Pending'>('all');

  const filtered = dossiers.filter(d => {
    const matchSearch =
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.boxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(d.fromJobId).includes(searchTerm) ||
      String(d.toJobId).includes(searchTerm);

    if (!matchSearch) return false;
    if (boxFilter !== 'all' && d.boxId !== boxFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Archive className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>{language === 'ar' ? 'إدارة الدوسيهات (Dossiers)' : 'Dossiers Management'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'كل دوسيه يحتوي بدقة على 50 خانة مشروع متسلسلة.'
              : 'Strict 50-project slots per dossier with gap and status mapping.'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث بالدوسيه أو النطاق...' : 'Search dossier or range...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Box Selector */}
          <select
            value={boxFilter}
            onChange={e => setBoxFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="all">{language === 'ar' ? 'كافة البوكسات' : 'All Boxes'}</option>
            {boxes.map(b => (
              <option key={b.id} value={b.boxCode}>
                Box {b.boxCode}
              </option>
            ))}
          </select>

          {/* Status buttons */}
          <div className="flex items-center gap-1">
            {(['all', 'Inprogress', 'Archived', 'Pending'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {s === 'all' && (language === 'ar' ? 'الكل' : 'All')}
                {s === 'Inprogress' && (language === 'ar' ? 'جاري' : 'Inprogress')}
                {s === 'Archived' && (language === 'ar' ? 'مكتمل (50)' : 'Archived')}
                {s === 'Pending' && (language === 'ar' ? 'فارغ' : 'Pending')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dossiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(dossier => {
          const percent = ((dossier.archivedCount / 50) * 100).toFixed(0);
          return (
            <div
              key={dossier.id}
              onClick={() => {
                onSelectDossier(dossier.id);
                onNavigate('dossier-detail', dossier.id);
              }}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-900 dark:text-white text-sm">
                      {dossier.dossierNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        Box {dossier.boxId} · {language === 'ar' ? `دوسيه ${dossier.dossierNumber}` : `Dossier ${dossier.dossierNumber}`}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                        #{dossier.fromJobId} → #{dossier.toJobId}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      dossier.status === 'Archived'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : dossier.status === 'Inprogress'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {dossier.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'مؤرشف' : 'Archived'}</div>
                    <div className="text-xs font-bold text-emerald-600 tabular-nums">
                      {dossier.archivedCount} / 50
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'مفقود' : 'Missing'}</div>
                    <div className="text-xs font-bold text-rose-600 tabular-nums">
                      {dossier.missingCount > 0 ? dossier.missingCount : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</div>
                    <div className="text-xs font-bold text-slate-400 tabular-nums">
                      {dossier.pendingCount}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(dossier.archivedCount / 50) * 100}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${(dossier.missingCount / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <span className="text-[11px] font-semibold">{percent}% {language === 'ar' ? 'مكتمل' : 'complete'}</span>
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <span>{language === 'ar' ? 'عرض الـ 50 مشروع' : 'View 50 slots'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
