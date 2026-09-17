import { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/authErrors';
import { homePath } from '@/lib/roles';
import { useToast } from '@/context/ToastContext';
import { getDeviceInfo, setDeviceVerified } from '@/lib/deviceFingerprint';
import type { Profile } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  kickedOut: boolean;
  kickMessage: string | null;
  clearKick: () => void;
  signUp: (email: string, password: string, fullName: string, isTeacher: boolean, phone: string, guardianPhone?: string, educationStage?: string, curriculum?: string, isGuardian?: boolean) => Promise<{ error: string | null }>;
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
  const [kickedOut, setKickedOut] = useState(false);
  const [kickMessage, setKickMessage] = useState<string | null>(null);

  const profileInFlightRef = useRef<{ userId: string; promise: Promise<Profile | null> } | null>(null);
  const adminInFlightRef = useRef<{ userId: string; promise: Promise<boolean> } | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const inFlight = profileInFlightRef.current;
    if (inFlight && inFlight.userId === userId) return inFlight.promise;

    const promise = (async () => {
      const { data } = await supabase.rpc('get_my_profile');
      const rows = (data ?? []) as Profile[];
      return rows.find((p) => p.id === userId) ?? null;
    })();

    profileInFlightRef.current = { userId, promise };
    try {
      const result = await promise;
      setProfile(result);
      return result;
    } finally {
      if (profileInFlightRef.current?.userId === userId) profileInFlightRef.current = null;
    }
  }, []);

  const fetchAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    const inFlight = adminInFlightRef.current;
    if (inFlight && inFlight.userId === userId) return inFlight.promise;

    const promise = (async () => {
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    })();

    adminInFlightRef.current = { userId, promise };
    try {
      const result = await promise;
      setIsAdmin(result);
      return result;
    } finally {
      if (adminInFlightRef.current?.userId === userId) adminInFlightRef.current = null;
    }
  }, []);

  const activateMyDevice = useCallback(async (_userId: string) => {
    try {
      const deviceInfo = await getDeviceInfo();
      const { data, error } = await supabase.rpc('activate_device', {
        p_fingerprint: deviceInfo.fingerprint,
        p_device_name: deviceInfo.deviceName,
        p_user_agent: deviceInfo.userAgent,
      });
      if (error) {
        console.error('activate_device error:', error);
        return;
      }
      const result = data as { ok: boolean; kicked?: boolean; restricted?: boolean };
      if (result.restricted) {
        setDeviceVerified(true);
      }
      if (result.kicked) {
        // Another device was active and got kicked — no problem for us
        // The other device will detect it via its own Realtime listener
      }
    } catch (err) {
      console.error('Device activation error:', err);
    }
  }, []);

  // Realtime: listen for profile changes (active_device_fingerprint) to detect kick-out
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('device-kick-listener')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const newProfile = payload.new as { active_device_fingerprint?: string | null };
        // If active device changed and it's not our device → we got kicked
        void (async () => {
          const deviceInfo = await getDeviceInfo();
          const currentFingerprint = deviceInfo.fingerprint;

          if (newProfile.active_device_fingerprint && newProfile.active_device_fingerprint !== currentFingerprint) {
            // We got kicked by another device login
            setKickedOut(true);
            setKickMessage('تم تسجيل الدخول من جهاز آخر. تم إغلاق الجلسة على هذا الجهاز.');
            toast('تم تسجيل الدخول من جهاز آخر — تم إغلاق جلستك', 'error');
            // Sign out after a short delay so user sees the message
            setTimeout(() => {
              void supabase.auth.signOut();
            }, 2000);
          }
        })();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, toast]);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    const finish = () => {
      if (!cancelled && !finished) {
        finished = true;
        setLoading(false);
      }
    };

    // Fallback to prevent an infinite loading state (30s timeout)
    const timeout = setTimeout(() => {
      finish();
      if (!supabaseUrl || !supabaseAnonKey) {
        toast('المتغيرات البيئية غير معينة. يرجى التحقق من الإعدادات.', 'error');
      }
    }, 30000);

    // Drive session state from a single listener (always fires INITIAL_SESSION on subscribe)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void Promise.all([fetchProfile(session.user.id), fetchAdminStatus(session.user.id)]).finally(finish);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setDeviceVerified(false);
        finish();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    if (data.user) {
      const [profileRow, admin] = await Promise.all([fetchProfile(data.user.id), fetchAdminStatus(data.user.id)]);

      // Activate this device (makes it the only active one)
      await activateMyDevice(data.user.id);

      return { error: null, home: homePath(profileRow, admin) };
    }
    return { error: null };
  }, [fetchProfile, fetchAdminStatus, activateMyDevice]);

  const signOut = useCallback(async () => {
    // Clear active device before signing out
    if (user) {
      try {
        const deviceInfo = await getDeviceInfo();
        // Mark device as inactive
        await supabase.rpc('activate_device', {
          p_fingerprint: deviceInfo.fingerprint,
          p_device_name: deviceInfo.deviceName,
          p_user_agent: deviceInfo.userAgent,
        });
      } catch {
        // ignore
      }
    }
    await supabase.auth.signOut();
    setProfile(null);
    setDeviceVerified(false);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, isTeacher: boolean, phone: string, guardianPhone?: string, educationStage?: string, curriculum?: string, isGuardian = false) => {
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
        is_guardian: isGuardian,
        is_approved: !isTeacher,
        education_stage: isTeacher ? null : educationStage || null,
        curriculum: isTeacher ? null : curriculum || null,
        teaching_stages: isTeacher && educationStage ? [educationStage] : [],
        teaching_curricula: isTeacher && curriculum ? [curriculum] : [],
      });
      if (profileError) return { error: translateAuthError(profileError.message) };
    }

    return { error: null };
  }, []);

  const clearKick = useCallback(() => {
    setKickedOut(false);
    setKickMessage(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, isAdmin, kickedOut, kickMessage, clearKick, signUp, signIn, signOut, refreshProfile }),
    [user, profile, loading, isAdmin, kickedOut, kickMessage, clearKick, signUp, signIn, signOut, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
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
