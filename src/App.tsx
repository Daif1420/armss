/**
 * ARMS - Archive Reports Management System
 * Main Application Orchestrator
 */

import { useState } from 'react';
import { ArchiveProvider, useArchive } from './context/ArchiveContext';
import { TopNav, ActiveTab } from './components/navigation/TopNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { BoxesView } from './components/boxes/BoxesView';
import { BoxDetailView } from './components/boxes/BoxDetailView';
import { DossiersView } from './components/dossiers/DossiersView';
import { DossierDetailView } from './components/dossiers/DossierDetailView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ImportDataView } from './components/import/ImportDataView';
import { LabelsView } from './components/labels/LabelsView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { UsersManagementModal } from './components/users/UsersManagementModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { LoginView } from './components/auth/LoginView';

function MainApp() {
  const { language, dossiers, authenticated, authLoading, archiveLoading, archiveLoadError, retryArchiveLoad } = useArchive();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedBoxId, setSelectedBoxId] = useState<string>('D42');
  const [selectedDossierId, setSelectedDossierId] = useState<string>('D42-1');
  const [projectsFilter, setProjectsFilter] = useState<string>('');
  const [labelInitialBoxCode, setLabelInitialBoxCode] = useState<string>('D42');

  // Modals state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [usersManagementOpen, setUsersManagementOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (authLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500">ARMS · Loading secure session...</div>;
  if (!authenticated) return <LoginView />;

  // Navigation handler
  const handleNavigate = (tab: ActiveTab, param?: string) => {
    setActiveTab(tab);
    if (tab === 'box-detail' && param) {
      setSelectedBoxId(param);
    } else if (tab === 'dossier-detail' && param) {
      setSelectedDossierId(param);
    } else if (tab === 'projects' && param) {
      setProjectsFilter(param);
    } else if (tab === 'labels' && param) {
      setLabelInitialBoxCode(param);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute Breadcrumbs
  const getBreadcrumbs = () => {
    const isAr = language === 'ar';
    switch (activeTab) {
      case 'boxes':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'البوكسات' : 'Boxes' },
        ];
      case 'box-detail':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'البوكسات' : 'Boxes', tab: 'boxes' as ActiveTab },
          { label: `Box ${selectedBoxId}` },
        ];
      case 'dossiers':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'الدوسيهات' : 'Dossiers' },
        ];
      case 'dossier-detail': {
        const d = dossiers.find(x => x.id === selectedDossierId);
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'البوكسات' : 'Boxes', tab: 'boxes' as ActiveTab },
          {
            label: `Box ${d?.boxId || selectedBoxId}`,
            tab: 'box-detail' as ActiveTab,
            param: d?.boxId || selectedBoxId,
          },
          { label: isAr ? `دوسيه ${d?.dossierNumber || 1}` : `Dossier ${d?.dossierNumber || 1}` },
        ];
      }
      case 'projects':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'المشاريع' : 'Projects' },
          ...(projectsFilter ? [{ label: projectsFilter }] : []),
        ];
      case 'reports':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'التقارير' : 'Reports' },
        ];
      case 'labels':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'طباعة الليبلات' : 'Labels Printing' },
        ];
      case 'import':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'استيراد البيانات' : 'Import Excel' },
        ];
      case 'audit':
        return [
          { label: isAr ? 'الرئيسية' : 'Dashboard', tab: 'dashboard' as ActiveTab },
          { label: isAr ? 'سجل العمليات' : 'Audit Log' },
        ];
      default:
        return [];
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors"
    >
      {/* Strict Horizontal Top Navigation */}
      <TopNav
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenUsersManagement={() => setUsersManagementOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        breadcrumbs={getBreadcrumbs()}
      />

      {(archiveLoading || archiveLoadError) && (
        <div className="mx-auto mt-3 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${archiveLoadError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'}`}>
            {archiveLoadError ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>تم تسجيل الدخول، لكن تعذر تحميل بيانات الأرشيف: {archiveLoadError}</span>
                <button onClick={() => void retryArchiveLoad().catch(() => undefined)} className="rounded-lg bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">إعادة المحاولة</button>
              </div>
            ) : 'تم تسجيل الدخول. جارٍ تحميل بيانات الأرشيف...'}
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}

        {activeTab === 'boxes' && (
          <BoxesView
            onNavigate={handleNavigate}
            onSelectBox={boxId => setSelectedBoxId(boxId)}
          />
        )}

        {activeTab === 'box-detail' && (
          <BoxDetailView
            boxId={selectedBoxId}
            onNavigate={handleNavigate}
            onSelectDossier={dossierId => setSelectedDossierId(dossierId)}
          />
        )}

        {activeTab === 'dossiers' && (
          <DossiersView
            onNavigate={handleNavigate}
            onSelectDossier={dossierId => setSelectedDossierId(dossierId)}
          />
        )}

        {activeTab === 'dossier-detail' && (
          <DossierDetailView
            dossierId={selectedDossierId}
            onNavigate={handleNavigate}
            onSelectProject={jobId => {
              setProjectsFilter(String(jobId));
              setActiveTab('projects');
            }}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView initialFilter={projectsFilter} onNavigate={handleNavigate} />
        )}

        {activeTab === 'import' && <ImportDataView onNavigate={handleNavigate} />}

        {activeTab === 'labels' && (
          <LabelsView initialBoxCode={labelInitialBoxCode} onNavigate={handleNavigate} />
        )}

        {activeTab === 'reports' && <ReportsView onNavigate={handleNavigate} />}

        {activeTab === 'audit' && <AuditLogView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">ARMS</span>
            <span>·</span>
            <span>Archive Reports Management System</span>
            <span>·</span>
            <span>Intercom Standard</span>
          </div>
          <div className="text-[11px] font-mono">
            1 Box = 6 Dossiers · 1 Dossier = 50 Projects · 300 Slots Strict
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={handleNavigate}
      />

      <UsersManagementModal
        isOpen={usersManagementOpen}
        onClose={() => setUsersManagementOpen(false)}
      />

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ArchiveProvider>
      <MainApp />
    </ArchiveProvider>
  );
}
