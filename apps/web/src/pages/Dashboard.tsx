import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import { fetchTiers, fetchLedger, type Tier, type LedgerEntry } from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const tenant = useTenant();
  const { member } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    fetchTiers(tenant.id).then(setTiers);
    if (member) fetchLedger(member.id).then(setLedger);
  }, [tenant.id, member]);

  const tier = tiers.find((t) => t.id === member?.tier_id);
  const next = tiers.find((t) => t.min_points > (member?.lifetime_points ?? 0));
  const toNext = next ? next.min_points - (member?.lifetime_points ?? 0) : 0;

  return (
    <>
      <div className="card points-hero">
        {tier && <span className="tier-pill">{tier.name}</span>}
        <div className="points-value">{member?.points_balance ?? 0}</div>
        <div className="muted">{(tenant.settings as any)?.pointsLabel ?? 'Points'}</div>
        {next && (
          <p className="muted" style={{ marginTop: 10 }}>
            {toNext} pts to {next.name}
          </p>
        )}
      </div>

      <h3>Recent activity</h3>
      {ledger.length === 0 && <p className="muted">No activity yet. Make a purchase to earn points!</p>}
      {ledger.map((l) => (
        <div className="card row" key={l.id}>
          <div className="stack">
            <strong>{l.reason ?? l.kind}</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              {new Date(l.created_at).toLocaleString()}
            </span>
          </div>
          <strong style={{ color: l.delta >= 0 ? 'var(--color-secondary)' : 'var(--color-accent)' }}>
            {l.delta >= 0 ? '+' : ''}
            {l.delta}
          </strong>
        </div>
      ))}
    </>
  );
}
