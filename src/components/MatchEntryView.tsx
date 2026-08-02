import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tournament, MatchEntry } from '../types';
import { Crosshair, Save, Flame, Trophy, PlusCircle, Edit3, Plus } from 'lucide-react';
import { computeEntryScore, resolveRules, hasNumericValue } from '../utils/scoring';
import { ToastKind } from '../App';

interface MatchEntryViewProps {
  tournament: Tournament | null;
  onSaveMatch: (matchNumber: number, entries: Record<string, MatchEntry>) => void;
  onAddMatch: () => void;
  showToast: (msg: string, kind?: ToastKind) => void;
}

interface TeamEntryFormState {
  placement: number | string;
  manualPlacementPoints: number | string;
  manualPoints: number | string;
  overrideTotalPoints: number | string;
  playerKills: Record<string, number | string>;
}

const blankEntry = (): TeamEntryFormState => ({
  placement: '',
  manualPlacementPoints: '',
  manualPoints: '',
  overrideTotalPoints: '',
  playerKills: {}
});

export const MatchEntryView: React.FC<MatchEntryViewProps> = ({
  tournament,
  onSaveMatch,
  onAddMatch,
  showToast
}) => {
  const [selectedMatch, setSelectedMatch] = useState(1);
  const [entriesState, setEntriesState] = useState<Record<string, TeamEntryFormState>>({});

  // Reloading the form is keyed on "which tournament / which match" only.
  // Rebuilding it on every `tournament` object identity change (which happens
  // after every background refresh) used to wipe scores mid-typing.
  const loadedSignature = useRef<string>('');

  const tournamentId = tournament?.id;
  const teams = useMemo(() => tournament?.teams ?? [], [tournament]);

  // Keep the selected match inside the valid range when the schedule changes.
  useEffect(() => {
    if (!tournament) return;
    setSelectedMatch(prev => Math.min(Math.max(1, prev), Math.max(1, tournament.totalMatches)));
  }, [tournament?.totalMatches, tournamentId]);

  useEffect(() => {
    if (!tournament || !tournamentId) return;

    const signature = `${tournamentId}::${selectedMatch}`;
    const isSameForm = loadedSignature.current === signature;

    const existingMatch = tournament.matches.find(m => m.matchNumber === selectedMatch);

    setEntriesState(prev => {
      const next: Record<string, TeamEntryFormState> = {};

      teams.forEach(team => {
        // Preserve anything the organizer has already typed for this same form.
        if (isSameForm && prev[team.id]) {
          const kept = prev[team.id];
          const playerKills: Record<string, number | string> = {};
          team.players.forEach(p => {
            playerKills[p.id] = kept.playerKills[p.id] ?? 0;
          });
          next[team.id] = { ...kept, playerKills };
          return;
        }

        const saved = existingMatch?.entries?.[team.id];
        if (!saved) {
          const playerKills: Record<string, number | string> = {};
          team.players.forEach(p => { playerKills[p.id] = 0; });
          next[team.id] = { ...blankEntry(), playerKills };
          return;
        }

        const playerKills: Record<string, number | string> = {};
        team.players.forEach(p => {
          playerKills[p.id] = saved.playerKills?.[p.id] ?? 0;
        });

        next[team.id] = {
          placement: saved.placement || '',
          // Leave this blank unless a genuine manual override was saved. The old
          // version pre-filled it with the auto value, which silently froze
          // placement points so later scoring-rule changes stopped applying.
          manualPlacementPoints: hasNumericValue(saved.manualPlacementPoints)
            ? Number(saved.manualPlacementPoints)
            : '',
          manualPoints: hasNumericValue(saved.manualPoints) ? Number(saved.manualPoints) : '',
          overrideTotalPoints: hasNumericValue(saved.overrideTotalPoints)
            ? Number(saved.overrideTotalPoints)
            : '',
          playerKills
        };
      });

      return next;
    });

    loadedSignature.current = signature;
  }, [tournamentId, selectedMatch, teams, tournament]);

  if (!tournament) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>No active tournament.</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <Crosshair size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
        <h3>Please register squads first</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          You need at least one registered squad before you can enter match scores.
        </p>
      </div>
    );
  }

  const rules = resolveRules(tournament.scoringRules);

  const patchEntry = (teamId: string, patch: Partial<TeamEntryFormState>) => {
    setEntriesState(prev => ({
      ...prev,
      [teamId]: { ...(prev[teamId] ?? blankEntry()), ...patch }
    }));
  };

  const handlePlayerKillChange = (teamId: string, playerId: string, value: string) => {
    setEntriesState(prev => {
      const current = prev[teamId] ?? blankEntry();
      return {
        ...prev,
        [teamId]: {
          ...current,
          playerKills: { ...current.playerKills, [playerId]: value }
        }
      };
    });
  };

  const handleAddNewMatchClick = async () => {
    const nextMatchNumber = tournament.totalMatches + 1;
    await onAddMatch();
    setSelectedMatch(nextMatchNumber);
  };

  const toMatchEntry = (data: TeamEntryFormState): MatchEntry => {
    const playerKills: Record<string, number> = {};
    Object.entries(data.playerKills).forEach(([playerId, value]) => {
      playerKills[playerId] = Number(value) || 0;
    });

    return {
      placement: Number(data.placement) || 0,
      playerKills,
      manualPlacementPoints: hasNumericValue(data.manualPlacementPoints)
        ? Number(data.manualPlacementPoints)
        : undefined,
      manualPoints: hasNumericValue(data.manualPoints) ? Number(data.manualPoints) : undefined,
      overrideTotalPoints: hasNumericValue(data.overrideTotalPoints)
        ? Number(data.overrideTotalPoints)
        : undefined
    };
  };

  const handleSave = () => {
    const placements = teams
      .map(t => Number(entriesState[t.id]?.placement) || 0)
      .filter(p => p > 0);

    const duplicates = placements.filter((p, i) => placements.indexOf(p) !== i);
    if (duplicates.length > 0) {
      showToast(`Two squads share rank #${duplicates[0]} — please fix before saving.`, 'error');
      return;
    }

    const formatted: Record<string, MatchEntry> = {};
    teams.forEach(team => {
      formatted[team.id] = toMatchEntry(entriesState[team.id] ?? blankEntry());
    });

    onSaveMatch(selectedMatch, formatted);
  };

  const livePreview = teams
    .map(team => {
      const score = computeEntryScore(toMatchEntry(entriesState[team.id] ?? blankEntry()), rules);
      return { team, placement: score.placement, kills: score.kills, points: score.totalPoints };
    })
    .sort((a, b) => {
      if (a.placement > 0 && b.placement > 0) return a.placement - b.placement;
      if (a.placement > 0) return -1;
      if (b.placement > 0) return 1;
      return b.points - a.points;
    });

  const rankBadge = (place: number | string) => {
    const p = Number(place);
    if (p === 1) return '🥇';
    if (p === 2) return '🥈';
    if (p === 3) return '🥉';
    if (p > 3) return `#${p}`;
    return '🎯';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 16px 36px rgba(0,0,0,0.65)'
        }}
      >
        <div>
          <h2 style={{ color: '#f8fafc', fontWeight: 800, margin: '0 0 0.35rem 0' }}>Match Score Entry</h2>
          <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.95rem' }}>
            {tournament.name} — enter placements and player frags.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="matchsel" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#e2e8f0' }}>
              Select Match:
            </label>
            <select
              id="matchsel"
              className="form-control"
              style={{ width: '130px', fontWeight: 'bold', background: 'rgba(30,41,59,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
              value={selectedMatch}
              onChange={e => setSelectedMatch(Number(e.target.value))}
            >
              {Array.from({ length: Math.max(1, tournament.totalMatches) }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>Match {num}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={handleAddNewMatchClick} title="Add another match to this tournament">
            <Plus size={16} /> Add Match
          </button>

          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            <Save size={18} /> Save Match {selectedMatch}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="live-preview-container">
        <div className="preview-header">
          <div className="preview-title">
            <Trophy size={16} /> Live Standings Preview (Match {selectedMatch})
          </div>
          <span className="live-badge">REAL-TIME CALC</span>
        </div>

        <div className="preview-strip">
          {livePreview.map((item, index) => (
            <div
              key={item.team.id}
              className={`preview-chip ${index === 0 ? 'rank-top1' : index === 1 ? 'rank-top2' : index === 2 ? 'rank-top3' : ''}`}
            >
              <span className="chip-rank">{item.placement ? `#${item.placement}` : '-'}</span>
              <span className="chip-name">{item.team.name}</span>
              <span className="chip-score">{item.points} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {teams.map(team => {
          const entry = entriesState[team.id] ?? blankEntry();
          const score = computeEntryScore(toMatchEntry(entry), rules);

          return (
            <div key={team.id} className="match-team-card">
              <div className="match-team-header">
                <div className="team-badge-name">
                  <div className="team-avatar">{team.logo || team.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800, margin: 0 }}>{team.name}</h3>
                    <div className="team-captain">Captain: {team.captain}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>Rank:</span>
                    <div className="placement-input-wrapper">
                      <span className="live-rank-tag">{rankBadge(entry.placement)}</span>
                      <input
                        type="number"
                        min={1}
                        max={teams.length}
                        className="placement-input"
                        placeholder="Rank"
                        value={entry.placement}
                        onChange={e => patchEntry(team.id, { placement: e.target.value })}
                        aria-label={`${team.name} placement`}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>
                      Placement Pts:
                    </span>
                    <input
                      type="number"
                      className="placement-pts-input"
                      placeholder={String(score.usedManualPlacement ? '' : score.placementPoints)}
                      value={entry.manualPlacementPoints}
                      onChange={e => patchEntry(team.id, { manualPlacementPoints: e.target.value })}
                      aria-label={`${team.name} manual placement points`}
                      title="Leave blank to use the automatic placement points table"
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span
                  style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'block', fontWeight: 700 }}
                >
                  Player Individual Kills:
                </span>
                <div className="player-kills-grid">
                  {team.players.map(player => (
                    <div key={player.id} className="player-kill-box">
                      <span className="player-kill-name" title={player.ign || player.name}>
                        {player.ign || player.name}
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="player-kill-input"
                        value={entry.playerKills[player.id] ?? 0}
                        onChange={e => handlePlayerKillChange(team.id, player.id, e.target.value)}
                        aria-label={`${player.ign || player.name} kills`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="team-override-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={16} color="#34d399" />
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Bonus / Penalty Pts:</span>
                  <input
                    type="number"
                    className="override-input"
                    placeholder="+/- Pts"
                    value={entry.manualPoints}
                    onChange={e => patchEntry(team.id, { manualPoints: e.target.value })}
                    aria-label={`${team.name} bonus or penalty points`}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <Edit3 size={16} color="#38bdf8" />
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Direct Total Override:</span>
                  <input
                    type="number"
                    className="override-input"
                    placeholder="Override"
                    value={entry.overrideTotalPoints}
                    onChange={e => patchEntry(team.id, { overrideTotalPoints: e.target.value })}
                    aria-label={`${team.name} total points override`}
                  />
                </div>
              </div>

              <div className="team-calc-summary">
                <div>
                  <Flame size={14} style={{ display: 'inline', color: '#fbbf24' }} /> Total Team Kills:{' '}
                  <span style={{ color: '#fbbf24', fontWeight: 800 }}>{score.kills}</span>
                </div>
                <div>
                  Placement Pts: <span style={{ color: '#38bdf8', fontWeight: 800 }}>{score.placementPoints}</span>
                  {score.bonusPoints !== 0 && (
                    <span style={{ color: '#34d399', marginLeft: '0.5rem' }}>
                      ({score.bonusPoints > 0 ? `+${score.bonusPoints}` : score.bonusPoints} bonus)
                    </span>
                  )}
                </div>
                <div className="calc-pill">
                  Total Match Points: {score.totalPoints}
                  {score.usedTotalOverride && (
                    <span style={{ fontSize: '0.7rem', marginLeft: '0.4rem', opacity: 0.85 }}>(overridden)</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
