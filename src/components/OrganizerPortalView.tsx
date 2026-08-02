import React, { useState } from 'react';
import { Tournament, Team } from '../types';
import { AppUser } from '../utils/supabase';
import {
  Plus, Users, Crosshair, Settings, Copy, Check, Phone, Trophy, Radio,
  Calendar, Hash, Key, Trash2, ShieldCheck, DoorOpen
} from 'lucide-react';

interface OrganizerPortalViewProps {
  myTournaments: Tournament[];
  activeTournament: Tournament | null;
  canManageActiveTournament: boolean;
  currentUser: AppUser | null;
  onSelectActive: (id: string) => void;
  onNavigate: (tab: string) => void;
  onOpenCreateTournament: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onDeleteTournament: (id: string) => void;
  showToast: (msg: string, kind?: 'success' | 'error' | 'info') => void;
}

export const OrganizerPortalView: React.FC<OrganizerPortalViewProps> = ({
  myTournaments,
  activeTournament,
  canManageActiveTournament,
  currentUser,
  onSelectActive,
  onNavigate,
  onOpenCreateTournament,
  onEditTeam,
  onDeleteTeam,
  onDeleteTournament,
  showToast
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInviteLink = async () => {
    if (!activeTournament) return;
    const inviteUrl = `${window.location.origin}/?invite=${activeTournament.id}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('🔗 Squad invite link copied — share it with your captains!');
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Clipboard is blocked outside secure contexts; show the link instead.
      window.prompt('Copy this squad invite link:', inviteUrl);
    }
  };

  if (myTournaments.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '620px', margin: '2rem auto' }}>
        <Trophy size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>You have not organized any events yet</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          Create a tournament to get your own control deck. You will be the only person who can
          enter match scores and change the scoring rules for it.
        </p>
        <button className="btn btn-primary btn-lg" onClick={onOpenCreateTournament}>
          <Plus size={18} /> Create Your First Tournament
        </button>
      </div>
    );
  }

  const managing = canManageActiveTournament ? activeTournament : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
          background: 'linear-gradient(135deg, #ffffff, var(--lavender-light))',
          border: '1px solid var(--border-lavender)', padding: '1.25rem 1.5rem', borderRadius: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="stat-icon" style={{ background: '#ffffff', color: 'var(--accent-emerald)' }}>
            <ShieldCheck />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: 0 }}>Organizer Control Deck</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--lavender-dark)', fontWeight: 600 }}>
              Signed in as <strong>{currentUser?.displayName || currentUser?.email}</strong>
              {' · '}{myTournaments.length} event{myTournaments.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateTournament}>
          <Plus size={16} /> Create Tournament
        </button>
      </div>

      {/* My events */}
      <div>
        {/* On the background photo — light heading, not dark panel text */}
        <div className="section-heading-row">
          <h3 className="section-heading">
            <Trophy size={20} color="var(--gold-primary)" />
            My Events
            <span className="section-heading-count">{myTournaments.length}</span>
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1.25rem' }}>
          {myTournaments.map(t => {
            const isActive = activeTournament?.id === t.id;
            return (
              <div
                key={t.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderColor: isActive ? 'var(--lavender-primary)' : 'var(--border-glass)',
                  boxShadow: isActive ? 'var(--shadow-lavender)' : 'none'
                }}
              >
                <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>{t.name}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                  <Calendar size={12} style={{ display: 'inline' }} /> {t.date}
                </div>

                {/* Room credentials are visible here because this is the organizer's own deck */}
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid #e2e8f0',
                    padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.85rem'
                  }}
                >
                  <div><Hash size={11} /> Room: <strong style={{ color: 'var(--lavender-dark)' }}>{t.roomId || '—'}</strong></div>
                  <div><Key size={11} /> Pass: <strong style={{ color: 'var(--lavender-dark)' }}>{t.roomPassword || '—'}</strong></div>
                  <div><Users size={11} /> Squads: <strong style={{ color: 'var(--lavender-dark)' }}>{t.teams.length}</strong></div>
                  <div><Trophy size={11} /> Matches: <strong style={{ color: 'var(--lavender-dark)' }}>{t.matches.length}/{t.totalMatches}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                  {isActive ? (
                    <span className="btn btn-sm btn-outline-gold" style={{ cursor: 'default', opacity: 0.85 }}>
                      <Check size={14} /> Selected
                    </span>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={() => onSelectActive(t.id)}>
                      Select &amp; Manage
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => onDeleteTournament(t.id)} title="Delete tournament">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!managing ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Select one of your events above to enter scores, share invite links, and manage squads.
          </p>
        </div>
      ) : (
        <>
          {/* Quick actions for the selected event */}
          <div>
            <div className="section-heading-row">
              <h3 className="section-heading">
                <Settings size={20} color="var(--lavender-primary)" />
                Managing: {managing.name}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '1.25rem' }}>
              <button className="glass-panel stat-card" style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }} onClick={() => onNavigate('matchentry')}>
                <div className="stat-icon" style={{ color: 'var(--lavender-primary)' }}><Crosshair /></div>
                <div className="stat-info">
                  <span className="stat-value">Match Entry</span>
                  <span className="stat-label">Record placements &amp; frags</span>
                </div>
              </button>

              <button className="glass-panel stat-card" style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }} onClick={() => onNavigate('rooms')}>
                <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}><DoorOpen /></div>
                <div className="stat-info">
                  <span className="stat-value">Rooms &amp; Chat</span>
                  <span className="stat-label">
                    {managing.teams.length > 12
                      ? `${Math.ceil(managing.teams.length / 12)} rooms needed`
                      : 'Split squads · message them'}
                  </span>
                </div>
              </button>

              <button className="glass-panel stat-card" style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }} onClick={() => onNavigate('settings')}>
                <div className="stat-icon" style={{ color: 'var(--gold-primary)' }}><Settings /></div>
                <div className="stat-info">
                  <span className="stat-value">Scoring Rules</span>
                  <span className="stat-label">Placement points &amp; schedule</span>
                </div>
              </button>

              <button className="glass-panel stat-card" style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }} onClick={handleCopyInviteLink}>
                <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>
                  {copiedLink ? <Check /> : <Copy />}
                </div>
                <div className="stat-info">
                  <span className="stat-value">{copiedLink ? 'Link Copied!' : 'Invite Link'}</span>
                  <span className="stat-label">Share squad registration</span>
                </div>
              </button>

              <button
                className="glass-panel stat-card"
                style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }}
                onClick={() => window.open('/obs', '_blank', 'noopener')}
              >
                <div className="stat-icon" style={{ color: 'var(--accent-rose)' }}><Radio /></div>
                <div className="stat-info">
                  <span className="stat-value">OBS Overlay</span>
                  <span className="stat-label">Broadcast leaderboard</span>
                </div>
              </button>
            </div>
          </div>

          {/* Squads */}
          <div className="glass-panel" style={{ padding: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>
                Registered Squads ({managing.teams.length})
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={handleCopyInviteLink}>
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>

            {managing.teams.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>
                No squads yet. Share the invite link so team leaders can register themselves.
              </p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tag</th><th>Team Name</th><th>Captain</th><th>Phone</th><th>Players</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managing.teams.map(t => (
                      <tr key={t.id}>
                        <td><span style={{ fontWeight: 800, color: 'var(--lavender-dark)' }}>{t.logo || t.name.substring(0, 3).toUpperCase()}</span></td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{t.name}</td>
                        <td>{t.captain}</td>
                        <td>
                          {t.phone ? (
                            <a href={`tel:${t.phone}`} style={{ color: 'var(--accent-emerald)', fontWeight: 600, textDecoration: 'none' }}>
                              <Phone size={12} /> {t.phone}
                            </a>
                          ) : '—'}
                        </td>
                        <td>{t.players.map(p => p.ign || p.name).join(', ')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => onEditTeam(t)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => onDeleteTeam(t.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
