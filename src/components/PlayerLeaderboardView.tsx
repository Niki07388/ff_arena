import React, { useState } from 'react';
import { Tournament, PlayerStat } from '../types';
import { Flame, Download } from 'lucide-react';
import { exportPlayerLeaderboardCSV } from '../utils/export';

interface PlayerLeaderboardViewProps {
  tournament: Tournament | null;
  playerStats: PlayerStat[];
  onSelectPlayer: (stat: PlayerStat) => void;
}

export const PlayerLeaderboardView: React.FC<PlayerLeaderboardViewProps> = ({
  tournament,
  playerStats,
  onSelectPlayer
}) => {
  const [selectedMatchFilter, setSelectedMatchFilter] = useState<number | 'all'>('all');

  if (!tournament) return <div>No active tournament.</div>;

  const handleExportCSV = () => {
    exportPlayerLeaderboardCSV(tournament, playerStats);
  };

  // If a specific match is selected in the filter dropdown, sort players by kills in THAT match!
  const processedPlayerStats = [...playerStats].sort((a, b) => {
    if (selectedMatchFilter === 'all') {
      return b.totalKills - a.totalKills;
    }
    const killsA = a.matchKills[selectedMatchFilter] || 0;
    const killsB = b.matchKills[selectedMatchFilter] || 0;
    if (killsB !== killsA) return killsB - killsA;
    return b.totalKills - a.totalKills;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#0f172a' }}>Player Individual Fragger Leaderboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Match-by-match fragger stats and MVP standings.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Match Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--bronze-primary)', fontSize: '0.9rem' }}>
              Filter By Match:
            </span>
            <select
              className="form-control"
              style={{ width: '150px', fontWeight: 'bold' }}
              value={selectedMatchFilter}
              onChange={e => {
                const val = e.target.value;
                setSelectedMatchFilter(val === 'all' ? 'all' : Number(val));
              }}
            >
              <option value="all">Overall (All)</option>
              {Array.from({ length: tournament.totalMatches }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>Match {num} Kills</option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export Player Stats CSV
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player IGN</th>
              <th>Team Name</th>
              {/* Dynamic Match-by-Match Kills Columns */}
              {Array.from({ length: tournament.totalMatches }, (_, i) => i + 1).map(mNum => (
                <th
                  key={mNum}
                  style={{
                    textAlign: 'center',
                    background: selectedMatchFilter === mNum ? 'rgba(217, 119, 6, 0.15)' : undefined,
                    color: selectedMatchFilter === mNum ? 'var(--bronze-primary)' : undefined
                  }}
                >
                  M{mNum} Frags
                </th>
              ))}
              <th style={{ textAlign: 'center' }}>Total Kills</th>
              <th style={{ textAlign: 'center' }}>Avg / Match</th>
              <th style={{ textAlign: 'center' }}>Best Frag</th>
            </tr>
          </thead>
          <tbody>
            {processedPlayerStats.map((p, index) => {
              const rankNum = index + 1;
              const isGold = rankNum === 1;
              const isSilver = rankNum === 2;
              const isBronze = rankNum === 3;

              return (
                <tr
                  key={p.player.id}
                  className={isGold ? 'rank-1-row' : isSilver ? 'rank-2-row' : isBronze ? 'rank-3-row' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectPlayer(p)}
                >
                  <td>
                    <div className={`rank-badge ${isGold ? 'rank-gold' : isSilver ? 'rank-silver' : isBronze ? 'rank-bronze' : 'rank-normal'}`}>
                      {rankNum === 1 ? '👑' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : rankNum}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 700, color: isGold ? 'var(--gold-primary)' : '#0f172a' }}>
                      {p.player.ign || p.player.name}
                    </div>
                  </td>

                  <td style={{ color: 'var(--text-muted)' }}>{p.teamName}</td>

                  {/* Match-by-Match Kills Breakdown */}
                  {Array.from({ length: tournament.totalMatches }, (_, i) => i + 1).map(mNum => {
                    const numKills = p.matchKills[mNum] || 0;
                    const isSelectedMatchCol = selectedMatchFilter === mNum;

                    return (
                      <td
                        key={mNum}
                        style={{
                          textAlign: 'center',
                          fontWeight: numKills > 0 ? 700 : 400,
                          color: numKills > 0 ? (isSelectedMatchCol ? 'var(--gold-primary)' : '#0f172a') : 'var(--text-muted)',
                          background: isSelectedMatchCol ? 'rgba(217, 119, 6, 0.05)' : undefined
                        }}
                      >
                        {numKills > 0 ? numKills : '-'}
                      </td>
                    );
                  })}

                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--bronze-primary)' }}>
                    <Flame size={14} style={{ display: 'inline' }} /> {p.totalKills}
                  </td>

                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.avgKills}</td>
                  <td style={{ textAlign: 'center', color: 'var(--lavender-dark)', fontWeight: 700 }}>{p.highestKillMatch} Kills</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
