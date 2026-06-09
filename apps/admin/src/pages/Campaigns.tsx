import { useEffect, useState } from 'react';
import { getSupabase } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export default function Campaigns() {
  const { tenant } = useAdmin();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ title: '', description: '', starts_at: '', ends_at: '' });

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase()
      .from('campaigns')
      .select('id, title, description, starts_at, ends_at, active')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setCampaigns((data as Campaign[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    await getSupabase().from('campaigns').insert({
      tenant_id: tenant.id,
      title: form.title,
      description: form.description || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    });
    setForm({ title: '', description: '', starts_at: '', ends_at: '' });
    load();
  }

  async function toggle(c: Campaign) {
    await getSupabase().from('campaigns').update({ active: !c.active }).eq('id', c.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this campaign?')) return;
    await getSupabase().from('campaigns').delete().eq('id', id);
    load();
  }

  return (
    <>
      <h2>Campaigns</h2>
      <div className="card">
        <form onSubmit={add}>
          <div className="field">
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="inline">
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Starts</label>
              <input className="input" type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Ends</label>
              <input className="input" type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <button className="btn">Add campaign</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Period</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td className="muted">
                  {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} →{' '}
                  {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : '—'}
                </td>
                <td>{c.active ? <span className="pill">active</span> : <span className="muted">hidden</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" onClick={() => toggle(c)}>{c.active ? 'Hide' : 'Show'}</button>{' '}
                  <button className="btn btn-ghost" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && <tr><td colSpan={4} className="muted">No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
