import { useState } from 'react';
import { BrandMark } from '@loyalink/theme';
import { getSupabase, friendlyError } from '@loyalink/sdk';
import { useAuth } from '../lib/auth';

// Shown once after first sign-in to collect member profile + PDPA consent.
export default function Onboarding() {
  const { member, refreshMember, signOut } = useAuth();
  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [company, setCompany] = useState(member?.company ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [address, setAddress] = useState(member?.address ?? '');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (!consent) {
      setError('Please accept the privacy policy to continue.');
      return;
    }
    setError('');
    setBusy(true);
    const { error } = await getSupabase()
      .from('members')
      .update({
        full_name: fullName.trim(),
        company: company.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        pdpa_consent: true,
        pdpa_consent_at: new Date().toISOString(),
      })
      .eq('id', member.id);
    setBusy(false);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    await refreshMember();
  }

  return (
    <div className="app">
      <div className="content">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <BrandMark className="brand" />
        </div>
        <h2>Complete your profile</h2>
        <p className="muted">We need a few details to set up your membership.</p>

        <form className="card stack" onSubmit={submit}>
          <div>
            <label className="label">Full name *</label>
            <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Telephone (for OTP / contact)</label>
            <input
              className="input"
              inputMode="tel"
              placeholder="+66..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <label className="row" style={{ alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <span className="muted" style={{ fontSize: 13 }}>
              I consent to the collection and use of my personal data for this loyalty
              program in accordance with the privacy policy (PDPA).
            </span>
          </label>

          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
          <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </form>
      </div>
    </div>
  );
}
