import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, fetchTenant, type Tenant } from '@loyalink/sdk';

interface AdminState {
  session: Session | null;
  tenant: Tenant | null;
  isAdmin: boolean;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminState>({} as AdminState);
export const useAdmin = () => useContext(Ctx);

export function AdminProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function check(s: Session | null) {
    try {
      const t = await fetchTenant();
      setTenant(t);
      if (s?.user && t) {
        const { data } = await supabase
          .from('admins')
          .select('role')
          .eq('user_id', s.user.id)
          .eq('tenant_id', t.id)
          .maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.error('admin check failed', e);
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      check(data.session).finally(() => setLoading(false));
    });
    // NOTE: never call awaitable supabase methods directly inside this callback
    // (it holds the auth lock and would deadlock). Defer with setTimeout.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => check(s), 0);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AdminState = {
    session,
    tenant,
    isAdmin,
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
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
