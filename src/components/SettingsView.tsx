import React, { useState, useEffect } from 'react';
import { Tournament, ScoringRules } from '../types';
import { Settings, Save, Plus, RotateCcw } from 'lucide-react';
import { DEFAULT_SCORING_RULES } from '../utils/scoring';

interface SettingsViewProps {
  tournament: Tournament | null;
  onSaveScoring: (rules: ScoringRules) => void;
  onAddMatch: () => void;
}

const ordinal = (index: number) => {
  const place = index + 1;
  if (place === 1) return '🥇 1st Place';
  if (place === 2) return '🥈 2nd Place';
  if (place === 3) return '🥉 3rd Place';
  return `${place}th Place`;
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  tournament,
  onSaveScoring,
  onAddMatch
}) => {
  // NOTE: hooks must run on every render — the old version returned early when
  // there was no tournament, which crashed React once the data arrived.
  const [perKill, setPerKill] = useState<number>(DEFAULT_SCORING_RULES.perKillPoints);
  const [placements, setPlacements] = useState<number[]>([...DEFAULT_SCORING_RULES.placementPoints]);

  // Re-sync whenever a different tournament is selected, so the form never shows
  // (and never saves) another event's rules.
  useEffect(() => {
    if (!tournament) return;
    setPerKill(Number(tournament.scoringRules?.perKillPoints) || 0);
    setPlacements(
      Array.isArray(tournament.scoringRules?.placementPoints)
        ? [...tournament.scoringRules.placementPoints]
        : [...DEFAULT_SCORING_RULES.placementPoints]
    );
  }, [tournament?.id, tournament?.scoringRules]);

  if (!tournament) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>No active tournament.</div>;
  }

  const handlePlacementChange = (idx: number, value: string) => {
    setPlacements(prev => {
      const next = [...prev];
      next[idx] = Number(value) || 0;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveScoring({ placementPoints: placements, perKillPoints: perKill });
  };

  const handleReset = () => {
    setPerKill(DEFAULT_SCORING_RULES.perKillPoints);
    setPlacements([...DEFAULT_SCORING_RULES.placementPoints]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <h2 style={{ color: '#0f172a' }}>Point System & Settings</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Scoring rules for <strong>{tournament.name}</strong>. Changes apply to every match instantly.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.35rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: 0 }}>Match Schedule</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            This tournament currently has <strong>{tournament.totalMatches}</strong> matches.
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onAddMatch}>
          <Plus size={16} /> Add Another Match
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} /> Point System Rules
        </h3>

        <div className="form-group" style={{ maxWidth: '250px' }}>
          <label className="form-label">Points Per Kill</label>
          <input
            type="number"
            min={0}
            className="form-control"
            value={perKill}
            onChange={e => setPerKill(Number(e.target.value) || 0)}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Placement Points Table</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100px, 100%), 1fr))', gap: '0.75rem' }}>
            {placements.map((pts, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  {ordinal(idx)}
                </span>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  style={{ textAlign: 'center', marginTop: '0.2rem', fontWeight: 'bold' }}
                  value={pts}
                  onChange={e => handlePlacementChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            <RotateCcw size={15} /> Reset to Default
          </button>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save Point Rules
          </button>
        </div>
      </form>
    </div>
  );
};
