import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import {
  fetchMissions,
  fetchMyMissionProgress,
  checkinMission,
  type Mission,
  type MissionProgress,
} from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div style={{ background: 'color-mix(in srgb, var(--color-foreground) 12%, transparent)', borderRadius: 999, height: 8, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)' }} />
    </div>
  );
}

export default function Missions() {
  const tenant = useTenant();
  const { member } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function loadProgress() {
    if (!member) return;
    const rows = await fetchMyMissionProgress(member.id);
    setProgress(Object.fromEntries(rows.map((r) => [r.mission_id, r])));
  }

  useEffect(() => {
    fetchMissions(tenant.id).then(setMissions);
    loadProgress();
  }, [tenant.id, member]);

  const today = new Date().toISOString().slice(0, 10);

  async function checkin(m: Mission) {
    setBusy(m.id);
    setMsg('');
    try {
      await checkinMission(m.id);
      await loadProgress();
      setMsg('Checked in! 🎉');
    } catch (e) {
      setMsg((e as Error).message || 'Check-in failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h3>Missions</h3>
      {msg && <p className="muted">{msg}</p>}
      {missions.length === 0 && <p className="muted">No active missions right now.</p>}

      {missions.map((m) => {
        const p = progress[m.id];
        const done = p?.status === 'completed' || p?.status === 'claimed';

        if (m.type === 'checkin') {
          const goalDays = Number(m.goal?.days ?? 7);
          const streak = p?.streak ?? 0;
          const checkedToday = p?.last_event_date === today;
          return (
            <div className="card" key={m.id}>
              <div className="row">
                <strong>🔥 {m.title}</strong>
                <span className="tier-pill">+{m.reward_points} pts</span>
              </div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              <p className="muted" style={{ fontSize: 13 }}>Streak {Math.min(streak, goalDays)}/{goalDays} days</p>
              <Bar value={Math.min(streak, goalDays)} max={goalDays} />
              <button
                className="btn"
                style={{ marginTop: 12 }}
                disabled={busy === m.id || checkedToday || done}
                onClick={() => checkin(m)}
              >
                {done ? 'Completed ✓' : checkedToday ? 'Checked in today' : busy === m.id ? 'Checking…' : 'Check in today'}
              </button>
            </div>
          );
        }

        if (m.type === 'stamp') {
          const goalCount = Number(m.goal?.count ?? 1);
          const count = Math.min(p?.count ?? 0, goalCount);
          return (
            <div className="card" key={m.id}>
              <div className="row">
                <strong>🎟️ {m.title}</strong>
                <span className="tier-pill">+{m.reward_points} pts</span>
              </div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              <p className="muted" style={{ fontSize: 13 }}>{count}/{goalCount} {done ? '— completed ✓' : ''}</p>
              <Bar value={count} max={goalCount} />
            </div>
          );
        }

        // basic
        return (
          <div className="card" key={m.id}>
            <div className="row">
              <strong>{m.title}</strong>
              <span className="tier-pill">+{m.reward_points} pts</span>
            </div>
            {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
          </div>
        );
      })}
    </>
  );
}
