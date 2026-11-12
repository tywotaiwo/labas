import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string;
  client_id: string;
  note: string | null;
  status: string;
  requested_at: string;
  profiles: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null;
};

export default async function DeletionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('id, client_id, note, status, requested_at, profiles(full_name, email)')
    .order('requested_at', { ascending: false });

  const rows = (data ?? []) as unknown as RequestRow[];

  return (
    <main>
      <h1>Deletion</h1>
      <p className="muted">A client can ask. You confirm. The account, ratings, and invitation are then removed.</p>
      {error ? <p className="error">{error.message}</p> : null}
      <table style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Client</th>
            <th>Requested</th>
            <th>Note</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="muted">No requests.</td></tr>
          ) : (
            rows.map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/clients/${row.client_id}`}>{profile?.full_name || 'Client'}</Link>
                    <div className="muted">{profile?.email}</div>
                  </td>
                  <td>{new Date(row.requested_at).toLocaleDateString('en-GB')}</td>
                  <td>{row.note || '—'}</td>
                  <td>{row.status}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </main>
  );
}
