import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { migrateGuestToAccount } from '../lib/guest';
import type { Profile } from '../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }, [user]);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Migrate guest data on first login
          const { loadGuestHistory, clearGuestHistory, migrateGuestToAccount } = await import('../lib/guest');
          await migrateGuestToAccount(newSession.user.id);
          
          const history = loadGuestHistory();
          if (history.length > 0) {
            for (const log of history) {
              await supabase.rpc('record_game_result', {
                p_player_id: log.playerId,
                p_guesses_used: log.guessesUsed,
                p_won: log.won,
                p_mode: log.mode,
                p_score: log.score
              });
            }
            clearGuestHistory();
          }

          // Load profile
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle();
          if (data) setProfile(data as Profile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (username.trim().length < 2) return { error: 'Username must be at least 2 characters' };
    if (username.trim().length > 20) return { error: 'Username must be at most 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return { error: 'Username can only contain letters, numbers, and underscores' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    if (error) return { error: error.message };

    // Update the auto-created profile with the chosen username
    if (data.user) {
      await supabase.from('profiles').update({ username: username.trim() }).eq('id', data.user.id);
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signInWithGoogle, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
