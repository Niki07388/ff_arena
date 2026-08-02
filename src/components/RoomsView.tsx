import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tournament, Team, Group, ROOM_CAPACITY } from '../types';
import { AppUser, GroupEngine } from '../utils/supabase';
import { GroupChat } from './GroupChat';
import {
  DoorOpen, Plus, Users, Trash2, Hash, Key, Check,
  UserPlus, Wand2, AlertCircle, Copy
} from 'lucide-react';
import { ToastKind } from '../App';

interface RoomsViewProps {
  tournament: Tournament | null;
  currentUser: AppUser | null;
  isOrganizer: boolean;
  showToast: (msg: string, kind?: ToastKind) => void;
}

const nextRoomName = (existing: Group[]): string => {
  // Group A, Group B, … skipping any already taken
  for (let i = 0; i < 26; i++) {
    const candidate = `Group ${String.fromCharCode(65 + i)}`;
    if (!existing.some(g => g.name.toLowerCase() === candidate.toLowerCase())) return candidate;
  }
  return `Group ${existing.length + 1}`;
};

const randomRoomId = () => `FF-${Math.floor(1000 + Math.random() * 9000)}`;
const randomRoomPass = () => String(Math.floor(100 + Math.random() * 900));

export const RoomsView: React.FC<RoomsViewProps> = ({
  tournament,
  currentUser,
  isOrganizer,
  showToast
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState(randomRoomId);
  const [roomPassword, setRoomPassword] = useState(randomRoomPass);
  const [isSaving, setIsSaving] = useState(false);

  const tournamentId = tournament?.id;

  const loadGroups = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setGroups(await GroupEngine.listForTournament(tournamentId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load rooms.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, showToast]);

  useEffect(() => {
    setIsLoading(true);
    setSelectedTeamIds([]);
    loadGroups();
  }, [loadGroups]);

  const teams = useMemo(() => tournament?.teams ?? [], [tournament]);

  const assignedTeamIds = useMemo(
    () => new Set(groups.flatMap(g => g.teamIds)),
    [groups]
  );

  const unassignedTeams = useMemo(
    () => teams.filter(t => !assignedTeamIds.has(t.id)),
    [teams, assignedTeamIds]
  );

  const teamsById = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach(t => { map[t.id] = t; });
    return map;
  }, [teams]);

  /** Which room does the signed-in captain's squad sit in? */
  const myGroupIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const myTeamIds = new Set(teams.filter(t => t.registeredBy === currentUser.id).map(t => t.id));
    return new Set(groups.filter(g => g.teamIds.some(id => myTeamIds.has(id))).map(g => g.id));
  }, [groups, teams, currentUser]);

  if (!tournament) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>No active tournament.</div>;
  }

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => {
      if (prev.includes(teamId)) return prev.filter(id => id !== teamId);
      if (prev.length >= ROOM_CAPACITY) {
        showToast(`A Free Fire custom room holds ${ROOM_CAPACITY} squads. Deselect one first.`, 'info');
        return prev;
      }
      return [...prev, teamId];
    });
  };

  const openBuilder = () => {
    setRoomName(nextRoomName(groups));
    setRoomId(randomRoomId());
    setRoomPassword(randomRoomPass());
    setIsBuilderOpen(true);
  };

  /** Fill the current selection up to 12 from the unassigned pool. */
  const autoFill = () => {
    const remaining = ROOM_CAPACITY - selectedTeamIds.length;
    if (remaining <= 0) return;
    const additions = unassignedTeams
      .filter(t => !selectedTeamIds.includes(t.id))
      .slice(0, remaining)
      .map(t => t.id);
    setSelectedTeamIds(prev => [...prev, ...additions]);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const name = roomName.trim();
    if (!name) {
      showToast('Give the room a name, e.g. "Group A".', 'error');
      return;
    }
    if (selectedTeamIds.length === 0) {
      showToast('Select at least one squad for this room.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await GroupEngine.createGroup(
        tournament.id,
        { name, roomId: roomId.trim(), roomPassword: roomPassword.trim(), maxTeams: ROOM_CAPACITY },
        selectedTeamIds
      );
      setSelectedTeamIds([]);
      setIsBuilderOpen(false);
      await loadGroups();
      showToast(`🚪 ${name} created with ${selectedTeamIds.length} squads.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create the room.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoom = async (group: Group) => {
    if (!window.confirm(`Delete "${group.name}"? Its squads return to the unassigned pool and the chat is erased.`)) return;
    try {
      await GroupEngine.deleteGroup(group.id);
      await loadGroups();
      showToast(`🗑️ ${group.name} deleted.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete the room.', 'error');
    }
  };

  const handleRemoveTeam = async (group: Group, teamId: string) => {
    try {
      await GroupEngine.removeTeam(group.id, teamId);
      await loadGroups();
      showToast('Squad moved back to the unassigned pool.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove the squad.', 'error');
    }
  };

  const copyRoomCreds = async (group: Group) => {
    const text = `${group.name}\nRoom ID: ${group.roomId || '—'}\nPassword: ${group.roomPassword || '—'}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('🔗 Room credentials copied.');
    } catch {
      window.prompt('Copy the room credentials:', text.replace(/\n/g, '  '));
    }
  };

  const roomsNeeded = Math.ceil(teams.length / ROOM_CAPACITY);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#0f172a' }}>Custom Rooms &amp; Group Chat</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            A Free Fire room holds {ROOM_CAPACITY} squads. {teams.length} registered
            {teams.length > 0 && <> — that needs <strong>{roomsNeeded} room{roomsNeeded === 1 ? '' : 's'}</strong>.</>}
          </p>
        </div>

        {isOrganizer && (
          <button className="btn btn-primary" onClick={openBuilder} disabled={unassignedTeams.length === 0}>
            <Plus size={16} /> Create Room
          </button>
        )}
      </div>

      {/* Room builder */}
      {isOrganizer && isBuilderOpen && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DoorOpen size={18} color="var(--lavender-primary)" /> New Room
            </h3>
            <span className={`room-counter ${selectedTeamIds.length === ROOM_CAPACITY ? 'full' : ''}`}>
              {selectedTeamIds.length} / {ROOM_CAPACITY} selected
            </span>
          </div>

          <form onSubmit={handleCreateRoom}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="roomname">Room Name</label>
                <input id="roomname" className="form-control" required value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Group A" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="roomid">Room ID</label>
                <input id="roomid" className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="roompass">Room Password</label>
                <input id="roompass" className="form-control" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Pick squads ({unassignedTeams.length} unassigned)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-sm btn-secondary" onClick={autoFill} disabled={selectedTeamIds.length >= ROOM_CAPACITY || unassignedTeams.length === 0}>
                  <Wand2 size={14} /> Fill to {ROOM_CAPACITY}
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedTeamIds([])} disabled={selectedTeamIds.length === 0}>
                  Clear
                </button>
              </div>
            </div>

            {unassignedTeams.length === 0 ? (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Every registered squad is already in a room.
              </div>
            ) : (
              <div className="team-picker">
                {unassignedTeams.map(team => {
                  const checked = selectedTeamIds.includes(team.id);
                  const atCapacity = !checked && selectedTeamIds.length >= ROOM_CAPACITY;

                  return (
                    <button
                      type="button"
                      key={team.id}
                      className={`team-pick ${checked ? 'checked' : ''} ${atCapacity ? 'disabled' : ''}`}
                      onClick={() => toggleTeam(team.id)}
                      aria-pressed={checked}
                      disabled={atCapacity}
                    >
                      <span className="team-pick-check">{checked && <Check size={13} />}</span>
                      <span className="team-pick-avatar">{team.logo || team.name.charAt(0).toUpperCase()}</span>
                      <span className="team-pick-info">
                        <span className="team-pick-name">{team.name}</span>
                        <span className="team-pick-captain">{team.captain}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsBuilderOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving || selectedTeamIds.length === 0}>
                <DoorOpen size={16} /> Create Room with {selectedTeamIds.length} Squad{selectedTeamIds.length === 1 ? '' : 's'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unassigned warning */}
      {isOrganizer && !isBuilderOpen && unassignedTeams.length > 0 && groups.length > 0 && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--gold-primary)' }}>
          <AlertCircle size={18} color="var(--gold-primary)" />
          <span style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: '#0f172a' }}>{unassignedTeams.length}</strong> squad
            {unassignedTeams.length === 1 ? ' is' : 's are'} not in a room yet.
          </span>
          <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={openBuilder}>
            <Plus size={14} /> Create Room
          </button>
        </div>
      )}

      {/* Rooms */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading rooms…</div>
      ) : groups.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <DoorOpen size={48} color="var(--lavender-primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No rooms yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: isOrganizer ? '1.5rem' : 0 }}>
            {isOrganizer
              ? `Split your ${teams.length} squads into rooms of ${ROOM_CAPACITY}. Each room gets its own credentials and private chat.`
              : 'The organizer has not drawn the rooms yet. Check back shortly.'}
          </p>
          {isOrganizer && teams.length > 0 && (
            <button className="btn btn-primary btn-lg" onClick={openBuilder}>
              <Plus size={18} /> Create the First Room
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {groups.map(group => {
            const members = group.teamIds.map(id => teamsById[id]).filter(Boolean);
            const canChat = isOrganizer || myGroupIds.has(group.id);
            const showCreds = canChat;

            return (
              <div key={group.id} className="glass-panel group-room-card">
                <div className="group-room-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="group-room-icon"><DoorOpen size={20} /></div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>{group.name}</h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <Users size={12} style={{ display: 'inline' }} /> {members.length} / {group.maxTeams} squads
                      </div>
                    </div>
                    {myGroupIds.has(group.id) && <span className="badge-organizer">YOUR ROOM</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* No chat toggle: the chat is always on, in its own column
                        beside the squads. */}
                    {showCreds && (
                      <button className="btn btn-sm btn-secondary" onClick={() => copyRoomCreds(group)} title="Copy room ID and password">
                        <Copy size={14} />
                      </button>
                    )}
                    {isOrganizer && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRoom(group)} title="Delete room">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Room credentials — private to the organizer and this room's squads */}
                <div className="group-room-creds">
                  {showCreds ? (
                    <>
                      <span><Hash size={12} /> Room ID: <strong>{group.roomId || '—'}</strong></span>
                      <span><Key size={12} /> Password: <strong>{group.roomPassword || '—'}</strong></span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      <Key size={12} /> Room credentials are visible to this room's squads only
                    </span>
                  )}
                </div>

                {/* Two columns: squads on the left, chat always open on the
                    right. Stacks on narrow screens. */}
                <div className={`room-body ${canChat ? '' : 'no-chat'}`}>
                  {/* Squads with their FF member IDs */}
                  <div className="room-team-grid">
                  {members.map(team => (
                    <div key={team.id} className="room-team">
                      <div className="room-team-top">
                        <span className="team-pick-avatar">{team.logo || team.name.charAt(0).toUpperCase()}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="room-team-name">{team.name}</div>
                          <div className="room-team-captain">{team.captain}</div>
                        </div>
                        {isOrganizer && (
                          <button
                            className="chat-icon-btn"
                            onClick={() => handleRemoveTeam(group, team.id)}
                            title={`Remove ${team.name} from ${group.name}`}
                            aria-label={`Remove ${team.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* FF member IDs — what the organizer types into the room invite */}
                      {showCreds && (
                        <ul className="room-player-list">
                          {team.players.map(p => (
                            <li key={p.id}>
                              <span className="room-player-ign">{p.ign || p.name}</span>
                              <span className="room-player-uid">{p.ffUid || '— no UID —'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                    {members.length < group.maxTeams && isOrganizer && (
                      <div className="room-team room-team-empty">
                        <UserPlus size={16} />
                        <span>{group.maxTeams - members.length} slot{group.maxTeams - members.length === 1 ? '' : 's'} free</span>
                      </div>
                    )}
                  </div>

                  {/* Chat column — always open for members of this room */}
                  {canChat ? (
                    <GroupChat
                      group={group}
                      currentUser={currentUser}
                      isOrganizer={isOrganizer}
                      onError={msg => showToast(msg, 'error')}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
