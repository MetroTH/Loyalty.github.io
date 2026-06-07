// partner-api — REST gateway for external partners.
// Auth: Authorization: Bearer <api key>. Enforces scope + per-minute rate limit.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/client.ts';
import { sha256Hex } from '../_shared/hmac.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

interface KeyRow {
  id: string;
  tenant_id: string;
  scopes: string[];
  rate_limit_per_min: number;
  active: boolean;
}

async function authenticate(admin: SupabaseClient, req: Request): Promise<KeyRow | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const hash = await sha256Hex(token);
  const { data } = await admin
    .from('api_keys')
    .select('id, tenant_id, scopes, rate_limit_per_min, active')
    .eq('key_hash', hash)
    .eq('active', true)
    .maybeSingle();
  return (data as KeyRow) ?? null;
}

async function rateLimited(admin: SupabaseClient, key: KeyRow): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  const { data: count } = await admin.rpc('incr_rate', {
    p_key: key.id,
    p_window: windowStart,
  });
  return (count ?? 1) > key.rate_limit_per_min;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  const key = await authenticate(admin, req);
  if (!key) return json({ error: 'invalid api key' }, 401);
  if (await rateLimited(admin, key)) return json({ error: 'rate limit exceeded' }, 429);
  await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id);

  // path after the function mount, e.g. /partner-api/members/+66...
  const parts = new URL(req.url).pathname.replace(/^\/partner-api/, '').split('/').filter(Boolean);
  const tenantId = key.tenant_id;

  try {
    // GET /rewards
    if (req.method === 'GET' && parts[0] === 'rewards') {
      const { data } = await admin
        .from('rewards')
        .select('id, title, cost_points, stock, active')
        .eq('tenant_id', tenantId)
        .eq('active', true);
      return json({ rewards: data ?? [] });
    }

    // GET /members/:phone
    if (req.method === 'GET' && parts[0] === 'members' && parts[1]) {
      const { data } = await admin
        .from('members')
        .select('id, phone, points_balance, lifetime_points, tier_id')
        .eq('tenant_id', tenantId)
        .eq('phone', decodeURIComponent(parts[1]))
        .maybeSingle();
      if (!data) return json({ error: 'not found' }, 404);
      return json({ member: data });
    }

    // POST /points/earn { phone, amount, reference }
    if (req.method === 'POST' && parts[0] === 'points' && parts[1] === 'earn') {
      if (!key.scopes.includes('points:write')) return json({ error: 'scope required' }, 403);
      const { phone, amount, reference } = await req.json();
      const { data: memberId } = await admin.rpc('find_or_create_member', {
        p_tenant: tenantId,
        p_phone: phone,
      });
      const { data: pts, error } = await admin.rpc('earn_points', {
        p_member: memberId,
        p_amount: amount ?? 0,
        p_reference: reference ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, member_id: memberId, points_awarded: pts ?? 0 });
    }

    // POST /points/redeem { phone, reward_id }
    if (req.method === 'POST' && parts[0] === 'points' && parts[1] === 'redeem') {
      if (!key.scopes.includes('points:write')) return json({ error: 'scope required' }, 403);
      const { phone, reward_id } = await req.json();
      const { data: member } = await admin
        .from('members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle();
      if (!member) return json({ error: 'member not found' }, 404);
      const { data, error } = await admin.rpc('redeem_reward', {
        p_member: member.id,
        p_reward: reward_id,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, code: data.code });
    }

    return json({ error: 'not found' }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
