import React, { useState, useEffect } from 'react';
import { Team, Player, Tournament } from '../../types';
import { AppUser } from '../../utils/supabase';
import { X, Users, Save, Phone, Hash, Key } from 'lucide-react';

interface AddTeamModalProps {
  isOpen: boolean;
  tournament: Tournament | null;
  editingTeam: Team | null;
  currentUser: AppUser | null;
  onClose: () => void;
  onSave: (teamData: Team) => void;
}

const PLAYER_SLOTS = 4;

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const AddTeamModal: React.FC<AddTeamModalProps> = ({
  isOpen,
  tournament,
  editingTeam,
  currentUser,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [captain, setCaptain] = useState('');
  const [phone, setPhone] = useState('');
  const [players, setPlayers] = useState<string[]>(Array(PLAYER_SLOTS).fill(''));
  // Free Fire member/UID per player — the organizer needs these to invite each
  // player into the custom room.
  const [ffUids, setFfUids] = useState<string[]>(Array(PLAYER_SLOTS).fill(''));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (editingTeam) {
      setName(editingTeam.name);
      setLogo(editingTeam.logo || '');
      setCaptain(editingTeam.captain || '');
      setPhone(editingTeam.phone || '');
      setPlayers(
        Array.from({ length: PLAYER_SLOTS }, (_, i) => editingTeam.players[i]?.ign || '')
      );
      setFfUids(
        Array.from({ length: PLAYER_SLOTS }, (_, i) => editingTeam.players[i]?.ffUid || '')
      );
    } else {
      setName('');
      setLogo('');
      setCaptain(currentUser?.displayName || '');
      setPhone('');
      setPlayers(Array(PLAYER_SLOTS).fill(''));
      setFfUids(Array(PLAYER_SLOTS).fill(''));
    }
  }, [editingTeam, isOpen, currentUser]);

  if (!isOpen) return null;

  const updatePlayer = (index: number, value: string) => {
    setPlayers(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const updateFfUid = (index: number, value: string) => {
    setFfUids(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedIgns = players.map(p => p.trim());
    const trimmedUids = ffUids.map(u => u.trim());

    if (!trimmedName) {
      setError('Please enter a team name.');
      return;
    }
    if (trimmedIgns.some(ign => !ign)) {
      setError('All 4 player IGNs are required.');
      return;
    }
    if (trimmedUids.some(uid => !uid)) {
      setError('All 4 Free Fire member IDs / names are required — the organizer needs them to invite players to the room.');
      return;
    }

    const lowered = trimmedIgns.map(i => i.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      setError('Each player IGN must be unique within the squad.');
      return;
    }
    if (new Set(trimmedUids).size !== trimmedUids.length) {
      setError('Each Free Fire member ID must be unique within the squad.');
      return;
    }

    // Player ids must stay stable across edits, otherwise every saved kill count
    // (which is keyed by player id) would be orphaned.
    const teamId = editingTeam?.id ?? generateUUID();
    const roster: Player[] = trimmedIgns.map((ign, index) => ({
      id: editingTeam?.players[index]?.id ?? `p_${teamId}_${index + 1}`,
      name: ign,
      ign,
      ffUid: trimmedUids[index]
    }));

    onSave({
      id: teamId,
      name: trimmedName,
      logo: logo.trim() || trimmedName.substring(0, 3).toUpperCase(),
      captain: captain.trim() || currentUser?.displayName || 'Captain',
      phone: phone.trim(),
      players: roster,
      registeredBy: editingTeam?.registeredBy ?? currentUser?.id
    });
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> {editingTeam ? 'Edit Squad Roster' : 'Register Squad'}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        {tournament && (
          <div
            style={{
              background: 'var(--lavender-light)', border: '1px solid var(--border-lavender)',
              padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
              color: 'var(--lavender-dark)', marginBottom: '1.25rem'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
              Joining: {tournament.name}
            </div>
            {/* Room credentials are shown here because you are registering into this event */}
            {(tournament.roomId || tournament.roomPassword) && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                {tournament.roomId && <span><Hash size={11} /> Room: <strong>{tournament.roomId}</strong></span>}
                {tournament.roomPassword && <span><Key size={11} /> Pass: <strong>{tournament.roomPassword}</strong></span>}
              </div>
            )}
            {currentUser && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.85 }}>
                Registering as <strong>{currentUser.email}</strong>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)', padding: '0.75rem 1rem', borderRadius: '8px',
              fontSize: '0.86rem', marginBottom: '1rem'
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="teamname">Team Name</label>
              <input
                id="teamname"
                type="text"
                required
                autoFocus
                className="form-control"
                placeholder="e.g. Family"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="teamlogo">Logo / Tag</label>
              <input
                id="teamlogo"
                type="text"
                maxLength={4}
                className="form-control"
                placeholder="FAM"
                value={logo}
                onChange={e => setLogo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="captain">Captain IGN / Name</label>
              <input
                id="captain"
                type="text"
                required
                className="form-control"
                placeholder="e.g. Royal PAVAN"
                value={captain}
                onChange={e => setCaptain(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={12} color="var(--lavender-primary)" /> Captain Phone / WhatsApp
              </label>
              <input
                id="phone"
                type="tel"
                required
                className="form-control"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label">4 Main Players — IGN &amp; Free Fire Member ID</label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.6rem 0' }}>
              The member ID (UID) is on your Free Fire profile. The organizer needs it to invite
              you into the custom room.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {players.map((value, index) => (
                <div key={index} className="player-input-row">
                  <span className="player-input-index">{index + 1}</span>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder={`Player ${index + 1} IGN`}
                    value={value}
                    onChange={e => updatePlayer(index, e.target.value)}
                    aria-label={`Player ${index + 1} IGN`}
                  />
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="FF Member ID / Name"
                    value={ffUids[index]}
                    onChange={e => updateFfUid(index, e.target.value)}
                    aria-label={`Player ${index + 1} Free Fire member ID`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> {editingTeam ? 'Update Squad' : 'Register Squad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
