// webhook-inbound — external platforms (e.g. POS) push events here to earn points.
// Verifies an HMAC signature, records the event, runs the point engine.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, resolveTenant } from '../_shared/client.ts';
import { hmacHex, safeEqual } from '../_shared/hmac.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const raw = await req.text();
    const secret = Deno.env.get('WEBHOOK_INBOUND_SECRET') ?? '';
    if (secret) {
      const sig = req.headers.get('x-loyalink-signature');
      const expected = await hmacHex(secret, raw);
      if (!sig || !safeEqual(sig, expected)) {
        return json({ error: 'invalid signature' }, 401);
      }
    }

    const body = JSON.parse(raw || '{}');
    const slug = req.headers.get('x-loyalink-tenant') ?? 'default';
    const admin = adminClient();
    const tenantId = await resolveTenant(admin, slug);
    if (!tenantId) return json({ error: 'unknown tenant' }, 404);

    const { data: ev } = await admin
      .from('events')
      .insert({ tenant_id: tenantId, type: body.type ?? 'unknown', payload: body, direction: 'inbound' })
      .select('id')
      .single();

    let awarded = 0;
    if (body.type === 'purchase' && body.member?.phone) {
      const { data: memberId } = await admin.rpc('find_or_create_member', {
        p_tenant: tenantId,
        p_phone: body.member.phone,
      });
      const { data: pts } = await admin.rpc('earn_points', {
        p_member: memberId,
        p_amount: body.amount ?? 0,
        p_reference: body.reference ?? null,
      });
      awarded = pts ?? 0;
    }

    if (ev) {
      await admin
        .from('events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', ev.id);
    }

    return json({ ok: true, points_awarded: awarded });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
