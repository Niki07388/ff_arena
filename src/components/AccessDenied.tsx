import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AccessDeniedProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title,
  message,
  actionLabel,
  onAction
}) => (
  <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '560px', margin: '2rem auto' }}>
    <div
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '18px',
        background: 'var(--lavender-light)',
        border: '1px solid var(--border-lavender)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.25rem auto',
        color: 'var(--lavender-dark)'
      }}
    >
      <ShieldAlert size={32} />
    </div>

    <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem' }}>{title}</h2>
    <p style={{ color: 'var(--text-muted)', marginBottom: actionLabel ? '1.75rem' : 0, lineHeight: 1.6 }}>
      {message}
    </p>

    {actionLabel && onAction && (
      <button className="btn btn-primary btn-lg" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);
