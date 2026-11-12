'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Invite = {
  id: string;
  email: string;
  full_name: string;
  token: string;
  started_on: string;
  expires_at: string;
  accepted_at: string | null;
};

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function Invites({ appUrl }: { appUrl: string }) {
  const [rows, setRows] = useState<Invite[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [startedOn, setStartedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error: loadError } = await createClient()
      .from('invitations')
      .select('id, email, full_name, token, started_on, expires_at, accepted_at')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setRows((data ?? []) as Invite[]);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load invitations.'));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setLink(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Sign in again.');
      setSaving(false);
      return;
    }
    const token = makeToken();
    const { error: insertError } = await supabase.from('invitations').insert({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      token,
      coach_id: user.id,
      started_on: startedOn,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setLink(`${appUrl}/invite/${token}`);
    setFullName('');
    setEmail('');
    await load();
  }

  return (
    <>
      <form className="panel" onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        <strong>New invitation</strong>
        <input required placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        <input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="muted" htmlFor="start">Program start</label>
        <input id="start" required type="date" value={startedOn} onChange={(event) => setStartedOn(event.target.value)} />
        <button className="primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create link'}</button>
        {link ? (
          <div className="link-box">
            Send this private link. It expires in 30 days.
            <div>{link}</div>
            <button className="ghost" type="button" style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(link)}>
              Copy
            </button>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </form>
      <table style={{ marginTop: 22 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Starts</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="muted">No invitations yet.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.full_name}</td>
                <td>{row.email}</td>
                <td>{row.started_on}</td>
                <td>{row.accepted_at ? 'Accepted' : new Date(row.expires_at) < new Date() ? 'Expired' : 'Waiting'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
