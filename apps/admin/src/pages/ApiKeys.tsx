import { useEffect, useState } from 'react';
import { getSupabase, type ApiKey } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return 'lk_live_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ApiKeys() {
  const { tenant } = useAdmin();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase()
      .from('api_keys')
      .select('id, name, key_prefix, scopes, rate_limit_per_min, active, last_used_at, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const token = randomToken();
    const key_hash = await sha256Hex(token);
    await getSupabase().from('api_keys').insert({
      tenant_id: tenant.id,
      name,
      key_prefix: token.slice(0, 16),
      key_hash,
      scopes: ['points:read', 'points:write'],
      rate_limit_per_min: 60,
    });
    setCreated(token);
    setName('');
    load();
  }

  async function revoke(id: string) {
    await getSupabase().from('api_keys').update({ active: false }).eq('id', id);
    load();
  }

  return (
    <>
      <h2>API Keys</h2>
      <div className="card">
        <form className="inline" onSubmit={create}>
          <div style={{ flex: 1 }}>
            <label className="label">Key name (e.g. "POS integration")</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn">Generate key</button>
        </form>
        {created && (
          <div style={{ marginTop: 14 }}>
            <p className="muted">Copy this key now — it won't be shown again:</p>
            <div className="codebox">{created}</div>
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Rate/min</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><code>{k.key_prefix}…</code></td>
                <td>{k.scopes.join(', ')}</td>
                <td>{k.rate_limit_per_min}</td>
                <td>{k.active ? <span className="pill">active</span> : <span className="muted">revoked</span>}</td>
                <td>{k.active && <button className="btn btn-ghost" onClick={() => revoke(k.id)}>Revoke</button>}</td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={6} className="muted">No keys yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
