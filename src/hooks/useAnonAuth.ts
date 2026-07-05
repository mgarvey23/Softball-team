import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

export type AuthStatus = 'connecting' | 'ready' | 'error';

/**
 * Signs the device in to Firebase anonymously -- no login screen, no password.
 * Every phone silently gets a Firebase identity, which is all the security
 * rules need to allow shared reads/writes. Returns the connection status so the
 * UI can show a spinner (or fall back) while connecting.
 */
export function useAnonAuth(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured ? 'connecting' : 'ready',
  );

  useEffect(() => {
    const authInstance = auth;
    if (!authInstance) return;
    const unsub = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setStatus('ready');
      } else {
        signInAnonymously(authInstance).catch((err) => {
          console.error('Anonymous sign-in failed:', err);
          setStatus('error');
        });
      }
    });
    return unsub;
  }, []);

  return status;
}
