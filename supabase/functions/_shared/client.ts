import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are injected
// automatically into the Edge runtime.

/** Service-role client — bypasses RLS. Use for trusted server-side writes. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Client scoped to the caller's JWT — respects RLS, resolves the user. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/** Resolve a tenant id from a slug (defaults to "default"). */
export async function resolveTenant(admin: SupabaseClient, slug = 'default'): Promise<string | null> {
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}
