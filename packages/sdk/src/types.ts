// Shared domain types for Loyalink (kept in sync with the DB schema).

export interface Tenant {
  id: string;
  slug: string;
  brand_name: string;
  logo_url: string | null;
  theme: TenantTheme;
  settings: Record<string, unknown>;
}

export interface TenantTheme {
  colors?: {
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    foreground?: string;
    muted?: string;
  };
  radius?: string;
  font?: string;
}

export interface Tier {
  id: string;
  tenant_id: string;
  name: string;
  min_points: number;
  benefits: string[];
  sort_order: number;
}

export interface Member {
  id: string;
  tenant_id: string;
  user_id: string | null;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  company: string | null;
  address: string | null;
  pdpa_consent: boolean;
  points_balance: number;
  lifetime_points: number;
  tier_id: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  member_id: string;
  delta: number;
  kind: 'earn' | 'burn' | 'adjust' | 'expire';
  reason: string | null;
  reference: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  stock: number | null;
  active: boolean;
}

export interface Redemption {
  id: string;
  reward_id: string;
  cost_points: number;
  code: string;
  status: 'issued' | 'used' | 'expired' | 'cancelled';
  created_at: string;
  reward_title: string | null;
  reward?: { title: string; image_url: string | null } | null;
}

export interface Mission {
  id: string;
  title: string;
  description: string | null;
  reward_points: number;
  active: boolean;
  type: 'basic' | 'checkin' | 'stamp' | string;
  goal: Record<string, unknown>;
  image_url: string | null;
}

export interface MissionProgress {
  id: string;
  mission_id: string;
  member_id: string;
  count: number;
  streak: number;
  last_event_date: string | null;
  status: 'in_progress' | 'completed' | 'claimed';
  completed_at: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}
