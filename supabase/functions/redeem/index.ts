// redeem — member burns points for a reward, receives a voucher/QR code.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const { data: u } = await userClient(auth).auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const { reward_id } = await req.json().catch(() => ({}));
    if (!reward_id) return json({ error: 'reward_id required' }, 400);

    const admin = adminClient();
    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('user_id', u.user.id)
      .maybeSingle();
    if (!member) return json({ error: 'member not found' }, 404);

    const { data, error } = await admin.rpc('redeem_reward', {
      p_member: member.id,
      p_reward: reward_id,
    });
    if (error) return json({ error: error.message }, 400);

    return json({ code: data.code, redemption: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
