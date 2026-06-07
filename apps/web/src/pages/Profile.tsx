import { useState } from 'react';
import { getSupabase } from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

export default function Profile() {
  const { member, session, signOut, refreshMember } = useAuth();
  const [name, setName] = useState(member?.full_name ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    await getSupabase()
      .from('members')
      .update({ full_name: name, phone })
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
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn" style={{ marginTop: 8 }}>{saved ? 'Saved ✓' : 'Save'}</button>
      </form>

      <div className="card">
        <div className="row">
          <span className="muted">Lifetime points</span>
          <strong>{member?.lifetime_points ?? 0}</strong>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
    </>
  );
}
