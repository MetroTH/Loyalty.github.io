import { useEffect, useState } from 'react';
import { getSupabase, type Reward } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

interface FormState {
  id: string | null;
  title: string;
  description: string;
  image_url: string;
  cost_points: number;
  stock: string;
}

const empty: FormState = { id: null, title: '', description: '', image_url: '', cost_points: 100, stock: '' };

export default function Rewards() {
  const { tenant } = useAdmin();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase().from('rewards').select('*').eq('tenant_id', tenant.id).order('cost_points');
    setRewards((data as Reward[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError('');
    const payload = {
      tenant_id: tenant.id,
      title: form.title,
      description: form.description || null,
      image_url: form.image_url || null,
      cost_points: Number(form.cost_points),
      stock: form.stock === '' ? null : Number(form.stock),
    };
    const sb = getSupabase();
    const { error } = form.id
      ? await sb.from('rewards').update(payload).eq('id', form.id)
      : await sb.from('rewards').insert(payload);
    if (error) { setError(error.message); return; }
    setForm(empty);
    load();
  }

  function edit(r: Reward) {
    setForm({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      image_url: r.image_url ?? '',
      cost_points: r.cost_points,
      stock: r.stock == null ? '' : String(r.stock),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggle(r: Reward) {
    await getSupabase().from('rewards').update({ active: !r.active }).eq('id', r.id);
    load();
  }

  async function remove(r: Reward) {
    if (!confirm(`Delete reward "${r.title}"?`)) return;
    const { error } = await getSupabase().from('rewards').delete().eq('id', r.id);
    if (error) {
      // Likely referenced by existing redemptions (FK). Suggest hiding instead.
      setError(`Cannot delete "${r.title}" — it has been redeemed before. Use "Hide" instead.`);
      return;
    }
    setError('');
    load();
  }

  return (
    <>
      <h2>Rewards</h2>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit reward' : 'Add reward'}</h3>
        <form onSubmit={submit}>
          <div className="inline">
            <div className="field" style={{ flex: 2 }}>
              <label className="label">Title</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Cost (pts)</label>
              <input className="input" type="number" value={form.cost_points} onChange={(e) => setForm({ ...form, cost_points: Number(e.target.value) })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Stock</label>
              <input className="input" type="number" placeholder="∞" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Image URL</label>
            <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Recommended: landscape image ~600×360 px (JPG/PNG). Shown at 140 px tall in the member app. Keep under ~300 KB.
            </p>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn">{form.id ? 'Save changes' : 'Add reward'}</button>
          {form.id && (
            <button type="button" className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setForm(empty)}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th></th><th>Title</th><th>Cost</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.image_url ? (
                    <img src={r.image_url} alt="" style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{r.title}</td>
                <td>{r.cost_points}</td>
                <td>{r.stock ?? '∞'}</td>
                <td>{r.active ? <span className="pill">active</span> : <span className="muted">hidden</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" onClick={() => edit(r)}>Edit</button>{' '}
                  <button className="btn btn-ghost" onClick={() => toggle(r)}>{r.active ? 'Hide' : 'Show'}</button>{' '}
                  <button className="btn btn-ghost" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
