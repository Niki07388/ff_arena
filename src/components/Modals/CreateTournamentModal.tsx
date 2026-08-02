import React, { useState, useEffect } from 'react';
import { X, Plus, Shield, LogIn } from 'lucide-react';

interface CreateTournamentModalProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    date: string;
    roomId: string;
    roomPassword: string;
    totalMatches: number;
  }) => void;
  onRequireAuth: () => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];
const randomRoomId = () => `FF-${Math.floor(1000 + Math.random() * 9000)}`;
const randomRoomPass = () => String(Math.floor(100 + Math.random() * 900));

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  isAuthenticated,
  onClose,
  onCreate,
  onRequireAuth
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO);
  const [roomId, setRoomId] = useState(randomRoomId);
  const [roomPassword, setRoomPassword] = useState(randomRoomPass);
  const [totalMatches, setTotalMatches] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fresh values each time the modal opens, so a second event does not reuse the
  // previous room credentials.
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDate(todayISO());
    setRoomId(randomRoomId());
    setRoomPassword(randomRoomPass());
    setTotalMatches(5);
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Sign in to organize</h3>
            <button className="modal-close" onClick={onClose} aria-label="Close"><X /></button>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            You need an account to create a tournament. Whoever creates it becomes its organizer —
            the only person who can enter match scores or change its settings.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onRequireAuth}>
            <LogIn size={18} /> Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    onCreate({
      name: trimmed,
      date,
      roomId: roomId.trim(),
      roomPassword: roomPassword.trim(),
      totalMatches: Math.min(50, Math.max(1, Number(totalMatches) || 1))
    });
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} /> Create New Tournament
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="tname">Tournament Name</label>
            <input
              id="tname"
              type="text"
              required
              autoFocus
              className="form-control"
              placeholder="e.g. Free Fire Masters Cup"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tdate">Date</label>
              <input id="tdate" type="date" required className="form-control" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tmatches">Total Matches</label>
              <input
                id="tmatches"
                type="number"
                min={1}
                max={50}
                required
                className="form-control"
                value={totalMatches}
                onChange={e => setTotalMatches(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="troom">Room ID (optional)</label>
              <input id="troom" type="text" className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tpass">Room Password (optional)</label>
              <input id="tpass" type="text" className="form-control" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
            Room credentials stay private — only you and your registered squads can see them.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Plus size={16} /> Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
