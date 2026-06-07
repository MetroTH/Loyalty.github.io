import { useEffect, useState } from 'react';
import { getSupabase, type Member } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

export default function Members() {
  const { tenant } = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!tenant) return;
    getSupabase()
      .from('members')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMembers((data as Member[]) ?? []));
  }, [tenant]);

  return (
    <>
      <h2>Members</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th>Phone</th><th>Email</th><th>Balance</th><th>Lifetime</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.phone ?? '—'}</td>
                <td>{m.email ?? '—'}</td>
                <td>{m.points_balance}</td>
                <td>{m.lifetime_points}</td>
                <td>{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={5} className="muted">No members yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
