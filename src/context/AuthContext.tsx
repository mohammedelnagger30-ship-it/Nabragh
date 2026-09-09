import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/authErrors';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, isTeacher: boolean, educationStage?: string, curriculum?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.rpc('get_my_profile');
    const rows = (data ?? []) as Profile[];
    setProfile(rows.find((p) => p.id === userId) ?? null);
  };

  const fetchAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    console.log('AuthContext: Starting session check...');
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('AuthContext: Loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 3000); // Reduced to 3 seconds timeout

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Session retrieved', session ? 'User logged in' : 'No user');
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.allSettled([fetchProfile(session.user.id), fetchAdminStatus(session.user.id)]).finally(() => {
          console.log('AuthContext: Profile and admin status loaded');
          setLoading(false);
        });
      } else {
        console.log('AuthContext: No session, setting loading to false');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('AuthContext: Error getting session', error);
      setLoading(false);
    });

    return () => clearTimeout(timeout);
  }, []);

  // Auth state change listener
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: Auth state changed', _event, session ? 'User logged in' : 'No user');
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await Promise.all([fetchProfile(session.user.id), fetchAdminStatus(session.user.id)]);
        })();
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, isTeacher: boolean, educationStage?: string, curriculum?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email,
        is_teacher: isTeacher,
        is_approved: !isTeacher,
        education_stage: isTeacher ? null : educationStage || null,
        curriculum: isTeacher ? null : curriculum || null,
        teaching_stages: isTeacher && educationStage ? [educationStage] : [],
        teaching_curricula: isTeacher && curriculum ? [curriculum] : [],
      });
      if (profileError) return { error: translateAuthError(profileError.message) };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
