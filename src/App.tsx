import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tournament, Team, PlayerStat, LeaderboardItem, MatchEntry, ScoringRules } from './types';
import { StorageEngine } from './utils/storage';
import { AppUser, getCurrentUser, onAuthChange, signOut } from './utils/supabase';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { TournamentManagerView } from './components/TournamentManagerView';
import { TeamManagerView } from './components/TeamManagerView';
import { MatchEntryView } from './components/MatchEntryView';
import { MatchScoreboardView } from './components/MatchScoreboardView';
import { TeamLeaderboardView } from './components/TeamLeaderboardView';
import { PlayerLeaderboardView } from './components/PlayerLeaderboardView';
import { StatisticsView } from './components/StatisticsView';
import { OrganizerPortalView } from './components/OrganizerPortalView';
import { RoomsView } from './components/RoomsView';
import { ObsOverlayView } from './components/ObsOverlayView';
import { BackgroundCarousel } from './components/BackgroundCarousel';
import { OpeningSplash } from './components/OpeningSplash';
import { AccessDenied } from './components/AccessDenied';
import { TeamProfileModal } from './components/Modals/TeamProfileModal';
import { PlayerProfileModal } from './components/Modals/PlayerProfileModal';
import { CreateTournamentModal } from './components/Modals/CreateTournamentModal';
import { AddTeamModal } from './components/Modals/AddTeamModal';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { ProfileView } from './components/ProfileView';
import { EventSwitcher } from './components/EventSwitcher';
import { exportTeamLeaderboardCSV, printPDFReport } from './utils/export';
import '../css/styles.css';
import '../css/rooms-chat.css';
// last, so its media queries override the desktop rules above
import '../css/mobile.css';

export type ToastKind = 'success' | 'error' | 'info';

/**
 * The selected event lives in the URL (`?event=<id>`) rather than in a single
 * module-level variable. That is what lets an organizer run 2-3 of their own
 * events side by side in separate browser tabs — each tab keeps its own event,
 * and a reload no longer throws the selection away.
 */
const readEventIdFromUrl = (): string | null =>
  new URLSearchParams(window.location.search).get('event');

const writeEventIdToUrl = (id: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set('event', id);
  window.history.replaceState({}, '', url.toString());
};

// Seed the selection before the first fetch so the URL wins over "first in list"
const initialEventId = readEventIdFromUrl();
if (initialEventId) StorageEngine.setActiveTournamentId(initialEventId);

/** Tabs that anyone may open, signed in or not. */
const PUBLIC_TABS = [
  'home',
  'dashboard',
  'scoreboard',
  'leaderboard',
  'players',
  'teams',
  'tournaments',
  'stats',
  'rooms'
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ---- Auth -----------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register'>('login');

  // ---- Modals ---------------------------------------------------------------
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<Team | null>(null);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<PlayerStat | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3500);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const currentUserId = currentUser?.id ?? null;

  const refreshData = useCallback(async () => {
    try {
      const all = await StorageEngine.fetchAllTournaments(Boolean(currentUserId));
      const active = StorageEngine.getActiveTournament();
      setTournaments(all);
      setActiveTournament(active);
      setLeaderboard(StorageEngine.calculateTeamLeaderboard(active));
      setPlayerStats(StorageEngine.calculatePlayerStats(active));
      setLoadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load tournament data.';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, currentUserId]);

  /** Wraps an action so failures surface as an error toast instead of vanishing. */
  const run = useCallback(
    async (action: () => Promise<void>, successMessage?: string) => {
      try {
        await action();
        await refreshData();
        if (successMessage) showToast(successMessage, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
      }
    },
    [refreshData, showToast]
  );

  // Restore the session, then keep it in sync with Supabase Auth.
  useEffect(() => {
    let cancelled = false;

    // Never let a stalled auth call strand the app on a loading screen: if the
    // session has not resolved in 5s, carry on as a signed-out visitor. The
    // onAuthChange subscription below still corrects the state once it arrives.
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setIsAuthReady(true);
    }, 5000);

    getCurrentUser()
      .then(user => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(failsafe);
        if (!cancelled) setIsAuthReady(true);
      });

    const unsubscribe = onAuthChange(user => setCurrentUser(user));
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  // Load once the session is known, and reload whenever the signed-in identity
  // changes — signing in unlocks extra columns (room password, captain phones),
  // signing out must drop them again.
  useEffect(() => {
    if (!isAuthReady) return;
    refreshData();
  }, [isAuthReady, currentUserId, refreshData]);

  // ---- Roles ----------------------------------------------------------------
  const isAuthenticated = Boolean(currentUser);

  const isOrganizerOf = useCallback(
    (tournament: Tournament | null | undefined): boolean =>
      Boolean(currentUser?.id && tournament?.createdBy && tournament.createdBy === currentUser.id),
    [currentUser]
  );

  /** Only the creator of the *currently selected* event may score or configure it. */
  const canManageActiveTournament = useMemo(
    () => isOrganizerOf(activeTournament),
    [isOrganizerOf, activeTournament]
  );

  const myTournaments = useMemo(
    () => tournaments.filter(t => isOrganizerOf(t)),
    [tournaments, isOrganizerOf]
  );

  const goToAuth = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalInitialMode(mode);
    setActiveTab('auth');
  }, []);

  /**
   * The one squad this user already registered in the selected event.
   * A team leader gets exactly one squad per tournament.
   */
  const myTeamInActiveTournament = useMemo(
    () =>
      currentUser?.id
        ? activeTournament?.teams.find(t => t.registeredBy === currentUser.id) ?? null
        : null,
    [activeTournament, currentUser]
  );

  /** Squad registration requires a signed-in team leader. */
  const openRegisterTeam = useCallback(
    (team: Team | null = null) => {
      if (!isAuthenticated) {
        showToast('Please sign in first — team leaders must have an account to register.', 'info');
        goToAuth('register');
        return;
      }

      // Already registered in this event? Open that squad for editing rather
      // than letting them fill in a form the database is going to reject.
      //
      // Read the selection from StorageEngine, not from React state: registering
      // straight off a tournament card selects the event and opens this form in
      // the same tick, and setActiveTournament has not applied yet. StorageEngine
      // updates synchronously, so it always reflects the event just chosen.
      const target = StorageEngine.getActiveTournament();
      const existing = currentUser?.id
        ? target?.teams.find(t => t.registeredBy === currentUser.id) ?? null
        : null;

      if (!team && existing) {
        setEditingTeam(existing);
        setIsAddTeamOpen(true);
        showToast(`You already registered "${existing.name}" — editing it instead.`, 'info');
        return;
      }

      setEditingTeam(team);
      setIsAddTeamOpen(true);
    },
    [isAuthenticated, goToAuth, showToast, currentUser]
  );

  // ---- Deep links -----------------------------------------------------------
  // `?invite=<id>` selects the event and opens registration — but only once,
  // otherwise every background refresh would reopen the modal.
  const inviteHandled = useRef(false);
  useEffect(() => {
    if (inviteHandled.current || !isAuthReady || tournaments.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (!inviteId) return;

    inviteHandled.current = true;
    const found = tournaments.find(t => t.id === inviteId);

    if (!found) {
      showToast('That invite link points to an event that no longer exists.', 'error');
      return;
    }

    StorageEngine.setActiveTournamentId(found.id);
    setActiveTournament(found);
    setLeaderboard(StorageEngine.calculateTeamLeaderboard(found));
    setPlayerStats(StorageEngine.calculatePlayerStats(found));

    if (isAuthenticated) {
      setEditingTeam(null);
      setIsAddTeamOpen(true);
      showToast(`🏆 Welcome! Register your squad for "${found.name}".`);
    } else {
      showToast(`Sign in to register your squad for "${found.name}".`, 'info');
      goToAuth('register');
    }
  }, [tournaments, isAuthReady, isAuthenticated, goToAuth, showToast]);

  // OBS broadcast overlay lives on its own URL so it can be captured as a
  // browser source without any of the app chrome.
  const isObsRoute = window.location.pathname.toLowerCase().includes('obs');

  // ---- Handlers -------------------------------------------------------------
  const handleSignOut = () =>
    run(async () => {
      await signOut();
      setCurrentUser(null);
      setActiveTab('home');
    }, '🔒 Signed out.');

  const handleSelectActiveTournament = (id: string, announce = true) => {
    StorageEngine.setActiveTournamentId(id);
    writeEventIdToUrl(id);

    const selected = StorageEngine.getAllTournaments().find(t => t.id === id) || null;
    setActiveTournament(selected);
    setLeaderboard(StorageEngine.calculateTeamLeaderboard(selected));
    setPlayerStats(StorageEngine.calculatePlayerStats(selected));

    if (announce && selected) showToast(`🏆 Now viewing "${selected.name}"`);
  };

  const handleCreateTournament = (data: {
    name: string;
    date: string;
    roomId: string;
    roomPassword: string;
    totalMatches: number;
  }) => {
    if (!currentUser) {
      goToAuth('login');
      return;
    }
    return run(async () => {
      const created = await StorageEngine.createTournament(data, currentUser.id);
      // Pin the new event to this tab straight away
      writeEventIdToUrl(created.id);
    }, '✨ Tournament created — you are the organizer.');
  };

  const handleDeleteTournament = (id: string) => {
    const target = tournaments.find(t => t.id === id);
    if (!isOrganizerOf(target)) {
      showToast('Only the organizer who created this event can delete it.', 'error');
      return;
    }
    return run(async () => {
      await StorageEngine.deleteTournament(id);
    }, '🗑️ Tournament deleted.');
  };

  const handleSaveTeam = (teamData: Team) => {
    if (!activeTournament || !currentUser) return;

    const isEditing = Boolean(editingTeam);
    return run(async () => {
      if (isEditing) {
        await StorageEngine.updateTeam(teamData);
      } else {
        await StorageEngine.createTeam(activeTournament.id, teamData, currentUser.id);
      }
    }, isEditing ? '✅ Squad updated.' : '✅ Squad registered — good luck!');
  };

  /** A captain may remove their own squad; the organizer may remove any of them. */
  const canManageTeam = useCallback(
    (team: Team) =>
      canManageActiveTournament || Boolean(currentUser?.id && team.registeredBy === currentUser.id),
    [canManageActiveTournament, currentUser]
  );

  const handleDeleteTeam = (teamId: string) => {
    const team = activeTournament?.teams.find(t => t.id === teamId);
    if (!team || !canManageTeam(team)) {
      showToast('You can only remove squads you registered.', 'error');
      return;
    }
    return run(async () => {
      await StorageEngine.deleteTeam(teamId);
    }, '🗑️ Squad removed.');
  };

  const handleAddMatch = () => {
    if (!activeTournament || !canManageActiveTournament) return;
    return run(async () => {
      await StorageEngine.addMatch(activeTournament.id);
    }, '➕ Match added to the schedule.');
  };

  const handleSaveMatch = (matchNumber: number, entries: Record<string, MatchEntry>) => {
    if (!activeTournament || !canManageActiveTournament) return;
    return run(async () => {
      await StorageEngine.saveMatchEntries(activeTournament.id, matchNumber, entries);
    }, `✅ Match ${matchNumber} scores saved.`);
  };

  const handleSaveScoringRules = (rules: ScoringRules) => {
    if (!activeTournament || !canManageActiveTournament) return;
    return run(async () => {
      await StorageEngine.saveScoringRules(activeTournament.id, rules);
    }, '⚙️ Scoring rules updated.');
  };

  const handleExportCSV = () => {
    if (!activeTournament || leaderboard.length === 0) {
      showToast('Nothing to export yet — register squads first.', 'info');
      return;
    }
    exportTeamLeaderboardCSV(activeTournament, leaderboard);
    showToast('📊 Standings CSV downloaded!');
  };

  const handlePrintPDF = () => {
    if (!activeTournament) {
      showToast('Select a tournament before printing a report.', 'info');
      return;
    }
    printPDFReport();
  };

  // ---- Standalone routes ----------------------------------------------------
  if (isObsRoute) {
    return (
      <ObsOverlayView
        tournament={activeTournament}
        leaderboard={leaderboard}
        onExitObs={() => {
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  if (activeTab === 'auth') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#07070b', overflowY: 'auto' }}>
        <AuthView
          initialMode={authModalInitialMode}
          onAuthSuccess={user => {
            setCurrentUser(user);
            setActiveTab('profile');
            showToast(`👋 Welcome, ${user.displayName}!`);
          }}
          onNavigateHome={() => setActiveTab('home')}
        />
      </div>
    );
  }

  // A signed-out visitor should never land on an organizer-only screen.
  const requestedPrivateTab = !PUBLIC_TABS.includes(activeTab) && activeTab !== 'profile';
  const organizerOnlyTab = activeTab === 'matchentry' || activeTab === 'settings';

  return (
    <div className="app-container">
      <OpeningSplash />
      <BackgroundCarousel />

      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        tournament={activeTournament}
        isAuthenticated={isAuthenticated}
        canManageActiveTournament={canManageActiveTournament}
        onOpenRegisterTeam={() => openRegisterTeam(null)}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        onNavigateDashboard={() => setActiveTab('home')}
        currentUser={currentUser}
        onOpenAuth={goToAuth}
        onNavigateProfile={() => setActiveTab('profile')}
        onSignOut={handleSignOut}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tournament={activeTournament}
        isAuthenticated={isAuthenticated}
        canManageActiveTournament={canManageActiveTournament}
        onOpenCreateTournament={() => setIsCreateTournamentOpen(true)}
        onOpenRegisterTeam={() => openRegisterTeam(null)}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        onOpenAuth={goToAuth}
        onSignOut={handleSignOut}
      />

      <main className="main-content">
        {/* Switch between your own events instantly, or open one in a new tab
            to run several in parallel. Hidden for anyone with no events. */}
        {!isLoading && (
          <EventSwitcher
            myTournaments={myTournaments}
            activeTournamentId={activeTournament?.id ?? null}
            onSelect={handleSelectActiveTournament}
          />
        )}

        {loadError && (
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--accent-rose)' }}>
            <strong style={{ color: 'var(--accent-rose)' }}>Could not reach the database.</strong>
            <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0.75rem 0' }}>{loadError}</p>
            <button className="btn btn-sm btn-primary" onClick={refreshData}>Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3>Loading tournaments…</h3>
          </div>
        ) : requestedPrivateTab && !isAuthenticated ? (
          <AccessDenied
            title="Sign in required"
            message="You need an account to open this section. Team leaders sign in to register a squad; organizers sign in to run their events."
            actionLabel="Sign In / Create Account"
            onAction={() => goToAuth('login')}
          />
        ) : organizerOnlyTab && !canManageActiveTournament ? (
          <AccessDenied
            title="Organizer access only"
            message={
              activeTournament
                ? `Only the organizer who created "${activeTournament.name}" can enter match scores or change its settings.`
                : 'Select a tournament you organize to enter scores or change settings.'
            }
            actionLabel="Go to My Events"
            onAction={() => setActiveTab('organizer')}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeView
                tournaments={tournaments}
                activeTournament={activeTournament}
                isAuthenticated={isAuthenticated}
                isOrganizerOf={isOrganizerOf}
                onSelectTournament={handleSelectActiveTournament}
                onOpenRegisterTeam={() => openRegisterTeam(null)}
                onOpenCreateTournament={() => setIsCreateTournamentOpen(true)}
                onOpenAuth={goToAuth}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                tournament={activeTournament}
                leaderboard={leaderboard}
                playerStats={playerStats}
                canSeeRoomCredentials={canManageActiveTournament}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'tournaments' && (
              <TournamentManagerView
                tournaments={tournaments}
                activeTournament={activeTournament}
                isAuthenticated={isAuthenticated}
                isOrganizerOf={isOrganizerOf}
                onOpenAuth={() => goToAuth('login')}
                onSelectActive={handleSelectActiveTournament}
                onViewStandings={id => {
                  handleSelectActiveTournament(id, false);
                  setActiveTab('leaderboard');
                }}
                onCreateNew={() => setIsCreateTournamentOpen(true)}
                onDelete={handleDeleteTournament}
                onRegisterSquad={id => {
                  handleSelectActiveTournament(id, false);
                  openRegisterTeam(null);
                }}
                onExportCSV={handleExportCSV}
                onPrintPDF={handlePrintPDF}
              />
            )}

            {activeTab === 'teams' && (
              <TeamManagerView
                tournament={activeTournament}
                isAuthenticated={isAuthenticated}
                canManageTeam={canManageTeam}
                isOrganizer={canManageActiveTournament}
                myTeamId={myTeamInActiveTournament?.id ?? null}
                onAddTeam={() => openRegisterTeam(null)}
                onEditTeam={team => openRegisterTeam(team)}
                onDeleteTeam={handleDeleteTeam}
              />
            )}

            {activeTab === 'matchentry' && (
              <MatchEntryView
                tournament={activeTournament}
                onSaveMatch={handleSaveMatch}
                onAddMatch={handleAddMatch}
                showToast={showToast}
              />
            )}

            {activeTab === 'rooms' && (
              <RoomsView
                tournament={activeTournament}
                currentUser={currentUser}
                isOrganizer={canManageActiveTournament}
                showToast={showToast}
              />
            )}

            {activeTab === 'scoreboard' && (
              <MatchScoreboardView tournament={activeTournament} onSelectTeam={setSelectedTeamProfile} />
            )}

            {activeTab === 'leaderboard' && (
              <TeamLeaderboardView
                tournament={activeTournament}
                leaderboard={leaderboard}
                onSelectTeam={setSelectedTeamProfile}
              />
            )}

            {activeTab === 'players' && (
              <PlayerLeaderboardView
                tournament={activeTournament}
                playerStats={playerStats}
                onSelectPlayer={setSelectedPlayerProfile}
              />
            )}

            {activeTab === 'stats' && (
              <StatisticsView tournament={activeTournament} leaderboard={leaderboard} playerStats={playerStats} />
            )}

            {activeTab === 'organizer' && (
              <OrganizerPortalView
                myTournaments={myTournaments}
                activeTournament={activeTournament}
                canManageActiveTournament={canManageActiveTournament}
                currentUser={currentUser}
                onSelectActive={handleSelectActiveTournament}
                onNavigate={setActiveTab}
                onOpenCreateTournament={() => setIsCreateTournamentOpen(true)}
                onEditTeam={team => openRegisterTeam(team)}
                onDeleteTeam={handleDeleteTeam}
                onDeleteTournament={handleDeleteTournament}
                showToast={showToast}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                tournament={activeTournament}
                onSaveScoring={handleSaveScoringRules}
                onAddMatch={handleAddMatch}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                myTournaments={myTournaments}
                onSignOut={handleSignOut}
                onOpenCreateTournament={() => setIsCreateTournamentOpen(true)}
                onNavigateTab={setActiveTab}
                onSelectActive={handleSelectActiveTournament}
              />
            )}
          </>
        )}
      </main>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.kind}`}>{toast.message}</div>
        </div>
      )}

      <CreateTournamentModal
        isOpen={isCreateTournamentOpen}
        isAuthenticated={isAuthenticated}
        onClose={() => setIsCreateTournamentOpen(false)}
        onCreate={handleCreateTournament}
        onRequireAuth={() => {
          setIsCreateTournamentOpen(false);
          goToAuth('login');
        }}
      />

      <AddTeamModal
        isOpen={isAddTeamOpen}
        tournament={activeTournament}
        editingTeam={editingTeam}
        currentUser={currentUser}
        onClose={() => {
          setIsAddTeamOpen(false);
          setEditingTeam(null);
        }}
        onSave={handleSaveTeam}
      />

      <TeamProfileModal
        team={selectedTeamProfile}
        tournament={activeTournament}
        onClose={() => setSelectedTeamProfile(null)}
      />

      <PlayerProfileModal
        playerStat={selectedPlayerProfile}
        tournament={activeTournament}
        onClose={() => setSelectedPlayerProfile(null)}
      />
    </div>
  );
};

export default App;
