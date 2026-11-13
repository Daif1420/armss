/**
 * ARMS - Thermal Label Printing System (Section 8)
 * Conforms 100% to approved archive label specification specifications.
 * 100 x 50 mm Landscape, monochrome black & white, jsPDF 7-page export, live 1:1 preview.
 */

import React, { useState, useEffect } from 'react';
import { Printer, Download, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { LabelData } from '../../types';
import { LabelCanvasPreview } from './LabelCanvasPreview';
import { buildBoxLabelPackage, generateLabelsPDF } from '../../utils/labelGenerator';
import { ActiveTab } from '../navigation/TopNav';

interface LabelsViewProps {
  initialBoxCode?: string;
  onNavigate: (tab: ActiveTab, param?: string) => void;
}

export const LabelsView: React.FC<LabelsViewProps> = ({ initialBoxCode, onNavigate }) => {
  const { boxes, language } = useArchive();

  // Mode: automatic (from existing box) or manual
  const [mode, setMode] = useState<'automatic' | 'manual' | 'single-dossier'>('automatic');

  // Automatic mode state
  const defaultBox = boxes.find(b => b.boxCode === initialBoxCode) || boxes[0];
  const [selectedBoxCode, setSelectedBoxCode] = useState<string>(
    initialBoxCode?.includes(':') ? initialBoxCode.split(':')[0] : defaultBox?.boxCode || 'D42'
  );

  // Manual mode state
  const [manualBoxCode, setManualBoxCode] = useState('D42');
  const [manualFirstJobId, setManualFirstJobId] = useState(35500);

  // Single dossier mode state
  const [singleDossierNumber, setSingleDossierNumber] = useState<number>(
    initialBoxCode?.includes(':') ? Number(initialBoxCode.split(':')[1]) : 1
  );
  const [singleDossierFirstJobId, setSingleDossierFirstJobId] = useState(35500);

  // Current active label in preview carousel (0 = Box Label, 1..6 = Dossiers 1..6)
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState(1.0);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Compute label package based on mode
  const currentBox = boxes.find(b => b.boxCode === selectedBoxCode);

  let activeLabels: LabelData[] = [];

  if (mode === 'automatic') {
    const boxCode = currentBox ? currentBox.boxCode : selectedBoxCode;
    const firstId = currentBox ? currentBox.firstJobId : 35500;
    activeLabels = buildBoxLabelPackage(boxCode, firstId);
  } else if (mode === 'manual') {
    activeLabels = buildBoxLabelPackage(manualBoxCode.toUpperCase(), Number(manualFirstJobId));
  } else {
    // Single Dossier
    const fromId = Number(singleDossierFirstJobId);
    activeLabels = [
      {
        type: 'dossier',
        boxCode: manualBoxCode.toUpperCase(),
        dossierNumber: singleDossierNumber,
        totalDossiers: 6,
        fromJobId: fromId,
        toJobId: fromId + 49,
      },
    ];
  }

  // Keep active preview index within bounds
  useEffect(() => {
    if (activePreviewIndex >= activeLabels.length) {
      setActivePreviewIndex(0);
    }
  }, [activeLabels.length, activePreviewIndex]);

  const currentPreviewLabel = activeLabels[activePreviewIndex] || activeLabels[0];

  // Download PDF matching the exact 100 x 50 mm specification
  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const pdf = await generateLabelsPDF(activeLabels);
      const filename =
        mode === 'single-dossier'
          ? `Label_${manualBoxCode}_Dossier_${singleDossierNumber}.pdf`
          : `Labels_${activeLabels[0].boxCode}_7Pages.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed generating PDF labels');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 text-slate-900 dark:text-white" />
            <span>{language === 'ar' ? 'نظام طباعة الليبلات الحرارية (100×50 مم)' : 'Thermal Label Generator (100x50 mm)'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'مطابق بنسبة 100% للملف المعتمد approved archive label specification — أسود وأبيض فقط، وشعار Intercom مدمج.'
              : 'Strict 1:1 conformity with approved approved archive label specification standard — Black & white thermal ready.'}
          </p>
        </div>

        {/* Print / Download buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {generatingPdf
                ? 'Generating PDF...'
                : mode === 'single-dossier'
                ? (language === 'ar' ? 'تحميل ليبل PDF (صفحة 1)' : 'Download 1-Page PDF')
                : (language === 'ar' ? 'تحميل ملف PDF (7 صفحات)' : 'Download 7-Page PDF')}
            </span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Controls on left, Live 1:1 Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mode Selector */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'طريقة تحديد الليبل' : 'Generation Mode'}
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setMode('automatic')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-colors text-center ${
                  mode === 'automatic'
                    ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {language === 'ar' ? 'آلي (من بوكس)' : 'Automatic (Box)'}
              </button>

              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-colors text-center ${
                  mode === 'manual'
                    ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {language === 'ar' ? 'يدوي (Manual)' : 'Manual (Range)'}
              </button>

              <button
                type="button"
                onClick={() => setMode('single-dossier')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-colors text-center ${
                  mode === 'single-dossier'
                    ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {language === 'ar' ? 'دوسيه منفرد' : 'Single Dossier'}
              </button>
            </div>

            {/* Mode 1: Automatic */}
            {mode === 'automatic' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'ar' ? 'اختر البوكس المطلوب' : 'Select Box from System'}
                  </label>
                  <select
                    value={selectedBoxCode}
                    onChange={e => setSelectedBoxCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    {boxes.map(b => (
                      <option key={b.id} value={b.boxCode}>
                        Box {b.boxCode} (#{b.firstJobId} → #{b.lastJobId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'حزمة الليبلات الناتجة (7 صفحات):' : 'Output Package (7 Pages):'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    · Page 1: Box {currentBox?.boxCode || selectedBoxCode} (#{currentBox?.firstJobId} → #{currentBox?.lastJobId})
                    <br />
                    · Pages 2-7: Dossiers 1 to 6 (50 projects each)
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Manual */}
            {mode === 'manual' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'ar' ? 'كود البوكس (Box Code)' : 'Box Code'}
                  </label>
                  <input
                    type="text"
                    value={manualBoxCode}
                    onChange={e => setManualBoxCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'ar' ? 'رقم أول مشروع في البوكس (First Job ID)' : 'First Project Number'}
                  </label>
                  <input
                    type="number"
                    value={manualFirstJobId}
                    onChange={e => setManualFirstJobId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums font-bold"
                  />
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
                  {language === 'ar'
                    ? `النظام يحسب تلقائيًا آخر رقم (+299): #${Number(manualFirstJobId) + 299} ونطاقات الـ 6 دوسيهات (+49 لكل دوسيه).`
                    : `System auto-calculates last ID (+299): #${Number(manualFirstJobId) + 299} and all 6 dossier spans (+49 each).`}
                </div>
              </div>
            )}

            {/* Mode 3: Single Dossier */}
            {mode === 'single-dossier' && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'ar' ? 'كود البوكس' : 'Box Code'}
                    </label>
                    <input
                      type="text"
                      value={manualBoxCode}
                      onChange={e => setManualBoxCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'ar' ? 'رقم الدوسيه (1-6)' : 'Dossier # (1-6)'}
                    </label>
                    <select
                      value={singleDossierNumber}
                      onChange={e => {
                        const dNum = Number(e.target.value);
                        setSingleDossierNumber(dNum);
                        // Auto update first job id offset
                        setSingleDossierFirstJobId(35500 + (dNum - 1) * 50);
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>
                          Dossier {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'ar' ? 'رقم أول مشروع في الدوسيه' : 'First Project in Dossier'}
                  </label>
                  <input
                    type="number"
                    value={singleDossierFirstJobId}
                    onChange={e => setSingleDossierFirstJobId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums font-bold"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    {language === 'ar'
                      ? `النطاق المحسوب: من #${singleDossierFirstJobId} إلى #${Number(singleDossierFirstJobId) + 49}`
                      : `Calculated range: #${singleDossierFirstJobId} → #${Number(singleDossierFirstJobId) + 49}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Standards & Geometry Specifications Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-600" />
              <span>{language === 'ar' ? 'المعايير الهندسية لليبل الحراري:' : 'Approved Thermal Geometry:'}</span>
            </div>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <li>· <strong>Dimensions:</strong> 100 × 50 mm (Landscape).</li>
              <li>· <strong>Header Bar:</strong> Solid black top with white Intercom logo.</li>
              <li>· <strong>Left Box:</strong> Rounded rect with divider at Y ≈ 35mm.</li>
              <li>· <strong>QR Code:</strong> Top right (X: 62.5, Y: 14.8) with corner brackets.</li>
              <li>· <strong>Range:</strong> FROM / TO box (50.9 → 94 mm) split vertically.</li>
              <li>· <strong>Colors:</strong> 100% Monochrome Black/White. No gradients.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live 1:1 Vector Preview & Carousel Switcher */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'المعاينة المباشرة (مطابقة 1:1 للطباعة)' : 'Live 1:1 Print Preview'}
                </h2>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentPreviewLabel.type === 'box'
                    ? `Box Label · ${currentPreviewLabel.boxCode}`
                    : `Dossier ${currentPreviewLabel.dossierNumber} Label · Box ${currentPreviewLabel.boxCode}`}
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setPreviewScale(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1.5 tabular-nums">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  onClick={() => setPreviewScale(prev => Math.min(1.4, prev + 0.1))}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Preview Center */}
            <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center overflow-auto min-h-[260px]">
              {currentPreviewLabel && (
                <LabelCanvasPreview data={currentPreviewLabel} scale={previewScale} />
              )}
            </div>

            {/* Carousel Tabs for the 7 pages */}
            {activeLabels.length > 1 && (
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'ar' ? 'صفحات الملف السبعة (اختر للمعاينة):' : 'Package Pages (Click to inspect):'}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {activeLabels.map((l, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        activePreviewIndex === idx
                          ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono">
                        {l.type === 'box' ? 'Box' : `D${l.dossierNumber}`}
                      </div>
                      <div className="text-[9px] opacity-75 font-mono truncate">
                        #{l.fromJobId}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
