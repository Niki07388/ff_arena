import React from 'react';
import { Tournament, PlayerStat } from '../../types';
import { Flame } from 'lucide-react';

interface PlayerProfileModalProps {
  playerStat: PlayerStat | null;
  tournament: Tournament | null;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  playerStat,
  tournament,
  onClose
}) => {
  if (!playerStat || !tournament) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="stat-icon" style={{ width: '40px', height: '40px', fontSize: '1.2rem', color: 'var(--bronze-primary)' }}>
              <Flame />
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#0f172a' }}>{playerStat.player.ign || playerStat.player.name}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Team: {playerStat.teamName}</div>
            </div>
          </div>

          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Player Overall Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Frags</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--bronze-primary)' }}>
              {playerStat.totalKills}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg / Match</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--lavender-dark)' }}>
              {playerStat.avgKills}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Best Match</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-primary)' }}>
              {playerStat.highestKillMatch} Kills
            </div>
          </div>
        </div>

        {/* Match-by-Match Kills Breakdown */}
        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--lavender-dark)' }}>Match-by-Match Breakdown:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(110px, 100%), 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: tournament.totalMatches }, (_, i) => i + 1).map(mNum => {
            const kills = playerStat.matchKills[mNum] || 0;
            return (
              <div key={mNum} style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match {mNum}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: kills > 0 ? '#0f172a' : 'var(--text-muted)' }}>
                  {kills} {kills === 1 ? 'Kill' : 'Kills'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close Profile</button>
        </div>
      </div>
    </div>
  );
};
