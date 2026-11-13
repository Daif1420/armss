/**
 * ARMS - Projects View
 * Section 7: Strict Columns Order:
 * 1. Job ID
 * 2. Date Approved
 * 3. Project Status
 * 4. Actions
 * All extraneous Excel columns removed as required.
 */

import React, { useState } from 'react';
import { FileText, Search, Eye, Edit2, Calendar, History, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { Project, ProjectStatus } from '../../types';
import { ActiveTab } from '../navigation/TopNav';

interface ProjectsViewProps {
  initialFilter?: string;
  onNavigate: (tab: ActiveTab, param?: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ initialFilter, onNavigate }) => {
  const { projects, boxes, updateProjectStatus, language } = useArchive();

  const [searchTerm, setSearchTerm] = useState(
    initialFilter && !['Archived', 'Missing', 'Pending'].includes(initialFilter)
      ? initialFilter
      : ''
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilter && ['Archived', 'Missing', 'Pending'].includes(initialFilter)
      ? initialFilter
      : 'all'
  );
  const [boxFilter, setBoxFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Edit status modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newStatus, setNewStatus] = useState<ProjectStatus>('Archived');
  const [updateNote, setUpdateNote] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filteredProjects = projects.filter(p => {
    const matchSearch =
      String(p.jobId).includes(searchTerm) ||
      (p.dateApproved && p.dateApproved.includes(searchTerm)) ||
      p.boxId.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (boxFilter !== 'all' && p.boxId !== boxFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    updateProjectStatus(editingProject.jobId, newStatus, updateNote);
    // update local reference
    setEditingProject(null);
    setUpdateNote('');
    if (selectedProject?.jobId === editingProject.jobId) {
      setSelectedProject(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>{language === 'ar' ? 'سجل المشاريع (Projects)' : 'Projects Directory'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'الأعمدة المعتمدة حصراً: 1. Job ID · 2. Date Approved · 3. Project Status · 4. Actions'
              : 'Strict Columns: 1. Job ID · 2. Date Approved · 3. Project Status · 4. Actions'}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {language === 'ar' ? 'إجمالي السجلات:' : 'Total Records:'}{' '}
          <strong className="text-slate-900 dark:text-white tabular-nums">
            {filteredProjects.length}
          </strong>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث برقم Job ID...' : 'Search Job ID...'}
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Box Filter */}
          <select
            value={boxFilter}
            onChange={e => {
              setBoxFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="all">{language === 'ar' ? 'كافة البوكسات' : 'All Boxes'}</option>
            {boxes.map(b => (
              <option key={b.id} value={b.boxCode}>
                Box {b.boxCode}
              </option>
            ))}
          </select>

          {/* Status Buttons */}
          <div className="flex items-center gap-1">
            {(['all', 'Archived', 'Missing', 'Pending'] as const).map(s => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {s === 'all' && (language === 'ar' ? 'الكل' : 'All')}
                {s === 'Archived' && (language === 'ar' ? 'مؤرشف' : 'Archived')}
                {s === 'Missing' && (language === 'ar' ? 'مفقود' : 'Missing')}
                {s === 'Pending' && (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Table strictly in order */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 w-16">#</th>
                {/* 1. Job ID */}
                <th className="px-4 py-3">1. Job ID</th>
                {/* 2. Date Approved */}
                <th className="px-4 py-3">2. Date Approved</th>
                {/* 3. Project Status */}
                <th className="px-4 py-3">3. Project Status</th>
                {/* Contextual location indicator */}
                <th className="px-4 py-3 text-slate-400">{language === 'ar' ? 'الموقع' : 'Location'}</th>
                {/* 4. Actions */}
                <th className="px-4 py-3 text-center">4. Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProjects.map((p, idx) => (
                <tr
                  key={p.jobId}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedProject(p)}
                >
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px] tabular-nums">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>

                  {/* 1. Job ID */}
                  <td className="px-4 py-3 font-bold font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                    {p.jobId}
                  </td>

                  {/* 2. Date Approved */}
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                    {p.dateApproved ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.dateApproved}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        {language === 'ar' ? 'لم يعتمد بعد' : 'Not delivered'}
                      </span>
                    )}
                  </td>

                  {/* 3. Project Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                        p.status === 'Archived'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : p.status === 'Missing'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {p.status === 'Archived' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {p.status === 'Missing' && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                      {p.status === 'Pending' && <Clock className="w-3 h-3 text-slate-400" />}
                      <span>{p.status}</span>
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {p.boxId}
                    </span>{' '}
                    · Dossier {p.dossierNumber} (Slot #{p.slotIndex + 1})
                  </td>

                  {/* 4. Actions */}
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedProject(p)}
                        title={language === 'ar' ? 'تفاصيل المشروع' : 'View Details'}
                        className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingProject(p);
                          setNewStatus(p.status);
                        }}
                        title={language === 'ar' ? 'تعديل الحالة' : 'Change Status'}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            {language === 'ar'
              ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(
                  currentPage * pageSize,
                  filteredProjects.length
                )} من ${filteredProjects.length}`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  filteredProjects.length
                )} of ${filteredProjects.length}`}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white"
            >
              {language === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <span className="px-2 font-mono font-bold tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-white"
            >
              {language === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Project Details Modal / Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-900 dark:text-white" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? `تفاصيل المشروع #${selectedProject.jobId}` : `Project #${selectedProject.jobId} Details`}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Job ID</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {selectedProject.jobId}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Date Approved</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {selectedProject.dateApproved || '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Project Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedProject.status === 'Archived'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedProject.status === 'Missing'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedProject.status}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Archive Location</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Box {selectedProject.boxId} · Dossier {selectedProject.dossierNumber} (Slot #{selectedProject.slotIndex + 1})
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Source Upload</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                  {selectedProject.sourceUpload}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Last Update</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                  {selectedProject.lastUpdateDate.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            </div>

            {/* Status History */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'سجل تغير الحالة (Status History)' : 'Status History'}</span>
              </h3>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                {selectedProject.statusHistory.map((h, i) => (
                  <div key={i} className="text-[11px] flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60 last:border-none">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {h.status}
                      </span>
                      {h.note && <span className="text-slate-400">· {h.note}</span>}
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{h.timestamp.slice(0, 16)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setEditingProject(selectedProject);
                  setNewStatus(selectedProject.status);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                {language === 'ar' ? 'تعديل الحالة' : 'Change Status'}
              </button>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? `تعديل حالة المشروع #${editingProject.jobId}` : `Update Status for Job #${editingProject.jobId}`}
            </h2>

            <form onSubmit={handleSaveStatus} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'الحالة الجديدة' : 'New Status'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Archived', 'Missing', 'Pending'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewStatus(s)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        newStatus === s
                          ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'ar' ? 'ملاحظة التعديل' : 'Update Note'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: تم العثور على الملف يدويًا...' : 'Reason for manual status change...'}
                  value={updateNote}
                  onChange={e => setUpdateNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  {language === 'ar' ? 'حفظ التعديل' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
