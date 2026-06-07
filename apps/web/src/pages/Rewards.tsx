import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import { fetchRewards, getSupabase, type Reward } from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

export default function Rewards() {
  const tenant = useTenant();
  const { member, refreshMember } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{ title: string; code: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRewards(tenant.id).then(setRewards);
  }, [tenant.id]);

  async function redeem(r: Reward) {
    setError('');
    setBusyId(r.id);
    try {
      const { data, error } = await getSupabase().functions.invoke('redeem', {
        body: { reward_id: r.id },
      });
      if (error) throw error;
      setVoucher({ title: r.title, code: (data as any).code });
      await refreshMember();
    } catch (err) {
      setError((err as Error).message || 'Redemption failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Rewards</h3>
        <span className="muted">{member?.points_balance ?? 0} pts</span>
      </div>

      {voucher && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted">Redeemed: {voucher.title}</p>
          <div className="qr">
            <img
              alt="voucher QR"
              width={160}
              height={160}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                voucher.code,
              )}`}
            />
          </div>
          <p className="code" style={{ marginTop: 10, fontSize: 18 }}>{voucher.code}</p>
          <button className="btn btn-ghost" onClick={() => setVoucher(null)}>Done</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {rewards.map((r) => {
        const affordable = (member?.points_balance ?? 0) >= r.cost_points;
        return (
          <div className="card" key={r.id}>
            <div className="row">
              <div className="stack">
                <strong>{r.title}</strong>
                {r.description && <span className="muted" style={{ fontSize: 13 }}>{r.description}</span>}
              </div>
              <span className="tier-pill">{r.cost_points} pts</span>
            </div>
            <button
              className="btn"
              style={{ marginTop: 12 }}
              disabled={!affordable || busyId === r.id}
              onClick={() => redeem(r)}
            >
              {busyId === r.id ? 'Redeeming…' : affordable ? 'Redeem' : 'Not enough points'}
            </button>
          </div>
        );
      })}
    </>
  );
}
