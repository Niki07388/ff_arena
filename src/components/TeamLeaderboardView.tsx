import React from 'react';
import { Tournament, LeaderboardItem, Team } from '../types';
import { Flame, Download } from 'lucide-react';
import { exportTeamLeaderboardCSV } from '../utils/export';

interface TeamLeaderboardViewProps {
  tournament: Tournament | null;
  leaderboard: LeaderboardItem[];
  onSelectTeam: (team: Team) => void;
}

export const TeamLeaderboardView: React.FC<TeamLeaderboardViewProps> = ({
  tournament,
  leaderboard,
  onSelectTeam
}) => {
  if (!tournament) return <div>No active tournament.</div>;

  const handleExportCSV = () => {
    exportTeamLeaderboardCSV(tournament, leaderboard);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#0f172a' }}>Overall Team Standings & Leaderboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Automated tournament ranking calculated from placements and frags.</p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportCSV}>
          <Download size={16} /> Export Standings CSV
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team Name</th>
              <th>Captain</th>
              <th style={{ textAlign: 'center' }}>Matches</th>
              <th style={{ textAlign: 'center' }}>WWCD (Booyah)</th>
              <th style={{ textAlign: 'center' }}>Placement Pts</th>
              <th style={{ textAlign: 'center' }}>Total Kills</th>
              <th style={{ textAlign: 'right' }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((item, index) => {
              const rankNum = index + 1;
              const isGold = rankNum === 1;
              const isSilver = rankNum === 2;
              const isBronze = rankNum === 3;

              return (
                <tr
                  key={item.team.id}
                  className={isGold ? 'rank-1-row' : isSilver ? 'rank-2-row' : isBronze ? 'rank-3-row' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectTeam(item.team)}
                >
                  <td>
                    <div className={`rank-badge ${isGold ? 'rank-gold' : isSilver ? 'rank-silver' : isBronze ? 'rank-bronze' : 'rank-normal'}`}>
                      {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : rankNum}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="team-avatar" style={{ width: '34px', height: '34px', fontSize: '0.95rem' }}>
                        {item.team.logo || item.team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: isGold ? 'var(--gold-primary)' : '#0f172a', fontWeight: 700 }}>
                          {item.team.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click for team breakdown</div>
                      </div>
                    </div>
                  </td>

                  <td>{item.team.captain}</td>
                  <td style={{ textAlign: 'center' }}>{item.matchesPlayed}</td>
                  <td style={{ textAlign: 'center' }}>
                    {item.wwcd > 0 ? (
                      <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>
                        🏆 {item.wwcd}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--lavender-dark)' }}>{item.placementPoints}</td>
                  <td style={{ textAlign: 'center', color: 'var(--bronze-primary)', fontWeight: 'bold' }}>
                    <Flame size={12} style={{ display: 'inline' }} /> {item.totalKills}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--lavender-dark)' }}>
                    {item.totalPoints} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
