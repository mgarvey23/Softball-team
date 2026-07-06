import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamState } from '../types';
import { defaultState, saveState } from '../storage';
import { mutateTeam, saveBackup, subscribeTeam } from '../services/firestoreTeam';

/** Don't take more than one auto-backup per this interval (per device). */
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

/** True if the team has any content worth backing up. */
function hasContent(s: TeamState): boolean {
  return (
    s.players.length > 0 ||
    s.practices.length > 0 ||
    s.topics.length > 0 ||
    s.ideas.length > 0 ||
    s.lineups.length > 0
  );
}

/**
 * Cloud-synced team state. Subscribes to the shared Firestore document for
 * `teamId` and applies every change through a transaction (see `mutateTeam`) so
 * concurrent edits from different teammates merge instead of overwriting each
 * other. Changes are also applied to local state immediately (optimistically)
 * for a snappy UI; the incoming snapshot then reconciles to the merged server
 * result. Returns `state: null` until the first snapshot arrives.
 */
export function useCloudTeam(teamId: string) {
  const [state, setState] = useState<TeamState | null>(null);
  // Serialize writes so they apply in the order the user made them.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const lastBackupAt = useRef(0);

  // Whenever the team changes: keep a copy on this device, and take a throttled
  // cloud snapshot so a bad write can always be rolled back from Settings.
  useEffect(() => {
    if (!state || !hasContent(state)) return;
    saveState(state);
    if (Date.now() - lastBackupAt.current > BACKUP_INTERVAL_MS) {
      lastBackupAt.current = Date.now();
      void saveBackup(teamId, state).catch((e) => console.warn('Auto-backup failed:', e));
    }
  }, [state, teamId]);

  useEffect(() => {
    setState(null);
    const unsub = subscribeTeam(
      teamId,
      (remote) => setState(remote),
      () => {
        // The team document doesn't exist yet. Show an empty team locally, but
        // do NOT write a blank team to the server here: if this "missing"
        // signal were ever wrong it would wipe real data. The document is
        // instead created lazily by the first real edit, which goes through a
        // transaction (mutateTeam) that reads the latest server state first and
        // therefore can never clobber an existing team.
        setState(defaultState());
      },
    );
    return unsub;
  }, [teamId]);

  const update = useCallback(
    (fn: (s: TeamState) => TeamState) => {
      // Optimistic local apply for immediate feedback.
      setState((prev) => (prev ? fn(prev) : prev));
      // Durable, conflict-free apply against the latest server state.
      queue.current = queue.current
        .then(() => mutateTeam(teamId, fn))
        .catch((err) => console.error('Sync failed:', err));
    },
    [teamId],
  );

  return { state, update };
}
