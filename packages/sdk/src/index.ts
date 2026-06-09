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

/** Map a Postgres/Supabase error to a friendly, user-facing message. */
export function friendlyError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error) return '';
  switch (error.code) {
    case '23505':
      return 'That phone number is already registered to another member.';
    case '23503':
      return 'This item is in use and cannot be deleted.';
    default:
      return error.message ?? 'Something went wrong. Please try again.';
  }
}

// ── Image upload (client-side resize + Supabase Storage) ──────

function loadImageEl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Downscale an image file to maxWidth and re-encode (jpeg/png). */
async function resizeImageFile(
  file: File,
  maxWidth: number,
  format: 'jpeg' | 'png',
): Promise<Blob> {
  const img = await loadImageEl(file);
  const scale = Math.min(1, maxWidth / (img.width || maxWidth));
  const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
  const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))), mime, 0.85),
  );
}

/**
 * Resize an image in the browser, upload to the public `assets` bucket,
 * and return its public URL.
 */
export async function uploadImage(
  file: File,
  opts: { folder?: string; maxWidth?: number; format?: 'jpeg' | 'png' } = {},
): Promise<string> {
  const folder = opts.folder ?? 'uploads';
  const maxWidth = opts.maxWidth ?? 600;
  const format = opts.format ?? 'jpeg';
  const blob = await resizeImageFile(file, maxWidth, format);
  const ext = format === 'png' ? 'png' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const sb = getSupabase();
  const { error } = await sb.storage.from('assets').upload(path, blob, {
    contentType: format === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return sb.storage.from('assets').getPublicUrl(path).data.publicUrl;
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
    .select('id, reward_id, cost_points, code, status, created_at, reward_title, reward:rewards(title, image_url)')
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
