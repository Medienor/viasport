"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient, Session, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState(() => createClientComponentClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
        // Optional: Redirect on sign in/out if needed
        // if (_event === 'SIGNED_IN') router.push('/');
        // if (_event === 'SIGNED_OUT') router.push('/');
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signInWithGoogle = async ({ redirectTo } = {}) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || undefined,
          queryParams: {
            origin: typeof window !== 'undefined' ? window.location.origin : undefined
          }
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
     if (error) {
      console.error("Error signing out:", error.message);
    }
    // State update is handled by onAuthStateChange
    // No need to manually set loading to false here if listener works
    // setIsLoading(false); // Can be removed if listener handles it
    router.refresh(); // Refresh server components if needed
  };

  const value = {
    supabase,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 