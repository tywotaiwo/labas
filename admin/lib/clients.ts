import { createClient } from '@/lib/supabase/server';
import {
  emptyScores,
  completionRate,
  percent,
  programDay,
  shortDate,
  trendCounts,
  PROGRAM_DAYS,
  type CheckIn,
  type SymptomKey,
  SYMPTOMS,
} from '@/lib/program';

export type Profile = { full_name: string; email: string | null };
export type Enrollment = {
  id: string;
  client_id: string;
  started_on: string;
  duration_days: number;
  status: string;
  profiles: Profile | Profile[] | null;
};

export function profileOf(row: Enrollment): Profile {
  const profile = row.profiles;
  if (!profile) return { full_name: 'Client', email: null };
  return Array.isArray(profile) ? profile[0] ?? { full_name: 'Client', email: null } : profile;
}

export function toCheckIn(row: Record<string, unknown>): CheckIn {
  const scores = emptyScores();
  for (const symptom of SYMPTOMS) {
    const value = row[symptom.key];
    scores[symptom.key as SymptomKey] = typeof value === 'number' ? value : null;
  }
  return {
    entry_date: String(row.entry_date).slice(0, 10),
    skipped: Boolean(row.skipped),
    ...scores,
  };
}

export async function loadCoachData() {
  const supabase = await createClient();
  const [{ data: enrollments, error: enrollmentError }, { data: rows, error: checkError }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, client_id, started_on, duration_days, status, profiles(full_name, email)')
      .order('started_on', { ascending: false }),
    supabase.from('check_ins').select('*').order('entry_date'),
  ]);
  if (enrollmentError) throw new Error(enrollmentError.message);
  if (checkError) throw new Error(checkError.message);

  const byClient = new Map<string, CheckIn[]>();
  for (const row of rows ?? []) {
    const checkIn = toCheckIn(row as Record<string, unknown>);
    const clientId = String((row as { client_id: string }).client_id);
    const list = byClient.get(clientId) ?? [];
    list.push(checkIn);
    byClient.set(clientId, list);
  }

  return {
    enrollments: (enrollments ?? []) as unknown as Enrollment[],
    byClient,
  };
}

export function clientSummary(enrollment: Enrollment, checkIns: CheckIn[]) {
  const profile = profileOf(enrollment);
  const day = programDay(enrollment.started_on);
  const counts = trendCounts(checkIns, enrollment.started_on);
  const last = [...checkIns].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0];
  return {
    profile,
    dayLabel: day < 1 ? 'Not started' : `Day ${Math.min(day, PROGRAM_DAYS)} / ${PROGRAM_DAYS}`,
    completion: percent(completionRate(checkIns, enrollment.started_on)),
    lastLabel: last ? shortDate(last.entry_date) : 'None yet',
    pattern:
      counts.early === 6
        ? 'Early'
        : `${counts.improving} easing · ${counts.higher} higher`,
  };
}
