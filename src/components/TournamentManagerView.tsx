import React from 'react';
import { Tournament } from '../types';
import { Shield, Plus, Check, Trash2, Download, Calendar, Users, Hash, Printer, UserPlus, Trophy, Lock } from 'lucide-react';

interface TournamentManagerViewProps {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  isAuthenticated: boolean;
  isOrganizerOf: (tournament: Tournament | null | undefined) => boolean;
  onOpenAuth: () => void;
  onSelectActive: (id: string) => void;
  onViewStandings: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  onRegisterSquad: (id: string) => void;
  onExportCSV: () => void;
  onPrintPDF: () => void;
}

export const TournamentManagerView: React.FC<TournamentManagerViewProps> = ({
  tournaments,
  activeTournament,
  isAuthenticated,
  isOrganizerOf,
  onOpenAuth,
  onSelectActive,
  onViewStandings,
  onCreateNew,
  onDelete,
  onRegisterSquad,
  onExportCSV,
  onPrintPDF
}) => {
  const handleDeleteClick = (t: Tournament) => {
    if (window.confirm(`Delete "${t.name}"? This also removes its squads and match scores. This cannot be undone.`)) {
      onDelete(t.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        className="glass-panel"
        style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <h2 style={{ color: '#0f172a' }}>All Tournaments</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Every event is public to browse. You can only manage the ones you created.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={isAuthenticated ? onCreateNew : onOpenAuth}>
            <Plus size={16} /> {isAuthenticated ? 'Create Tournament' : 'Sign In to Create'}
          </button>
          <button className="btn btn-secondary" onClick={onExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={onPrintPDF}>
            <Printer size={16} /> Print PDF
          </button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Trophy size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
          <h3>No tournaments have been created yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Be the first organizer to set one up.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1.25rem' }}>
          {tournaments.map(t => {
            const isActive = activeTournament?.id === t.id;
            const isMine = isOrganizerOf(t);

            return (
              <div
                key={t.id}
                className="glass-panel tournament-card"
                style={{
                  borderColor: isActive ? 'var(--lavender-primary)' : 'var(--border-glass)',
                  boxShadow: isActive ? 'var(--shadow-lavender)' : 'none'
                }}
              >
                <div>
                  {/* Same fixed row structure as the home page cards */}
                  <div className="tournament-card-badges">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className="live-badge" style={{ background: isActive ? 'var(--lavender-primary)' : '#64748b' }}>
                        {isActive ? 'SELECTED' : 'EVENT SESSION'}
                      </span>
                      {isMine && (
                        <span className="badge-organizer">
                          <Shield size={11} /> YOURS
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Calendar size={12} style={{ display: 'inline' }} /> {t.date}
                    </span>
                  </div>

                  <h3 className="tournament-card-title">{t.name}</h3>

                  <div className="tournament-card-stats">
                    <div><Users size={12} /> Squads: <strong>{t.teams.length}</strong></div>
                    <div><Hash size={12} /> Matches: <strong>{t.matches.length}/{t.totalMatches}</strong></div>
                    <div className="tournament-card-room">
                      {isMine ? (
                        <><Shield size={11} /> You can score and configure this event</>
                      ) : (
                        <><Lock size={11} /> Managed by another organizer</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tournament-card-actions">
                  {/* "Select & Load" means "make this my working event", so it is
                      offered only on events you organize. Everyone else's events
                      stay open to view and to register a squad into. */}
                  {isMine ? (
                    isActive ? (
                      <span className="btn btn-sm btn-outline-gold" style={{ flex: 1, cursor: 'default', opacity: 0.8, justifyContent: 'center' }}>
                        <Check size={14} /> Selected
                      </span>
                    ) : (
                      <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => onSelectActive(t.id)}>
                        Select &amp; Load
                      </button>
                    )
                  ) : (
                    <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => onViewStandings(t.id)}>
                      View Standings
                    </button>
                  )}

                  <button className="btn btn-sm btn-secondary" onClick={() => onRegisterSquad(t.id)} title="Register your squad">
                    <UserPlus size={14} />
                  </button>

                  {/* Delete is only offered to the organizer; the database rejects it for anyone else. */}
                  {isMine && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(t)} title="Delete tournament">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
