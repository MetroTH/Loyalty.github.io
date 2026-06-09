import { useEffect, useState } from 'react';
import { getSupabase, type Mission } from '@loyalink/sdk';
import { useAdmin } from '../lib/admin';

const TYPE_LABEL: Record<string, string> = {
  basic: 'Basic',
  checkin: 'Daily check-in',
  stamp: 'Stamp / N times',
  quiz: 'Quiz',
  spin: 'Spin wheel',
  team: 'Team',
};

const emptyForm = {
  title: '',
  description: '',
  reward_points: 100,
  type: 'checkin',
  goalValue: 7,
  question: '',
  optionsText: '',
  answerIndex: 0,
  prizesText: '50 pts,50,1\n100 pts,100,1\nJackpot,500,0.2',
};

export default function Missions() {
  const { tenant } = useAdmin();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  async function load() {
    if (!tenant) return;
    const { data } = await getSupabase()
      .from('missions')
      .select('id, title, description, reward_points, active, type, goal, image_url')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setMissions((data as Mission[]) ?? []);
  }
  useEffect(() => { load(); }, [tenant]);

  function buildGoal(): Record<string, unknown> {
    switch (form.type) {
      case 'checkin': return { days: Number(form.goalValue) };
      case 'stamp': return { count: Number(form.goalValue), source: 'purchase' };
      case 'team': return { count: Number(form.goalValue) };
      case 'quiz':
        return {
          question: form.question,
          options: form.optionsText.split(',').map((s) => s.trim()).filter(Boolean),
          answer: Number(form.answerIndex),
        };
      case 'spin':
        return {
          prizes: form.prizesText
            .split('\n')
            .map((line) => line.split(','))
            .filter((c) => c[0]?.trim())
            .map((c) => ({ label: c[0].trim(), points: Number(c[1] ?? 0), weight: Number(c[2] ?? 1) })),
        };
      default: return {};
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError('');
    const { error } = await getSupabase().from('missions').insert({
      tenant_id: tenant.id,
      title: form.title,
      description: form.description || null,
      reward_points: Number(form.reward_points),
      type: form.type,
      goal: buildGoal(),
    });
    if (error) { setError(error.message); return; }
    setForm({ ...emptyForm });
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

  const usesGoalValue = ['checkin', 'stamp', 'team'].includes(form.type);
  const goalLabel = form.type === 'checkin' ? 'Days in a row' : form.type === 'team' ? 'Team goal (count)' : 'Times required';

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
          <div className="inline">
            <div className="field" style={{ flex: 2 }}>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="checkin">Daily check-in (streak)</option>
                <option value="stamp">Stamp / do N times (auto from purchases)</option>
                <option value="quiz">Quiz (answer a question)</option>
                <option value="spin">Spin wheel (random prize)</option>
                <option value="team">Team challenge (shared goal)</option>
                <option value="basic">Basic (info only)</option>
              </select>
            </div>
            {usesGoalValue && (
              <div className="field" style={{ flex: 1 }}>
                <label className="label">{goalLabel}</label>
                <input className="input" type="number" min={1} value={form.goalValue} onChange={(e) => setForm({ ...form, goalValue: Number(e.target.value) })} />
              </div>
            )}
          </div>

          {form.type === 'quiz' && (
            <>
              <div className="field">
                <label className="label">Question</label>
                <input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div className="inline">
                <div className="field" style={{ flex: 3 }}>
                  <label className="label">Options (comma-separated)</label>
                  <input className="input" placeholder="Red, Green, Blue" value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Correct index (0-based)</label>
                  <input className="input" type="number" min={0} value={form.answerIndex} onChange={(e) => setForm({ ...form, answerIndex: Number(e.target.value) })} />
                </div>
              </div>
            </>
          )}

          {form.type === 'spin' && (
            <div className="field">
              <label className="label">Prizes — one per line: label,points,weight</label>
              <textarea className="input" rows={4} value={form.prizesText} onChange={(e) => setForm({ ...form, prizesText: e.target.value })} />
            </div>
          )}

          <div className="field">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn">Add mission</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Reward</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {missions.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td>{TYPE_LABEL[m.type] ?? m.type}</td>
                <td>+{m.reward_points}</td>
                <td>{m.active ? <span className="pill">active</span> : <span className="muted">hidden</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" onClick={() => toggle(m)}>{m.active ? 'Hide' : 'Show'}</button>{' '}
                  <button className="btn btn-ghost" onClick={() => remove(m.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {missions.length === 0 && <tr><td colSpan={5} className="muted">No missions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
