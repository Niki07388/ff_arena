import { MatchEntry, ScoringRules, Tournament } from '../types';

export const DEFAULT_SCORING_RULES: ScoringRules = {
  placementPoints: [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0],
  perKillPoints: 1
};

/**
 * True when a manual/override field actually holds a usable number.
 * Empty strings, null and undefined all mean "not set, fall back to automatic".
 */
export const hasNumericValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return false;
  return !Number.isNaN(Number(value));
};

export const resolveRules = (rules?: ScoringRules | null): ScoringRules => ({
  placementPoints: Array.isArray(rules?.placementPoints)
    ? rules!.placementPoints
    : DEFAULT_SCORING_RULES.placementPoints,
  perKillPoints: hasNumericValue(rules?.perKillPoints)
    ? Number(rules!.perKillPoints)
    : DEFAULT_SCORING_RULES.perKillPoints
});

export const placementPointsFor = (placement: number, rules: ScoringRules): number => {
  const index = Number(placement) - 1;
  if (index < 0 || index >= rules.placementPoints.length) return 0;
  return Number(rules.placementPoints[index]) || 0;
};

export const sumKills = (playerKills?: Record<string, number | string>): number => {
  if (!playerKills) return 0;
  return Object.values(playerKills).reduce<number>((total, k) => total + (Number(k) || 0), 0);
};

export interface EntryScore {
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  bonusPoints: number;
  totalPoints: number;
  usedManualPlacement: boolean;
  usedTotalOverride: boolean;
  participated: boolean;
}

/**
 * The single source of truth for "what is this team worth in this match".
 *
 * Precedence, highest first:
 *   1. overrideTotalPoints  — replaces the whole total
 *   2. manualPlacementPoints — replaces the automatic placement points
 *   3. the placement points table
 * Kill points and bonus/penalty points are always added unless (1) applies.
 */
export const computeEntryScore = (
  entry: Partial<MatchEntry> | null | undefined,
  rawRules?: ScoringRules | null
): EntryScore => {
  const rules = resolveRules(rawRules);

  const empty: EntryScore = {
    placement: 0,
    kills: 0,
    placementPoints: 0,
    killPoints: 0,
    bonusPoints: 0,
    totalPoints: 0,
    usedManualPlacement: false,
    usedTotalOverride: false,
    participated: false
  };

  if (!entry) return empty;

  const placement = Number(entry.placement) || 0;
  const kills = sumKills(entry.playerKills as Record<string, number | string> | undefined);

  const usedManualPlacement = hasNumericValue(entry.manualPlacementPoints);
  const placementPoints = usedManualPlacement
    ? Number(entry.manualPlacementPoints)
    : placementPointsFor(placement, rules);

  const killPoints = kills * rules.perKillPoints;
  const bonusPoints = hasNumericValue(entry.manualPoints) ? Number(entry.manualPoints) : 0;

  const usedTotalOverride = hasNumericValue(entry.overrideTotalPoints);
  const totalPoints = usedTotalOverride
    ? Number(entry.overrideTotalPoints)
    : placementPoints + killPoints + bonusPoints;

  const participated =
    placement > 0 || kills > 0 || placementPoints !== 0 || bonusPoints !== 0 || usedTotalOverride;

  return {
    placement,
    kills,
    placementPoints,
    killPoints,
    bonusPoints,
    totalPoints,
    usedManualPlacement,
    usedTotalOverride,
    participated
  };
};

/** Aggregate one team's totals across every match of a tournament. */
export const computeTeamTotals = (tournament: Tournament, teamId: string) => {
  const totals = {
    matchesPlayed: 0,
    wwcd: 0,
    placementPoints: 0,
    totalKills: 0,
    killPoints: 0,
    totalPoints: 0
  };

  tournament.matches.forEach(match => {
    const entry = match.entries?.[teamId];
    if (!entry) return;

    const score = computeEntryScore(entry, tournament.scoringRules);
    if (score.placement === 1) totals.wwcd += 1;
    if (score.participated) totals.matchesPlayed += 1;

    totals.placementPoints += score.placementPoints;
    totals.totalKills += score.kills;
    totals.killPoints += score.killPoints;
    totals.totalPoints += score.totalPoints;
  });

  return totals;
};
