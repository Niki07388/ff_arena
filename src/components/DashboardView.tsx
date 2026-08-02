import React from 'react';
import { Tournament, LeaderboardItem, PlayerStat } from '../types';
import { Trophy, Shield, Flame, Users, Calendar, Key, Hash, Award, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  tournament: Tournament | null;
  leaderboard: LeaderboardItem[];
  playerStats: PlayerStat[];
  /** Room ID / password are only revealed to the organizer of this event. */
  canSeeRoomCredentials: boolean;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tournament,
  leaderboard,
  playerStats,
  canSeeRoomCredentials,
  onNavigate
}) => {
  if (!tournament) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <Trophy size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
        <h2>No Active Tournament Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create a new tournament to start managing scores.</p>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('tournaments')}>Manage Tournaments</button>
      </div>
    );
  }

  const leaderTeam = leaderboard[0];
  const mvpPlayer = playerStats[0];
  const totalMatchesPlayed = tournament.matches.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Room Details Banner */}
      <div className="room-card">
        <div>
          <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '0.2rem' }}>{tournament.name}</h2>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> {tournament.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={14} /> {tournament.teams.length} Teams Enrolled</span>
          </div>
        </div>

        <div className="room-details">
          <div className="room-detail-item">
            <span className="room-detail-label"><Hash size={12} style={{ display: 'inline' }} /> Room ID</span>
            <span className="room-detail-value">
              {canSeeRoomCredentials ? (tournament.roomId || '—') : '••••••'}
            </span>
          </div>
          <div className="room-detail-item">
            <span className="room-detail-label"><Key size={12} style={{ display: 'inline' }} /> Password</span>
            <span className="room-detail-value">
              {canSeeRoomCredentials ? (tournament.roomPassword || '—') : '•••'}
            </span>
          </div>
          <div className="room-detail-item">
            <span className="room-detail-label">Progress</span>
            <span className="room-detail-value" style={{ color: 'var(--accent-emerald)' }}>
              Match {totalMatchesPlayed} / {tournament.totalMatches}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon"><Trophy /></div>
          <div className="stat-info">
            <span className="stat-value">{leaderTeam ? leaderTeam.team.name : 'N/A'}</span>
            <span className="stat-label">Current Tournament Leader</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'rgba(234, 88, 12, 0.3)', color: 'var(--bronze-primary)' }}><Flame /></div>
          <div className="stat-info">
            <span className="stat-value">{mvpPlayer ? (mvpPlayer.player.ign || mvpPlayer.player.name) : 'N/A'}</span>
            <span className="stat-label">Tournament MVP ({mvpPlayer ? mvpPlayer.totalKills : 0} Kills)</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--accent-emerald)' }}><Shield /></div>
          <div className="stat-info">
            <span className="stat-value">{tournament.teams.length}</span>
            <span className="stat-label">Registered Teams</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ borderColor: 'rgba(124, 58, 237, 0.3)', color: 'var(--accent-purple)' }}><Award /></div>
          <div className="stat-info">
            <span className="stat-value">{totalMatchesPlayed} / {tournament.totalMatches}</span>
            <span className="stat-label">Matches Completed</span>
          </div>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1.5rem' }}>
        {/* Top 3 Leaderboard Card */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--lavender-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} /> Top 3 Standings
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('leaderboard')}>
              Full Standings <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaderboard.slice(0, 3).map((item, idx) => (
              <div 
                key={item.team.id}
                className="glass-card"
                style={{
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  borderLeft: `4px solid ${idx === 0 ? 'var(--gold-primary)' : idx === 1 ? 'var(--silver-primary)' : 'var(--bronze-primary)'}`
                }}
              >
                <div className={`rank-badge ${idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : 'rank-bronze'}`}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{item.team.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    WWCD: {item.wwcd} | Kills: {item.totalKills}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--lavender-dark)', fontWeight: 800 }}>
                  {item.totalPoints} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Kill Fraggers Card */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--bronze-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} /> Top Kill Fraggers
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('players')}>
              Player Stats <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {playerStats.slice(0, 3).map((p, idx) => (
              <div key={p.player.id} className="glass-card" style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className={`rank-badge ${idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : 'rank-bronze'}`}>
                  {idx === 0 ? '👑' : idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                    {p.player.ign || p.player.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Team: {p.teamName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--bronze-primary)', fontWeight: 800 }}>
                    {p.totalKills} Kills
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg: {p.avgKills}/M</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
