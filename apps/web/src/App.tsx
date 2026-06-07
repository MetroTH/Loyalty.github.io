import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rewards from './pages/Rewards';
import Missions from './pages/Missions';
import News from './pages/News';
import Profile from './pages/Profile';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/news" element={<News />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
