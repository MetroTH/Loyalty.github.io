import { useEffect, useState } from 'react';
import { useTenant } from '@loyalink/theme';
import { fetchMissions, type Mission } from '@loyalink/sdk';

export default function Missions() {
  const tenant = useTenant();
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    fetchMissions(tenant.id).then(setMissions);
  }, [tenant.id]);

  return (
    <>
      <h3>Missions</h3>
      {missions.length === 0 && <p className="muted">No active missions right now.</p>}
      {missions.map((m) => (
        <div className="card" key={m.id}>
          <div className="row">
            <strong>{m.title}</strong>
            <span className="tier-pill">+{m.reward_points} pts</span>
          </div>
          {m.description && <p className="muted" style={{ fontSize: 13 }}>{m.description}</p>}
        </div>
      ))}
    </>
  );
}
