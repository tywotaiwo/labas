'use client';

import { useMemo, useState } from 'react';
import { ChartIcon, HomeIcon, ReportIcon } from '@/components/icons';
import {
  PROGRAM_DAYS,
  SYMPTOMS,
  addDays,
  averages,
  baselineVsRecent,
  chartWindow,
  completionRate,
  dailyValues,
  dateISO,
  emptyScores,
  firstName,
  formatScore,
  greeting,
  inRange,
  initial,
  isComplete,
  observations,
  percent,
  programDay,
  reportText,
  shortDate,
  todayISO,
  trendFor,
  trendLabel,
  weekWindow,
  type CheckIn,
  type Scores,
  type SymptomKey,
} from '@/lib/program';

type Tab = 'today' | 'progress' | 'report';

export type JournalProps = {
  fullName: string;
  startedOn: string;
  checkIns: CheckIn[];
  reminderOptIn: boolean;
  reminderHour: number;
  deletionPending: boolean;
  onSave: (entry: CheckIn) => Promise<void>;
  onReminder: (optIn: boolean, reminderHour: number) => Promise<void>;
  onDeletion: (note: string) => Promise<void>;
  onSignOut?: () => Promise<void>;
};

function defaultDate(startedOn: string) {
  const day = programDay(startedOn);
  if (day < 1) return startedOn;
  if (day > PROGRAM_DAYS) return addDays(startedOn, PROGRAM_DAYS - 1);
  return todayISO();
}

function recentDays(startedOn: string) {
  const end = defaultDate(startedOn);
  const days: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const iso = addDays(end, -i);
    if (iso >= startedOn && iso <= end) days.push(iso);
  }
  return days;
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="phone framed">{children}</div>
    </div>
  );
}

export function ClientApp(props: JournalProps) {
  const [tab, setTab] = useState<Tab>('today');
  const [account, setAccount] = useState(false);
  const day = Math.max(programDay(props.startedOn), 0);
  const shownDay = Math.min(day, PROGRAM_DAYS);

  return (
    <PhoneFrame>
      <div className="phone-scroll">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 22px 0' }}>
          <div className="wordmark">
            <strong>LABAS.</strong>
            <span>PRIVATE</span>
          </div>
          <button className="avatar" type="button" onClick={() => setAccount(true)} aria-label="Account">
            {initial(props.fullName)}
          </button>
        </header>
        {tab === 'today' ? <TodayPanel {...props} /> : null}
        {tab === 'progress' ? <ProgressPanel {...props} day={shownDay} /> : null}
        {tab === 'report' ? <ReportPanel {...props} day={shownDay} /> : null}
      </div>
      <nav className="tabbar no-print" aria-label="Sections">
        <button className={tab === 'today' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('today')}>
          <HomeIcon active={tab === 'today'} />
          Today
        </button>
        <button className={tab === 'progress' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('progress')}>
          <ChartIcon />
          Progress
        </button>
        <button className={tab === 'report' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('report')}>
          <ReportIcon />
          Report
        </button>
      </nav>
      {account ? <AccountSheet {...props} day={shownDay} onClose={() => setAccount(false)} /> : null}
    </PhoneFrame>
  );
}

function TodayPanel(props: JournalProps) {
  const [selected, setSelected] = useState(() => defaultDate(props.startedOn));
  const [showDays, setShowDays] = useState(false);
  const day = programDay(props.startedOn);
  const started = day >= 1;
  const existing = props.checkIns.find((row) => row.entry_date === selected);

  return (
    <>
      <div className="section" style={{ paddingTop: 28 }}>
        <p className="eyebrow">YOUR PRIVATE SPACE</p>
        <h1 className="greeting">
          {greeting()},
          <br />
          {firstName(props.fullName)}.
        </h1>
        <p className="lede">A small moment to check in with yourself.</p>
      </div>
      <section className="journey">
        <div className="journey-row">
          <h2>Your 90-day journey</h2>
          <div className="day">{started ? `Day ${Math.min(day, PROGRAM_DAYS)} / ${PROGRAM_DAYS}` : 'Not started'}</div>
        </div>
        <div className="track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, (day / PROGRAM_DAYS) * 100))}%` }} />
        </div>
        <p>Small observations. Meaningful patterns.</p>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Daily check-in</h2>
          <span className="pill">About 1 minute</span>
        </div>
        <p className="prompt">How strongly did you experience each symptom today?</p>
        <p className="prompt" style={{ marginTop: 6, fontSize: 13 }}>
          Rate the day from morning until now. Sleep disturbance means last night.
        </p>
        {started ? (
          <button className="linkish" type="button" onClick={() => setShowDays((open) => !open)}>
            {selected === todayISO() ? 'Today' : shortDate(selected)} · {showDays ? 'close' : 'change day'}
          </button>
        ) : (
          <p className="prompt">Your program begins {shortDate(props.startedOn)}.</p>
        )}
        {showDays ? (
          <div className="days">
            {recentDays(props.startedOn).map((iso) => (
              <button
                key={iso}
                className={iso === selected ? 'daychip on' : 'daychip'}
                type="button"
                onClick={() => {
                  setSelected(iso);
                  setShowDays(false);
                }}
              >
                {iso === todayISO() ? 'Today' : shortDate(iso)}
              </button>
            ))}
          </div>
        ) : null}
      </section>
      {started ? (
        <DayEditor
          key={`${selected}:${existing?.skipped ? 'skip' : 'open'}`}
          entryDate={selected}
          existing={existing}
          onSave={props.onSave}
        />
      ) : null}
    </>
  );
}

function DayEditor({
  entryDate,
  existing,
  onSave,
}: {
  entryDate: string;
  existing?: CheckIn;
  onSave: (entry: CheckIn) => Promise<void>;
}) {
  const [scores, setScores] = useState<Scores>(() => {
    if (!existing || existing.skipped) return emptyScores();
    return {
      stress: existing.stress,
      fatigue: existing.fatigue,
      physical_tension: existing.physical_tension,
      difficulty_focusing: existing.difficulty_focusing,
      irritability: existing.irritability,
      sleep_disturbance: existing.sleep_disturbance,
    };
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(existing?.skipped ? 'This day was left blank. You can fill it in now.' : null);
  const [error, setError] = useState<string | null>(null);

  function setScore(key: SymptomKey, value: number) {
    setScores((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function save(skipped: boolean) {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        entry_date: entryDate,
        skipped,
        ...(skipped ? emptyScores() : scores),
      });
      setMessage(skipped ? 'Day left blank. That does not count against you.' : 'Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this check-in.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="scale-legend">
          <span>0 · None</span>
          <span>4 · Severe</span>
        </div>
        {SYMPTOMS.map((symptom) => (
          <div className="symptom" key={symptom.key}>
            <h3>{symptom.label}</h3>
            <div className="scale" role="group" aria-label={symptom.label}>
              {[0, 1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scores[symptom.key] === value}
                  onClick={() => setScore(symptom.key, value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="save" type="button" disabled={!isComplete(scores) || saving} onClick={() => save(false)}>
        {saving ? 'Saving…' : entryDate === todayISO() ? "Save today's check-in →" : `Save ${shortDate(entryDate)} →`}
      </button>
      {!isComplete(scores) ? <p className="fine">Choose a score for each symptom to save.</p> : null}
      <p className="fine">Your answers are private. This check-in is not a diagnosis or emergency monitoring service.</p>
      <div style={{ padding: '0 22px 18px' }}>
        <button className="texty" type="button" disabled={saving} onClick={() => save(true)}>
          Skip this day
        </button>
        {message ? <p className="note" style={{ margin: '4px 0 0' }}>{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </>
  );
}

function ProgressPanel({ checkIns, startedOn, day }: JournalProps & { day: number }) {
  const window = chartWindow(startedOn);
  return (
    <div className="section">
      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 40, fontWeight: 500, margin: '8px 0 0' }}>
        Progress
      </h2>
      <p className="lede">Lower is quieter. Bars show the last few weeks of your program.</p>
      <p className="prompt">
        Day {day} · {percent(completionRate(checkIns, startedOn))} of days acknowledged
      </p>
      <div className="card" style={{ margin: '18px 0 24px' }}>
        {SYMPTOMS.map((symptom) => {
          const values = dailyValues(checkIns, symptom.key, window.from, window.to);
          const weeks = weekWindow(startedOn);
          const trend = trendFor(
            averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo))[symptom.key],
            averages(inRange(checkIns, weeks.previousFrom, weeks.previousTo))[symptom.key],
          );
          return (
            <div className="symptom" key={symptom.key}>
              <div className="journey-row">
                <h3>{symptom.label}</h3>
                <span className={`trend ${trend}`}>{trendLabel(trend)}</span>
              </div>
              <div className="bars" aria-hidden="true">
                {values.map((value, index) => (
                  <i
                    key={`${symptom.key}-${index}`}
                    className={value === null ? 'empty' : undefined}
                    style={{ height: value === null ? 3 : 8 + (value / 4) * 56 }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportPanel({ checkIns, startedOn, fullName, day }: JournalProps & { day: number }) {
  const weeks = weekWindow(startedOn);
  const weekAvg = averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo));
  const lines = observations(checkIns, startedOn);
  const span = baselineVsRecent(checkIns);
  const closing = day >= PROGRAM_DAYS || span.count >= 14;

  const text = useMemo(
    () => reportText({ fullName, startedOn, checkIns }),
    [fullName, startedOn, checkIns],
  );

  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `labas-private-${dateISO(new Date())}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="section" style={{ paddingBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 40, fontWeight: 500, margin: '8px 0 0' }}>
        Report
      </h2>
      <p className="lede">A weekly note you and your coach can read together.</p>
      <div className="report-block">
        <h3>
          This week · {shortDate(weeks.currentFrom)} – {shortDate(weeks.currentTo)}
        </h3>
        {SYMPTOMS.map((symptom) => (
          <div className="report-row" key={symptom.key}>
            <span>{symptom.label}</span>
            <strong>{formatScore(weekAvg[symptom.key])}</strong>
          </div>
        ))}
        <h3>What changed</h3>
        {lines.map((line) => (
          <p className="obs" key={line}>
            {line}
          </p>
        ))}
        <div className="report-row">
          <span>Days acknowledged</span>
          <strong>{percent(completionRate(checkIns, startedOn))}</strong>
        </div>
      </div>
      <div className="report-block">
        <h3>{day >= PROGRAM_DAYS ? 'End of program' : 'Since you began'}</h3>
        {closing ? (
          SYMPTOMS.map((symptom) => (
            <div className="report-row" key={symptom.key}>
              <span>{symptom.label}</span>
              <span>
                {formatScore(span.first[symptom.key])} → {formatScore(span.last[symptom.key])}
              </span>
            </div>
          ))
        ) : (
          <p className="obs">The longer view opens once two weeks of check-ins are here.</p>
        )}
        <p className="fine" style={{ margin: '16px 0 0' }}>
          Averages use 0 for none and 4 for severe. A lower number is a quieter day. This checklist is not a clinical
          diagnosis.
        </p>
      </div>
      <button className="save no-print" type="button" onClick={() => window.print()}>
        Save as PDF
      </button>
      <button className="ghost no-print" type="button" onClick={download} style={{ width: 'calc(100% - 40px)', margin: '10px 20px 20px' }}>
        Download text summary
      </button>
    </div>
  );
}

function AccountSheet(props: JournalProps & { day: number; onClose: () => void }) {
  const [optIn, setOptIn] = useState(props.reminderOptIn);
  const [hour, setHour] = useState(props.reminderHour);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'reminder' | 'deletion' | null>(null);

  async function saveReminder() {
    setError(null);
    setPending('reminder');
    try {
      await props.onReminder(optIn, hour);
      setMessage(optIn ? 'Reminder preference saved.' : 'Reminder turned off.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the reminder.');
    } finally {
      setPending(null);
    }
  }

  function download() {
    const payload = {
      exported_at: new Date().toISOString(),
      full_name: props.fullName,
      started_on: props.startedOn,
      check_ins: props.checkIns,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'labas-private-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function requestDeletion() {
    setError(null);
    setPending('deletion');
    try {
      await props.onDeletion(note);
      setMessage('Deletion requested. Your coach will confirm it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="sheet no-print" role="dialog" aria-label="Account">
      <div className="sheet-card">
        <div className="journey-row">
          <h2>{props.fullName}</h2>
          <button className="linkish" type="button" onClick={props.onClose} style={{ marginTop: 0 }}>
            Close
          </button>
        </div>
        <p className="prompt">Day {props.day} of {PROGRAM_DAYS}</p>
        <div className="field">
          <label htmlFor="reminder">Daily reminder</label>
          <input
            id="reminder"
            type="checkbox"
            checked={optIn}
            onChange={(event) => setOptIn(event.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </div>
        <div className="field">
          <label htmlFor="hour">Hour</label>
          <select id="hour" value={hour} onChange={(event) => setHour(Number(event.target.value))}>
            {Array.from({ length: 16 }, (_, index) => index + 6).map((value) => (
              <option key={value} value={value}>
                {String(value).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <p className="prompt">Saved on your account. The mobile app sends it after you allow notifications.</p>
        <button className="ghost" type="button" onClick={saveReminder} disabled={pending !== null}>
          {pending === 'reminder' ? 'Saving…' : 'Save reminder'}
        </button>
        <button className="ghost" type="button" onClick={download}>
          Download my data
        </button>
        <label className="prompt" htmlFor="delete-note" style={{ display: 'block', marginTop: 16 }}>
          Ask for your data to be deleted
        </label>
        <input
          id="delete-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          style={{ width: '100%', marginTop: 8 }}
        />
        <button className="ghost" type="button" onClick={requestDeletion} disabled={props.deletionPending || pending !== null}>
          {props.deletionPending ? 'Deletion already requested' : pending === 'deletion' ? 'Sending…' : 'Request deletion'}
        </button>
        {props.onSignOut ? (
          <button className="texty" type="button" onClick={() => props.onSignOut?.()}>
            Sign out
          </button>
        ) : null}
        {message ? <p className="note" style={{ marginLeft: 0 }}>{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  );
}

export function scoresLookValid(entry: CheckIn) {
  if (entry.skipped) return true;
  return (
    isComplete(entry) &&
    SYMPTOMS.every((symptom) => {
      const value = entry[symptom.key];
      return typeof value === 'number' && value >= 0 && value <= 4;
    })
  );
}
