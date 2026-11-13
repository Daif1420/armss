/**
 * ARMS - Boxes View
 * Section 7: Boxes List with 6 dossiers, 300 projects, Force Close indicator, progress bars, and admin controls.
 */

import React, { useState } from 'react';
import { FolderArchive, Printer, Plus, Search, ArrowRight, Lock, Unlock } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { Box } from '../../types';
import { ActiveTab } from '../navigation/TopNav';

interface BoxesViewProps {
  onNavigate: (tab: ActiveTab, param?: string) => void;
  onSelectBox: (boxId: string) => void;
}

export const BoxesView: React.FC<BoxesViewProps> = ({ onNavigate, onSelectBox }) => {
  const { boxes, currentUser, forceCloseBox, reopenBox, createBox, language } = useArchive();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Archived' | 'Inprogress' | 'ForceClosed'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoxCode, setNewBoxCode] = useState('');
  const [newFirstJobId, setNewFirstJobId] = useState(35500);

  const [forceCloseModalBox, setForceCloseModalBox] = useState<Box | null>(null);
  const [forceCloseReason, setForceCloseReason] = useState('');

  const filteredBoxes = boxes.filter(b => {
    const matchSearch =
      b.boxCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(b.firstJobId).includes(searchTerm) ||
      String(b.lastJobId).includes(searchTerm);

    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'ForceClosed') return b.isForceClosed;
    if (statusFilter === 'Archived') return b.status === 'Archived';
    if (statusFilter === 'Inprogress') return b.status === 'Inprogress' && !b.isForceClosed;
    return true;
  });

  const handleCreateBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxCode || !newFirstJobId) return;
    try { createBox(newBoxCode.toUpperCase().trim(), Number(newFirstJobId)); setShowCreateModal(false); } catch (error) { alert(error instanceof Error ? error.message : 'Invalid box sequence.'); return; }
    setNewBoxCode('');
  };

  const handleExecuteForceClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceCloseModalBox || !forceCloseReason.trim()) return;
    forceCloseBox(forceCloseModalBox.id, forceCloseReason.trim());
    setForceCloseModalBox(null);
    setForceCloseReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>{language === 'ar' ? 'إدارة البوكسات (Boxes)' : 'Box Management'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'كل بوكس يحتوي بدقة على 6 دوسيهات و 300 مشروع (Job Slots).'
              : 'Each archive box strictly holds 6 dossiers and 300 project slots.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'System Admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة بوكس يدوي' : 'Create Box'}</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('labels')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'طباعة ليبلات البوكسات' : 'Print Labels'}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث بكود البوكس أو رقم المشروع...' : 'Search box code or job ID...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {(['all', 'Inprogress', 'Archived', 'ForceClosed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === f
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {f === 'all' && (language === 'ar' ? 'الكل' : 'All')}
              {f === 'Inprogress' && (language === 'ar' ? 'جاري الأرشفة' : 'In Progress')}
              {f === 'Archived' && (language === 'ar' ? 'مكتمل (300)' : 'Archived')}
              {f === 'ForceClosed' && (language === 'ar' ? 'مغلق إداريًا' : 'Force Closed')}
            </button>
          ))}
        </div>
      </div>

      {/* Boxes Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'كود البوكس' : 'Box Code'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'النطاق (FROM / TO)' : 'Range (From - To)'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الدوسيهات المكتملة' : 'Completed Dossiers'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'المشاريع' : 'Projects'}</th>
                <th className="px-4 py-3 text-right text-rose-600">{language === 'ar' ? 'مفقود' : 'Missing'}</th>
                <th className="px-4 py-3 text-right text-slate-400">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'نسبة الإنجاز' : 'Progress'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBoxes.map(box => {
                const percent = ((box.archivedProjects / 300) * 100).toFixed(0);
                return (
                  <tr
                    key={box.id}
                    onClick={() => {
                      onSelectBox(box.id);
                      onNavigate('box-detail', box.id);
                    }}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Box Code */}
                    <td className="px-4 py-3 font-bold text-sm text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{box.boxCode}</span>
                        {box.isForceClosed && (
                          <span
                            title={`Force closed: ${box.forceCloseReason}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Force Close</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Range */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                      {box.firstJobId} → {box.lastJobId}
                    </td>

                    {/* Dossiers count: X / 6 */}
                    <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {box.completedDossiers} / 6
                    </td>

                    {/* Projects count: X / 300 */}
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      {box.archivedProjects} / 300
                    </td>

                    {/* Missing count */}
                    <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums">
                      {box.missingProjects > 0 ? box.missingProjects : '-'}
                    </td>

                    {/* Pending count */}
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
                      {box.pendingProjects}
                    </td>

                    {/* Progress Bar */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${(box.archivedProjects / 300) * 100}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${(box.missingProjects / 300) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums w-8 text-right">
                          {percent}%
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                          box.status === 'Archived'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {box.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3 text-center"
                      onClick={e => e.stopPropagation()} // Prevent row click
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            onNavigate('labels', box.boxCode);
                          }}
                          title={language === 'ar' ? 'طباعة 7 ليبلات (بوكس + 6 دوسيهات)' : 'Print 7-Page Labels'}
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Force Close Button for Admin */}
                        {currentUser.role === 'System Admin' && (
                          box.isForceClosed ? (
                            <button
                              onClick={() => reopenBox(box.id)}
                              title={language === 'ar' ? 'إلغاء الإغلاق الإداري' : 'Reopen Box'}
                              className="p-1.5 text-purple-600 hover:text-purple-900 rounded hover:bg-purple-50"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setForceCloseModalBox(box);
                                setForceCloseReason('');
                              }}
                              title={language === 'ar' ? 'إغلاق إداري (Force Close)' : 'Force Close Box (Admin only)'}
                              className="p-1.5 text-slate-400 hover:text-purple-600 rounded hover:bg-purple-50"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}

                        <button
                          onClick={() => {
                            onSelectBox(box.id);
                            onNavigate('box-detail', box.id);
                          }}
                          className="p-1.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Force Close Admin Modal */}
      {forceCloseModalBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold">
              <Lock className="w-5 h-5" />
              <h2 className="text-base font-bold">
                {language === 'ar' ? 'إغلاق البوكس إداريًا (Force Close)' : 'Force Close Archive Box'}
              </h2>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 rounded-lg text-xs space-y-1">
              <div className="font-bold">
                {language === 'ar' ? 'تنبيه وفقًا لقواعد النظام:' : 'System Policy Notice:'}
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>{language === 'ar' ? 'لا يغيّر حالات المشاريع الناقصة (تبقى Missing).' : 'Does not change missing project status.'}</li>
                <li>{language === 'ar' ? 'لا يجعل الدوسيهات غير المكتملة Archived.' : 'Does not make incomplete dossiers archived.'}</li>
                <li>{language === 'ar' ? 'يُسجَّل في Audit Log مع هوية المستخدم والسبب.' : 'Audit logged with admin identity & mandatory reason.'}</li>
              </ul>
            </div>

            <form onSubmit={handleExecuteForceClose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'البوكس المستهدف' : 'Target Box'}
                </label>
                <div className="text-sm font-bold font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  {forceCloseModalBox.boxCode} ({forceCloseModalBox.firstJobId} → {forceCloseModalBox.lastJobId})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'سبب الإغلاق الإداري (إلزامي)' : 'Reason for Administrative Closure (Mandatory)'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    language === 'ar'
                      ? 'أدخل سبب الإغلاق الإداري لاعتماده في سجل العمليات...'
                      : 'Provide operational justification for force-closing incomplete box...'
                  }
                  value={forceCloseReason}
                  onChange={e => setForceCloseReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForceCloseModalBox(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!forceCloseReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {language === 'ar' ? 'تأكيد الإغلاق الإداري' : 'Confirm Force Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Create Box Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'إنشاء بوكس أرشفة جديد' : 'Create New Archive Box'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'ar'
                ? 'ينشئ النظام تلقائيًا 6 دوسيهات و 300 خانة مشروع ابتداءً من الرقم المحدد.'
                : 'Generates 6 dossiers and 300 slots starting at specified Job ID.'}
            </p>

            <form onSubmit={handleCreateBox} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'كود البوكس (مثال D43)' : 'Box Code (e.g. D43)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="D43"
                  value={newBoxCode}
                  onChange={e => setNewBoxCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'رقم أول مشروع في البوكس' : 'First Project Job ID'}
                </label>
                <input
                  type="number"
                  required
                  value={newFirstJobId}
                  onChange={e => setNewFirstJobId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums"
                />
                <div className="mt-1 text-[11px] text-slate-400">
                  {language === 'ar'
                    ? `النطاق المحسوب: من ${newFirstJobId} إلى ${Number(newFirstJobId) + 299}`
                    : `Calculated range: ${newFirstJobId} to ${Number(newFirstJobId) + 299}`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg"
                >
                  {language === 'ar' ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
