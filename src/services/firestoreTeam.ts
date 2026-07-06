// Firestore persistence for the shared team. The whole TeamState is stored in a
// single document at teams/{teamId} -- simple and well within Firestore's 1MB
// document limit for a rec team's roster, threads, and lineups.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { defaultState, normalize } from '../storage';
import type { TeamState } from '../types';

/** How many recent auto-backups to keep per team. */
const MAX_BACKUPS = 24;

function teamDoc(teamId: string) {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'teams', teamId);
}

function backupsCol(teamId: string) {
  if (!db) throw new Error('Firestore is not configured');
  // A subcollection under the team. Crucially, this lives *separately* from the
  // team document, so a bad write that blanks the team doc can't touch these.
  return collection(db, 'teams', teamId, 'backups');
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

/** One saved snapshot of the whole team. */
export interface Backup {
  id: string;
  createdAt: number;
  state: TeamState;
}

/**
 * Save a snapshot of the team into the backups subcollection, then trim to the
 * most recent MAX_BACKUPS. Snapshots live separately from the team document, so
 * they survive even if the main document is wiped.
 */
export async function saveBackup(teamId: string, state: TeamState): Promise<void> {
  await addDoc(backupsCol(teamId), { createdAt: Date.now(), state });
  const all = await getDocs(query(backupsCol(teamId), orderBy('createdAt', 'desc')));
  await Promise.all(all.docs.slice(MAX_BACKUPS).map((d) => deleteDoc(d.ref)));
}

/** List recent backups, newest first. */
export async function listBackups(teamId: string): Promise<Backup[]> {
  const snap = await getDocs(
    query(backupsCol(teamId), orderBy('createdAt', 'desc'), limit(MAX_BACKUPS)),
  );
  return snap.docs.map((d) => {
    const data = d.data() as { createdAt?: number; state?: Partial<TeamState> };
    return { id: d.id, createdAt: data.createdAt ?? 0, state: normalize(data.state) };
  });
}
