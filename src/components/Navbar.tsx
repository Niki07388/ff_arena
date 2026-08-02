import React from 'react';
import { Tournament } from '../types';
import { AppUser } from '../utils/supabase';
import { Menu, UserPlus, Download, Printer, LogIn, User, LogOut } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  tournament: Tournament | null;
  isAuthenticated: boolean;
  canManageActiveTournament: boolean;
  onOpenRegisterTeam: () => void;
  onExportCSV: () => void;
  onPrintPDF: () => void;
  onNavigateDashboard: () => void;
  currentUser: AppUser | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigateProfile: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  tournament,
  isAuthenticated,
  onOpenRegisterTeam,
  onExportCSV,
  onPrintPDF,
  onNavigateDashboard,
  currentUser,
  onOpenAuth,
  onNavigateProfile,
  onSignOut
}) => {
  const displayUserText = currentUser?.displayName || currentUser?.email || 'Profile';
  const hasTournament = Boolean(tournament);

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Class, not an inline style: mobile.css dissolves this wrapper with
            `display: contents` so the logo can be centred by the header grid,
            and an inline display would override that. */}
        <div className="header-left">
          <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle navigation sidebar">
            <Menu size={22} />
          </button>

          {/* Styling lives in styles.css / mobile.css. Inline styles here would
              beat the mobile media queries (inline always wins), which is what
              stopped the header collapsing to a single row on phones. */}
          <a
            href="/"
            onClick={e => { e.preventDefault(); onNavigateDashboard(); }}
            className="brand-logo"
          >
            <img src="/navlogo.png" alt="Free Fire Esport Manager" />
            <div className="brand-text">
              <span className="brand-subtitle">ESPORT MANAGER</span>
            </div>
          </a>
        </div>

        {tournament && (
          <div className="active-tournament-pill">
            <span className="pulse-dot" />
            <span>{tournament.name}</span>
          </div>
        )}

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={onOpenRegisterTeam}
            disabled={!hasTournament}
            title={hasTournament ? 'Register your squad' : 'Select a tournament first'}
          >
            <UserPlus size={14} /> <span className="btn-text-responsive">Register Team</span>
          </button>

          {/* Hidden on phones (btn-hide-mobile) — both are in the sidebar
              footer, and the row overflowed the viewport with them present. */}
          <button
            className="btn btn-sm btn-secondary btn-hide-mobile"
            onClick={onExportCSV}
            disabled={!hasTournament}
            title="Export standings CSV"
          >
            <Download size={14} /> <span className="btn-text-responsive">Export CSV</span>
          </button>

          <button
            className="btn btn-sm btn-secondary btn-hide-mobile"
            onClick={onPrintPDF}
            disabled={!hasTournament}
            title="Print or save a PDF report"
          >
            <Printer size={14} /> <span className="btn-text-responsive">PDF Report</span>
          </button>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
              <button
                className="btn btn-sm"
                style={{
                  background: 'var(--lavender-light)', color: 'var(--lavender-dark)',
                  border: '1px solid var(--border-lavender)', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
                onClick={onNavigateProfile}
                title="View your account profile"
              >
                <User size={15} />
                <span className="btn-text-responsive">{displayUserText}</span>
              </button>

              <button
                className="btn btn-sm btn-danger"
                style={{ padding: '0.45rem 0.65rem' }}
                onClick={onSignOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm btn-primary"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#ffffff',
                fontWeight: 800, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)', marginLeft: '0.25rem'
              }}
              onClick={() => onOpenAuth('login')}
            >
              <LogIn size={15} /> <span className="btn-text-responsive">Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
