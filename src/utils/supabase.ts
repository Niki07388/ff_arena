import { createClient, Session, User } from '@supabase/supabase-js';
import { Tournament, Team, MatchEntry, ScoringRules, Match, Group, ChatMessage } from '../types';
import { DEFAULT_SCORING_RULES } from './scoring';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly at boot instead of silently returning empty data everywhere.
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

/**
 * Vite's hot reload re-executes this module on every edit, and each execution
 * would build a fresh client against the same storage key — which is what
 * produces the "Multiple GoTrueClient instances detected" warning and can lead
 * to sessions fighting each other. Caching on globalThis keeps exactly one
 * client alive across reloads.
 */
const createFreshClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'ff-esports-auth'
    }
  });

const globalRef = globalThis as typeof globalThis & {
  __ffSupabase?: ReturnType<typeof createFreshClient>;
};

export const supabase = globalRef.__ffSupabase ?? createFreshClient();
globalRef.__ffSupabase = supabase;

// ============================================================================
//  AUTHENTICATION  (Supabase Auth — passwords are hashed server-side with
//  bcrypt and never leave the auth service. RLS policies key off auth.uid().)
// ============================================================================

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
}

export const toAppUser = (user: User | null | undefined): AppUser | null => {
  if (!user) return null;
  const email = user.email || '';
  return {
    id: user.id,
    email,
    displayName:
      (user.user_metadata?.display_name as string) || email.split('@')[0] || 'Player'
  };
};

/** Human-readable message for the messages Supabase Auth returns. */
const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'Wrong email or password. Please check and try again.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists — please sign in instead.';
  }
  if (m.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email address first, then sign in.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return message;
};

export interface SignUpResult {
  user: AppUser | null;
  needsEmailConfirmation: boolean;
}

export const signUpWithPassword = async (
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { display_name: displayName?.trim() || cleanEmail.split('@')[0] }
    }
  });

  if (error) throw new Error(friendlyAuthError(error.message));

  // Supabase does not reveal whether an email is already registered: signUp
  // returns a success-shaped response with an EMPTY identities array instead of
  // an error, and it does NOT change the existing password. Without this check
  // a repeat sign-up looks like it worked, and the following sign-in then fails
  // with a confusing 400 because the password was never updated.
  const alreadyRegistered = Boolean(data.user && (data.user.identities?.length ?? 0) === 0);
  if (alreadyRegistered) {
    throw new Error(
      'An account with this email already exists. Sign in instead — or use "Forgot password?" if you cannot remember it.'
    );
  }

  // When "Confirm email" is enabled in Supabase, signUp returns a user but no
  // session until the link is clicked.
  return {
    user: toAppUser(data.user),
    needsEmailConfirmation: Boolean(data.user && !data.session)
  };
};

export const signInWithPassword = async (email: string, password: string): Promise<AppUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) throw new Error(friendlyAuthError(error.message));

  const user = toAppUser(data.user);
  if (!user) throw new Error('Sign in failed. Please try again.');
  return user;
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin
  });
  if (error) throw new Error(friendlyAuthError(error.message));
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const getCurrentUser = async (): Promise<AppUser | null> => {
  const session = await getCurrentSession();
  return toAppUser(session?.user);
};

/** Fires whenever the user signs in, signs out, or the token refreshes. */
export const onAuthChange = (callback: (user: AppUser | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAppUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
};

// ============================================================================
//  DATA ACCESS
//  Every write below is additionally gated by RLS in the database, so a
//  malicious client cannot bypass these checks by calling the API directly.
// ============================================================================

const parseJson = <T,>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

interface TournamentRow {
  id: string;
  name: string;
  date: string;
  room_id: string;
  room_password: string;
  total_matches: number;
  scoring_rules: unknown;
  created_by: string | null;
  teams?: unknown[];
  matches?: unknown[];
}

const mapTournamentRow = (row: TournamentRow): Tournament => {
  const teams: Team[] = (row.teams || []).map((raw) => {
    const tm = raw as Record<string, unknown>;
    const name = String(tm.name ?? '');
    return {
      id: String(tm.id),
      name,
      logo: (tm.logo as string) || name.charAt(0).toUpperCase(),
      captain: (tm.captain as string) || '',
      phone: (tm.phone as string) || '',
      players: parseJson(tm.players, []),
      registeredBy: (tm.registered_by as string) || undefined
    };
  });

  const matches: Match[] = (row.matches || [])
    .map((raw) => {
      const m = raw as Record<string, unknown>;
      return {
        matchNumber: Number(m.match_number),
        entries: parseJson<Record<string, MatchEntry>>(m.entries, {})
      };
    })
    .sort((a, b) => a.matchNumber - b.matchNumber);

  return {
    id: row.id,
    name: row.name,
    date: row.date,
    roomId: row.room_id,
    roomPassword: row.room_password,
    totalMatches: Number(row.total_matches) || 0,
    scoringRules: parseJson(row.scoring_rules, DEFAULT_SCORING_RULES),
    teams,
    matches,
    createdBy: row.created_by || undefined
  };
};

export const SupabaseEngine = {
  /**
   * Loads every tournament with its squads and matches in ONE round trip
   * (the previous version issued 2 extra queries per tournament).
   *
   * Signed-out visitors never receive the room password or captain phone
   * numbers — the database revokes those columns from the `anon` role, so we
   * must not ask for them either. Hiding them only in the UI would still leave
   * them readable straight from the REST API.
   *
   * `isSignedIn` is passed in rather than read via supabase.auth here: calling
   * an auth method from the data path can deadlock against the
   * onAuthStateChange callback, which holds the auth lock while it runs.
   */
  async getAllTournaments(isSignedIn: boolean): Promise<Tournament[]> {
    const tournamentCols = isSignedIn
      ? 'id, name, date, room_id, room_password, total_matches, scoring_rules, created_by'
      : 'id, name, date, room_id, total_matches, scoring_rules, created_by';

    const teamCols = isSignedIn
      ? 'id, name, logo, captain, phone, players, registered_by'
      : 'id, name, logo, captain, players, registered_by';

    const { data, error } = await supabase
      .from('tournaments')
      .select(
        `${tournamentCols},
         teams ( ${teamCols} ),
         matches ( match_number, entries )`
      )
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Could not load tournaments: ${error.message}`);
    return (data as unknown as TournamentRow[] | null)?.map(mapTournamentRow) ?? [];
  },

  async createTournament(
    data: {
      name: string;
      date: string;
      roomId: string;
      roomPassword: string;
      totalMatches: number;
    },
    createdByUserId: string
  ): Promise<Tournament> {
    const { data: inserted, error } = await supabase
      .from('tournaments')
      .insert([
        {
          name: data.name,
          date: data.date,
          room_id: data.roomId,
          room_password: data.roomPassword,
          total_matches: data.totalMatches,
          scoring_rules: DEFAULT_SCORING_RULES,
          created_by: createdByUserId
        }
      ])
      .select(
        `id, name, date, room_id, room_password, total_matches, scoring_rules, created_by`
      )
      .single();

    if (error) throw new Error(`Could not create tournament: ${error.message}`);
    return mapTournamentRow(inserted as TournamentRow);
  },

  async deleteTournament(tournamentId: string): Promise<void> {
    const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
    if (error) throw new Error(`Could not delete tournament: ${error.message}`);
  },

  /** Used by "Add Match" to grow the schedule, and by the settings screen. */
  async updateTournament(
    tournamentId: string,
    patch: Partial<{
      name: string;
      date: string;
      roomId: string;
      roomPassword: string;
      totalMatches: number;
      scoringRules: ScoringRules;
    }>
  ): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.roomId !== undefined) row.room_id = patch.roomId;
    if (patch.roomPassword !== undefined) row.room_password = patch.roomPassword;
    if (patch.totalMatches !== undefined) row.total_matches = patch.totalMatches;
    if (patch.scoringRules !== undefined) row.scoring_rules = patch.scoringRules;

    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('tournaments').update(row).eq('id', tournamentId);
    if (error) throw new Error(`Could not update tournament: ${error.message}`);
  },

  /**
   * Registering a new squad stamps it with the signed-in captain's id so RLS can
   * later tell "my squad" from someone else's. Editing never rewrites that stamp,
   * which lets an organizer fix a roster without stealing ownership of it.
   */
  async createTeam(tournamentId: string, team: Team, registeredByUserId: string): Promise<void> {
    const { error } = await supabase.from('teams').insert({
      tournament_id: tournamentId,
      name: team.name,
      logo: team.logo || team.name.charAt(0).toUpperCase(),
      captain: team.captain,
      phone: team.phone || '',
      players: team.players,
      registered_by: registeredByUserId
    });

    if (error) {
      if (error.code === '23505') {
        // Two different unique indexes can fire here — tell them apart so the
        // message actually explains what went wrong.
        if (/one_squad_per_user/i.test(error.message)) {
          throw new Error(
            'You have already registered a squad in this tournament. Edit your existing squad instead.'
          );
        }
        throw new Error(`A squad named "${team.name}" is already registered in this tournament.`);
      }
      throw new Error(`Could not register squad: ${error.message}`);
    }
  },

  async updateTeam(team: Team): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({
        name: team.name,
        logo: team.logo || team.name.charAt(0).toUpperCase(),
        captain: team.captain,
        phone: team.phone || '',
        players: team.players
      })
      .eq('id', team.id);

    if (error) {
      if (error.code === '23505') {
        throw new Error(`A squad named "${team.name}" is already registered in this tournament.`);
      }
      throw new Error(`Could not update squad: ${error.message}`);
    }
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw new Error(`Could not delete squad: ${error.message}`);
  },

  async saveMatchEntries(
    tournamentId: string,
    matchNumber: number,
    entries: Record<string, MatchEntry>
  ): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .upsert(
        { tournament_id: tournamentId, match_number: matchNumber, entries },
        { onConflict: 'tournament_id,match_number' }
      );

    if (error) throw new Error(`Could not save match scores: ${error.message}`);
  },

  async saveScoringRules(tournamentId: string, rules: ScoringRules): Promise<void> {
    const { error } = await supabase
      .from('tournaments')
      .update({ scoring_rules: rules })
      .eq('id', tournamentId);

    if (error) throw new Error(`Could not save scoring rules: ${error.message}`);
  }
};

// ============================================================================
//  GROUPS (CUSTOM ROOMS) + CHAT
// ============================================================================

interface GroupRow {
  id: string;
  tournament_id: string;
  name: string;
  room_id: string | null;
  room_password: string | null;
  max_teams: number;
  group_teams?: { team_id: string }[];
}

const mapGroupRow = (row: GroupRow): Group => ({
  id: row.id,
  tournamentId: row.tournament_id,
  name: row.name,
  roomId: row.room_id || '',
  roomPassword: row.room_password || '',
  maxTeams: Number(row.max_teams) || 12,
  teamIds: (row.group_teams || []).map(gt => gt.team_id)
});

export const GroupEngine = {
  async listForTournament(tournamentId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('id, tournament_id, name, room_id, room_password, max_teams, group_teams(team_id)')
      .eq('tournament_id', tournamentId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Could not load rooms: ${error.message}`);
    return (data as unknown as GroupRow[] | null)?.map(mapGroupRow) ?? [];
  },

  async createGroup(
    tournamentId: string,
    input: { name: string; roomId: string; roomPassword: string; maxTeams: number },
    teamIds: string[]
  ): Promise<Group> {
    const { data: inserted, error } = await supabase
      .from('groups')
      .insert({
        tournament_id: tournamentId,
        name: input.name,
        room_id: input.roomId,
        room_password: input.roomPassword,
        max_teams: input.maxTeams
      })
      .select('id, tournament_id, name, room_id, room_password, max_teams')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error(`A room called "${input.name}" already exists.`);
      throw new Error(`Could not create room: ${error.message}`);
    }

    const group = mapGroupRow(inserted as GroupRow);

    if (teamIds.length > 0) {
      try {
        await this.assignTeams(group.id, teamIds);
      } catch (err) {
        // Don't leave a half-built room behind if the squads could not be added.
        await supabase.from('groups').delete().eq('id', group.id);
        throw err;
      }
      group.teamIds = teamIds;
    }

    return group;
  },

  async updateGroup(
    groupId: string,
    patch: Partial<{ name: string; roomId: string; roomPassword: string; maxTeams: number }>
  ): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.roomId !== undefined) row.room_id = patch.roomId;
    if (patch.roomPassword !== undefined) row.room_password = patch.roomPassword;
    if (patch.maxTeams !== undefined) row.max_teams = patch.maxTeams;
    if (Object.keys(row).length === 0) return;

    const { error } = await supabase.from('groups').update(row).eq('id', groupId);
    if (error) throw new Error(`Could not update room: ${error.message}`);
  },

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw new Error(`Could not delete room: ${error.message}`);
  },

  async assignTeams(groupId: string, teamIds: string[]): Promise<void> {
    if (teamIds.length === 0) return;

    const { error } = await supabase
      .from('group_teams')
      .insert(teamIds.map(team_id => ({ group_id: groupId, team_id })));

    if (error) {
      // 23505 = the squad is already in a room (unique index on team_id)
      if (error.code === '23505') {
        throw new Error('One or more of those squads is already assigned to a room.');
      }
      // The capacity trigger raises check_violation when the room is full
      if (error.code === '23514' || /full/i.test(error.message)) {
        throw new Error(error.message);
      }
      throw new Error(`Could not assign squads: ${error.message}`);
    }
  },

  async removeTeam(groupId: string, teamId: string): Promise<void> {
    const { error } = await supabase
      .from('group_teams')
      .delete()
      .eq('group_id', groupId)
      .eq('team_id', teamId);

    if (error) throw new Error(`Could not remove squad from room: ${error.message}`);
  }
};

interface MessageRow {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  body: string;
  created_at: string;
}

const mapMessageRow = (row: MessageRow): ChatMessage => ({
  id: row.id,
  groupId: row.group_id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  body: row.body,
  createdAt: row.created_at
});

export const ChatEngine = {
  async listMessages(groupId: string, limit = 200): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, group_id, sender_id, sender_name, body, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Could not load messages: ${error.message}`);
    return (data as unknown as MessageRow[] | null)?.map(mapMessageRow) ?? [];
  },

  async sendMessage(groupId: string, senderId: string, senderName: string, body: string): Promise<void> {
    const trimmed = body.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      sender_id: senderId,
      sender_name: senderName,
      body: trimmed.slice(0, 2000)
    });

    if (error) throw new Error(`Could not send message: ${error.message}`);
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw new Error(`Could not delete message: ${error.message}`);
  },

  /**
   * Live updates for one room's chat. Realtime honours RLS, so a subscriber is
   * only ever pushed messages for groups they actually belong to.
   * Returns an unsubscribe function.
   */
  subscribe(
    groupId: string,
    onInsert: (message: ChatMessage) => void,
    onDelete: (messageId: string) => void
  ): () => void {
    const channel = supabase
      .channel(`chat:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        payload => onInsert(mapMessageRow(payload.new as MessageRow))
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        payload => onDelete((payload.old as { id: string }).id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
