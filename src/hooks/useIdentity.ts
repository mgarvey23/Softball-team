import { useCallback, useEffect, useState } from 'react';

const ME_KEY = 'softball-team:me';

/**
 * The lightweight "who am I" for this device. We store just the player's id in
 * localStorage: on first visit the person picks (or creates) their player, and
 * from then on the app knows who they are automatically -- no login, but their
 * posts, votes, and availability all stay tied to them. `setMe(null)` is the
 * "not you? switch" action for shared devices.
 */
export function useIdentity(): {
  meId: string | null;
  setMe: (id: string | null) => void;
} {
  const [meId, setMeId] = useState<string | null>(() =>
    localStorage.getItem(ME_KEY),
  );

  useEffect(() => {
    if (meId) localStorage.setItem(ME_KEY, meId);
    else localStorage.removeItem(ME_KEY);
  }, [meId]);

  const setMe = useCallback((id: string | null) => setMeId(id), []);

  return { meId, setMe };
}
