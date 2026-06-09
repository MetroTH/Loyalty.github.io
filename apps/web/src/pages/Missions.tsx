import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import {
  fetchMissions,
  fetchMyMissionProgress,
  checkinMission,
  answerQuiz,
  spinMission,
  fetchMyTeam,
  teamCreate,
  teamJoin,
  teamContribute,
  type Mission,
  type MissionProgress,
  type Team,
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
  const { member, refreshMember } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});
  const [teams, setTeams] = useState<Record<string, Team | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [teamInput, setTeamInput] = useState<Record<string, string>>({});

  async function loadAll() {
    if (!member) return;
    const ms = await fetchMissions(tenant.id);
    setMissions(ms);
    const rows = await fetchMyMissionProgress(member.id);
    setProgress(Object.fromEntries(rows.map((r) => [r.mission_id, r])));
    const teamEntries = await Promise.all(
      ms.filter((m) => m.type === 'team').map(async (m) => [m.id, await fetchMyTeam(m.id, member.id)] as const),
    );
    setTeams(Object.fromEntries(teamEntries));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, member]);

  const today = new Date().toISOString().slice(0, 10);
  const setM = (id: string, text: string) => setMsg((p) => ({ ...p, [id]: text }));

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setM(id, '');
    try {
      await fn();
    } catch (e) {
      setM(id, (e as Error).message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h3>Missions</h3>
      {missions.length === 0 && <p className="muted">No active missions right now.</p>}

      {missions.map((m) => {
        const g = (m.goal ?? {}) as Record<string, unknown>;
        const p = progress[m.id];
        const done = p?.status === 'completed' || p?.status === 'claimed';

        // CHECK-IN
        if (m.type === 'checkin') {
          const goalDays = Number(g.days ?? 7);
          const streak = p?.streak ?? 0;
          const checkedToday = p?.last_event_date === today;
          return (
            <div className="card" key={m.id}>
              <div className="row"><strong>🔥 {m.title}</strong><span className="tier-pill">+{m.reward_points} pts</span></div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              <p className="muted" style={{ fontSize: 13 }}>Streak {Math.min(streak, goalDays)}/{goalDays} days</p>
              <Bar value={Math.min(streak, goalDays)} max={goalDays} />
              <button className="btn" style={{ marginTop: 12 }} disabled={busy === m.id || checkedToday || done}
                onClick={() => run(m.id, async () => { await checkinMission(m.id); await loadAll(); await refreshMember(); })}>
                {done ? 'Completed ✓' : checkedToday ? 'Checked in today' : busy === m.id ? 'Checking…' : 'Check in today'}
              </button>
              {msg[m.id] && <p className="muted" style={{ fontSize: 13 }}>{msg[m.id]}</p>}
            </div>
          );
        }

        // STAMP
        if (m.type === 'stamp') {
          const goalCount = Number(g.count ?? 1);
          const count = Math.min(p?.count ?? 0, goalCount);
          return (
            <div className="card" key={m.id}>
              <div className="row"><strong>🎟️ {m.title}</strong><span className="tier-pill">+{m.reward_points} pts</span></div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              <p className="muted" style={{ fontSize: 13 }}>{count}/{goalCount} {done ? '— completed ✓' : ''}</p>
              <Bar value={count} max={goalCount} />
            </div>
          );
        }

        // QUIZ
        if (m.type === 'quiz') {
          const options = (g.options as string[]) ?? [];
          return (
            <div className="card" key={m.id}>
              <div className="row"><strong>❓ {m.title}</strong><span className="tier-pill">+{m.reward_points} pts</span></div>
              <p style={{ fontSize: 14 }}>{String(g.question ?? '')}</p>
              {done ? (
                <p className="badge">Completed ✓</p>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {options.map((opt, i) => (
                    <button key={i} className="btn btn-ghost" disabled={busy === m.id}
                      onClick={() => run(m.id, async () => {
                        const res = await answerQuiz(m.id, i);
                        await loadAll(); await refreshMember();
                        setM(m.id, res.status === 'completed' ? 'Correct! 🎉' : 'Not quite — try again');
                      })}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {msg[m.id] && <p className="muted" style={{ fontSize: 13 }}>{msg[m.id]}</p>}
            </div>
          );
        }

        // SPIN
        if (m.type === 'spin') {
          const spunToday = p?.last_event_date === today;
          return (
            <div className="card" key={m.id}>
              <div className="row"><strong>🎡 {m.title}</strong></div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              <button className="btn" style={{ marginTop: 8 }} disabled={busy === m.id || spunToday}
                onClick={() => run(m.id, async () => {
                  const prize = await spinMission(m.id);
                  await loadAll(); await refreshMember();
                  setM(m.id, `You won: ${prize.label}${prize.points ? ` (+${prize.points} pts)` : ''} 🎉`);
                })}>
                {spunToday ? 'Come back tomorrow' : busy === m.id ? 'Spinning…' : 'Spin!'}
              </button>
              {msg[m.id] && <p style={{ fontSize: 14, fontWeight: 700 }}>{msg[m.id]}</p>}
            </div>
          );
        }

        // TEAM
        if (m.type === 'team') {
          const goalCount = Number(g.count ?? 1);
          const team = teams[m.id];
          const contributedToday = false; // server enforces; show generic
          return (
            <div className="card" key={m.id}>
              <div className="row"><strong>🤝 {m.title}</strong><span className="tier-pill">+{m.reward_points} pts</span></div>
              {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
              {!team ? (
                <div className="stack" style={{ gap: 10, marginTop: 8 }}>
                  <input className="input" placeholder="Team name to create" value={teamInput[`${m.id}-name`] ?? ''}
                    onChange={(e) => setTeamInput((p) => ({ ...p, [`${m.id}-name`]: e.target.value }))} />
                  <button className="btn" disabled={busy === m.id}
                    onClick={() => run(m.id, async () => { await teamCreate(m.id, teamInput[`${m.id}-name`] || 'My Team'); await loadAll(); })}>
                    Create team
                  </button>
                  <div className="row" style={{ gap: 8 }}>
                    <input className="input" placeholder="Join code" value={teamInput[`${m.id}-code`] ?? ''}
                      onChange={(e) => setTeamInput((p) => ({ ...p, [`${m.id}-code`]: e.target.value }))} />
                    <button className="btn btn-ghost" disabled={busy === m.id}
                      onClick={() => run(m.id, async () => { await teamJoin(m.id, teamInput[`${m.id}-code`] || ''); await loadAll(); })}>
                      Join
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Team <strong>{team.name}</strong> · code <strong>{team.code}</strong>
                  </p>
                  <p className="muted" style={{ fontSize: 13 }}>
                    {Math.min(team.count, goalCount)}/{goalCount} {team.status === 'completed' ? '— completed ✓' : ''}
                  </p>
                  <Bar value={Math.min(team.count, goalCount)} max={goalCount} />
                  <button className="btn" style={{ marginTop: 12 }} disabled={busy === m.id || team.status === 'completed' || contributedToday}
                    onClick={() => run(m.id, async () => { await teamContribute(m.id); await loadAll(); })}>
                    {team.status === 'completed' ? 'Completed ✓' : busy === m.id ? 'Contributing…' : 'Contribute today'}
                  </button>
                </>
              )}
              {msg[m.id] && <p className="muted" style={{ fontSize: 13 }}>{msg[m.id]}</p>}
            </div>
          );
        }

        // BASIC
        return (
          <div className="card" key={m.id}>
            <div className="row"><strong>{m.title}</strong><span className="tier-pill">+{m.reward_points} pts</span></div>
            {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
          </div>
        );
      })}
    </>
  );
}
