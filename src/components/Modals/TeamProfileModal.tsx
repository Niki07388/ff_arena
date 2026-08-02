import React from 'react';
import { Team, Tournament } from '../../types';
import { X, User, Phone } from 'lucide-react';
import { computeTeamTotals } from '../../utils/scoring';

interface TeamProfileModalProps {
  team: Team | null;
  tournament: Tournament | null;
  onClose: () => void;
}

export const TeamProfileModal: React.FC<TeamProfileModalProps> = ({
  team,
  tournament,
  onClose
}) => {
  if (!team || !tournament) return null;

  // Uses the same shared scorer as the leaderboard, so manual placement points,
  // bonus/penalty points and total overrides are all honoured here too. The old
  // version recomputed from the placement table alone and disagreed with the
  // standings table whenever an organizer had adjusted anything by hand.
  const {
    totalKills,
    placementPoints: totalPlacementPts,
    wwcd: wwcdCount,
    matchesPlayed,
    totalPoints
  } = computeTeamTotals(tournament, team.id);

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="team-avatar" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
              {team.logo || team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#0f172a' }}>{team.name}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--lavender-dark)', fontWeight: 600 }}>Captain: {team.captain}</div>
              {team.phone && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                  <Phone size={12} color="var(--accent-emerald)" /> {team.phone}
                </div>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(110px, 100%), 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Points</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--lavender-dark)', fontWeight: 800 }}>{totalPoints}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Kills</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--bronze-primary)', fontWeight: 800 }}>{totalKills}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Placement Pts</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--accent-purple)', fontWeight: 800 }}>{totalPlacementPts}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matches</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>{matchesPlayed}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booyahs</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--accent-emerald)', fontWeight: 800 }}>{wwcdCount}</div>
          </div>
        </div>

        {/* Player Roster */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Roster Players</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {team.players.map(p => (
              <div key={p.id} className="glass-card" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} color="var(--lavender-primary)" />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.ign || p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>Close Profile</button>
        </div>
      </div>
    </div>
  );
};
