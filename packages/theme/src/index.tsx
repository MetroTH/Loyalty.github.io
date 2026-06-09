import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchTenant, type Tenant, type TenantTheme } from '@loyalink/sdk';

// Default brand-neutral theme. brandName stays "Logo" until a tenant overrides.
const DEFAULT_TENANT: Tenant = {
  id: 'default',
  slug: 'default',
  brand_name: 'Logo',
  logo_url: null,
  theme: {
    colors: {
      primary: '#4338ca',
      primaryForeground: '#ffffff',
      secondary: '#0f766e',
      accent: '#b45309',
      background: '#0b1020',
      surface: '#11182f',
      foreground: '#e8ecf6',
      muted: '#8b93a7',
    },
    radius: '14px',
    font: 'Inter, system-ui, sans-serif',
  },
  settings: {},
};

const TenantContext = createContext<Tenant>(DEFAULT_TENANT);

export const useTenant = () => useContext(TenantContext);

/** Inject the tenant theme as CSS variables on :root. */
export function applyTheme(theme: TenantTheme) {
  const root = document.documentElement;
  const c = { ...DEFAULT_TENANT.theme.colors, ...(theme.colors ?? {}) };
  const set = (k: string, v?: string) => v && root.style.setProperty(k, v);
  set('--color-primary', c.primary);
  set('--color-primary-foreground', c.primaryForeground);
  set('--color-secondary', c.secondary);
  set('--color-accent', c.accent);
  set('--color-background', c.background);
  set('--color-surface', c.surface);
  set('--color-foreground', c.foreground);
  set('--color-muted', c.muted);
  set('--radius', theme.radius ?? DEFAULT_TENANT.theme.radius);
  set('--font', theme.font ?? DEFAULT_TENANT.theme.font);
}

/** Loads the active tenant, applies its theme, and provides it via context. */
export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT);

  useEffect(() => {
    applyTheme(DEFAULT_TENANT.theme);
    fetchTenant()
      .then((t) => {
        if (t) {
          const merged = { ...t, theme: { ...DEFAULT_TENANT.theme, ...t.theme } };
          setTenant(merged);
          applyTheme(merged.theme);
        }
      })
      .catch(() => {
        /* offline / not configured — keep brand-neutral defaults */
      });
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** Brand mark: shows the tenant logo image, or the brand name text ("Logo"). */
export function BrandMark({ className }: { className?: string }) {
  const tenant = useTenant();
  if (tenant.logo_url) {
    return (
      <img
        src={tenant.logo_url}
        alt={tenant.brand_name}
        className={className}
        style={{
          maxHeight: '40px',
          maxWidth: '180px',
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    );
  }
  return (
    <span
      className={className}
      style={{
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--color-primary)',
      }}
    >
      {tenant.brand_name}
    </span>
  );
}
