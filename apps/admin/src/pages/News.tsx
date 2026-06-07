import { useEffect, useState } from 'react';
import { getSupabase, type NewsItem } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

export default function News() {
  const { tenant } = useAdmin();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [form, setForm] = useState({ title: '', body: '' });

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase()
      .from('news')
      .select('id, title, body, image_url, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setNews((data as NewsItem[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    await getSupabase().from('news').insert({ tenant_id: tenant.id, title: form.title, body: form.body });
    setForm({ title: '', body: '' });
    load();
  }

  async function remove(id: string) {
    await getSupabase().from('news').delete().eq('id', id);
    load();
  }

  return (
    <>
      <h2>News</h2>
      <div className="card">
        <form onSubmit={add}>
          <div className="field">
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Body</label>
            <textarea className="input" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <button className="btn">Publish</button>
        </form>
      </div>

      {news.map((n) => (
        <div className="card row" key={n.id}>
          <div>
            <strong>{n.title}</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>{n.body}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => remove(n.id)}>Delete</button>
        </div>
      ))}
    </>
  );
}
