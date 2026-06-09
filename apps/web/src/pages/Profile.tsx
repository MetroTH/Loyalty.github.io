import { useEffect, useState } from 'react';
import { getSupabase, fetchMyRedemptions, type Redemption } from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

const statusColor: Record<string, string> = {
  issued: 'var(--color-secondary)',
  used: 'var(--color-muted)',
  expired: 'var(--color-accent)',
  cancelled: 'var(--color-accent)',
};

export default function Profile() {
  const { member, session, signOut, refreshMember } = useAuth();
  const [name, setName] = useState(member?.full_name ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [company, setCompany] = useState(member?.company ?? '');
  const [address, setAddress] = useState(member?.address ?? '');
  const [saved, setSaved] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  useEffect(() => {
    if (member) fetchMyRedemptions(member.id).then(setRedemptions);
  }, [member]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    await getSupabase()
      .from('members')
      .update({
        full_name: name,
        phone: phone || null,
        company: company || null,
        address: address || null,
      })
      .eq('id', member.id);
    await refreshMember();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <h3>Profile</h3>
      <form className="card stack" onSubmit={save}>
        <div>
          <label className="label">Email</label>
          <input className="input" value={session?.user.email ?? ''} disabled />
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Telephone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Company</label>
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <button className="btn" style={{ marginTop: 8 }}>{saved ? 'Saved ✓' : 'Save'}</button>
      </form>

      <div className="card">
        <div className="row">
          <span className="muted">Lifetime points</span>
          <strong>{member?.lifetime_points ?? 0}</strong>
        </div>
      </div>

      <h3>My vouchers</h3>
      {redemptions.length === 0 && <p className="muted">No redemptions yet.</p>}
      {redemptions.map((r) => (
        <div className="card row" key={r.id}>
          <div className="stack">
            <strong>{r.reward?.title ?? 'Reward'}</strong>
            <span className="code" style={{ fontSize: 14, letterSpacing: 2 }}>{r.code}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          <span className="badge" style={{ color: statusColor[r.status], background: 'transparent' }}>
            {r.status}
          </span>
        </div>
      ))}

      <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
    </>
  );
}
