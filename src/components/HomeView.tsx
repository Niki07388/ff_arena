import React from 'react';
import { Tournament } from '../types';
import {
  Trophy, Shield, Users, Calendar, UserPlus, LogIn, Plus, ArrowRight, Sparkles, Lock,
  Hash, Key
} from 'lucide-react';

interface HomeViewProps {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  isAuthenticated: boolean;
  isOrganizerOf: (tournament: Tournament | null | undefined) => boolean;
  onSelectTournament: (id: string) => void;
  onOpenRegisterTeam: () => void;
  onOpenCreateTournament: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigate: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tournaments,
  activeTournament,
  isAuthenticated,
  isOrganizerOf,
  onSelectTournament,
  onOpenRegisterTeam,
  onOpenCreateTournament,
  onOpenAuth,
  onNavigate
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '3rem' }}>
      {/* Hero */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 2rem', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(238,242,255,0.92))',
          border: '1px solid var(--border-lavender)', boxShadow: 'var(--shadow-lavender)', borderRadius: '20px'
        }}
      >
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--lavender-light)', color: 'var(--lavender-dark)',
            padding: '0.4rem 1.1rem', borderRadius: '30px', fontWeight: 700,
            fontSize: '0.85rem', marginBottom: '1.25rem', border: '1px solid var(--border-lavender)'
          }}
        >
          <Sparkles size={14} /> Official Esport Tournament Portal
        </div>

        <h1
          style={{
            fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800,
            color: '#0f172a', lineHeight: 1.15, marginBottom: '0.75rem', letterSpacing: '-0.02em'
          }}
        >
          FREE FIRE TOURNAMENT SUITE
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto 2rem auto', lineHeight: 1.5 }}>
          Create tournament rooms, register 4-player squad rosters with WhatsApp contact, and track
          match points &amp; player frags live.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={onOpenRegisterTeam} disabled={tournaments.length === 0}>
            <UserPlus size={20} /> Register Squad / Join Event
          </button>

          {isAuthenticated ? (
            <button className="btn btn-secondary btn-lg" onClick={onOpenCreateTournament}>
              <Plus size={20} /> Create a Tournament
            </button>
          ) : (
            <button className="btn btn-secondary btn-lg" onClick={() => onOpenAuth('login')}>
              <LogIn size={20} /> Sign In / Create Account
            </button>
          )}
        </div>

        {!isAuthenticated && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.25rem', marginBottom: 0 }}>
            Browsing is open to everyone. Team leaders need an account to register a squad.
          </p>
        )}
      </div>

      {/* Tournament list */}
      <div>
        {/* Sits directly on the background photo, so it uses the light
            .section-heading treatment rather than dark panel text. */}
        <div className="section-heading-row">
          <h2 className="section-heading">
            <Trophy size={22} color="var(--gold-primary)" />
            Tournament Sessions
            <span className="section-heading-count">{tournaments.length}</span>
          </h2>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('tournaments')}>
            View All Events <ArrowRight size={14} />
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Trophy size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
            <h3>No tournaments yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {isAuthenticated
                ? 'Create the first tournament session — you will be its organizer.'
                : 'Sign in to create the first tournament session.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={isAuthenticated ? onOpenCreateTournament : () => onOpenAuth('login')}
            >
              {isAuthenticated ? 'Create Tournament' : 'Sign In to Create'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1.25rem' }}>
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
                    {/* Every card renders the SAME rows so the grid stays aligned:
                        badges row, title, stats box, actions. The organizer badge
                        sits inline here instead of adding a row of its own. */}
                    <div className="tournament-card-badges">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="live-badge" style={{ background: isActive ? 'var(--lavender-primary)' : '#64748b' }}>
                          {isActive ? 'VIEWING' : 'EVENT SESSION'}
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

                    {/* Clamped to two lines so long and short names occupy equal space */}
                    <h3 className="tournament-card-title">{t.name}</h3>

                    <div className="tournament-card-stats">
                      <div><Users size={12} /> Squads: <strong>{t.teams.length}</strong></div>
                      <div><Trophy size={12} /> Matches: <strong>{t.matches.length}/{t.totalMatches}</strong></div>

                      {/* Always present, so the box is the same height on every card.
                          Room credentials are private: shown to the organizer, and to
                          squads once they register. */}
                      <div className="tournament-card-room">
                        {isMine ? (
                          <>
                            <Hash size={11} /> Room: <strong>{t.roomId || '—'}</strong>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <Key size={11} /> Pass: <strong>{t.roomPassword || '—'}</strong>
                          </>
                        ) : (
                          <>
                            <Lock size={11} /> Room ID &amp; password shown after you register
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="tournament-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        onSelectTournament(t.id);
                        onNavigate('leaderboard');
                      }}
                    >
                      View Standings
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onSelectTournament(t.id);
                        onOpenRegisterTeam();
                      }}
                    >
                      Register Squad
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 800 }}>
          How Free Fire Esport Manager Works
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="stat-icon" style={{ marginBottom: '0.85rem' }}><Plus /></div>
            <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>1. Organizer creates the event</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Sign in and set up a room with its ID, password and match count. Only you can score it.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="stat-icon" style={{ marginBottom: '0.85rem', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}><UserPlus /></div>
            <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>2. Team leaders register</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Captains sign in and submit 4 player IGNs plus a WhatsApp contact — directly or through
              your shareable invite link.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="stat-icon" style={{ marginBottom: '0.85rem', color: 'var(--gold-primary)', borderColor: 'var(--gold-primary)' }}><Trophy /></div>
            <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>3. Live scoreboards</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Record placements and frags per match. Standings, MVP stats and PDF reports update for
              everyone watching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
