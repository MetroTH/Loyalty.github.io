import { useState } from 'react';
import { uploadImage } from '@loyalink/sdk';

interface Props {
  folder: string;
  maxWidth: number;
  format?: 'jpeg' | 'png';
  onUploaded: (url: string) => void;
}

// Upload button that resizes the image client-side then stores it in Supabase
// Storage and returns a public URL.
export function ImageUpload({ folder, maxWidth, format = 'jpeg', onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const url = await uploadImage(file, { folder, maxWidth, format });
      onUploaded(url);
    } catch (e) {
      setErr((e as Error).message || 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label className="btn btn-ghost" style={{ display: 'inline-block', cursor: 'pointer' }}>
        {busy ? 'Uploading…' : 'Upload image'}
        <input type="file" accept="image/*" onChange={onChange} disabled={busy} style={{ display: 'none' }} />
      </label>
      <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>
        auto-resized to {maxWidth}px wide
      </span>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
