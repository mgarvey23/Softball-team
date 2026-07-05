// Firestore persistence for the shared team. The whole TeamState is stored in a
// single document at teams/{teamId} -- simple and well within Firestore's 1MB
// document limit for a rec team's roster, threads, and lineups.

import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { normalize } from '../storage';
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

/** Overwrite the shared team document. */
export async function saveTeam(teamId: string, state: TeamState): Promise<void> {
  await setDoc(teamDoc(teamId), state);
}
