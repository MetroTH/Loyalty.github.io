import { useState } from 'react';
import { BrandMark } from '@loyalink/theme';
import { useAdmin } from '../lib/admin';

export default function Login() {
  const { sendOtp, verifyOtp } = useAdmin();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>, next?: () => void) {
    setError('');
    setBusy(true);
    try {
      await fn();
      next?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <div className="card" style={{ width: 360 }}>
        <h1><BrandMark /> Admin</h1>
        {step === 'email' ? (
          <>
            <div className="field">
              <label className="label">Admin email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" disabled={busy} onClick={() => run(() => sendOtp(email.trim()), () => setStep('otp'))}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label className="label">6-digit code sent to {email}</label>
              <input className="input" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" disabled={busy} onClick={() => run(() => verifyOtp(email.trim(), token.trim()))}>
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
