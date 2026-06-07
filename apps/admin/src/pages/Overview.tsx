import { useEffect, useState } from 'react';
import { getSupabase } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

export default function Overview() {
  const { tenant } = useAdmin();
  const [stats, setStats] = useState({ members: 0, redemptions: 0, points: 0, rewards: 0 });

  useEffect(() => {
    if (!tenant) return;
    const sb = getSupabase();
    (async () => {
      const [members, redemptions, rewards, ledger] = await Promise.all([
        sb.from('members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        sb.from('redemptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        sb.from('rewards').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        sb.from('points_ledger').select('delta').eq('tenant_id', tenant.id).gt('delta', 0),
      ]);
      const points = (ledger.data ?? []).reduce((s, r: any) => s + r.delta, 0);
      setStats({
        members: members.count ?? 0,
        redemptions: redemptions.count ?? 0,
        rewards: rewards.count ?? 0,
        points,
      });
    })();
  }, [tenant]);

  const cards = [
    { label: 'Members', value: stats.members },
    { label: 'Points issued', value: stats.points },
    { label: 'Redemptions', value: stats.redemptions },
    { label: 'Rewards', value: stats.rewards },
  ];

  return (
    <>
      <h2>Overview</h2>
      <div className="grid">
        {cards.map((c) => (
          <div className="card" key={c.label}>
            <div className="muted">{c.label}</div>
            <div className="stat">{c.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
