/**
 * ARMS - Horizontal Top Navigation
 * Section 2: Strict Horizontal Top Navigation with Lucide Icons and Archive / Profile Dropdowns.
 * Works seamlessly across all desktop, tablet, and mobile screen widths.
 */

import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, FolderArchive, Archive, FileText, FileBarChart, Printer, FileSpreadsheet, History, Bell, User, ChevronDown, LogOut, Shield, KeyRound, Globe, Menu, X, Sun, Moon } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { IntercomLogo } from '../common/IntercomLogo';

export type ActiveTab =
  | 'dashboard'
  | 'boxes'
  | 'box-detail'
  | 'dossiers'
  | 'dossier-detail'
  | 'projects'
  | 'reports'
  | 'labels'
  | 'import'
  | 'audit'
  | 'settings';

interface TopNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab, param?: string) => void;
  onOpenNotifications: () => void;
  onOpenUsersManagement: () => void;
  onOpenProfile: () => void;
  breadcrumbs?: { label: string; tab?: ActiveTab; param?: string }[];
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onNavigate,
  onOpenNotifications,
  onOpenUsersManagement,
  onOpenProfile,
  breadcrumbs = [],
}) => {
  const { currentUser, notifications, language, setLanguage, logout } =
    useArchive();

  const [archiveDropdownOpen, setArchiveDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('arms_theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    localStorage.setItem('arms_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const archiveRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (archiveRef.current && !archiveRef.current.contains(event.target as Node)) {
        setArchiveDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isArchiveActive =
    activeTab === 'boxes' ||
    activeTab === 'box-detail' ||
    activeTab === 'dossiers' ||
    activeTab === 'dossier-detail' ||
    activeTab === 'projects';

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Zone: Intercom + ARMS */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group hover:opacity-90 transition-opacity"
            >
              <IntercomLogo size="md" variant="dark" />
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                  ARMS
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider hidden md:block">
                  {language === 'ar' ? 'نظام إدارة تقارير الأرشيف' : 'Archive Reports System'}
                </span>
              </div>
            </button>
          </div>

          {/* Main Horizontal Navigation with prominent Icons & Archive Dropdown */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 flex-1 justify-center">
            {/* 1. Dashboard */}
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
              <span>{language === 'ar' ? 'الرئيسية' : 'Dashboard'}</span>
            </button>

            {/* 2. Archive ▼ Dropdown (Boxes / Dossiers / Projects) */}
            <div className="relative" ref={archiveRef}>
              <button
                type="button"
                onClick={() => setArchiveDropdownOpen(!archiveDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isArchiveActive || archiveDropdownOpen
                    ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <FolderArchive className={`w-4 h-4 ${isArchiveActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
                <span>{language === 'ar' ? 'الأرشيف' : 'Archive'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    archiveDropdownOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''
                  }`}
                />
              </button>

              {/* Archive Dropdown Menu */}
              {archiveDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {language === 'ar' ? 'أقسام الأرشيف' : 'Archive Sections'}
                  </div>

                  {/* Option 1: Boxes */}
                  <button
                    onClick={() => {
                      onNavigate('boxes');
                      setArchiveDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors ${
                      activeTab === 'boxes' || activeTab === 'box-detail'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {language === 'ar' ? 'البوكسات (Boxes)' : 'Boxes'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'ar' ? '6 دوسيهات · 300 مشروع' : '6 Dossiers · 300 Projects'}
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Dossiers */}
                  <button
                    onClick={() => {
                      onNavigate('dossiers');
                      setArchiveDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors ${
                      activeTab === 'dossiers' || activeTab === 'dossier-detail'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {language === 'ar' ? 'الدوسيهات (Dossiers)' : 'Dossiers'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'ar' ? '50 مشروع لكل دوسيه' : '50 Projects per Dossier'}
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Projects */}
                  <button
                    onClick={() => {
                      onNavigate('projects');
                      setArchiveDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors ${
                      activeTab === 'projects'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {language === 'ar' ? 'المشاريع (Projects)' : 'Projects Directory'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'ar' ? 'Job ID & Date Approved' : 'Job ID & Date Approved'}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Reports */}
            <button
              onClick={() => onNavigate('reports')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileBarChart className={`w-4 h-4 ${activeTab === 'reports' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
              <span>{language === 'ar' ? 'التقارير' : 'Reports'}</span>
            </button>

            {/* 4. Labels */}
            <button
              onClick={() => onNavigate('labels')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'labels'
                  ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Printer className={`w-4 h-4 ${activeTab === 'labels' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
              <span>{language === 'ar' ? 'طباعة الليبلات' : 'Labels'}</span>
            </button>

            {/* 5. Import Data */}
            {['System Admin', 'Archive Manager'].includes(currentUser.role) && <button
              onClick={() => onNavigate('import')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'import'
                  ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'import' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
              <span>{language === 'ar' ? 'استيراد البيانات' : 'Import Data'}</span>
            </button>}

            {/* 6. Audit Trail */}
            <button
              onClick={() => onNavigate('audit')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className={`w-4 h-4 ${activeTab === 'audit' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
              <span>{language === 'ar' ? 'سجل العمليات' : 'Audit Log'}</span>
            </button>
          </nav>

          {/* Right Action Zone: Language, Notifications, User Profile ▼ */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              title="Toggle Language"
              className="p-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase">
                {language === 'ar' ? 'EN' : 'عربي'}
              </span>
            </button>

            {/* Appearance: Light / Dark */}
            <button
              onClick={() => setDarkMode(value => !value)}
              title={darkMode ? (language === 'ar' ? 'الوضع الفاتح' : 'Light mode') : (language === 'ar' ? 'الوضع الداكن' : 'Dark mode')}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={language === 'ar' ? 'الإشعارات' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile ▼ Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border transition-colors ${
                  profileDropdownOpen
                    ? 'border-slate-400 bg-slate-50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    profileDropdownOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* User info header */}
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {currentUser.email}
                    </div>
                    <div className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {currentUser.role}
                    </div>
                  </div>

                  {/* Menu Options: Profile, Change Password, Users Management, Settings, Reset */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onOpenProfile();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{language === 'ar' ? 'الملف الشخصي' : 'My Profile'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenProfile();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>{language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                    </button>

                    {currentUser.role === 'System Admin' && (
                      <button
                        onClick={() => {
                          onOpenUsersManagement();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium"
                      >
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>{language === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'User Management'}</span>
                      </button>
                    )}
                    <button
                      onClick={async () => { setProfileDropdownOpen(false); await logout(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Compact Navigation Bar (always present with Dropdown support!) */}
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 py-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {/* 1. Dashboard */}
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الرئيسية' : 'Dashboard'}</span>
            </button>

            {/* 2. Archive Mobile Dropdown Trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setArchiveDropdownOpen(!archiveDropdownOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg ${
                  isArchiveActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'الأرشيف' : 'Archive'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {archiveDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => {
                      onNavigate('boxes');
                      setArchiveDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 font-medium"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'ar' ? 'البوكسات' : 'Boxes'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('dossiers');
                      setArchiveDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 font-medium"
                  >
                    <Archive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'ar' ? 'الدوسيهات' : 'Dossiers'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('projects');
                      setArchiveDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>{language === 'ar' ? 'المشاريع' : 'Projects'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Reports */}
            <button
              onClick={() => onNavigate('reports')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <FileBarChart className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'التقارير' : 'Reports'}</span>
            </button>

            {/* 4. Labels */}
            <button
              onClick={() => onNavigate('labels')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'labels'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الليبلات' : 'Labels'}</span>
            </button>

            {/* 5. Import */}
            {['System Admin', 'Archive Manager'].includes(currentUser.role) && <button
              onClick={() => onNavigate('import')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'import'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استيراد' : 'Import'}</span>
            </button>}

            {/* 6. Audit */}
            <button
              onClick={() => onNavigate('audit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'audit'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الرقابة' : 'Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Breadcrumbs Bar (Boxes → Dossiers → Projects → Project Details) */}
      {breadcrumbs.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-2 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex items-center gap-2 overflow-x-auto">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-400 font-bold">/</span>}
              {crumb.tab ? (
                <button
                  onClick={() => onNavigate(crumb.tab!, crumb.param)}
                  className="hover:text-slate-900 dark:hover:text-white font-medium hover:underline transition-colors whitespace-nowrap"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-slate-900 dark:text-white font-bold whitespace-nowrap">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </header>
  );
};
