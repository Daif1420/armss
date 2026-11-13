/**
 * ARMS - Reports Engine (Section 9)
 * All 12 specialized archive reports with filters and multi-format export (Excel, PDF, Print).
 */

import React, { useState } from 'react';
import { FileBarChart, Download, Printer, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { useArchive } from '../../context/ArchiveContext';
import { ActiveTab } from '../navigation/TopNav';

export type ReportType =
  | 'archived-projects'
  | 'missing-projects'
  | 'pending-projects'
  | 'archived-boxes'
  | 'inprogress-boxes'
  | 'dossier-report'
  | 'box-details-report'
  | 'archive-summary'
  | 'upload-history'
  | 'user-activity'
  | 'exception-report'
  | 'force-close-report';

interface ReportsViewProps {
  onNavigate: (tab: ActiveTab, param?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNavigate }) => {
  const { boxes, dossiers, projects, uploadHistory, auditLogs, language } = useArchive();

  const [activeReport, setActiveReport] = useState<ReportType>('archived-projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [boxFilter, setBoxFilter] = useState('all');

  const reportOptions: { id: ReportType; titleAr: string; titleEn: string; category: string }[] = [
    { id: 'archived-projects', titleAr: '1. تقرير المشاريع المؤرشفة', titleEn: '1. Archived Projects', category: 'Projects' },
    { id: 'missing-projects', titleAr: '2. تقرير المشاريع المفقودة (الفجوات)', titleEn: '2. Missing Projects (Gaps)', category: 'Projects' },
    { id: 'pending-projects', titleAr: '3. تقرير المشاريع قيد الانتظار', titleEn: '3. Pending Projects', category: 'Projects' },
    { id: 'archived-boxes', titleAr: '4. تقرير البوكسات المكتملة', titleEn: '4. Archived Boxes', category: 'Boxes' },
    { id: 'inprogress-boxes', titleAr: '5. تقرير البوكسات الجارية', titleEn: '5. Inprogress Boxes', category: 'Boxes' },
    { id: 'dossier-report', titleAr: '6. تقرير الدوسيهات الشامل', titleEn: '6. Dossiers Overview', category: 'Dossiers' },
    { id: 'box-details-report', titleAr: '7. تقرير تفاصيل البوكسات والدوسيهات', titleEn: '7. Box & Dossier Details', category: 'Boxes' },
    { id: 'archive-summary', titleAr: '8. الملخص العام للأرشفة', titleEn: '8. Archive Summary', category: 'Executive' },
    { id: 'upload-history', titleAr: '9. تقرير سجل عمليات الرفع', titleEn: '9. Upload History Log', category: 'Upload' },
    { id: 'user-activity', titleAr: '10. تقرير نشاط المستخدمين (Audit)', titleEn: '10. User Activity (Audit)', category: 'Security' },
    { id: 'exception-report', titleAr: '11. تقرير الاستثناءات والفجوات', titleEn: '11. Exception Report', category: 'Quality' },
    { id: 'force-close-report', titleAr: '12. تقرير الإغلاق الإداري (Force Close)', titleEn: '12. Force Close Report', category: 'Audit' },
  ];

  // Build report dataset based on selected report
  let reportColumns: string[] = [];
  let reportData: any[] = [];

  switch (activeReport) {
    case 'archived-projects':
      reportColumns = ['Job ID', 'Date Approved', 'Box Code', 'Dossier #', 'Slot #', 'Source Upload'];
      reportData = projects
        .filter(p => p.status === 'Archived' && (boxFilter === 'all' || p.boxId === boxFilter))
        .map(p => ({
          'Job ID': p.jobId,
          'Date Approved': p.dateApproved || '—',
          'Box Code': p.boxId,
          'Dossier #': p.dossierNumber,
          'Slot #': p.slotIndex + 1,
          'Source Upload': p.sourceUpload,
        }));
      break;

    case 'missing-projects':
      reportColumns = ['Job ID', 'Box Code', 'Dossier #', 'Slot #', 'Status', 'Gap Proof'];
      reportData = projects
        .filter(p => p.status === 'Missing' && (boxFilter === 'all' || p.boxId === boxFilter))
        .map(p => ({
          'Job ID': p.jobId,
          'Box Code': p.boxId,
          'Dossier #': p.dossierNumber,
          'Slot #': p.slotIndex + 1,
          'Status': 'Missing',
          'Gap Proof': 'Higher Job IDs exist in sequence',
        }));
      break;

    case 'pending-projects':
      reportColumns = ['Job ID', 'Box Code', 'Dossier #', 'Slot #', 'Status'];
      reportData = projects
        .filter(p => p.status === 'Pending' && (boxFilter === 'all' || p.boxId === boxFilter))
        .map(p => ({
          'Job ID': p.jobId,
          'Box Code': p.boxId,
          'Dossier #': p.dossierNumber,
          'Slot #': p.slotIndex + 1,
          'Status': 'Pending Delivery',
        }));
      break;

    case 'archived-boxes':
      reportColumns = ['Box Code', 'First Job ID', 'Last Job ID', 'Total Projects', 'Completed Dossiers', 'Status'];
      reportData = boxes
        .filter(b => b.status === 'Archived')
        .map(b => ({
          'Box Code': b.boxCode,
          'First Job ID': b.firstJobId,
          'Last Job ID': b.lastJobId,
          'Total Projects': `${b.archivedProjects} / 300`,
          'Completed Dossiers': `${b.completedDossiers} / 6`,
          'Status': b.status,
        }));
      break;

    case 'inprogress-boxes':
      reportColumns = ['Box Code', 'Range', 'Archived', 'Missing', 'Pending', 'Completion %', 'Force Closed'];
      reportData = boxes
        .filter(b => b.status === 'Inprogress')
        .map(b => ({
          'Box Code': b.boxCode,
          'Range': `${b.firstJobId} → ${b.lastJobId}`,
          'Archived': `${b.archivedProjects} / 300`,
          'Missing': b.missingProjects,
          'Pending': b.pendingProjects,
          'Completion %': `${((b.archivedProjects / 300) * 100).toFixed(0)}%`,
          'Force Closed': b.isForceClosed ? `Yes (${b.forceCloseReason})` : 'No',
        }));
      break;

    case 'dossier-report':
      reportColumns = ['Dossier ID', 'Box Code', 'Dossier #', 'Range', 'Archived (50)', 'Missing', 'Pending', 'Status'];
      reportData = dossiers
        .filter(d => boxFilter === 'all' || d.boxId === boxFilter)
        .map(d => ({
          'Dossier ID': d.id,
          'Box Code': d.boxId,
          'Dossier #': d.dossierNumber,
          'Range': `${d.fromJobId} → ${d.toJobId}`,
          'Archived (50)': `${d.archivedCount} / 50`,
          'Missing': d.missingCount,
          'Pending': d.pendingCount,
          'Status': d.status,
        }));
      break;

    case 'box-details-report':
      reportColumns = ['Box Code', 'Total Dossiers', 'Total Projects', 'Archived', 'Missing', 'Force Closed', 'Created'];
      reportData = boxes.map(b => ({
        'Box Code': b.boxCode,
        'Total Dossiers': 6,
        'Total Projects': 300,
        'Archived': b.archivedProjects,
        'Missing': b.missingProjects,
        'Force Closed': b.isForceClosed ? 'Yes' : 'No',
        'Created': b.createdAt.slice(0, 10),
      }));
      break;

    case 'archive-summary':
      reportColumns = ['Metric', 'Count / Value', 'Notes'];
      reportData = [
        { 'Metric': 'Total Projects Capacity', 'Count / Value': projects.length, 'Notes': 'Strict 300 slots per box' },
        { 'Metric': 'Archived Projects', 'Count / Value': projects.filter(p => p.status === 'Archived').length, 'Notes': 'Successfully imported' },
        { 'Metric': 'Missing Projects', 'Count / Value': projects.filter(p => p.status === 'Missing').length, 'Notes': 'Proven sequence gaps' },
        { 'Metric': 'Pending Projects', 'Count / Value': projects.filter(p => p.status === 'Pending').length, 'Notes': 'Awaiting physical delivery' },
        { 'Metric': 'Total Boxes', 'Count / Value': boxes.length, 'Notes': 'Active repository boxes' },
        { 'Metric': 'Archived Boxes', 'Count / Value': boxes.filter(b => b.status === 'Archived').length, 'Notes': '100% completed' },
        { 'Metric': 'Force Closed Boxes', 'Count / Value': boxes.filter(b => b.isForceClosed).length, 'Notes': 'Administrative closures' },
      ];
      break;

    case 'upload-history':
      reportColumns = ['File Name', 'User', 'Timestamp', 'Total Rows', 'Imported', 'Duplicates', 'Status'];
      reportData = uploadHistory.map(u => ({
        'File Name': u.fileName,
        'User': u.userName,
        'Timestamp': u.timestamp,
        'Total Rows': u.totalRows,
        'Imported': u.importedCount,
        'Duplicates': u.duplicateCount,
        'Status': u.status,
      }));
      break;

    case 'user-activity':
      reportColumns = ['Timestamp', 'User', 'Action', 'Record Type', 'Record ID', 'Details'];
      reportData = auditLogs.map(a => ({
        'Timestamp': a.timestamp,
        'User': a.userName,
        'Action': a.action,
        'Record Type': a.recordType,
        'Record ID': a.recordId,
        'Details': a.details,
      }));
      break;

    case 'exception-report':
      reportColumns = ['Job ID', 'Box Code', 'Dossier #', 'Anomaly Type', 'Action Required'];
      reportData = projects
        .filter(p => p.status === 'Missing')
        .map(p => ({
          'Job ID': p.jobId,
          'Box Code': p.boxId,
          'Dossier #': p.dossierNumber,
          'Anomaly Type': 'Proven Sequence Gap',
          'Action Required': 'Physical audit of branch folder',
        }));
      break;

    case 'force-close-report':
      reportColumns = ['Box Code', 'Range', 'Reason for Closure', 'Closed By', 'Closed At', 'Archived Count'];
      reportData = boxes
        .filter(b => b.isForceClosed)
        .map(b => ({
          'Box Code': b.boxCode,
          'Range': `${b.firstJobId} → ${b.lastJobId}`,
          'Reason for Closure': b.forceCloseReason || 'No reason provided',
          'Closed By': b.forceClosedBy || 'Admin',
          'Closed At': b.forceClosedAt || '—',
          'Archived Count': `${b.archivedProjects} / 300`,
        }));
      break;
  }

  // Filter report data with local search term
  const filteredReportData = reportData.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Export to Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredReportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `ARMS_${activeReport}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(14);
    pdf.text(`ARMS Report: ${activeReport.toUpperCase().replace('-', ' ')}`, 14, 15);
    pdf.setFontSize(9);
    pdf.text(`Generated on: ${new Date().toLocaleString()} · Total Records: ${filteredReportData.length}`, 14, 22);

    // Simple formatted table
    let y = 30;
    const colWidth = 270 / reportColumns.length;

    // Header
    pdf.setFont('helvetica', 'bold');
    reportColumns.forEach((col, i) => {
      pdf.text(col, 14 + i * colWidth, y);
    });

    pdf.line(14, y + 2, 280, y + 2);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    filteredReportData.slice(0, 25).forEach(row => {
      reportColumns.forEach((col, i) => {
        pdf.text(String(row[col] ?? '').slice(0, 25), 14 + i * colWidth, y);
      });
      y += 6;
      if (y > 190) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save(`ARMS_${activeReport}_Report.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>{language === 'ar' ? 'مركز التقارير المتقدمة (12 تقرير)' : 'Advanced Reports Center'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تصدير كامل لكافة تقارير الأرشفة، النواقص، البوكسات، وعمليات الإغلاق الإداري إلى Excel و PDF.'
              : 'Full export capabilities for archived projects, missing gaps, boxes, and audit logs to Excel & PDF.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تصدير إلى Excel' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تصدير إلى PDF' : 'Export PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Report Selection List on left, Data Table on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: 12 Reports Menu */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            {language === 'ar' ? 'التقارير المتوفرة (12 تقرير)' : 'Available Reports'}
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {reportOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveReport(opt.id);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  activeReport === opt.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{language === 'ar' ? opt.titleAr : opt.titleEn}</span>
                <span className="text-[10px] opacity-60 font-mono">{opt.category}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Filters & Dynamic Report Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar'
                  ? reportOptions.find(r => r.id === activeReport)?.titleAr
                  : reportOptions.find(r => r.id === activeReport)?.titleEn}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ar'
                  ? `إجمالي السجلات المستخرجة: ${filteredReportData.length} سجل`
                  : `Total matching records: ${filteredReportData.length}`}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'تصفية النتائج...' : 'Filter in table...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none w-36 sm:w-44"
                />
              </div>

              {/* Box filter for project/dossier reports */}
              {(activeReport.includes('project') || activeReport.includes('dossier')) && (
                <select
                  value={boxFilter}
                  onChange={e => setBoxFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="all">{language === 'ar' ? 'كافة البوكسات' : 'All Boxes'}</option>
                  {boxes.map(b => (
                    <option key={b.id} value={b.boxCode}>
                      Box {b.boxCode}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table display */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 w-12">#</th>
                    {reportColumns.map(col => (
                      <th key={col} className="px-3 py-2.5">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReportData.length > 0 ? (
                    filteredReportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-400 font-mono text-[11px] tabular-nums">
                          {idx + 1}
                        </td>
                        {reportColumns.map(col => (
                          <td
                            key={col}
                            className={`px-3 py-2 ${
                              col === 'Job ID' || col === 'First Job ID' || col === 'Range'
                                ? 'font-mono font-bold text-slate-900 dark:text-white tabular-nums'
                                : col === 'Status' || col === 'Validation Status'
                                ? 'font-semibold'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {String(row[col] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={reportColumns.length + 1} className="py-8 text-center text-slate-400">
                        {language === 'ar' ? 'لا توجد بيانات متطابقة مع شروط البحث' : 'No records match current filter'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
