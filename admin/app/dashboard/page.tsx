import Link from 'next/link';
import { clientSummary, loadCoachData } from '@/lib/clients';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let enrollments: Awaited<ReturnType<typeof loadCoachData>>['enrollments'] = [];
  let byClient = new Map<string, Awaited<ReturnType<typeof loadCoachData>>['byClient'] extends Map<string, infer T> ? T : never>();
  let error: string | null = null;
  try {
    const loaded = await loadCoachData();
    enrollments = loaded.enrollments;
    byClient = loaded.byClient;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Could not load clients.';
  }

  const active = enrollments.filter((row) => row.status === 'active');
  const acknowledgedToday = [...byClient.values()].filter((rows) =>
    rows.some((row) => row.entry_date === new Date().toISOString().slice(0, 10)),
  ).length;

  return (
    <main>
      <h1>Clients</h1>
      <p className="muted">Completion, last check-in, and whether the week is quieter or higher.</p>
      {error ? <p className="error">{error}. Add admin/.env.local and apply the database migration.</p> : null}
      <section className="stats">
        <div className="stat"><b>{active.length}</b><span className="muted">Active programs</span></div>
        <div className="stat"><b>{acknowledgedToday}</b><span className="muted">Acknowledged today</span></div>
        <div className="stat"><b>{enrollments.length}</b><span className="muted">All enrollments</span></div>
      </section>
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Program</th>
            <th>Completion</th>
            <th>Last entry</th>
            <th>This week</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No clients yet. Send an invitation when you are ready.</td>
            </tr>
          ) : (
            enrollments.map((enrollment) => {
              const summary = clientSummary(enrollment, byClient.get(enrollment.client_id) ?? []);
              return (
                <tr key={enrollment.id}>
                  <td>
                    <Link href={`/dashboard/clients/${enrollment.client_id}`}>
                      <strong>{summary.profile.full_name}</strong>
                      <div className="muted">{summary.profile.email}</div>
                    </Link>
                  </td>
                  <td>{summary.dayLabel}<div className="muted">{enrollment.status}</div></td>
                  <td>{summary.completion}</td>
                  <td>{summary.lastLabel}</td>
                  <td>{summary.pattern}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </main>
  );
}
