import { Tournament, Team, MatchEntry, ScoringRules, LeaderboardItem, PlayerStat } from '../types';
import { SupabaseEngine } from './supabase';
import { computeEntryScore, DEFAULT_SCORING_RULES } from './scoring';

export { DEFAULT_SCORING_RULES };

let memoryTournamentsCache: Tournament[] = [];
let activeTournamentIdMemory: string | null = null;

export const StorageEngine = {
  async fetchAllTournaments(isSignedIn: boolean): Promise<Tournament[]> {
    const tournaments = await SupabaseEngine.getAllTournaments(isSignedIn);
    memoryTournamentsCache = tournaments;

    // Keep the current selection if it still exists, otherwise fall back.
    const stillExists = tournaments.some(t => t.id === activeTournamentIdMemory);
    if (!stillExists) {
      activeTournamentIdMemory = tournaments.length > 0 ? tournaments[0].id : null;
    }
    return tournaments;
  },

  getAllTournaments(): Tournament[] {
    return memoryTournamentsCache;
  },

  getActiveTournamentId(): string | null {
    return activeTournamentIdMemory;
  },

  setActiveTournamentId(id: string): void {
    activeTournamentIdMemory = id;
  },

  getActiveTournament(): Tournament | null {
    if (memoryTournamentsCache.length === 0) return null;
    return (
      memoryTournamentsCache.find(t => t.id === activeTournamentIdMemory) ||
      memoryTournamentsCache[0]
    );
  },

  async createTournament(
    data: { name: string; date: string; roomId: string; roomPassword: string; totalMatches: number },
    createdByUserId: string
  ): Promise<Tournament> {
    const created = await SupabaseEngine.createTournament(data, createdByUserId);
    activeTournamentIdMemory = created.id;
    return created;
  },

  async deleteTournament(id: string): Promise<void> {
    await SupabaseEngine.deleteTournament(id);
    if (activeTournamentIdMemory === id) activeTournamentIdMemory = null;
  },

  async createTeam(tournamentId: string, team: Team, registeredByUserId: string): Promise<void> {
    await SupabaseEngine.createTeam(tournamentId, team, registeredByUserId);
  },

  async updateTeam(team: Team): Promise<void> {
    await SupabaseEngine.updateTeam(team);
  },

  async deleteTeam(teamId: string): Promise<void> {
    await SupabaseEngine.deleteTeam(teamId);
  },

  /**
   * Appends one match to the schedule.
   * The previous implementation computed the new total and then threw it away,
   * so the match count never actually changed.
   */
  async addMatch(tournamentId: string): Promise<number> {
    const tournament = memoryTournamentsCache.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found.');

    const newTotal = (Number(tournament.totalMatches) || 0) + 1;
    await SupabaseEngine.updateTournament(tournamentId, { totalMatches: newTotal });
    return newTotal;
  },

  async removeLastMatch(tournamentId: string): Promise<number> {
    const tournament = memoryTournamentsCache.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found.');

    const newTotal = Math.max(1, (Number(tournament.totalMatches) || 1) - 1);
    await SupabaseEngine.updateTournament(tournamentId, { totalMatches: newTotal });
    return newTotal;
  },

  async saveMatchEntries(
    tournamentId: string,
    matchNumber: number,
    entries: Record<string, MatchEntry>
  ): Promise<void> {
    await SupabaseEngine.saveMatchEntries(tournamentId, matchNumber, entries);
  },

  async saveScoringRules(tournamentId: string, rules: ScoringRules): Promise<void> {
    await SupabaseEngine.saveScoringRules(tournamentId, rules);
  },

  calculateTeamLeaderboard(tournament: Tournament | null): LeaderboardItem[] {
    if (!tournament) return [];

    const items: Record<string, LeaderboardItem> = {};
    tournament.teams.forEach(team => {
      items[team.id] = {
        team,
        matchesPlayed: 0,
        wwcd: 0,
        placementPoints: 0,
        totalKills: 0,
        killPoints: 0,
        totalPoints: 0
      };
    });

    tournament.matches.forEach(match => {
      if (!match.entries) return;

      Object.entries(match.entries).forEach(([teamId, entry]) => {
        const item = items[teamId];
        if (!item) return; // entry for a squad that has since been removed

        const score = computeEntryScore(entry, tournament.scoringRules);
        if (score.placement === 1) item.wwcd += 1;
        if (score.participated) item.matchesPlayed += 1;

        item.placementPoints += score.placementPoints;
        item.totalKills += score.kills;
        item.killPoints += score.killPoints;
        item.totalPoints += score.totalPoints;
      });
    });

    return Object.values(items).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd;
      return b.totalKills - a.totalKills;
    });
  },

  calculatePlayerStats(tournament: Tournament | null): PlayerStat[] {
    if (!tournament) return [];

    const statsById: Record<string, PlayerStat> = {};

    tournament.teams.forEach(team => {
      team.players.forEach(player => {
        statsById[player.id] = {
          player,
          teamName: team.name,
          matchKills: {},
          totalKills: 0,
          avgKills: 0,
          highestKillMatch: 0
        };
      });
    });

    tournament.matches.forEach(match => {
      if (!match.entries) return;

      Object.values(match.entries).forEach(entry => {
        if (!entry.playerKills) return;

        Object.entries(entry.playerKills).forEach(([playerId, kills]) => {
          const stat = statsById[playerId];
          if (!stat) return;

          const k = Number(kills) || 0;
          stat.matchKills[match.matchNumber] = k;
          stat.totalKills += k;
          if (k > stat.highestKillMatch) stat.highestKillMatch = k;
        });
      });
    });

    return Object.values(statsById)
      .map(stat => {
        // Average over matches the player actually appeared in, not the whole schedule.
        const appearances = Object.keys(stat.matchKills).length;
        return {
          ...stat,
          avgKills: appearances > 0 ? Number((stat.totalKills / appearances).toFixed(1)) : 0
        };
      })
      .sort((a, b) => b.totalKills - a.totalKills);
  }
};
