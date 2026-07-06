// ---------------------------------------------------------------------------
// Core data model for the softball team hub.
//
// One TeamState holds everything the team shares: the roster, proposed
// practices (with availability), forum topics, ideas, and saved lineups. In
// cloud mode this whole object lives in a single Firestore document that every
// teammate reads and writes; in local mode it lives in the browser.
// ---------------------------------------------------------------------------

/** Softball field positions for a 10-player defense (four outfielders). */
export const POSITIONS = [
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LCF', 'RCF', 'RF',
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  '3B': 'Third Base',
  SS: 'Shortstop',
  LF: 'Left Field',
  LCF: 'Left-Center',
  RCF: 'Right-Center',
  RF: 'Right Field',
};

/**
 * Off-field roles: not real fielding spots, but jobs the team needs filled.
 * GM runs the roster/logistics; Team Chef handles the important stuff (food).
 */
export const ROLES = ['GM', 'CHEF'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  GM: 'General Manager',
  CHEF: 'Team Chef',
};

/** Anything a player can be tagged with: a field position or an off-field role. */
export type PlayerPosition = Position | Role;

/** True if the given code is an off-field role rather than a field position. */
export function isRole(code: string): code is Role {
  return (ROLES as readonly string[]).includes(code);
}

/** Which hand a player bats/throws with. "S" = switch hitter. */
export type Hand = 'L' | 'R' | 'S';

/** Jersey/shirt sizes, for ordering team gear. */
export const JERSEY_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type JerseySize = (typeof JERSEY_SIZES)[number];

/** A member of the team. Also serves as a lightweight identity: a person picks
 *  their player on first visit and it is remembered on their device. */
export interface Player {
  id: string;
  name: string;
  jersey?: string;
  /** Jersey/shirt size, for ordering team gear. */
  jerseySize?: JerseySize;
  phone?: string;
  bats?: Hand;
  throws?: 'L' | 'R';
  /** Positions/roles the player can cover, most-preferred first. */
  positions: PlayerPosition[];
  createdAt: number;
}

/** A yes/no/maybe response to a proposed practice. */
export type Availability = 'yes' | 'no' | 'maybe';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  yes: 'In',
  maybe: 'Maybe',
  no: 'Out',
};

/** A proposed practice (or any get-together) the team can respond to. */
export interface Practice {
  id: string;
  /** ISO date, "YYYY-MM-DD". */
  date: string;
  /** Free-form time, e.g. "6:30 PM". */
  time?: string;
  location?: string;
  note?: string;
  createdBy: string; // playerId
  createdAt: number;
  /** playerId -> availability. */
  responses: Record<string, Availability>;
}

/** A single message within a forum topic. */
export interface Post {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
}

/** A forum thread: an opening message plus replies. */
export interface Topic {
  id: string;
  title: string;
  authorId: string;
  createdAt: number;
  posts: Post[];
}

/** A quick suggestion the team can upvote. */
export interface Idea {
  id: string;
  authorId: string;
  text: string;
  /** playerIds who upvoted. */
  votes: string[];
  createdAt: number;
}

/** What a lineup slot can be: a field position, an off-field role, or bench. */
export type FieldAssignment = Position | Role | 'BENCH';

/** Human-readable label for any lineup assignment. */
export function assignmentLabel(a: FieldAssignment): string {
  if (a === 'BENCH') return 'Bench';
  if (isRole(a)) return ROLE_LABELS[a];
  return POSITION_LABELS[a];
}

export interface LineupEntry {
  playerId: string;
  position: FieldAssignment;
}

/** A saved lineup for a game: batting order (array order) + field positions. */
export interface Lineup {
  id: string;
  name: string;
  /** Ordered batting lineup. */
  entries: LineupEntry[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** The full shared state for the team. */
export interface TeamState {
  version: number;
  teamName: string;
  players: Player[];
  practices: Practice[];
  topics: Topic[];
  ideas: Idea[];
  lineups: Lineup[];
}

/**
 * The interface the UI uses, independent of where the data lives. Both the
 * local (localStorage) and cloud (Firestore) hooks return this shape, so the
 * views don't care which backend is active. `update` applies a pure transform
 * from `teamOps` and persists the result.
 */
export interface TeamApi {
  state: TeamState;
  update: (fn: (s: TeamState) => TeamState) => void;
}

// --- Small display helpers -------------------------------------------------

/** Resolve a player's display name from an id, tolerating deleted players. */
export function playerName(state: TeamState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? 'Unknown';
}

/** Tally availability responses for a practice. */
export function availabilityCounts(
  practice: Practice,
): Record<Availability, number> {
  const counts: Record<Availability, number> = { yes: 0, maybe: 0, no: 0 };
  for (const v of Object.values(practice.responses)) counts[v] += 1;
  return counts;
}
