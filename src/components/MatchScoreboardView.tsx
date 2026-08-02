import React, { useState } from 'react';
import { Tournament, Team } from '../types';
import { Printer, Download, Flame } from 'lucide-react';
import { exportMatchScoreboardCSV } from '../utils/export';
import { computeEntryScore } from '../utils/scoring';

interface MatchScoreboardViewProps {
  tournament: Tournament | null;
  onSelectTeam?: (team: Team) => void;
}

export const MatchScoreboardView: React.FC<MatchScoreboardViewProps> = ({ tournament, onSelectTeam }) => {
  const [selectedMatch, setSelectedMatch] = useState<number>(1);

  if (!tournament) return <div style={{ padding: '2rem', textAlign: 'center' }}>No active tournament.</div>;

  // Get data for selected match
  const matchData = tournament.matches.find(m => m.matchNumber === selectedMatch);

  // Scores come from the shared scorer so this table can never drift away from
  // the overall standings or the team profile popup.
  const matchRows = tournament.teams.map(team => {
    const score = computeEntryScore(matchData?.entries?.[team.id], tournament.scoringRules);

    return {
      team,
      placement: score.placement,
      placementPoints: score.placementPoints,
      kills: score.kills,
      totalPoints: score.totalPoints,
      isWWCD: score.placement === 1,
      participated: score.participated
    };
  }).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.placement > 0 && b.placement > 0) return a.placement - b.placement;
    return b.kills - a.kills;
  });

  const handleExportCSV = () => {
    exportMatchScoreboardCSV(tournament, selectedMatch, matchRows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Selector Bar in White Glass Panel */}
      <div className="glass-panel no-print" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#0f172a' }}>Match {selectedMatch} Scorecard Table</h2>
          <p style={{ color: 'var(--text-muted)' }}>Match-by-match score breakdown formatted like overall team standings.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--lavender-dark)' }}>Select Match:</span>
            <select
              className="form-control"
              style={{ width: '140px', fontWeight: 'bold' }}
              value={selectedMatch}
              onChange={e => setSelectedMatch(Number(e.target.value))}
            >
              {Array.from({ length: tournament.totalMatches }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>Match {num}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Scoreboard Table in Normal Theme */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team Name</th>
              <th>Captain</th>
              <th style={{ textAlign: 'center' }}>Played</th>
              <th style={{ textAlign: 'center' }}>WWCD (Booyah)</th>
              <th style={{ textAlign: 'center' }}>Placement Pts</th>
              <th style={{ textAlign: 'center' }}>Total Kills</th>
              <th style={{ textAlign: 'right' }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {matchRows.map((item, index) => {
              const rankNum = index + 1;
              const isGold = rankNum === 1;
              const isSilver = rankNum === 2;
              const isBronze = rankNum === 3;

              return (
                <tr
                  key={item.team.id}
                  className={isGold ? 'rank-1-row' : isSilver ? 'rank-2-row' : isBronze ? 'rank-3-row' : ''}
                  style={{ cursor: onSelectTeam ? 'pointer' : 'default' }}
                  onClick={() => onSelectTeam && onSelectTeam(item.team)}
                >
                  {/* Rank */}
                  <td>
                    <div className={`rank-badge ${isGold ? 'rank-gold' : isSilver ? 'rank-silver' : isBronze ? 'rank-bronze' : 'rank-normal'}`}>
                      {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : rankNum}
                    </div>
                  </td>

                  {/* Team Name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="team-avatar" style={{ width: '34px', height: '34px', fontSize: '0.95rem' }}>
                        {item.team.logo || item.team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: isGold ? 'var(--lavender-dark)' : '#0f172a', fontWeight: 700 }}>
                          {item.team.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click for team breakdown</div>
                      </div>
                    </div>
                  </td>

                  {/* Captain */}
                  <td>{item.team.captain}</td>

                  {/* Did this squad actually play the selected match? */}
                  <td style={{ textAlign: 'center' }}>
                    {item.participated
                      ? <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>✓</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>

                  {/* WWCD */}
                  <td style={{ textAlign: 'center' }}>
                    {item.isWWCD ? (
                      <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>
                        🏆 1
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>

                  {/* Placement Pts */}
                  <td style={{ textAlign: 'center', color: 'var(--lavender-dark)' }}>{item.placementPoints}</td>

                  {/* Total Kills */}
                  <td style={{ textAlign: 'center', color: 'var(--bronze-primary)', fontWeight: 'bold' }}>
                    <Flame size={12} style={{ display: 'inline' }} /> {item.kills}
                  </td>

                  {/* Total Points */}
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
