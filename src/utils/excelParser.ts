/**
 * ARMS - Excel Import Engine
 * Specialized parser for NBE_Project_Volume_500M_V2.xlsx and custom Excel sheets.
 * Reads Job ID, Date Approved and Archive status; ignores unrelated columns.
 */

import * as XLSX from 'xlsx';

export interface ParsedRow {
  rowIndex: number;
  rawJobId: any;
  jobId: number | null;
  rawDate: any;
  dateApproved: string | null;
  archiveStatus?: 'Archived' | 'Pending';
  status: 'valid' | 'duplicate' | 'invalid_id' | 'invalid_date' | 'empty';
  errorNote?: string;
  isExisting?: boolean;
}

export interface SheetParseResult {
  sheetName: string;
  availableSheets: string[];
  headerRowIndex: number; // 0-indexed
  dataStartRowIndex: number;
  totalRowsRead: number;
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  duplicateCount: number;
  previewRows: ParsedRow[];
  summary: {
    totalParsed: number;
    validCount: number;
    errorCount: number;
    duplicateCount: number;
  };
}

/**
 * Format Excel date / string into clean YYYY-MM-DD
 */
export function parseDateOfDelivery(val: any): { dateStr: string | null; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { dateStr: null };
  }

  // If number, Excel serial date (e.g. 45214)
  if (typeof val === 'number') {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(val);
      if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
        const yyyy = String(parsedDate.y);
        const mm = String(parsedDate.m).padStart(2, '0');
        const dd = String(parsedDate.d).padStart(2, '0');
        return { dateStr: `${yyyy}-${mm}-${dd}` };
      }
    } catch {
      // fallback
    }
  }

  // If string
  const str = String(val).trim();
  if (!str) return { dateStr: null };

  // Check for common non-date text like "Intercom" or "Pending"
  if (/^[A-Za-z\s]+$/.test(str) && !str.includes('-') && !str.includes('/')) {
    return { dateStr: null, error: `Invalid date format: "${str}"` };
  }

  // Try dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return { dateStr: `${y}-${m}-${d}` };
  }

  // Try yyyy-mm-dd
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}` };
  }

  // Generic Date parse attempt
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    return { dateStr: parsed.toISOString().split('T')[0] };
  }

  return { dateStr: null, error: `Unrecognized date: "${str}"` };
}

/**
 * Parses an Excel Workbook
 */
export function parseExcelWorkbook(
  workbook: XLSX.WorkBook,
  targetSheetName?: string,
  existingJobIds?: Set<number>
): SheetParseResult {
  const availableSheets = workbook.SheetNames;
  
  // Prefer "بيانات المشاريع" if targetSheetName not provided
  let selectedSheet = targetSheetName;
  if (!selectedSheet || !availableSheets.includes(selectedSheet)) {
    const preferred = availableSheets.find(s => s.trim() === 'بيانات المشاريع');
    selectedSheet = preferred || availableSheets[0];
  }

  const sheet = workbook.Sheets[selectedSheet];
  if (!sheet) {
    throw new Error(`Sheet ${selectedSheet} not found in workbook`);
  }

  // Convert sheet to array of rows (2D array)
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  // Find header row containing "Job ID" (case insensitive, or arabic equivalent if any)
  let headerRowIndex = -1;
  let jobIdColIndex = -1;
  let dateColIndex = -1;
  let archiveColIndex = -1;

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim().toLowerCase();
      // Look for Job ID
      if (cellVal === 'job id' || cellVal === 'job_id' || cellVal === 'jobid' || cellVal === 'رقم المشروع') {
        jobIdColIndex = c;
        headerRowIndex = r;
      }
      // Look for Date Of Delivery
      if (
        cellVal === 'date of delivery' ||
        cellVal === 'date_of_delivery' ||
        cellVal === 'delivery date' ||
        cellVal === 'date approved' ||
        cellVal === 'تاريخ التسليم' ||
        cellVal === 'تاريخ الاعتماد'
      ) {
        dateColIndex = c;
      }
      if (['archive', 'archive status', 'archived', 'archive flag', 'حالة الأرشيف', 'الأرشيف'].includes(cellVal)) archiveColIndex = c;
    }

    if (jobIdColIndex !== -1 && dateColIndex !== -1) {
      break;
    }
  }

  // Fallbacks if not detected by header name
  if (jobIdColIndex === -1) {
    // Check row 8 (which is 9th row in 1-based indexing, per spec notes: header at row 9)
    if (rows.length > 8) {
      headerRowIndex = 8;
      // Search for any column looking like numeric job id or delivery date in subsequent rows
      jobIdColIndex = 1; // default fallback
      dateColIndex = 2;
    } else {
      headerRowIndex = 0;
      jobIdColIndex = 0;
      dateColIndex = 1;
    }
  }

  // If date column wasn't explicitly found next to Job ID, look in same row
  if (dateColIndex === -1) {
    const headerRow = rows[headerRowIndex] || [];
    dateColIndex = headerRow.findIndex((cell: any) =>
      String(cell).toLowerCase().includes('date') || String(cell).includes('تاريخ')
    );
    if (dateColIndex === -1) dateColIndex = jobIdColIndex + 1;
  }

  // Status rule: a Job ID present in the file with a valid approval date is Archived (the archive column is ignored).
  // A row without a valid date stays Pending (reserved).

  // Determine data start row (per spec, if header in row 9 (index 8), data starts row 12 (index 11))
  let dataStartRowIndex = headerRowIndex + 1;
  if (headerRowIndex === 8 && rows.length >= 12) {
    dataStartRowIndex = 11; // Row 12 (0-indexed 11)
  }

  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];
  const seenJobIdsInFile = new Set<number>();
  let duplicateCount = 0;

  for (let r = dataStartRowIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const rawJobId = row[jobIdColIndex];
    const rawDate = row[dateColIndex];

    // Check if row is empty summary row (like rows 10 & 11)
    if (rawJobId === '' || rawJobId === null || rawJobId === undefined) {
      continue;
    }

    // Try parsing Job ID
    const cleanJobStr = String(rawJobId).replace(/[^0-9]/g, '');
    const jobIdNum = cleanJobStr ? parseInt(cleanJobStr, 10) : null;

    if (!jobIdNum || isNaN(jobIdNum) || jobIdNum <= 0) {
      invalidRows.push({
        rowIndex: r + 1,
        rawJobId,
        jobId: null,
        rawDate,
        dateApproved: null,
        status: 'invalid_id',
        errorNote: `Non-numeric Job ID: "${rawJobId}"`,
      });
      continue;
    }

    // Parse date
    const dateResult = parseDateOfDelivery(rawDate);
    const dateApproved = dateResult.dateStr;

    // Check duplicate in current file
    if (seenJobIdsInFile.has(jobIdNum)) {
      duplicateCount++;
      invalidRows.push({
        rowIndex: r + 1,
        rawJobId,
        jobId: jobIdNum,
        rawDate,
        dateApproved,
        status: 'duplicate',
        errorNote: `Duplicate Job ID ${jobIdNum} inside file`,
      });
      continue;
    }
    seenJobIdsInFile.add(jobIdNum);

    const archiveStatus: 'Archived' | 'Pending' = dateApproved ? 'Archived' : 'Pending';

    // Check if exists already in system
    const isExisting = existingJobIds ? existingJobIds.has(jobIdNum) : false;

    if (dateResult.error) {
      // Valid ID with date warning
      validRows.push({
        rowIndex: r + 1,
        rawJobId,
        jobId: jobIdNum,
        rawDate,
        dateApproved,
        archiveStatus,
        status: 'valid',
        errorNote: dateResult.error,
        isExisting,
      });
    } else {
      validRows.push({
        rowIndex: r + 1,
        rawJobId,
        jobId: jobIdNum,
        rawDate,
        dateApproved,
        archiveStatus,
        status: 'valid',
        errorNote: undefined,
        isExisting,
      });
    }
  }

  return {
    sheetName: selectedSheet,
    availableSheets,
    headerRowIndex,
    dataStartRowIndex,
    totalRowsRead: rows.length,
    validRows,
    invalidRows,
    duplicateCount,
    previewRows: [...validRows.slice(0, 50), ...invalidRows.slice(0, 10)],
    summary: {
      totalParsed: validRows.length + invalidRows.length,
      validCount: validRows.length,
      errorCount: invalidRows.length,
      duplicateCount,
    },
  };
}

