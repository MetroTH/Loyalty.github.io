import { useEffect, useState } from 'react';
import { getSupabase, type Mission } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

export default function Missions() {
  const { tenant } = useAdmin();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [form, setForm] = useState({ title: '', description: '', reward_points: 100 });

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase()
      .from('missions')
      .select('id, title, description, reward_points, active')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setMissions((data as Mission[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    await getSupabase().from('missions').insert({
      tenant_id: tenant.id,
      title: form.title,
      description: form.description || null,
      reward_points: Number(form.reward_points),
    });
    setForm({ title: '', description: '', reward_points: 100 });
    load();
  }

  async function toggle(m: Mission) {
    await getSupabase().from('missions').update({ active: !m.active }).eq('id', m.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this mission?')) return;
    await getSupabase().from('missions').delete().eq('id', id);
    load();
  }

  return (
    <>
      <h2>Missions</h2>
      <div className="card">
        <form onSubmit={add}>
          <div className="inline">
            <div className="field" style={{ flex: 2 }}>
              <label className="label">Title</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Reward (pts)</label>
              <input className="input" type="number" value={form.reward_points} onChange={(e) => setForm({ ...form, reward_points: Number(e.target.value) })} />
            </div>
          </div>
          <div className="field">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn">Add mission</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Reward</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {missions.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td>+{m.reward_points}</td>
                <td>{m.active ? <span className="pill">active</span> : <span className="muted">hidden</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" onClick={() => toggle(m)}>{m.active ? 'Hide' : 'Show'}</button>{' '}
                  <button className="btn btn-ghost" onClick={() => remove(m.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {missions.length === 0 && <tr><td colSpan={4} className="muted">No missions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
