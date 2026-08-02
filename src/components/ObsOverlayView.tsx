import React from 'react';
import { Tournament, LeaderboardItem } from '../types';
import { Radio, X } from 'lucide-react';

interface ObsOverlayViewProps {
  tournament: Tournament | null;
  leaderboard: LeaderboardItem[];
  onExitObs: () => void;
}

export const ObsOverlayView: React.FC<ObsOverlayViewProps> = ({
  tournament,
  leaderboard,
  onExitObs
}) => {
  // Rendered on its own /obs route, so it must show something while the
  // tournament data is still loading rather than a blank capture source.
  if (!tournament) {
    return (
      <div
        style={{
          minHeight: '100vh', background: '#05060a', color: 'rgba(255,255,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', letterSpacing: '1px'
        }}
      >
        Waiting for tournament data…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05060a', color: '#fff', padding: '2rem' }}>
      {/* Floating Exit Button for OBS admin */}
      <div style={{ position: 'fixed', top: '15px', right: '15px', zIndex: 1000 }} className="no-print">
        <button className="btn btn-sm btn-danger" onClick={onExitObs}>
          <X size={14} /> Exit OBS Overlay
        </button>
      </div>

      {/* Broadcast Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--gold-primary)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--gold-primary)', color: '#000', padding: '0.4rem 0.8rem', borderRadius: '6px', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.2rem' }}>
            BOOYAH!
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', letterSpacing: '2px', background: 'linear-gradient(135deg, #fff, var(--gold-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {tournament.name}
            </h1>
            <div style={{ fontFamily: 'var(--font-sub)', color: 'var(--gold-light)', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px' }}>
              OFFICIAL OVERALL LEADERBOARD
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="live-badge" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
            <Radio size={14} style={{ display: 'inline', marginRight: '0.3rem' }} /> LIVE OVERLAY
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Matches Played: {tournament.matches.length} / {tournament.totalMatches}
          </div>
        </div>
      </div>

      {/* Scoreboard Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: '1rem' }}>
        {leaderboard.map((item, idx) => {
          const rank = idx + 1;
          const isGold = rank === 1;
          const isSilver = rank === 2;
          const isBronze = rank === 3;

          return (
            <div
              key={item.team.id}
              style={{
                background: 'rgba(18, 20, 29, 0.9)',
                border: `1px solid ${isGold ? 'var(--gold-primary)' : isSilver ? 'var(--silver-primary)' : isBronze ? 'var(--bronze-primary)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isGold ? '0 0 25px rgba(255,183,3,0.3)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={`rank-badge ${isGold ? 'rank-gold' : isSilver ? 'rank-silver' : isBronze ? 'rank-bronze' : 'rank-normal'}`} style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                  {rank}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: isGold ? 'var(--gold-primary)' : '#fff' }}>
                    {item.team.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    WWCD: {item.wwcd} | Kills: {item.totalKills}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 900, color: 'var(--gold-primary)' }}>
                  {item.totalPoints}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>POINTS</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
