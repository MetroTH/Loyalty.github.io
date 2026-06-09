import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, fetchTenant, type Member } from '@loyalink/sdk';

interface AuthState {
  session: Session | null;
  member: Member | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Ensure a member row exists for the signed-in user (self sign-up).
  async function ensureMember(userId: string, email: string | null) {
    const tenant = await fetchTenant();
    if (!tenant) return null;
    const existing = await supabase
      .from('members')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing.data) return existing.data as Member;
    const created = await supabase
      .from('members')
      .insert({ tenant_id: tenant.id, user_id: userId, email })
      .select('*')
      .single();
    return (created.data as Member) ?? null;
  }

  async function loadMember(s: Session | null) {
    try {
      if (!s?.user) {
        setMember(null);
        return;
      }
      const m = await ensureMember(s.user.id, s.user.email ?? null);
      setMember(m);
    } catch (e) {
      console.error('loadMember failed', e);
      setMember(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadMember(data.session).finally(() => setLoading(false));
    });
    // NOTE: never call awaitable supabase methods directly inside this callback
    // (it holds the auth lock and would deadlock). Defer with setTimeout.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadMember(s), 0);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthState = {
    session,
    member,
    loading,
    sendOtp: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });
      if (error) throw error;
    },
    verifyOtp: async (email, token) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setMember(null);
    },
    refreshMember: () => loadMember(session),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
