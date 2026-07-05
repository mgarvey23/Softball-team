import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamState } from '../types';
import { defaultState, loadState } from '../storage';
import { saveTeam, subscribeTeam } from '../services/firestoreTeam';

const SAVE_DEBOUNCE_MS = 600;

/**
 * Cloud-synced team state. Subscribes to the shared Firestore document for
 * `teamId`, applies mutations optimistically, and writes changes back
 * (debounced). If no document exists yet, it is seeded from any local data (so
 * a solo start migrates up) or from defaults. Returns `state: null` until the
 * first snapshot arrives.
 */
export function useCloudTeam(teamId: string) {
  const [state, setState] = useState<TeamState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [teamId]);

  const update = useCallback(
    (fn: (s: TeamState) => TeamState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveTeam(teamId, next);
        }, SAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [teamId],
  );

  return { state, update };
}
