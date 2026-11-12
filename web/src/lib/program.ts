export const PROGRAM_DAYS = 90;
export const PRIVACY_NOTICE_VERSION = '2026-11-09';

export const SYMPTOMS = [
  { key: 'stress', label: 'Stress', captures: 'Perceived psychological stress' },
  { key: 'fatigue', label: 'Fatigue', captures: 'Mental or physical exhaustion' },
  { key: 'physical_tension', label: 'Physical tension', captures: 'Muscle tension or bodily discomfort' },
  { key: 'difficulty_focusing', label: 'Difficulty focusing', captures: 'Problems concentrating' },
  { key: 'irritability', label: 'Irritability', captures: 'Increased emotional reactivity' },
  { key: 'sleep_disturbance', label: 'Sleep disturbance', captures: 'Trouble sleeping the previous night' },
] as const;

export type SymptomKey = (typeof SYMPTOMS)[number]['key'];

export type Scores = Record<SymptomKey, number | null>;

export type CheckIn = Scores & {
  entry_date: string;
  skipped: boolean;
};

export type Trend = 'improving' | 'steady' | 'higher' | 'early';

export function emptyScores(): Scores {
  return {
    stress: null,
    fatigue: null,
    physical_tension: null,
    difficulty_focusing: null,
    irritability: null,
    sleep_disturbance: null,
  };
}

export function dateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return dateISO(date);
}

export function todayISO(today = new Date()): string {
  return dateISO(today);
}

export function programDay(startedOn: string, today = new Date()): number {
  const start = parseISODate(startedOn).getTime();
  const now = parseISODate(todayISO(today)).getTime();
  return Math.round((now - start) / 86400000) + 1;
}

export function elapsedDays(startedOn: string, duration = PROGRAM_DAYS, today = new Date()): number {
  const day = programDay(startedOn, today);
  if (day < 1) return 0;
  return Math.min(day, duration);
}

export function isComplete(scores: Scores): boolean {
  return SYMPTOMS.every((symptom) => scores[symptom.key] !== null);
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scoredCheckIns(checkIns: CheckIn[]): CheckIn[] {
  return checkIns.filter(
    (row) => !row.skipped && SYMPTOMS.every((symptom) => typeof row[symptom.key] === 'number'),
  );
}

export function completionRate(checkIns: CheckIn[], startedOn: string, today = new Date()): number | null {
  const elapsed = elapsedDays(startedOn, PROGRAM_DAYS, today);
  if (elapsed <= 0) return null;
  const end = addDays(startedOn, elapsed - 1);
  const done = checkIns.filter((row) => row.entry_date >= startedOn && row.entry_date <= end).length;
  return done / elapsed;
}

export function inRange(checkIns: CheckIn[], from: string, to: string): CheckIn[] {
  return scoredCheckIns(checkIns).filter((row) => row.entry_date >= from && row.entry_date <= to);
}

export function trendFor(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null) return 'early';
  const delta = current - previous;
  if (delta <= -0.4) return 'improving';
  if (delta >= 0.4) return 'higher';
  return 'steady';
}

export function trendLabel(trend: Trend): string {
  if (trend === 'improving') return 'Improving';
  if (trend === 'higher') return 'Higher';
  if (trend === 'steady') return 'Steady';
  return 'Early';
}

export function weekWindow(startedOn: string, today = new Date()) {
  const elapsed = Math.max(elapsedDays(startedOn, PROGRAM_DAYS, today), 1);
  const end = addDays(startedOn, elapsed - 1);
  const currentFromRaw = addDays(end, -6);
  const currentFrom = currentFromRaw < startedOn ? startedOn : currentFromRaw;
  const previousTo = addDays(currentFrom, -1);
  const previousFromRaw = addDays(previousTo, -6);
  return {
    currentFrom,
    currentTo: end,
    previousFrom: previousFromRaw < startedOn ? startedOn : previousFromRaw,
    previousTo: previousTo < startedOn ? startedOn : previousTo,
  };
}

export function averages(checkIns: CheckIn[]): Record<SymptomKey, number | null> {
  const scored = scoredCheckIns(checkIns);
  const result = {} as Record<SymptomKey, number | null>;
  for (const symptom of SYMPTOMS) {
    result[symptom.key] = mean(
      scored.map((row) => row[symptom.key]).filter((value): value is number => value !== null),
    );
  }
  return result;
}

export function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

export function observations(checkIns: CheckIn[], startedOn: string, today = new Date()): string[] {
  const window = weekWindow(startedOn, today);
  const current = averages(inRange(checkIns, window.currentFrom, window.currentTo));
  const previous = averages(inRange(checkIns, window.previousFrom, window.previousTo));
  const lines: string[] = [];
  for (const symptom of SYMPTOMS) {
    const trend = trendFor(current[symptom.key], previous[symptom.key]);
    if (trend === 'improving') lines.push(`${symptom.label} is lower than the week before.`);
    if (trend === 'higher') lines.push(`${symptom.label} is higher than the week before.`);
  }
  if (lines.length) return lines;
  if (scoredCheckIns(checkIns).length < 3) {
    return ['A few more check-ins will make a pattern visible.'];
  }
  return ['This week looks steady beside the week before.'];
}

export function trendCounts(checkIns: CheckIn[], startedOn: string, today = new Date()) {
  const window = weekWindow(startedOn, today);
  const current = averages(inRange(checkIns, window.currentFrom, window.currentTo));
  const previous = averages(inRange(checkIns, window.previousFrom, window.previousTo));
  const counts = { improving: 0, higher: 0, steady: 0, early: 0 };
  for (const symptom of SYMPTOMS) {
    counts[trendFor(current[symptom.key], previous[symptom.key])] += 1;
  }
  return counts;
}

export function baselineVsRecent(checkIns: CheckIn[]) {
  const scored = [...scoredCheckIns(checkIns)].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  return {
    first: averages(scored.slice(0, 7)),
    last: averages(scored.slice(-7)),
    count: scored.length,
  };
}

export function dailyValues(
  checkIns: CheckIn[],
  key: SymptomKey,
  from: string,
  to: string,
): (number | null)[] {
  if (from > to) return [];
  const map = new Map(checkIns.map((row) => [row.entry_date, row]));
  const values: (number | null)[] = [];
  let cursor = from;
  while (cursor <= to) {
    const row = map.get(cursor);
    values.push(!row || row.skipped ? null : row[key]);
    cursor = addDays(cursor, 1);
  }
  return values;
}

export function chartWindow(startedOn: string, today = new Date()) {
  const end = addDays(startedOn, Math.max(elapsedDays(startedOn, PROGRAM_DAYS, today), 1) - 1);
  const fromRaw = addDays(end, -27);
  return { from: fromRaw < startedOn ? startedOn : fromRaw, to: end };
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function initial(fullName: string): string {
  const letter = fullName.trim().charAt(0);
  return letter ? letter.toUpperCase() : 'L';
}

export function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function percent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

export function demoStartedOn(today = new Date()): string {
  return addDays(todayISO(today), -18);
}

export function demoCheckIns(startedOn: string): CheckIn[] {
  const starts = [3, 3, 2, 3, 2, 3];
  const ends = [1, 2, 1, 2, 1, 1];
  const rows: CheckIn[] = [];
  for (let i = 0; i < 18; i += 1) {
    const entry_date = addDays(startedOn, i);
    if (i === 6) {
      rows.push({ entry_date, skipped: true, ...emptyScores() });
      continue;
    }
    const t = i / 17;
    const scores = emptyScores();
    SYMPTOMS.forEach((symptom, index) => {
      const value = starts[index] + (ends[index] - starts[index]) * t;
      const wobble = (i + index) % 5 === 0 ? 1 : 0;
      scores[symptom.key] = Math.min(4, Math.max(0, Math.round(value - wobble * 0.35)));
    });
    rows.push({ entry_date, skipped: false, ...scores });
  }
  return rows;
}

export function reportText(input: {
  fullName: string;
  startedOn: string;
  checkIns: CheckIn[];
  today?: Date;
}): string {
  const today = input.today ?? new Date();
  const day = programDay(input.startedOn, today);
  const window = weekWindow(input.startedOn, today);
  const weekAvg = averages(inRange(input.checkIns, window.currentFrom, window.currentTo));
  const lines = [
    `LABAS Private`,
    `${input.fullName}`,
    `Day ${Math.min(Math.max(day, 0), PROGRAM_DAYS)} of ${PROGRAM_DAYS}`,
    ``,
    `This week (${shortDate(window.currentFrom)} – ${shortDate(window.currentTo)})`,
    ...SYMPTOMS.map((symptom) => `${symptom.label}: ${formatScore(weekAvg[symptom.key])}`),
    ``,
    ...observations(input.checkIns, input.startedOn, today),
    ``,
    `Completion: ${percent(completionRate(input.checkIns, input.startedOn, today))}`,
    ``,
    `These notes describe a private checklist. They are not a diagnosis or an emergency service.`,
  ];
  return lines.join('\n');
}
