/**
 * ARMS - Users & Permissions Management (Section 10)
 * Admin panel for adding, editing, activating, and role assigning across the 4 roles.
 */

import React, { useState } from 'react';
import { X, Plus, Shield } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';
import { UserRole } from '../../types';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, addUser, updateUser, toggleUserStatus, language } = useArchive();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Data Entry');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newPassword) return;

    try { await addUser({
      username: newUsername.trim(),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      active: true,
    }, newPassword); } catch (error) { alert(error instanceof Error ? error.message : 'Unable to create user.'); return; }

    setShowAddForm(false);
    setNewUsername('');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-900 dark:text-white" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'إدارة المستخدمين والصلاحيات (RBAC)' : 'User Management & Permissions'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Table Explanation */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-400">
          <div>
            <strong className="text-slate-900 dark:text-white block">System Admin:</strong>
            {language === 'ar' ? 'كل الصلاحيات + Force Close' : 'Full Access + Force Close'}
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white block">Archive Manager:</strong>
            {language === 'ar' ? 'إدارة الأرشيف والتقارير' : 'Archive & Reports'}
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white block">Data Entry:</strong>
            {language === 'ar' ? 'قراءة فقط حالياً' : 'Read-only for now'}
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white block">Viewer:</strong>
            {language === 'ar' ? 'مشاهدة وطباعة فقط' : 'Read-only / Audit'}
          </div>
        </div>

        {/* Users List & Add Button */}
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? `المستخدمين المسجلين (${users.length})` : `Registered Users (${users.length})`}
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة مستخدم' : 'Add User'}</span>
            </button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ahmed Mahmoud"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'اسم المستخدم' : 'Username'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="amahmoud"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="user@intercom-arms.com"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'كلمة المرور الأولية (12 حرفاً على الأقل)' : 'Initial password (12+ characters)'}
                  </label>
                  <input type="password" required minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'الدور والصلاحية' : 'User Role'}
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value="System Admin">System Admin</option>
                    <option value="Archive Manager">Archive Manager</option>
                    <option value="Data Entry">Data Entry</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  {language === 'ar' ? 'حفظ المستخدم' : 'Save User'}
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-3 py-2.5">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-3 py-2.5">{language === 'ar' ? 'الصلاحية (الدور)' : 'Role'}</th>
                  <th className="px-3 py-2.5">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-3 py-2.5 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{u.username} · {u.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={u.role}
                        disabled={currentUser.role !== 'System Admin'}
                        onChange={e => updateUser(u.id, { role: e.target.value as UserRole }).catch(error => alert(error.message))}
                        className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-semibold"
                      >
                        <option value="System Admin">System Admin</option>
                        <option value="Archive Manager">Archive Manager</option>
                        <option value="Data Entry">Data Entry</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Disabled')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => toggleUserStatus(u.id).catch(error => alert(error.message))}
                        className={`p-1.5 rounded transition-colors text-xs font-semibold ${
                          u.active
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
