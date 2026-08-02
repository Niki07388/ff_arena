import React from 'react';
import { Tournament, Team } from '../types';
import { Users, Plus, Edit2, Trash2, User, Phone, Shield } from 'lucide-react';

interface TeamManagerViewProps {
  tournament: Tournament | null;
  isAuthenticated: boolean;
  /** True when the signed-in user registered this squad, or organizes the event. */
  canManageTeam: (team: Team) => boolean;
  isOrganizer: boolean;
  /** The one squad this user already registered here, if any. */
  myTeamId: string | null;
  onAddTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
}

export const TeamManagerView: React.FC<TeamManagerViewProps> = ({
  tournament,
  isAuthenticated,
  canManageTeam,
  isOrganizer,
  myTeamId,
  onAddTeam,
  onEditTeam,
  onDeleteTeam
}) => {
  if (!tournament) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>No active tournament.</div>;
  }

  const handleDeleteClick = (team: Team) => {
    if (window.confirm(`Remove squad "${team.name}" from this tournament?`)) {
      onDeleteTeam(team.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        className="glass-panel"
        style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <h2 style={{ color: '#0f172a' }}>Squads in {tournament.name}</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {!isAuthenticated
              ? 'Sign in as a team leader to register your squad.'
              : myTeamId
              ? 'You have registered one squad here — one per person, per event.'
              : 'Register your squad. Each person may enter one squad per event.'}
          </p>
        </div>

        {/* One squad per person per event, so this becomes an edit action once
            they have registered. */}
        <button className="btn btn-primary" onClick={onAddTeam}>
          {myTeamId ? <><Edit2 size={16} /> Edit My Squad</> : <><Plus size={16} /> Register Squad</>}
        </button>
      </div>

      {tournament.teams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Users size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
          <h3>No squads registered yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Be the first team to enter this tournament.
          </p>
          <button className="btn btn-primary" onClick={onAddTeam}>Register Squad</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1.25rem' }}>
          {tournament.teams.map(team => {
            const canManage = canManageTeam(team);
            const isMine = team.id === myTeamId;

            return (
              <div
                key={team.id}
                className="glass-panel"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem', gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <div className="team-avatar">
                      {team.logo ? team.logo.substring(0, 3).toUpperCase() : team.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {team.name}
                        {isMine && <span className="badge-organizer">YOUR SQUAD</span>}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--lavender-dark)', fontWeight: 600, marginTop: '0.15rem' }}>
                        Captain: {team.captain}
                      </div>
                      {/* Captain phone is contact info for the organizer — only shown to them. */}
                      {team.phone && isOrganizer && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <Phone size={13} color="var(--accent-emerald)" />
                          <a href={`tel:${team.phone}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
                            {team.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => onEditTeam(team)} title="Edit squad" aria-label={`Edit ${team.name}`}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(team)} title="Remove squad" aria-label={`Remove ${team.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span
                      title="Only this squad's team leader or the event organizer can edit it"
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <Shield size={15} />
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Roster Players
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {team.players.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        style={{
                          background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px',
                          border: '1px solid #e2e8f0', fontSize: '0.88rem', display: 'flex',
                          alignItems: 'center', gap: '0.45rem', color: '#0f172a', fontWeight: 600
                        }}
                      >
                        <User size={13} color="var(--lavender-primary)" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.ign || p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
