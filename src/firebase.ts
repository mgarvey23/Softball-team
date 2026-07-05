// ---------------------------------------------------------------------------
// Firebase initialization.
//
// Config comes from Vite env vars (VITE_FIREBASE_*) so no secrets are committed.
// Firebase web API keys are not secret in the usual sense -- access is governed
// by Firestore security rules and the authorized-domains list -- but keeping
// them in env vars keeps the repo clean and per-environment.
//
// If the config is absent the app still loads and runs in on-device local mode,
// which makes first-time setup painless.
// ---------------------------------------------------------------------------

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

// This team's Firebase project. These values are safe to ship in client code --
// access is controlled by Firestore security rules and the authorized-domains
// list, not by keeping the config secret. The VITE_FIREBASE_* env vars override
// them if set (e.g. to point a fork at a different project).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAvYIIGaIYqsDimve5CzVEqBZ9RloZSPXw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rec-softball.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rec-softball',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rec-softball.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '794602781884',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:794602781884:web:a18f6c024a62c1dc4464b9',
};

/** Which shared team document to read/write. */
export const TEAM_ID = import.meta.env.VITE_TEAM_ID || 'main';

/** True when the minimum config needed to talk to Firebase is present. */
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId,
);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  authInstance = getAuth(app);
  // On-device cache so the app keeps working offline and syncs when back online.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export const auth = authInstance;
export const db = dbInstance;
