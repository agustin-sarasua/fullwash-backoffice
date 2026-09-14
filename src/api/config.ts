import Constants from 'expo-constants';

type FirebaseConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId: string;
  appId?: string;
  messagingSenderId?: string;
};

type Extra = {
  appEnv: 'local' | 'staging' | 'prod';
  apiUrl: string;
  firebase: FirebaseConfig;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const APP_ENV = extra.appEnv ?? 'local';
export const API_URL = (extra.apiUrl ?? 'http://localhost:8000').replace(/\/$/, '');
export const FIREBASE_CONFIG: FirebaseConfig = extra.firebase ?? { projectId: 'full-wash' };

/** Whether Firebase is configured enough to attempt a sign-in. */
export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.appId);
}
