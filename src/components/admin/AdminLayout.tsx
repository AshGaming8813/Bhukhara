import React from 'react';
import type { AdminSession } from '../../types/admin';
import {
  LayoutDashboard,
  Users,
  History,
  ShieldCheck,
  LogOut,
  Coins,
  Activity,
} from 'lucide-react';

interface AdminLayoutProps {
  session: AdminSession;
  activeTab: 'dashboard' | 'players' | 'history' | 'account';
  onTabChange: (tab: 'dashboard' | 'players' | 'history' | 'account') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  session,
  activeTab,
  onTabChange,
  onLogout,
  children,
}) => {
  return (
    <div className="admin-app-container">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-circle">
            <Coins size={22} className="brand-icon" />
          </div>
          <div className="brand-text">
            <h2 className="brand-title">BHUKHARA</h2>
            <span className="brand-subtitle">ADMIN PANEL</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => onTabChange('players')}
          >
            <Users size={18} />
            <span>Player Management</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
          >
            <History size={18} />
            <span>Coin History</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => onTabChange('account')}
          >
            <ShieldCheck size={18} />
            <span>Admin Account</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-sidebar-logout" onClick={onLogout}>
            <LogOut size={16} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div className="admin-main-wrapper">
        {/* Top Header Bar */}
        <header className="admin-header">
          <div className="header-left-title">
            <span className="header-welcome">Welcome back,</span>
            <span className="header-admin-name">{session.username}</span>
            <span className="admin-role-badge">{session.role}</span>
          </div>

          <div className="header-right-actions">
            <div className="system-status-indicator" title="Bhukhara Server Backend Status">
              <Activity size={14} className="pulse-green" />
              <span>Server Online</span>
            </div>
            <button className="btn-admin-header-logout" onClick={onLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="admin-content-body">{children}</main>
      </div>
    </div>
  );
};
