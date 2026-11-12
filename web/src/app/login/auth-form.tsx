'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [creating, setCreating] = useState(params.get('create') === '1');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ready = hasSupabaseEnv();

  function switchMode(next: boolean) {
    setCreating(next);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const address = email.trim();

    if (creating) {
      const redirect = process.env.NEXT_PUBLIC_APP_URL;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: address,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: redirect ? `${redirect}/login` : undefined,
        },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('An account with this email already exists. Sign in instead.');
        return;
      }
      if (!data.session) {
        setInfo('Check your email to confirm the account, then sign in.');
        setCreating(false);
        return;
      }
      router.replace('/app');
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace('/app');
    router.refresh();
  }

  const passwordTooShort = creating && password.length > 0 && password.length < 8;
  const emailReady = email.trim().includes('@');
  const canSubmit =
    !loading &&
    emailReady &&
    password.length > 0 &&
    (!creating || (name.trim().length > 0 && password.length >= 8));
  const hint = passwordTooShort
    ? 'Use at least 8 characters.'
    : creating && password.length >= 8 && name.trim().length === 0
      ? 'Add your name.'
      : creating && password.length >= 8 && name.trim().length > 0 && !emailReady
        ? 'Add a valid email.'
        : !creating && password.length > 0 && !emailReady
          ? 'Add a valid email.'
          : !creating && emailReady && password.length === 0
            ? 'Enter your password.'
            : creating
              ? 'At least 8 characters.'
              : null;

  return (
    <main className="home">
      <div className="wordmark">
        <strong>LABAS.</strong>
        <span>PRIVATE</span>
      </div>
      <h1 style={{ fontSize: 48 }}>{creating ? 'Create your space.' : 'Welcome back.'}</h1>
      <p className="lede">
        {creating
          ? 'Use your email and a password. Your ninety days begin when the account is open.'
          : 'Sign in with the email and password for your private space.'}
      </p>
      {ready ? (
        <form className="form" onSubmit={onSubmit}>
          {creating ? (
            <input
              required
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            required
            minLength={creating ? 8 : 1}
            autoComplete={creating ? 'new-password' : 'current-password'}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {hint ? <p className={hint === 'At least 8 characters.' || hint === 'Enter your password.' ? 'hint' : 'error'}>{hint}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="lede">{info}</p> : null}
          <button className="primary" type="submit" disabled={!canSubmit}>
            {loading ? (creating ? 'Creating…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
          </button>
          <button className="texty" type="button" onClick={() => switchMode(!creating)}>
            {creating ? 'I already have an account' : 'Create an account'}
          </button>
        </form>
      ) : (
        <p className="lede">Add Supabase keys to web/.env.local before creating an account.</p>
      )}
      <div className="actions">
        <Link className="secondary" href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
