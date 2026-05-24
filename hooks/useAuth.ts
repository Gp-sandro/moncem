import type { Session } from '@supabase/supabase-js';
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearPushToken, ensureProfile, fetchProfile } from '../lib/queries';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfileFromDB(userId: string): Promise<Profile> {
  return fetchProfile(userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string): Promise<void> {
    try {
      const p = await loadProfileFromDB(userId);
      setProfile(p);
    } catch {
      // profile may not exist yet
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_IN' && newSession) {
        ensureProfile(newSession.user.id, newSession.user.email ?? '').then(() => {
          loadProfile(newSession.user.id);
        }).catch(() => {});
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function refreshProfile(): Promise<void> {
    if (session?.user.id) {
      return loadProfile(session.user.id);
    }
    return Promise.resolve();
  }

  async function signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    const userId = session?.user.id;
    if (userId) {
      await clearPushToken(userId).catch(() => {});
    }
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return createElement(
    AuthContext.Provider,
    { value: { session, profile, loading, signIn, signUp, signOut, refreshProfile } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
