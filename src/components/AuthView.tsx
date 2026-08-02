import React, { useState, useEffect } from 'react';
import {
  AppUser,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset
} from '../utils/supabase';
import {
  Mail, LogIn, UserPlus, AlertCircle, CheckCircle2, RefreshCw, Key, Lock,
  Trophy, Crosshair, ShieldCheck, Zap, Eye, EyeOff, User
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  onAuthSuccess: (user: AppUser) => void;
  onNavigateHome: () => void;
}

const MIN_PASSWORD_LENGTH = 6;

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onAuthSuccess,
  onNavigateHome
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialMode]);

  const switchMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmPassword('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, needsEmailConfirmation } = await signUpWithPassword(email, password, displayName);

      if (needsEmailConfirmation) {
        setSuccessMsg(
          `📩 Account created! Check ${email.trim()} for a confirmation link, then sign in below.`
        );
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (user) {
        onAuthSuccess(user);
        return;
      }

      // Extremely rare: signup succeeded but no session came back.
      setSuccessMsg('Account created! Please sign in below.');
      setAuthMode('login');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const user = await signInWithPassword(email, password);
      onAuthSuccess(user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign you in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Enter your email address first, then tap "Forgot password".');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccessMsg(`📩 If an account exists for ${email.trim()}, a reset link is on its way.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Trophy size={22} />,
      color: '#c084fc',
      bg: 'rgba(168, 85, 247, 0.2)',
      title: 'Organize Your Own Events',
      body: 'Create tournament rooms and stay the only person who can score them'
    },
    {
      icon: <Crosshair size={22} />,
      color: '#facc15',
      bg: 'rgba(234, 179, 8, 0.2)',
      title: 'Register Your Squad',
      body: 'Team leaders enter 4 player IGNs and join any open event in seconds'
    },
    {
      icon: <ShieldCheck size={22} />,
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.2)',
      title: 'Protected Accounts',
      body: 'Passwords are hashed and verified server-side — never stored in the browser'
    }
  ];

  return (
    <div
      className="auth-split-container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
        minHeight: '100vh',
        width: '100%',
        background: '#07070b'
      }}
    >
      {/* LEFT: showcase */}
      <div
        className="auth-visual-side"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #0f0c20 0%, #1a103c 50%, #3b0764 100%)',
          padding: '3.5rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          color: '#ffffff'
        }}
      >
        <div
          style={{
            position: 'absolute', top: '-10%', right: '-10%', width: '380px', height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(30px)', pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-10%', left: '-10%', width: '420px', height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234, 179, 8, 0.18) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(30px)', pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255,255,255,0.15)',
              padding: '0.45rem 1rem', borderRadius: '50px', fontSize: '0.82rem',
              fontWeight: 700, letterSpacing: '0.5px', color: '#fef08a', marginBottom: '1.75rem'
            }}
          >
            <Zap size={15} color="#eab308" />
            <span>OFFICIAL ESPORTS TOURNAMENT ARENA</span>
          </div>

          <h1
            style={{
              fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.15,
              fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px', margin: '0 0 1.25rem 0',
              background: 'linear-gradient(135deg, #ffffff 0%, #e9d5ff 60%, #c084fc 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}
          >
            DOMINATE THE BATTLEFIELD
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: '460px', margin: '0 0 2.5rem 0' }}>
            Your command deck for organizing Free Fire tournaments, squad leaderboards, and live kill scorecards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '440px' }}>
            {features.map(f => (
              <div
                key={f.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '1rem 1.25rem', borderRadius: '16px'
                }}
              >
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px', background: f.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: f.color, flexShrink: 0
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>{f.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem' }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.12)',
            paddingTop: '1.5rem', marginTop: '3rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/navlogo.png" alt="" style={{ height: '28px', width: 'auto' }} />
            <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>
              FREE FIRE ESPORT MANAGER v2.0
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
            <span className="pulse-dot" /> Live &amp; Online
          </div>
        </div>
      </div>

      {/* RIGHT: form */}
      <div
        className="auth-form-side"
        style={{
          background: '#ffffff', padding: '3.5rem 3rem', display: 'flex',
          flexDirection: 'column', justifyContent: 'center'
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: 'var(--lavender-light)', border: '1px solid var(--border-lavender)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem auto', color: 'var(--lavender-dark)'
              }}
            >
              {authMode === 'login' ? <LogIn size={32} /> : <UserPlus size={32} />}
            </div>

            <h2 style={{ fontSize: '1.75rem', color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {authMode === 'login'
                ? 'Sign in to register your squad or run your events'
                : 'Team leaders and organizers both start here'}
            </p>
          </div>

          <div
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
              background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px', marginBottom: '1.75rem'
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${authMode === 'login' ? 'btn-primary' : ''}`}
              style={{
                background: authMode === 'login' ? undefined : 'transparent',
                color: authMode === 'login' ? undefined : '#475569',
                boxShadow: authMode === 'login' ? undefined : 'none',
                padding: '0.6rem 1rem', fontWeight: 700
              }}
              onClick={() => switchMode('login')}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm ${authMode === 'register' ? 'btn-primary' : ''}`}
              style={{
                background: authMode === 'register' ? undefined : 'transparent',
                color: authMode === 'register' ? undefined : '#475569',
                boxShadow: authMode === 'register' ? undefined : 'none',
                padding: '0.6rem 1rem', fontWeight: 700
              }}
              onClick={() => switchMode('register')}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)', padding: '0.85rem 1rem', borderRadius: '10px',
                fontSize: '0.88rem', marginBottom: '1.5rem', display: 'flex',
                alignItems: 'center', gap: '0.5rem'
              }}
              role="alert"
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-emerald)', padding: '0.85rem 1rem', borderRadius: '10px',
                fontSize: '0.88rem', marginBottom: '1.5rem', display: 'flex',
                alignItems: 'center', gap: '0.5rem'
              }}
              role="status"
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            {authMode === 'register' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>
                  Display Name <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Royal PAVAN"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    style={{ paddingLeft: '2.75rem', height: '50px', fontSize: '1rem' }}
                    autoComplete="nickname"
                  />
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.75rem', height: '50px', fontSize: '1rem' }}
                  autoComplete="email"
                />
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: authMode === 'register' ? '1.25rem' : '0.75rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="form-control"
                  placeholder={authMode === 'register' ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', height: '50px', fontSize: '1rem' }}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                />
                <Key size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-control"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '2.75rem', height: '50px', fontSize: '1rem' }}
                    autoComplete="new-password"
                  />
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            {authMode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  style={{
                    background: 'none', border: 'none', color: 'var(--lavender-dark)',
                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', height: '52px', fontSize: '1.02rem', fontWeight: 700 }}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw size={20} className="spin" /> : authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              <span>{authMode === 'login' ? 'Sign In' : 'Create My Account'}</span>
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onNavigateHome}
              style={{
                background: 'none', border: 'none', color: 'var(--lavender-dark)',
                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              ← Return to Esports Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
