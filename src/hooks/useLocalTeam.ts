import { useCallback, useEffect, useState } from 'react';
import type { TeamState } from '../types';
import { loadState, saveState } from '../storage';

/**
 * On-device team state backed by localStorage. Used when Firebase isn't
 * configured, so the app is fully usable out of the box. Exposes the same
 * `{ state, update }` shape as the cloud hook.
 */
export function useLocalTeam() {
  const [state, setState] = useState<TeamState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback(
    (fn: (s: TeamState) => TeamState) => setState((s) => fn(s)),
    [],
  );

  return { state, update };
}
