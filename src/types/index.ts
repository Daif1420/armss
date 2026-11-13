/**
 * ARMS - Archive Reports Management System
 * Core Data Models & Types
 */

export type ProjectStatus = 'Archived' | 'Missing' | 'Pending';
export type DossierStatus = 'Pending' | 'Inprogress' | 'Archived';
export type BoxStatus = 'Inprogress' | 'Archived';
export type UserRole = 'System Admin' | 'Archive Manager' | 'Data Entry' | 'Viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLogin: string;
}

export interface StatusHistoryEntry {
  status: ProjectStatus;
  timestamp: string;
  note?: string;
  user?: string;
}

export interface Project {
  jobId: number;
  dateApproved: string | null;
  status: ProjectStatus;
  boxId: string;
  dossierNumber: number; // 1 to 6
  slotIndex: number; // 0 to 49
  firstImportDate: string;
  lastUpdateDate: string;
  sourceUpload: string;
  statusHistory: StatusHistoryEntry[];
}

export interface Dossier {
  id: string; // e.g. "D42-1"
  boxId: string; // e.g. "D42"
  dossierNumber: number; // 1 to 6
  fromJobId: number;
  toJobId: number;
  totalProjects: number; // always 50
  archivedCount: number;
  missingCount: number;
  pendingCount: number;
  status: DossierStatus;
}

export interface Box {
  id: string; // e.g. "D42"
  boxCode: string;
  firstJobId: number;
  lastJobId: number; // firstJobId + 299
  totalDossiers: number; // always 6
  completedDossiers: number; // 0 to 6
  totalProjects: number; // always 300
  archivedProjects: number;
  missingProjects: number;
  pendingProjects: number;
  status: BoxStatus;
  isForceClosed: boolean;
  forceCloseReason?: string;
  forceClosedBy?: string;
  forceClosedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadRecord {
  id: string;
  fileName: string;
  userName: string;
  timestamp: string;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errors: string[];
  status: 'Completed' | 'Completed with warnings' | 'Failed';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'import' | 'duplicate' | 'missing' | 'dossier' | 'box' | 'force_close' | 'status_update';
  severity: 'info' | 'success' | 'warning' | 'error';
  targetRoute: 'boxes' | 'dossiers' | 'projects' | 'reports' | 'import';
  targetParam?: string;
  timestamp: string;
  isRead: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  recordType: 'Import' | 'Project' | 'Box' | 'Dossier' | 'User' | 'Force Close' | 'Settings';
  recordId: string;
  timestamp: string;
  details: string;
  beforeState?: string;
  afterState?: string;
}

export interface LabelData {
  type: 'box' | 'dossier';
  boxCode: string;
  dossierNumber?: number; // 1-6 if dossier
  totalDossiers?: number; // 6
  fromJobId: number;
  toJobId: number;
}
