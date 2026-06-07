import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BrandMark } from '@loyalink/theme';

const tabs = [
  { to: '/', icon: '🏠', label: 'Home', end: true },
  { to: '/rewards', icon: '🎁', label: 'Rewards' },
  { to: '/missions', icon: '🎯', label: 'Missions' },
  { to: '/news', icon: '📰', label: 'News' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <div className="topbar">
        <BrandMark className="brand" />
        <span className="badge">Member</span>
      </div>
      <div className="content">{children}</div>
      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ic">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
