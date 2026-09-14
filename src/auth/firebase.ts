import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';

import { FIREBASE_CONFIG, isFirebaseConfigured } from '@/api/config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * The same `full-wash` Firebase project the mobile app uses. Admins sign in with the
 * same credentials; what separates them is the `admin` custom claim, which the backend
 * verifies on every request.
 */
export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Register a Web app in the full-wash project and ' +
        'set the EXPO_PUBLIC_FIREBASE_* variables (see .env.example).',
    );
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  }
  if (!auth) {
    auth = getAuth(app);
    // Survive a page reload; an admin should not be signed out by refreshing.
    void setPersistence(auth, browserLocalPersistence);
  }
  return auth;
}
