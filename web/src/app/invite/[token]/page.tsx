'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

type Invite = {
  email: string;
  full_name: string;
  started_on: string;
  expired: boolean;
  accepted: boolean;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('Supabase is not configured yet.');
      return;
    }
    const supabase = createClient();
    supabase
      .rpc('lookup_invitation', { invite_token: token })
      .then(({ data, error: lookupError }) => {
        if (lookupError) {
          setError(lookupError.message);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setError('This invitation could not be found.');
          return;
        }
        setInvite(row as Invite);
      });
  }, [token]);

  async function accept() {
    const supabase = createClient();
    const { error: acceptError } = await supabase.rpc('accept_invitation', { invite_token: token });
    if (acceptError) throw new Error(acceptError.message);
    router.replace('/app');
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!invite) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: invite.email,
          password,
          options: { data: { full_name: invite.full_name } },
        });
        if (signUpError) throw new Error(signUpError.message);
        if (!data.session) {
          setInfo('Confirm the email, then open this invitation again and sign in.');
          setLoading(false);
          return;
        }
      }
      await accept();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the invitation.');
      setLoading(false);
    }
  }

  return (
    <main className="home">
      <div className="wordmark">
        <strong>LABAS.</strong>
        <span>PRIVATE</span>
      </div>
      <h1 style={{ fontSize: 48 }}>Your invitation.</h1>
      {invite ? (
        <>
          <p className="lede">
            {invite.full_name}, your 90-day program {invite.started_on < new Date().toISOString().slice(0, 10) ? 'began' : 'begins'} on {invite.started_on}. Choose a password for {invite.email}.
          </p>
          {invite.accepted ? <p className="lede">This invitation has already been used. Sign in instead.</p> : null}
          {invite.expired ? <p className="error">This invitation has expired. Ask your coach for a new one.</p> : null}
          {!invite.accepted && !invite.expired ? (
            <form className="form" onSubmit={onSubmit}>
              <input type="password" required minLength={8} autoComplete="new-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <p className={password.length > 0 && password.length < 8 ? 'error' : 'hint'}>
                {password.length > 0 && password.length < 8 ? 'Use at least 8 characters.' : 'At least 8 characters.'}
              </p>
              <button className="primary" type="submit" disabled={loading || password.length < 8}>
                {loading ? 'Opening…' : 'Create my private space'}
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <p className="lede">{error ? error : 'Looking up this invitation…'}</p>
      )}
      {error && invite ? <p className="error">{error}</p> : null}
      {info ? <p className="lede">{info}</p> : null}
      <p className="fine" style={{ textAlign: 'left' }}>
        <Link href="/login">I already have a password</Link>
      </p>
    </main>
  );
}
