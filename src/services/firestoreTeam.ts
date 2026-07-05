// Firestore persistence for the shared team. The whole TeamState is stored in a
// single document at teams/{teamId} -- simple and well within Firestore's 1MB
// document limit for a rec team's roster, threads, and lineups.

import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { defaultState, normalize } from '../storage';
import type { TeamState } from '../types';

function teamDoc(teamId: string) {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'teams', teamId);
}

/**
 * Subscribe to the shared team document. `onData` fires with the current state
 * whenever it changes (including offline-cached updates). `onMissing` fires once
 * when the server confirms no document exists yet, so the caller can seed one.
 */
export function subscribeTeam(
  teamId: string,
  onData: (state: TeamState) => void,
  onMissing: () => void,
): Unsubscribe {
  return onSnapshot(teamDoc(teamId), { includeMetadataChanges: true }, (snap) => {
    // Skip echoes of our own not-yet-acknowledged writes so they don't clobber
    // the optimistic local state mid-edit.
    if (snap.metadata.hasPendingWrites) return;

    if (snap.exists()) {
      onData(normalize(snap.data() as Partial<TeamState>));
    } else if (!snap.metadata.fromCache) {
      onMissing();
    }
  });
}

/** Overwrite the shared team document (used only to seed a brand-new team). */
export async function saveTeam(teamId: string, state: TeamState): Promise<void> {
  await setDoc(teamDoc(teamId), state);
}

/**
 * Apply a change atomically. Runs `fn` against the *latest* server state inside
 * a Firestore transaction and writes the result, so two teammates editing at
 * once merge instead of clobbering each other (e.g. two people adding
 * themselves to the roster both stick). Firestore retries the transaction on
 * contention. This is the only path the app uses to persist edits in cloud mode.
 */
export async function mutateTeam(
  teamId: string,
  fn: (state: TeamState) => TeamState,
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  const ref = teamDoc(teamId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const base = snap.exists()
      ? normalize(snap.data() as Partial<TeamState>)
      : defaultState();
    tx.set(ref, fn(base));
  });
}
