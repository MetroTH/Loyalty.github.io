import { useEffect, useState } from 'react';
import { getSupabase, type Reward } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

export default function Rewards() {
  const { tenant } = useAdmin();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState({ title: '', cost_points: 100, stock: '' });

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase().from('rewards').select('*').eq('tenant_id', tenant.id).order('cost_points');
    setRewards((data as Reward[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    await getSupabase().from('rewards').insert({
      tenant_id: tenant.id,
      title: form.title,
      cost_points: Number(form.cost_points),
      stock: form.stock === '' ? null : Number(form.stock),
    });
    setForm({ title: '', cost_points: 100, stock: '' });
    load();
  }

  async function toggle(r: Reward) {
    await getSupabase().from('rewards').update({ active: !r.active }).eq('id', r.id);
    load();
  }

  return (
    <>
      <h2>Rewards</h2>
      <div className="card">
        <form className="inline" onSubmit={add}>
          <div style={{ flex: 2 }}>
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Cost (pts)</label>
            <input className="input" type="number" value={form.cost_points} onChange={(e) => setForm({ ...form, cost_points: Number(e.target.value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Stock</label>
            <input className="input" type="number" placeholder="∞" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <button className="btn">Add</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Cost</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.cost_points}</td>
                <td>{r.stock ?? '∞'}</td>
                <td>{r.active ? <span className="pill">active</span> : <span className="muted">hidden</span>}</td>
                <td><button className="btn btn-ghost" onClick={() => toggle(r)}>{r.active ? 'Hide' : 'Show'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
