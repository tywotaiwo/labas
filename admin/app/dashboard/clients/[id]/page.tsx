import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteClient } from '@/components/delete-client';
import { PrintButton } from '@/components/print-button';
import { profileOf, toCheckIn, type Enrollment } from '@/lib/clients';
import {
  PROGRAM_DAYS,
  SYMPTOMS,
  averages,
  baselineVsRecent,
  chartWindow,
  completionRate,
  dailyValues,
  formatScore,
  inRange,
  observations,
  percent,
  programDay,
  shortDate,
  trendFor,
  trendLabel,
  weekWindow,
} from '@/lib/program';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: enrollmentRow, error } = await supabase
    .from('enrollments')
    .select('id, client_id, started_on, duration_days, status, profiles(full_name, email, reminder_opt_in)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return <p className="error">{error.message}</p>;
  if (!enrollmentRow) notFound();

  const enrollment = enrollmentRow as unknown as Enrollment;
  const profile = profileOf(enrollment);
  const { data: rows } = await supabase.from('check_ins').select('*').eq('client_id', id).order('entry_date');
  const checkIns = (rows ?? []).map((row) => toCheckIn(row as Record<string, unknown>));
  const day = programDay(enrollment.started_on);
  const weeks = weekWindow(enrollment.started_on);
  const weekAvg = averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo));
  const span = baselineVsRecent(checkIns);
  const window = chartWindow(enrollment.started_on);
  const lines = observations(checkIns, enrollment.started_on);

  return (
    <main>
      <p className="no-print"><Link href="/dashboard">← Clients</Link></p>
      <h1>{profile.full_name}</h1>
      <p className="muted">
        {profile.email} · {day < 1 ? 'Not started' : `Day ${Math.min(Math.max(day, 0), PROGRAM_DAYS)} of ${PROGRAM_DAYS}`} · {enrollment.status} · {percent(completionRate(checkIns, enrollment.started_on))} acknowledged
      </p>
      <section className="panel" style={{ marginTop: 18 }}>
        <h2 className="serif" style={{ marginTop: 0 }}>This week</h2>
        <p className="muted">{shortDate(weeks.currentFrom)} – {shortDate(weeks.currentTo)}</p>
        {SYMPTOMS.map((symptom) => (
          <div key={symptom.key} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '8px 0' }}>
            <span>{symptom.label}</span>
            <strong>{formatScore(weekAvg[symptom.key])}</strong>
          </div>
        ))}
        <h3>What changed</h3>
        {lines.map((line) => <p key={line}>{line}</p>)}
      </section>
      <section className="panel" style={{ marginTop: 12 }}>
        <h2 className="serif" style={{ marginTop: 0 }}>{day >= PROGRAM_DAYS ? 'End of program' : 'Since they began'}</h2>
        {span.count >= 10 ? (
          SYMPTOMS.map((symptom) => (
            <div key={symptom.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{symptom.label}</span>
              <span>{formatScore(span.first[symptom.key])} → {formatScore(span.last[symptom.key])}</span>
            </div>
          ))
        ) : (
          <p className="muted">Not enough scored days for a longer comparison yet.</p>
        )}
        <p className="muted">0 is none and 4 is severe. A lower number is a quieter day. This is not a diagnosis.</p>
        <PrintButton />
      </section>
      <section style={{ marginTop: 22 }} className="no-print">
        <h2 className="serif">Recent pattern</h2>
        {SYMPTOMS.map((symptom) => {
          const values = dailyValues(checkIns, symptom.key, window.from, window.to);
          const trend = trendFor(
            averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo))[symptom.key],
            averages(inRange(checkIns, weeks.previousFrom, weeks.previousTo))[symptom.key],
          );
          return (
            <div key={symptom.key} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{symptom.label}</strong>
                <span className="muted">{trendLabel(trend)}</span>
              </div>
              <div className="bars">
                {values.map((value, index) => (
                  <i key={index} className={value === null ? 'empty' : undefined} style={{ height: value === null ? 2 : 6 + (value / 4) * 40 }} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
      <div style={{ marginTop: 28 }}>
        <DeleteClient clientId={id} name={profile.full_name} />
      </div>
    </main>
  );
}
