import { useState } from 'react';
import { BrandMark } from '@loyalink/theme';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendOtp(email.trim());
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyOtp(email.trim(), token.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="content center">
        <div style={{ width: '100%' }}>
          <BrandMark className="brand" />
          <h2>Welcome</h2>
          <p className="muted">Sign in to view your points and rewards.</p>

          {step === 'email' ? (
            <form onSubmit={submitEmail} className="stack" style={{ marginTop: 20 }}>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="error">{error}</p>}
              <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="stack" style={{ marginTop: 20 }}>
              <label className="label">Enter the 6-digit code sent to {email}</label>
              <input
                className="input code"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="••••••"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              {error && <p className="error">{error}</p>}
              <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('email')}>
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
