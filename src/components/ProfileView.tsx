import React from 'react';
import { Tournament } from '../types';
import { AppUser } from '../utils/supabase';
import { User, Shield, Mail, LogOut, Plus, Trophy, ArrowRight, CheckCircle, LayoutDashboard, ShieldCheck } from 'lucide-react';

interface ProfileViewProps {
  currentUser: AppUser | null;
  /** Only the events this user actually organizes. */
  myTournaments: Tournament[];
  onSignOut: () => void;
  onOpenCreateTournament: () => void;
  onNavigateTab: (tabId: string) => void;
  onSelectActive: (id: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  myTournaments,
  onSignOut,
  onOpenCreateTournament,
  onNavigateTab,
  onSelectActive
}) => {
  const sessionUser = currentUser;

  if (!sessionUser) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#ffffff', borderRadius: '20px', boxShadow: 'var(--shadow-lavender)', margin: '2rem auto', maxWidth: '500px' }}>
        <Shield size={48} style={{ color: 'var(--lavender-dark)', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '0.5rem' }}>Account Profile</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Please sign in to view your account profile, security details, and tournaments.</p>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigateTab('auth')}>
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const displayUserId = sessionUser.displayName || sessionUser.email || 'User';
  const displayEmail = sessionUser.email || 'No Email';
  const displayRole = myTournaments.length > 0 ? 'organizer' : 'team leader';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
      {/* Top Profile Header Banner */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
        padding: '2.5rem 2rem',
        borderRadius: '22px',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 40px -15px rgba(49, 46, 129, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#facc15',
              boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.3)'
            }}>
              <ShieldCheck size={44} />
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(250, 204, 21, 0.15)',
                border: '1px solid rgba(250, 204, 21, 0.4)',
                padding: '0.3rem 0.85rem',
                borderRadius: '50px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#facc15',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <CheckCircle size={14} color="#facc15" />
                <span>OFFICIAL VERIFIED {displayRole}</span>
              </div>

              <h1 style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                margin: 0,
                color: '#ffffff',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.5px'
              }}>
                {displayUserId}
              </h1>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: '0.35rem'
              }}>
                <Mail size={15} />
                <span>{displayEmail}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ background: '#facc15', color: '#0f172a', fontWeight: 800, border: 'none', height: '46px', padding: '0 1.5rem' }}
              onClick={onOpenCreateTournament}
            >
              <Plus size={18} /> Create Tournament Session
            </button>

            <button
              className="btn btn-danger"
              style={{ height: '46px', padding: '0 1.5rem', fontWeight: 700 }}
              onClick={onSignOut}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details & Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1.75rem' }}>
        {/* Account Security Card */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--lavender-light)',
              color: 'var(--lavender-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>Account Security Status</h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Authenticated Session Info</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>User ID</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{displayUserId}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Registered Email</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{displayEmail}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Session Status</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={15} /> Active & Secured
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Role Level</span>
              <span style={{ fontWeight: 800, color: 'var(--lavender-dark)' }}>{displayRole}</span>
            </div>
          </div>
        </div>

        {/* Quick Admin Actions Card */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(250, 204, 21, 0.15)',
              color: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>Esports Control Center</h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage tournaments & squads</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '1rem', fontWeight: 700 }}
              onClick={() => onNavigateTab('organizer')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={18} color="var(--lavender-dark)" />
                <span>Open Organizer Deck</span>
              </div>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '1rem', fontWeight: 700 }}
              onClick={() => onNavigateTab('tournaments')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Trophy size={18} color="var(--accent-purple)" />
                <span>Manage Tournaments List</span>
              </div>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '1rem', fontWeight: 700 }}
              onClick={() => onNavigateTab('teams')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <User size={18} color="var(--accent-emerald)" />
                <span>Register & Edit Squads</span>
              </div>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* My Tournaments Section */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0 }}>Your Organized Tournaments</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Esports tournaments managed under your account
            </div>
          </div>

          <button className="btn btn-primary" onClick={onOpenCreateTournament}>
            <Plus size={16} /> Create New Tournament
          </button>
        </div>

        {myTournaments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: '#f8fafc',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1'
          }}>
            <Trophy size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '1.05rem' }}>
              No Tournaments Created Yet
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto 1.25rem auto' }}>
              Start your first official Free Fire tournament session to generate room credentials and live scoreboards.
            </p>
            <button className="btn btn-primary" onClick={onOpenCreateTournament}>
              <Plus size={16} /> Create Your First Tournament
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tournament Name</th>
                  <th>Date</th>
                  <th>Room ID</th>
                  <th>Squads</th>
                  <th>Matches</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myTournaments.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{t.name}</td>
                    <td>{t.date}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--lavender-dark)' }}>{t.roomId}</span></td>
                    <td>{t.teams.length} Squads</td>
                    <td>{t.totalMatches} Matches</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          onSelectActive(t.id);
                          onNavigateTab('organizer');
                        }}
                      >
                        Manage Deck →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
