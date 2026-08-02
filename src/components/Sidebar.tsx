import React from 'react';
import { Tournament } from '../types';
import {
  Home, Trophy, Crosshair, BarChart2, Users, Settings, Download, Plus, Printer, X,
  UserPlus, LayoutDashboard, ListOrdered, Award, User, LogIn, LogOut, ShieldCheck,
  DoorOpen, type LucideIcon
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tournament: Tournament | null;
  isAuthenticated: boolean;
  canManageActiveTournament: boolean;
  onOpenCreateTournament: () => void;
  onOpenRegisterTeam: () => void;
  onExportCSV: () => void;
  onPrintPDF: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onSignOut: () => void;
}

type Visibility = 'public' | 'authenticated' | 'organizer';

interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  visibility: Visibility;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  tournament,
  isAuthenticated,
  canManageActiveTournament,
  onOpenCreateTournament,
  onOpenRegisterTeam,
  onExportCSV,
  onPrintPDF,
  onOpenAuth,
  onSignOut
}) => {
  const allTabs: TabDef[] = [
    { id: 'home',        label: 'Home Portal',       icon: Home,            visibility: 'public' },
    { id: 'dashboard',   label: 'Esports Hub',       icon: LayoutDashboard, visibility: 'public' },
    { id: 'scoreboard',  label: 'Match Scoreboard',  icon: ListOrdered,     visibility: 'public' },
    { id: 'leaderboard', label: 'Team Standings',    icon: Trophy,          visibility: 'public' },
    { id: 'players',     label: 'Player Stats',      icon: Award,           visibility: 'public' },
    { id: 'teams',       label: 'Squads & Register', icon: Users,           visibility: 'public' },
    { id: 'rooms',       label: 'Rooms & Chat',      icon: DoorOpen,        visibility: 'public' },
    { id: 'tournaments', label: 'All Tournaments',   icon: Trophy,          visibility: 'public' },
    { id: 'stats',       label: 'Analytics',         icon: BarChart2,       visibility: 'public' },
    { id: 'organizer',   label: 'Organizer Deck',    icon: ShieldCheck,     visibility: 'authenticated' },
    { id: 'matchentry',  label: 'Match Entry',       icon: Crosshair,       visibility: 'organizer' },
    { id: 'settings',    label: 'Scoring Settings',  icon: Settings,        visibility: 'organizer' },
    { id: 'profile',     label: 'Account Profile',   icon: User,            visibility: 'authenticated' }
  ];

  // Match Entry and Settings only appear for the creator of the selected event.
  const visibleTabs = allTabs.filter(tab => {
    if (tab.visibility === 'public') return true;
    if (tab.visibility === 'authenticated') return isAuthenticated;
    return canManageActiveTournament;
  });

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* No aria-hidden here: closing the drawer while a menu button still has
          focus would hide a focused element from assistive tech. The closed
          state uses `visibility: hidden` in CSS instead, which removes it from
          both the accessibility tree and the tab order. */}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.2rem', margin: '0 auto', textAlign: 'center' }}>
            <img src="/navlogo.png" alt="" className="sidebar-logo-img" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            <div className="sidebar-brand-text">
              <span
                className="sidebar-brand-title"
                style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--lavender-dark)', letterSpacing: '0.6px', textTransform: 'uppercase' }}
              >
                ESPORT MANAGER
              </span>
            </div>
          </div>

          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        {tournament && (
          <div className="sidebar-tournament-box">
            <span className="pulse-dot" />
            <div className="sidebar-tournament-info">
              <span className="sidebar-tournament-label">
                {canManageActiveTournament ? 'You organize this event' : 'Active Event'}
              </span>
              <span className="sidebar-tournament-name">{tournament.name}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="sidebar-nav-group-label">Navigation Menu</div>
          <ul className="sidebar-menu-list">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    className={`sidebar-menu-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    <Icon size={18} className="sidebar-item-icon" />
                    <span className="sidebar-item-label">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-primary btn-block"
            onClick={() => { onOpenRegisterTeam(); onClose(); }}
            disabled={!tournament}
          >
            <UserPlus size={16} /> Register Team / Squad
          </button>

          <div className="sidebar-action-grid">
            <button className="btn btn-secondary" onClick={() => { onExportCSV(); onClose(); }} disabled={!tournament}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-secondary" onClick={() => { onPrintPDF(); onClose(); }} disabled={!tournament}>
              <Printer size={14} /> PDF Report
            </button>
          </div>

          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-outline-gold btn-block" onClick={() => { onOpenCreateTournament(); onClose(); }}>
                <Plus size={14} /> Create New Event
              </button>
              <button
                className="btn btn-danger btn-block"
                style={{ fontWeight: 700 }}
                onClick={() => { onSignOut(); onClose(); }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-block"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', fontWeight: 800 }}
              onClick={() => { onOpenAuth('login'); onClose(); }}
            >
              <LogIn size={16} /> Sign In / Create Account
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
