-- Loyalink — seed data for the default (whitelabel) tenant.
-- Brand name stays 'Logo' until a real brand is configured.

insert into public.tenants (slug, brand_name, theme)
values ('default', 'Logo', jsonb_build_object(
  'colors', jsonb_build_object(
    'primary', '#4338ca',
    'secondary', '#0f766e',
    'accent', '#b45309'
  ),
  'radius', '14px'
))
on conflict (slug) do nothing;

-- Tiers
insert into public.tiers (tenant_id, name, min_points, sort_order, benefits)
select t.id, x.name, x.min_points, x.sort_order, x.benefits
from public.tenants t
cross join (values
  ('Silver',   0,    1, '["Earn 1 pt / 1 THB"]'::jsonb),
  ('Gold',     1000, 2, '["Earn 1.25 pt / 1 THB","Birthday bonus"]'::jsonb),
  ('Platinum', 5000, 3, '["Earn 1.5 pt / 1 THB","Priority support","Exclusive rewards"]'::jsonb)
) as x(name, min_points, sort_order, benefits)
where t.slug = 'default'
  and not exists (select 1 from public.tiers ti where ti.tenant_id = t.id);

-- Default earn rule: 1 point per 1 currency unit on purchase
insert into public.earn_rules (tenant_id, name, event_type, points_per_unit, unit)
select t.id, 'Base earn', 'purchase', 1, 'currency'
from public.tenants t
where t.slug = 'default'
  and not exists (select 1 from public.earn_rules e where e.tenant_id = t.id);

-- Rewards
insert into public.rewards (tenant_id, title, description, cost_points, stock)
select t.id, x.title, x.description, x.cost_points, x.stock
from public.tenants t
cross join (values
  ('Free Coffee',      'Redeem for one regular coffee',        200, 100),
  ('100 THB Voucher',  'Discount voucher for your next visit', 500, 50),
  ('Tote Bag',         'Limited edition branded tote bag',     1500, 20)
) as x(title, description, cost_points, stock)
where t.slug = 'default'
  and not exists (select 1 from public.rewards r where r.tenant_id = t.id);

-- Mission
insert into public.missions (tenant_id, title, description, reward_points, goal)
select t.id, 'First Purchase', 'Make your first purchase to earn bonus points', 100,
       '{"event":"purchase","count":1}'::jsonb
from public.tenants t
where t.slug = 'default'
  and not exists (select 1 from public.missions m where m.tenant_id = t.id);

-- News
insert into public.news (tenant_id, title, body)
select t.id, 'Welcome to our loyalty program!',
       'Start earning points today and unlock exclusive rewards.'
from public.tenants t
where t.slug = 'default'
  and not exists (select 1 from public.news n where n.tenant_id = t.id);
