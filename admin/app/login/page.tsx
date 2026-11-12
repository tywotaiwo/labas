'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Could not sign in.');
      setLoading(false);
      return;
    }
    const { data: adminProfile } = await supabase.from('admins').select('role').eq('id', data.user.id).maybeSingle();
    if (!adminProfile || !['coach', 'admin', 'super_admin'].includes(adminProfile.role || '')) {
      await supabase.auth.signOut();
      setError('This account is not a coach.');
      setLoading(false);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <main className="auth">
      <p className="brand">LABAS.</p>
      <p className="muted" style={{ letterSpacing: '0.28em', fontSize: 12 }}>PRIVATE · COACH</p>
      <h1 style={{ fontSize: 40, marginTop: 18 }}>Sign in.</h1>
      <p className="muted">Clients, completion, and the notes you will read together.</p>
      {hasSupabaseEnv() ? (
        <form className="form" onSubmit={onSubmit}>
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      ) : (
        <p className="muted">Add the Supabase keys in admin/.env.local first. See the roadmap.</p>
      )}
    </main>
  );
}
