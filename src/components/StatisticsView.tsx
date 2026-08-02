import React from 'react';
import { Tournament, LeaderboardItem, PlayerStat } from '../types';
import { BarChart2, Trophy, Flame, Shield, Award } from 'lucide-react';

interface StatisticsViewProps {
  tournament: Tournament | null;
  leaderboard: LeaderboardItem[];
  playerStats: PlayerStat[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  tournament,
  leaderboard,
  playerStats
}) => {
  if (!tournament) return <div>No active tournament.</div>;

  const topTeam = leaderboard[0];
  const mvp = playerStats[0];

  // Highest Kill Team
  const sortedByKills = [...leaderboard].sort((a, b) => b.totalKills - a.totalKills);
  const highestKillTeam = sortedByKills[0];

  // WWCD Leader
  const sortedByWwcd = [...leaderboard].sort((a, b) => b.wwcd - a.wwcd);
  const wwcdLeader = sortedByWwcd[0];

  // Max points for bar chart scaling
  const maxPoints = topTeam ? Math.max(topTeam.totalPoints, 1) : 1;
  const maxKills = mvp ? Math.max(mvp.totalKills, 1) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <h2 style={{ color: '#0f172a' }}>Tournament Analytics & Stats</h2>
        <p style={{ color: 'var(--text-muted)' }}>Detailed statistical breakdown and performance charts.</p>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon"><Trophy /></div>
          <div className="stat-info">
            <span className="stat-value">{topTeam ? topTeam.team.name : 'N/A'}</span>
            <span className="stat-label">Tournament Winner</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}><Flame /></div>
          <div className="stat-info">
            <span className="stat-value">{highestKillTeam ? highestKillTeam.team.name : 'N/A'}</span>
            <span className="stat-label">Most Kills Team ({highestKillTeam ? highestKillTeam.totalKills : 0})</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--gold-primary)', color: 'var(--gold-primary)' }}><Award /></div>
          <div className="stat-info">
            <span className="stat-value">{mvp ? (mvp.player.ign || mvp.player.name) : 'N/A'}</span>
            <span className="stat-label">Tournament MVP ({mvp ? mvp.totalKills : 0} Kills)</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}><Shield /></div>
          <div className="stat-info">
            <span className="stat-value">{wwcdLeader ? wwcdLeader.team.name : 'N/A'}</span>
            <span className="stat-label">WWCD Leader ({wwcdLeader ? wwcdLeader.wwcd : 0} Booyahs)</span>
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', gap: '1.5rem' }}>
        {/* Team Points Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} /> Team Points Comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {leaderboard.map(item => {
              const pct = Math.round((item.totalPoints / maxPoints) * 100);
              return (
                <div key={item.team.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700 }}>{item.team.name}</span>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>{item.totalPoints} pts</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--lavender-dark), var(--lavender-primary))',
                        borderRadius: '5px',
                        transition: 'width 0.6s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Kills Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--accent-rose)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={18} /> Top Fraggers Kills Comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {playerStats.slice(0, 6).map(p => {
              const pct = Math.round((p.totalKills / maxKills) * 100);
              return (
                <div key={p.player.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700 }}>{p.player.ign || p.player.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({p.teamName})</span></span>
                    <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>{p.totalKills} kills</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--accent-rose), var(--gold-primary))',
                        borderRadius: '5px',
                        transition: 'width 0.6s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
