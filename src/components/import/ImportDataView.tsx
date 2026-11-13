/**
 * ARMS - Excel Import Engine View
 * Section 5: Specialized parser for NBE_Project_Volume_500M_V2.xlsx
 * Reads Job ID, Date Approved and Archive status.
 */

import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, FileCheck, Info, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useArchive } from '../../context/ArchiveContext';
import {
  parseExcelWorkbook,
  SheetParseResult,
} from '../../utils/excelParser';
import { ActiveTab } from '../navigation/TopNav';

interface ImportDataViewProps {
  onNavigate: (tab: ActiveTab, param?: string) => void;
}

export const ImportDataView: React.FC<ImportDataViewProps> = ({ onNavigate }) => {
  const { boxes, importExcelProjects, uploadHistory, projects, language } = useArchive();

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentWorkbook, setCurrentWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parseResult, setParseResult] = useState<SheetParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [targetBoxCode, setTargetBoxCode] = useState<string>('auto');
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing job ids set for fast duplicate detection
  const existingJobIds = new Set(projects.filter(p => p.sourceUpload !== 'Reserved Slot' && p.sourceUpload !== 'System Slot').map(p => p.jobId));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setLoading(true);
    setImportSuccessMessage(null);
    setUploadedFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      setCurrentWorkbook(wb);

      // Prefer "بيانات المشاريع"
      const preferred = wb.SheetNames.find(s => s.trim() === 'بيانات المشاريع') || wb.SheetNames[0];
      setSelectedSheet(preferred);

      const result = parseExcelWorkbook(wb, preferred, existingJobIds);
      setParseResult(result);
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      alert(`Failed to parse Excel file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!currentWorkbook) return;
    setSelectedSheet(sheetName);
    const result = parseExcelWorkbook(currentWorkbook, sheetName, existingJobIds);
    setParseResult(result);
  };

  const handleExecuteImport = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    const rowsToImport = parseResult.validRows.map(r => ({
      jobId: r.jobId!,
      dateApproved: r.dateApproved,
      archiveStatus: r.archiveStatus,
    }));

    const result = importExcelProjects(
      rowsToImport,
      uploadedFileName,
      targetBoxCode === 'auto' ? undefined : targetBoxCode
    );

    setImportSuccessMessage(
      language === 'ar'
        ? `تم استيراد ${result.importedCount} مشروع. مكرر: ${result.duplicateCount}، مرفوض: ${result.rejectedCount}.`
        : `Imported ${result.importedCount} projects. Duplicates: ${result.duplicateCount}; rejected: ${result.rejectedCount}.`
    );

    // Clear preview
    setParseResult(null);
    setCurrentWorkbook(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'استيراد بيانات Excel' : 'Excel Import Engine'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'محرك استيراد متخصص لشيت "بيانات المشاريع" — قراءة Job ID و Date Approved وحالة Archive.'
              : 'Engine tuned for "بيانات المشاريع" sheet — strictly imports Job ID & Date Approved only.'}
          </p>
        </div>


      </div>

      {/* Success Banner */}
      {importSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            onClick={() => onNavigate('boxes')}
            className="text-xs font-bold underline hover:text-emerald-950"
          >
            {language === 'ar' ? 'معاينة البوكسات' : 'View Boxes'}
          </button>
        </div>
      )}

      {/* Specification Rules Card */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-300">
        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'ar' ? 'قواعد مطابقة ملف NBE_Project_Volume_500M_V2.xlsx:' : 'Excel Parser Matching Specification:'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div>· {language === 'ar' ? 'الشيت المستهدف: "بيانات المشاريع" (الهيدر في الصف 9، والبيانات تبدأ من الصف 12).' : 'Target Sheet: "بيانات المشاريع" (Header at row 9, data starts at row 12).'}</div>
          <div>· {language === 'ar' ? 'تجاهل صفوف الملخص 10 و 11 لأن Job ID فيها فارغ.' : 'Summary rows 10 & 11 skipped automatically.'}</div>
          <div>· {language === 'ar' ? 'يتم قراءة Job ID و Date Approved وحالة Archive، مع تجاهل باقي الأعمدة.' : 'Reads Job ID, Date Approved and Archive status only.'}</div>
          <div>· {language === 'ar' ? 'دعم تواريخ Excel الحقيقية وصيغ dd-mm-yyyy، وقراءة حالة الأرشيف.' : 'Excel date parsing and archive status mapping.'}</div>
        </div>
      </div>

      {/* Upload Zone */}
      {!parseResult && (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`p-10 border-2 border-dashed rounded-2xl text-center transition-all bg-white dark:bg-slate-900 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={e => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-3">
            <Upload className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {language === 'ar' ? 'اسحب ملف Excel هنا أو اضغط للاختيار' : 'Drag and drop Excel file here or click to browse'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {language === 'ar' ? 'يدعم .xlsx, .xls, .csv (حجم حتى 50MB)' : 'Supports .xlsx, .xls, .csv (up to 50MB)'}
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg transition-colors shadow-xs"
          >
            {loading ? (language === 'ar' ? 'جاري القراءة...' : 'Reading...') : (language === 'ar' ? 'اختيار ملف من الجهاز' : 'Select File')}
          </button>
        </div>
      )}

      {/* Preview Section before Import */}
      {parseResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'معاينة البيانات قبل الاعتماد (Import Preview)' : 'Pre-Import Data Preview'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {uploadedFileName} · {parseResult.validRows.length} {language === 'ar' ? 'مشروع جاهز للاستيراد' : 'records ready'}
              </p>
            </div>

            {/* Sheet Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">{language === 'ar' ? 'الشيت:' : 'Sheet:'}</span>
                <select
                  value={selectedSheet}
                  onChange={e => handleSheetChange(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                >
                  {parseResult.availableSheets.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Box Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">{language === 'ar' ? 'البوكس:' : 'Box:'}</span>
                <select
                  value={targetBoxCode}
                  onChange={e => setTargetBoxCode(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                >
                  <option value="auto">{language === 'ar' ? 'تلقائي (حسب أرقام Job ID)' : 'Auto-match by ID'}</option>
                  {boxes.map(b => (
                    <option key={b.id} value={b.boxCode}>
                      Box {b.boxCode} ({b.firstJobId} - {b.lastJobId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Verification KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'إجمالي الصفوف المفحوصة' : 'Scanned Rows'}</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {parseResult.totalRowsRead}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">{language === 'ar' ? 'المشاريع الصالحة للاستيراد' : 'Valid Projects'}</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {parseResult.validRows.length}
              </span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 block">{language === 'ar' ? 'التكرارات المكتشفة' : 'Duplicates Skipped'}</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                {parseResult.duplicateCount}
              </span>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 block">{language === 'ar' ? 'صفوف غير صالحة' : 'Invalid Rows'}</span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                {parseResult.invalidRows.length}
              </span>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-12">Row</th>
                    <th className="px-3 py-2">Job ID (Extracted)</th>
                    <th className="px-3 py-2">Date Approved</th>
                    <th className="px-3 py-2">Archive Status</th>
                    <th className="px-3 py-2">Validation Status</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parseResult.previewRows.slice(0, 30).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-[11px] tabular-nums">
                        {r.rowIndex}
                      </td>
                      <td className="px-3 py-1.5 font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {r.jobId || r.rawJobId || '—'}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {r.dateApproved || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.archiveStatus || '—'}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.status === 'valid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'duplicate'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-500">
                        {r.errorNote || (r.isExisting ? 'Existing in system' : 'New record')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm & Cancel Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setParseResult(null);
                setCurrentWorkbook(null);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {language === 'ar' ? 'إلغاء المعاينة' : 'Cancel Preview'}
            </button>

            <button
              onClick={handleExecuteImport}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? `تأكيد استيراد ${parseResult.validRows.length} مشروع`
                  : `Confirm Import of ${parseResult.validRows.length} Projects`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Upload History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>{language === 'ar' ? 'سجل عمليات الرفع السابقة (Upload History)' : 'Upload History Log'}</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2">{language === 'ar' ? 'اسم الملف' : 'File Name'}</th>
                <th className="px-3 py-2">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="px-3 py-2">{language === 'ar' ? 'التاريخ والوقت' : 'Date / Time'}</th>
                <th className="px-3 py-2 text-right">{language === 'ar' ? 'إجمالي الصفوف' : 'Total Rows'}</th>
                <th className="px-3 py-2 text-right text-emerald-600">{language === 'ar' ? 'المستورد' : 'Imported'}</th>
                <th className="px-3 py-2 text-right text-amber-600">{language === 'ar' ? 'المكرر' : 'Duplicates'}</th>
                <th className="px-3 py-2">{language === 'ar' ? 'النتيجة' : 'Result'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {uploadHistory.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                    {u.fileName}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{u.userName}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">{u.timestamp}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{u.totalRows}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-600 font-mono tabular-nums">
                    {u.importedCount}
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-600 font-mono tabular-nums">
                    {u.duplicateCount}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
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
    </div>
  );
};
