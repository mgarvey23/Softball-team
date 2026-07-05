import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamState } from '../types';
import { defaultState, loadState } from '../storage';
import { mutateTeam, saveTeam, subscribeTeam } from '../services/firestoreTeam';

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

  useEffect(() => {
    setState(null);
    const unsub = subscribeTeam(
      teamId,
      (remote) => setState(remote),
      () => {
        // No cloud document yet: seed from any local data, else defaults.
        const local = loadState();
        const seed = local.players.length > 0 ? local : defaultState();
        setState(seed);
        void saveTeam(teamId, seed);
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
