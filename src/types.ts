export interface Player {
  id: string;
  name: string;
  ign: string;
  /** In-game Free Fire member/UID — needed to invite the player to a custom room. */
  ffUid?: string;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  captain: string;
  phone?: string;
  players: Player[];
  /** auth.users id of the team leader who registered this squad. */
  registeredBy?: string;
}

export interface ScoringRules {
  placementPoints: number[];
  perKillPoints: number;
}

export interface MatchEntry {
  placement: number;
  playerKills: Record<string, number>; // playerId -> kill count
  manualPlacementPoints?: number; // Manual placement points override
  manualPoints?: number; // Bonus or penalty points
  overrideTotalPoints?: number; // Direct manual total points override
}

export interface Match {
  matchNumber: number;
  entries: Record<string, MatchEntry>; // teamId -> MatchEntry
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  roomId: string;
  roomPassword: string;
  totalMatches: number;
  scoringRules: ScoringRules;
  teams: Team[];
  matches: Match[];
  /** auth.users id of the organizer who created this event. */
  createdBy?: string;
}

/**
 * A custom room. Free Fire caps a room at 12 squads, so a 24-squad event is
 * split into two groups, each with its own room credentials and private chat.
 */
export interface Group {
  id: string;
  tournamentId: string;
  name: string;
  roomId: string;
  roomPassword: string;
  maxTeams: number;
  /** Ids of the squads assigned to this room. */
  teamIds: string[];
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  createdAt: string;
}

export const ROOM_CAPACITY = 12;

export interface LeaderboardItem {
  team: Team;
  matchesPlayed: number;
  wwcd: number;
  placementPoints: number;
  totalKills: number;
  killPoints: number;
  totalPoints: number;
}

export interface PlayerStat {
  player: Player;
  teamName: string;
  matchKills: Record<number, number>; // matchNumber -> kills
  totalKills: number;
  avgKills: number;
  highestKillMatch: number;
}
