/**
 * ARMS - Archive State Context & Database Engine
 * Handles persistent state, permissions, recalculations, audit trails, and notifications.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Box,
  Dossier,
  Project,
  User,
  UploadRecord,
  NotificationItem,
  AuditLogEntry,
  ProjectStatus,
} from '../types';
import { buildBoxStructure } from '../utils/archiveCalculations';
import { apiFetch, errorFrom, loadArchiveSnapshot } from '../utils/archiveApi';

interface ArchiveContextType {
  currentUser: User;
  authenticated: boolean;
  authLoading: boolean;
  setupRequired: boolean;
  authError: string;
  archiveLoading: boolean;
  archiveLoadError: string;
  retryArchiveLoad: () => Promise<void>;
  login: (payload: { action: 'login' | 'setup'; username: string; password: string; name?: string; email?: string; setupSecret?: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  users: User[];
  boxes: Box[];
  dossiers: Dossier[];
  projects: Project[];
  uploadHistory: UploadRecord[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  setCurrentUser: (user: User) => void;
  // Actions
  importExcelProjects: (
    importedRows: { jobId: number; dateApproved: string | null; archiveStatus?: ProjectStatus }[],
    fileName: string,
    targetBoxCode?: string
  ) => { importedCount: number; duplicateCount: number; newBoxesCreated: number; rejectedCount: number };
  createBox: (boxCode: string, firstJobId: number) => Box;
  forceCloseBox: (boxId: string, reason: string) => boolean;
  reopenBox: (boxId: string) => boolean;
  updateProjectStatus: (jobId: number, newStatus: ProjectStatus, note?: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addUser: (user: Omit<User, 'id' | 'lastLogin'>, password: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
}

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);


export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const guestUser: User = { id: 'guest', username: '', email: '', name: '', role: 'Viewer', active: false, lastLogin: 'Never' };
  const [currentUser, setCurrentUser] = useState<User>(guestUser);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [authError, setAuthError] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveLoadError, setArchiveLoadError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [hydrated, setHydrated] = useState(false);
  const revisionRef = useRef(0);

  const skipNextSaveRef = useRef(false);

  const loadArchiveState = async () => {
    setArchiveLoading(true);
    setArchiveLoadError('');
    try {
    const parsed = await loadArchiveSnapshot();
    // The state we just loaded is already stored; do not write it straight back.
    skipNextSaveRef.current = true;
    setBoxes(parsed.boxes || []);
    setDossiers(parsed.dossiers || []);
    setProjects(parsed.projects || []);
    setUploadHistory(parsed.uploadHistory || []);
    setNotifications(parsed.notifications || []);
    setAuditLogs(parsed.auditLogs || []);
    setCurrentUser(parsed.currentUser || guestUser);
    setUsers(parsed.users || (parsed.currentUser ? [parsed.currentUser] : []));
    revisionRef.current = Number(parsed._revision || 0);
    setAuthenticated(Boolean(parsed.currentUser));
    setHydrated(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات الأرشيف.';
      setArchiveLoadError(message);
      throw error;
    } finally {
      setArchiveLoading(false);
    }
  };

  const retryArchiveLoad = async () => {
    await loadArchiveState();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch('/api/auth', {}, 15000);
        if (cancelled) return;
        if (!r.ok || !r.body) throw new Error(errorFrom(r, 'خدمة تسجيل الدخول غير متاحة'));
        setSetupRequired(Boolean(r.body.setupRequired));
        if (r.body.user) await loadArchiveState();
      } catch (error) {
        console.error('ARMS initialization error:', error);
        if (!cancelled) setAuthError(error instanceof Error ? error.message : 'تعذر بدء التطبيق.');
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (payload: { action: 'login' | 'setup'; username: string; password: string; name?: string; email?: string; setupSecret?: string }) => {
    const r = await apiFetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok || !r.body) throw new Error(errorFrom(r, 'تعذر تسجيل الدخول'));
    if (!r.body.user) throw new Error('تعذر تسجيل الدخول.');
    setAuthError('');
    setSetupRequired(false);
    // Authentication succeeded and the session cookie is set. Enter the app immediately;
    // archive data hydration continues separately so a large archive cannot look like a failed login.
    setCurrentUser(r.body.user);
    setAuthenticated(true);
    setHydrated(false);
    void loadArchiveState().catch(error => {
      console.error('ARMS archive hydration error:', error);
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const r = await apiFetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'change-password', currentPassword, newPassword }) });
    if (!r.ok) throw new Error(errorFrom(r, 'تعذر تغيير كلمة المرور'));
  };

  const logout = async () => {
    try { await apiFetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }, 8000); } catch { /* clear local state anyway */ }
    setAuthenticated(false);
    setCurrentUser(guestUser);
    setUsers([]);
    setBoxes([]); setDossiers([]); setProjects([]); setUploadHistory([]); setNotifications([]); setAuditLogs([]);
    setHydrated(false);
  };

  // Debounced persistence with optimistic concurrency. A stale browser cannot overwrite a newer snapshot.
  const canWrite = currentUser.role === 'System Admin' || currentUser.role === 'Archive Manager';
  useEffect(() => {
    if (!hydrated || !authenticated || !canWrite) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const r = await apiFetch('/api/state', {
          method: 'PUT', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boxes, dossiers, projects, uploadHistory, notifications, auditLogs, _revision: revisionRef.current }),
        }, 60000);
        if (r.status === 401) { window.location.reload(); return; }
        if (r.status === 409) {
          alert('تم تعديل البيانات من جلسة أخرى. سيتم إعادة تحميل أحدث نسخة لحماية البيانات.');
          window.location.reload();
          return;
        }
        if (!r.ok || !r.body) throw new Error(errorFrom(r, 'فشل حفظ البيانات'));
        revisionRef.current = Number(r.body.revision);
      } catch (error) {
        if (!controller.signal.aborted) console.error('ARMS database save error:', error);
      }
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [hydrated, authenticated, canWrite, boxes, dossiers, projects, uploadHistory, notifications, auditLogs]);

  const addAuditLog = (
    action: string,
    recordType: AuditLogEntry['recordType'],
    recordId: string,
    details: string,
    beforeState?: string,
    afterState?: string
  ) => {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      recordType,
      recordId,
      timestamp: new Date().toLocaleString(),
      details,
      beforeState,
      afterState,
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  const addNotification = (
    title: string,
    message: string,
    type: NotificationItem['type'],
    severity: NotificationItem['severity'],
    targetRoute: NotificationItem['targetRoute'],
    targetParam?: string
  ) => {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      severity,
      targetRoute,
      targetParam,
      timestamp: new Date().toLocaleString(),
      isRead: false,
    };
    setNotifications(prev => [notif, ...prev]);
  };

  /**
   * Creates a new manual box with 300 slots
   */
  const createBox = (boxCode: string, firstJobId: number): Box => {
    const match = /^D(\d+)$/.exec(boxCode);
    const expectedNumber = 42 + Math.floor((firstJobId - 35500) / 300);
    if (!match || firstJobId < 35500 || (firstJobId - 35500) % 300 !== 0 || Number(match[1]) !== expectedNumber || boxes.some(b => b.boxCode === boxCode) || (expectedNumber > 42 && !boxes.some(b => b.boxCode === `D${expectedNumber - 1}`))) {
      throw new Error('Box must follow fixed sequence: D42 starts at 35500 and each next box advances exactly 300 Job IDs.');
    }
    const emptyMap = new Map<number, { dateApproved: string | null; sourceUpload?: string; status?: ProjectStatus }>();
    const { box: newBox, dossiers: newDossiers, projects: newProjects } = buildBoxStructure(
      boxCode,
      firstJobId,
      emptyMap
    );

    setBoxes(prev => [...prev, newBox]);
    setDossiers(prev => [...prev, ...newDossiers]);
    setProjects(prev => [...prev, ...newProjects]);

    addAuditLog('Create Box', 'Box', boxCode, `Created new Box ${boxCode} starting at #${firstJobId}`);
    return newBox;
  };

  /**
   * Imports Excel rows (Job ID, Date Approved)
   * Enforces 300-slot box logic, gap discovery (missing vs pending), deduplication, and recalculations.
   */
  const importExcelProjects = (
    importedRows: { jobId: number; dateApproved: string | null; archiveStatus?: ProjectStatus }[],
    fileName: string,
    targetBoxCode?: string
  ) => {
    const FIRST_BOX_ID = 35500;
    const FIRST_BOX_NUMBER = 42;
    const BOX_SIZE = 300;
    let importedCount = 0;
    let duplicateCount = 0;
    let newBoxesCreated = 0;
    let rejectedCount = 0;

    const groups = new Map<number, typeof importedRows>();
    importedRows.forEach(item => {
      if (!Number.isInteger(item.jobId) || item.jobId < FIRST_BOX_ID) { rejectedCount++; return; }
      const boxIndex = Math.floor((item.jobId - FIRST_BOX_ID) / BOX_SIZE);
      const expectedCode = `D${FIRST_BOX_NUMBER + boxIndex}`;
      if (targetBoxCode && targetBoxCode !== 'auto' && targetBoxCode !== expectedCode) { rejectedCount++; return; }
      const group = groups.get(boxIndex) || [];
      group.push(item);
      groups.set(boxIndex, group);
    });

    let updatedBoxes = [...boxes];
    let updatedDossiers = [...dossiers];
    let updatedProjects = [...projects];

    for (const [boxIndex, rows] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      const expectedPrevious = `D${FIRST_BOX_NUMBER + boxIndex - 1}`;
      if (boxIndex > 0 && !updatedBoxes.some(b => b.boxCode === expectedPrevious)) { rejectedCount += rows.length; continue; }
      const firstJobId = FIRST_BOX_ID + boxIndex * BOX_SIZE;
      const lastJobId = firstJobId + BOX_SIZE - 1;
      const boxCode = `D${FIRST_BOX_NUMBER + boxIndex}`;
      let box = updatedBoxes.find(b => b.boxCode === boxCode);
      if (!box) {
        const blank = buildBoxStructure(boxCode, firstJobId, new Map());
        box = blank.box;
        updatedBoxes.push(box);
        updatedDossiers.push(...blank.dossiers);
        updatedProjects.push(...blank.projects);
        newBoxesCreated++;
      }

      const currentById = new Map<number, Project>();
      updatedProjects.filter(p => p.boxId === boxCode).forEach(p => currentById.set(p.jobId, p));
      const archivedMap = new Map<number, { dateApproved: string | null; sourceUpload?: string; status?: ProjectStatus }>();

      currentById.forEach((project, jobId) => {
        if (project.sourceUpload !== 'Reserved Slot' && project.sourceUpload !== 'System Slot') {
          archivedMap.set(jobId, { dateApproved: project.dateApproved, sourceUpload: project.sourceUpload, status: project.status });
        }
      });

      rows.forEach(item => {
        if (item.jobId < firstJobId || item.jobId > lastJobId) { rejectedCount++; return; }
        const existing = currentById.get(item.jobId);
        const alreadyImported = existing && existing.sourceUpload !== 'Reserved Slot' && existing.sourceUpload !== 'System Slot';
        if (alreadyImported) {
          duplicateCount++;
          // Re-uploads never overwrite an existing status or placement.
          return;
        }
        importedCount++;
        archivedMap.set(item.jobId, {
          dateApproved: item.dateApproved,
          sourceUpload: fileName,
          status: item.archiveStatus || 'Archived',
        });
      });

      const recalculated = buildBoxStructure(boxCode, firstJobId, archivedMap, box);
      updatedBoxes = updatedBoxes.map(b => b.boxCode === boxCode ? recalculated.box : b);
      updatedDossiers = [...updatedDossiers.filter(d => d.boxId !== boxCode), ...recalculated.dossiers];
      updatedProjects = [...updatedProjects.filter(p => p.boxId !== boxCode), ...recalculated.projects];

      if (recalculated.box.missingProjects > 0) {
        addNotification('Missing Projects Found', `Box ${boxCode} has ${recalculated.box.missingProjects} reserved gaps before the highest imported Job ID.`, 'missing', 'warning', 'boxes', boxCode);
      }
    }

    const uploadRec: UploadRecord = {
      id: `upl-${Date.now()}`,
      fileName,
      userName: currentUser.name,
      timestamp: new Date().toLocaleString(),
      totalRows: importedRows.length,
      importedCount,
      duplicateCount,
      rejectedCount,
      errors: [
        ...(duplicateCount ? [`${duplicateCount} duplicate records skipped; existing status preserved`] : []),
        ...(rejectedCount ? [`${rejectedCount} records rejected: outside D42+ fixed ranges or invalid Job ID`] : []),
      ],
      status: duplicateCount || rejectedCount ? 'Completed with warnings' : 'Completed',
    };
    setUploadHistory(prev => [uploadRec, ...prev]);
    setBoxes(updatedBoxes);
    setDossiers(updatedDossiers);
    setProjects(updatedProjects);
    addAuditLog('Import Excel', 'Import', uploadRec.id, `Imported ${importedCount} projects from ${fileName}. Duplicates: ${duplicateCount}. Rejected: ${rejectedCount}.`);
    addNotification('Import Processed', `Imported ${importedCount} projects from ${fileName}.`, 'import', 'success', 'import');
    return { importedCount, duplicateCount, newBoxesCreated, rejectedCount };
  };

  /**
   * Force Close Box (Admin only)
   * Does NOT alter missing projects or make incomplete dossiers archived!
   */
  const forceCloseBox = (boxId: string, reason: string): boolean => {
    if (currentUser.role !== 'System Admin') {
      alert('Only System Admin can execute Force Close.');
      return false;
    }

    const box = boxes.find(b => b.id === boxId);
    if (!box) return false;

    const beforeState = `isForceClosed: ${box.isForceClosed}`;
    const afterState = `isForceClosed: true, Reason: ${reason}`;

    setBoxes(prev =>
      prev.map(b =>
        b.id === boxId
          ? {
              ...b,
              isForceClosed: true,
              forceCloseReason: reason,
              forceClosedBy: `${currentUser.name} (${currentUser.role})`,
              forceClosedAt: new Date().toLocaleString(),
              updatedAt: new Date().toISOString(),
            }
          : b
      )
    );

    addAuditLog('Force Close Box', 'Force Close', boxId, `Force closed box ${boxId}. Reason: ${reason}`, beforeState, afterState);
    addNotification('Box Force Closed', `Box ${boxId} was administratively force-closed. Reason: ${reason}`, 'force_close', 'info', 'boxes', boxId);

    return true;
  };

  /**
   * Reopen a Force Closed Box
   */
  const reopenBox = (boxId: string): boolean => {
    if (currentUser.role !== 'System Admin') return false;

    setBoxes(prev =>
      prev.map(b =>
        b.id === boxId
          ? {
              ...b,
              isForceClosed: false,
              forceCloseReason: undefined,
              forceClosedBy: undefined,
              forceClosedAt: undefined,
              updatedAt: new Date().toISOString(),
            }
          : b
      )
    );

    addAuditLog('Reopen Box', 'Box', boxId, `Reopened force-closed box ${boxId}`);
    return true;
  };

  /**
   * Manually update project status
   */
  const updateProjectStatus = (jobId: number, newStatus: ProjectStatus, note?: string) => {
    const project = projects.find(p => p.jobId === jobId);
    if (!project) return;

    const beforeStatus = project.status;
    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toLocaleString(),
      note: note || `Manual status update by ${currentUser.name}`,
      user: currentUser.name,
    };

    const updatedProjects = projects.map(p =>
      p.jobId === jobId
        ? {
            ...p,
            status: newStatus,
            lastUpdateDate: new Date().toISOString(),
            statusHistory: [historyEntry, ...p.statusHistory],
          }
        : p
    );

    setProjects(updatedProjects);

    // Recompute the parent dossier and box counts
    const parentBox = boxes.find(b => b.boxCode === project.boxId);
    if (parentBox) {
      const boxProjects = updatedProjects.filter(p => p.boxId === parentBox.boxCode);
      const boxArchived = boxProjects.filter(p => p.status === 'Archived').length;
      const boxMissing = boxProjects.filter(p => p.status === 'Missing').length;
      const boxPending = boxProjects.filter(p => p.status === 'Pending').length;

      setBoxes(prev =>
        prev.map(b =>
          b.id === parentBox.id
            ? {
                ...b,
                archivedProjects: boxArchived,
                missingProjects: boxMissing,
                pendingProjects: boxPending,
                status: boxArchived === 300 ? 'Archived' : 'Inprogress',
              }
            : b
        )
      );

      // Recompute dossiers for this box
      setDossiers(prev =>
        prev.map(d => {
          if (d.boxId === parentBox.boxCode) {
            const dProjects = boxProjects.filter(p => p.dossierNumber === d.dossierNumber);
            const dArch = dProjects.filter(p => p.status === 'Archived').length;
            const dMiss = dProjects.filter(p => p.status === 'Missing').length;
            const dPend = dProjects.filter(p => p.status === 'Pending').length;
            return {
              ...d,
              archivedCount: dArch,
              missingCount: dMiss,
              pendingCount: dPend,
              status: dArch === 50 ? 'Archived' : dArch > 0 ? 'Inprogress' : 'Pending',
            };
          }
          return d;
        })
      );
    }

    addAuditLog(
      'Update Project Status',
      'Project',
      String(jobId),
      `Updated Job #${jobId} status from ${beforeStatus} to ${newStatus}. Note: ${note || 'None'}`
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const addUser = async (userData: Omit<User, 'id' | 'lastLogin'>, password: string) => {
    const r = await apiFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...userData, password }) });
    if (!r.ok || !r.body?.user) throw new Error(errorFrom(r, 'تعذر إنشاء المستخدم'));
    setUsers(prev => [...prev, r.body.user]);
    addAuditLog('Add User', 'User', r.body.user.id, `Created user account for ${r.body.user.name} (${r.body.user.role})`);
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const r = await apiFetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    if (!r.ok || !r.body?.user) throw new Error(errorFrom(r, 'تعذر تحديث المستخدم'));
    setUsers(prev => prev.map(u => u.id === id ? r.body.user : u));
    addAuditLog('Update User', 'User', id, `Updated account settings for user ID ${id}`);
  };

  const toggleUserStatus = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    await updateUser(id, { active: !target.active });
  };


  return (
    <ArchiveContext.Provider
      value={{
        currentUser,
        authenticated,
        authLoading,
        setupRequired,
        authError,
        archiveLoading,
        archiveLoadError,
        retryArchiveLoad,
        login,
        logout,
        changePassword,
        users,
        boxes,
        dossiers,
        projects,
        uploadHistory,
        notifications,
        auditLogs,
        language,
        setLanguage,
        setCurrentUser,
        importExcelProjects,
        createBox,
        forceCloseBox,
        reopenBox,
        updateProjectStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addUser,
        updateUser,
        toggleUserStatus,
      }}
    >
      {children}
    </ArchiveContext.Provider>
  );
};

export const useArchive = () => {
  const context = useContext(ArchiveContext);
  if (!context) {
    throw new Error('useArchive must be used within an ArchiveProvider');
  }
  return context;
};
