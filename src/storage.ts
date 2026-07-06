// ---------------------------------------------------------------------------
// Local persistence. In local mode the whole TeamState lives in localStorage so
// the app works with no backend. The same normalize() is reused by the cloud
// path to coerce Firestore payloads into a valid TeamState.
// ---------------------------------------------------------------------------

import type { TeamState } from './types';

const STORAGE_KEY = 'softball-team:state';
const CURRENT_VERSION = 1;

export const DEFAULT_TEAM_NAME = 'Our Softball Team';

export function defaultState(): TeamState {
  return {
    version: CURRENT_VERSION,
    teamName: DEFAULT_TEAM_NAME,
    players: [],
    practices: [],
    topics: [],
    ideas: [],
    lineups: [],
  };
}

/** Coerce an arbitrary parsed object into a valid TeamState, filling gaps. */
export function normalize(input: Partial<TeamState> | undefined): TeamState {
  const base = defaultState();
  return {
    version: CURRENT_VERSION,
    teamName: input?.teamName || base.teamName,
    players: input?.players ?? [],
    practices: input?.practices ?? [],
    topics: input?.topics ?? [],
    ideas: input?.ideas ?? [],
    lineups: input?.lineups ?? [],
  };
}

/** Load and validate the team state from localStorage, falling back to defaults. */
export function loadState(): TeamState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw) as Partial<TeamState>);
  } catch (err) {
    console.warn('Failed to load team data, starting fresh:', err);
    return defaultState();
  }
}

/** Persist the team state to localStorage. */
export function saveState(state: TeamState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save team data:', err);
  }
}

/** Serialize the team state as a pretty JSON string, for backup/export. */
export function exportState(state: TeamState): string {
  return JSON.stringify(state, null, 2);
}

/** Parse an imported JSON string back into a TeamState. Throws on bad input. */
export function importState(json: string): TeamState {
  const parsed = JSON.parse(json) as Partial<TeamState>;
  if (typeof parsed !== 'object' || parsed === null || !('players' in parsed)) {
    throw new Error('This file does not look like a softball-team export.');
  }
  return normalize(parsed);
}
