import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Profile } from '../types/booking';

type SupabaseProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: Profile['role'];
};

type AuthState = {
  isConfigured: boolean;
  isLoading: boolean;
  profile: Profile | null;
  session: Session | null;
  errorMessage: string | null;
};

function mapProfile(row: SupabaseProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isConfigured: hasSupabaseConfig,
    isLoading: hasSupabaseConfig,
    profile: null,
    session: null,
    errorMessage: null,
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    async function loadProfile(session: Session | null) {
      if (!supabase || !isMounted) {
        return;
      }

      if (!session) {
        setAuthState({
          isConfigured: true,
          isLoading: false,
          profile: null,
          session: null,
          errorMessage: null,
        });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, role')
        .eq('id', session.user.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthState({
          isConfigured: true,
          isLoading: false,
          profile: null,
          session,
          errorMessage: 'Kunde inte hämta användarprofilen från Supabase.',
        });
        return;
      }

      setAuthState({
        isConfigured: true,
        isLoading: false,
        profile: mapProfile(data),
        session,
        errorMessage: null,
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      void loadProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  return {
    ...authState,
    signOut,
  };
}
