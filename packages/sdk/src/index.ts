import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Tenant,
  Member,
  Reward,
  Tier,
  NewsItem,
  Mission,
  LedgerEntry,
  Redemption,
} from './types';

export * from './types';

let client: SupabaseClient | null = null;

/** Singleton Supabase client built from Vite env vars. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** The active tenant slug (whitelabel selector). */
export function tenantSlug(): string {
  return (import.meta.env.VITE_TENANT_SLUG as string) || 'default';
}

// ── Data access helpers ───────────────────────────────────────

export async function fetchTenant(slug = tenantSlug()): Promise<Tenant | null> {
  const { data } = await getSupabase()
    .from('tenants')
    .select('id, slug, brand_name, logo_url, theme, settings')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Tenant) ?? null;
}

export async function fetchMyMember(tenantId: string): Promise<Member | null> {
  const { data } = await getSupabase()
    .from('members')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data as Member) ?? null;
}

export async function fetchTiers(tenantId: string): Promise<Tier[]> {
  const { data } = await getSupabase()
    .from('tiers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order');
  return (data as Tier[]) ?? [];
}

export async function fetchRewards(tenantId: string): Promise<Reward[]> {
  const { data } = await getSupabase()
    .from('rewards')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('cost_points');
  return (data as Reward[]) ?? [];
}

export async function fetchNews(tenantId: string): Promise<NewsItem[]> {
  const { data } = await getSupabase()
    .from('news')
    .select('id, title, body, image_url, created_at')
    .eq('tenant_id', tenantId)
    .eq('published', true)
    .order('created_at', { ascending: false });
  return (data as NewsItem[]) ?? [];
}

export async function fetchMissions(tenantId: string): Promise<Mission[]> {
  const { data } = await getSupabase()
    .from('missions')
    .select('id, title, description, reward_points, active')
    .eq('tenant_id', tenantId)
    .eq('active', true);
  return (data as Mission[]) ?? [];
}

export async function fetchMyRedemptions(memberId: string): Promise<Redemption[]> {
  const { data } = await getSupabase()
    .from('redemptions')
    .select('id, reward_id, cost_points, code, status, created_at, reward:rewards(title, image_url)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  return (data as unknown as Redemption[]) ?? [];
}

export async function fetchLedger(memberId: string): Promise<LedgerEntry[]> {
  const { data } = await getSupabase()
    .from('points_ledger')
    .select('id, member_id, delta, kind, reason, reference, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as LedgerEntry[]) ?? [];
}
