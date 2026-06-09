import { useEffect, useState } from 'react';
import { getSupabase } from '@loyalink/sdk';
import { applyTheme } from '@loyalink/theme';
import { useAdmin } from '../lib/admin';
import { ImageUpload } from '../components/ImageUpload';

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
          <label className="label">Logo (leave empty to show brand name text)</label>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="logo preview"
              style={{ maxHeight: 40, maxWidth: 180, objectFit: 'contain', display: 'block', marginBottom: 8 }}
            />
          )}
          <input
            className="input"
            placeholder="Paste a logo URL, or upload below"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <ImageUpload folder="logos" maxWidth={400} maxHeight={400} format="png" onUploaded={setLogoUrl} />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Square or rectangular logos both work — auto-resized (PNG, keeps transparency) and
            displayed up to 40 px tall / 180 px wide.
          </p>
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
