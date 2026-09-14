import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { configureApi } from '@/api/client';
import { isFirebaseConfigured } from '@/api/config';
import { getFirebaseAuth } from './firebase';

type AuthState = {
  user: User | null;
  /** Undefined until the admin claim has been read from the token. */
  isAdmin: boolean | undefined;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutNow: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();

    // Every request gets a fresh token from the SDK rather than a cached string: ID
    // tokens expire hourly, and a dashboard is exactly the kind of page left open.
    configureApi({
      getToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
    });

    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setIsAdmin(undefined);
        setLoading(false);
        return;
      }
      try {
        // forceRefresh, and this matters: custom claims only appear in a token minted
        // after they were granted. Without it, someone just made an admin signs in,
        // gets a 403, and reasonably concludes the grant did not work.
        const token = await next.getIdTokenResult(true);
        setIsAdmin(token.claims.admin === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
  }, [configured]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin,
      loading,
      configured,
      error,
      signIn: async (email, password) => {
        setError(null);
        setLoading(true);
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        } catch (e) {
          const code = (e as { code?: string }).code ?? '';
          setError(
            code.includes('invalid-credential') ||
              code.includes('wrong-password') ||
              code.includes('user-not-found')
              ? 'Incorrect email or password.'
              : code.includes('too-many-requests')
                ? 'Too many attempts. Try again in a few minutes.'
                : 'Could not sign in. Please try again.',
          );
          setLoading(false);
          throw e;
        }
      },
      signOutNow: async () => {
        await signOut(getFirebaseAuth());
        setIsAdmin(undefined);
      },
    }),
    [user, isAdmin, loading, configured, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
