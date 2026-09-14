import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/authErrors';
import { homePath } from '@/lib/roles';
import { useToast } from '@/context/ToastContext';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, isTeacher: boolean, phone: string, guardianPhone?: string, educationStage?: string, curriculum?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; home?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.rpc('get_my_profile');
    const rows = (data ?? []) as Profile[];
    const current = rows.find((p) => p.id === userId) ?? null;
    setProfile(current);
    return current;
  };

  const fetchAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsAdmin(!!data);
    return !!data;
  };

  useEffect(() => {
    console.log('AuthContext: Starting session check...');
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('AuthContext: Loading timeout - forcing loading to false');
        setLoading(false);
        toast('استغرق تحميل الجلسة وقتاً طويلاً. يرجى تحديث الصفحة.', 'info');
      }
    }, 10000); // Increased to 10 seconds timeout

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
      toast('حدث خطأ أثناء تحميل الجلسة. يرجى المحاولة مرة أخرى.', 'error');
    });

    return () => clearTimeout(timeout);
  }, []);

  // Auth state change listener
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('AuthContext: Auth state changed', _event, session ? 'User logged in' : 'No user');
      setUser(session?.user ?? null);
      if (session?.user) {
        const [profileData, adminData] = await Promise.all([fetchProfile(session.user.id), fetchAdminStatus(session.user.id)]);
        console.log('AuthContext: Profile loaded', profileData);
        console.log('AuthContext: Admin status loaded', adminData);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, isTeacher: boolean, phone: string, guardianPhone?: string, educationStage?: string, curriculum?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        guardian_phone: guardianPhone || null,
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    if (data.user) {
      const [profileRow, admin] = await Promise.all([fetchProfile(data.user.id), fetchAdminStatus(data.user.id)]);
      return { error: null, home: homePath(profileRow, admin) };
    }
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
