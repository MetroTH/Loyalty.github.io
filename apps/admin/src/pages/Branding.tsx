import { useEffect, useState } from 'react';
import { getSupabase } from '@loyalink/sdk';
import { applyTheme } from '@loyalink/theme';
import { useAdmin } from '../lib/admin';

export default function Branding() {
  const { tenant } = useAdmin();
  const [brandName, setBrandName] = useState('Logo');
  const [logoUrl, setLogoUrl] = useState('');
  const [primary, setPrimary] = useState('#4338ca');
  const [secondary, setSecondary] = useState('#0f766e');
  const [accent, setAccent] = useState('#b45309');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setBrandName(tenant.brand_name);
    setLogoUrl(tenant.logo_url ?? '');
    const c = tenant.theme.colors ?? {};
    if (c.primary) setPrimary(c.primary);
    if (c.secondary) setSecondary(c.secondary);
    if (c.accent) setAccent(c.accent);
  }, [tenant]);

  // Live preview
  useEffect(() => {
    applyTheme({ colors: { primary, secondary, accent } });
  }, [primary, secondary, accent]);

  async function save() {
    if (!tenant) return;
    const theme = { ...tenant.theme, colors: { ...tenant.theme.colors, primary, secondary, accent } };
    await getSupabase()
      .from('tenants')
      .update({ brand_name: brandName, logo_url: logoUrl || null, theme })
      .eq('id', tenant.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <h2>Branding (Whitelabel)</h2>
      <p className="muted">Replace the "Logo" placeholder with a real brand. Changes apply across the member app and admin.</p>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label className="label">Brand name</label>
          <input className="input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Logo URL (leave empty to show brand name text)</label>
          <input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
        <div className="inline">
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Primary</label>
            <input className="input" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Secondary</label>
            <input className="input" type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="label">Accent</label>
            <input className="input" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </div>
        </div>
        <button className="btn" onClick={save}>{saved ? 'Saved ✓' : 'Save branding'}</button>
      </div>
    </>
  );
}
