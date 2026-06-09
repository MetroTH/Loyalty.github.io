import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { BrandMark } from '@loyalink/theme';
import { useAdmin } from './lib/admin';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Members from './pages/Members';
import Rewards from './pages/Rewards';
import Missions from './pages/Missions';
import Campaigns from './pages/Campaigns';
import News from './pages/News';
import ApiKeys from './pages/ApiKeys';
import Branding from './pages/Branding';

const nav = [
  { to: '/', label: 'Overview', end: true },
  { to: '/members', label: 'Members' },
  { to: '/rewards', label: 'Rewards' },
  { to: '/missions', label: 'Missions' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/news', label: 'News' },
  { to: '/api-keys', label: 'API Keys' },
  { to: '/branding', label: 'Branding' },
];

export default function App() {
  const { session, isAdmin, loading, signOut } = useAdmin();

  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Login />;
  if (!isAdmin)
    return (
      <div className="center">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Your account is not an admin for this tenant.</p>
          <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1><BrandMark /> Admin</h1>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
          <a onClick={signOut} style={{ cursor: 'pointer', marginTop: 18 }}>Sign out</a>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/members" element={<Members />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/news" element={<News />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
