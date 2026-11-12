'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientApp, PhoneFrame, scoresLookValid } from '@/components/client-app';
import { createClient } from '@/lib/supabase/client';
import {
  PRIVACY_NOTICE_VERSION,
  emptyScores,
  type CheckIn,
  type SymptomKey,
  SYMPTOMS,
} from '@/lib/program';

type Loaded = {
  fullName: string;
  startedOn: string;
  enrollmentId: string;
  checkIns: CheckIn[];
  reminderOptIn: boolean;
  reminderHour: number;
  deletionPending: boolean;
  consented: boolean;
};

const SCORE_KEYS: SymptomKey[] = SYMPTOMS.map((symptom) => symptom.key);

function asCheckIn(row: Record<string, unknown>): CheckIn {
  const scores = emptyScores();
  for (const key of SCORE_KEYS) {
    const value = row[key];
    scores[key] = typeof value === 'number' ? value : null;
  }
  return {
    entry_date: String(row.entry_date).slice(0, 10),
    skipped: Boolean(row.skipped),
    ...scores,
  };
}

export function LiveApp() {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, started_on, status')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (enrollmentError) throw new Error(enrollmentError.message);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, reminder_opt_in, reminder_hour')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    if (!enrollment || !profile) {
      setData({
        fullName: profile?.full_name || 'there',
        startedOn: new Date().toISOString().slice(0, 10),
        enrollmentId: '',
        checkIns: [],
        reminderOptIn: false,
        reminderHour: 8,
        deletionPending: false,
        consented: true,
      });
      return;
    }

    const [{ data: rows, error: checkError }, { data: consents, error: consentError }, { data: deletions, error: deletionError }] =
      await Promise.all([
        supabase.from('check_ins').select('*').eq('client_id', user.id).order('entry_date'),
        supabase.from('consents').select('notice_version').eq('client_id', user.id).eq('notice_version', PRIVACY_NOTICE_VERSION).limit(1),
        supabase.from('deletion_requests').select('id').eq('client_id', user.id).eq('status', 'pending').limit(1),
      ]);
    if (checkError) throw new Error(checkError.message);
    if (consentError) throw new Error(consentError.message);
    if (deletionError) throw new Error(deletionError.message);

    setData({
      fullName: profile.full_name,
      startedOn: enrollment.started_on,
      enrollmentId: enrollment.id,
      checkIns: (rows ?? []).map((row) => asCheckIn(row as Record<string, unknown>)),
      reminderOptIn: profile.reminder_opt_in,
      reminderHour: profile.reminder_hour,
      deletionPending: (deletions ?? []).length > 0,
      consented: (consents ?? []).length > 0,
    });
  }, [router]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open your space.'));
  }, [load]);

  async function acceptConsent() {
    setAccepting(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error: insertError } = await supabase.from('consents').insert({
        client_id: user.id,
        notice_version: PRIVACY_NOTICE_VERSION,
      });
      if (insertError) throw new Error(insertError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your acknowledgement.');
    } finally {
      setAccepting(false);
    }
  }

  if (error && !data) {
    return (
      <PhoneFrame>
        <div className="section">
          <p className="error">{error}</p>
        </div>
      </PhoneFrame>
    );
  }

  if (!data) {
    return (
      <PhoneFrame>
        <div className="section">
          <p className="lede">Opening your space…</p>
        </div>
      </PhoneFrame>
    );
  }

  if (!data.enrollmentId) {
    return (
      <PhoneFrame>
        <div className="section">
          <div className="wordmark">
            <strong>LABAS.</strong>
            <span>PRIVATE</span>
          </div>
          <h1 className="greeting" style={{ fontSize: 40 }}>
            Not open yet.
          </h1>
          <p className="lede">This account does not have an active program. Sign out and create the account again, or open the link from your coach.</p>
          <button
            className="save"
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace('/login');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </PhoneFrame>
    );
  }

  if (!data.consented) {
    return (
      <PhoneFrame>
        <div className="section">
          <div className="wordmark">
            <strong>LABAS.</strong>
            <span>PRIVATE</span>
          </div>
          <h1 className="greeting" style={{ fontSize: 40 }}>
            Before you begin.
          </h1>
          <p className="lede">
            LABAS Private stores six daily symptom ratings so you and your coach can look at them together. It is not a
            medical record, a diagnosis, or an emergency service.
          </p>
          <p className="lede">Your coach can see your check-ins. Your employer cannot. You can skip a day, correct a past day, download your data, or ask for it to be deleted.</p>
          <a className="linkish" href="/privacy" style={{ display: 'inline-block' }}>
            Read the privacy notice
          </a>
          {error ? <p className="error">{error}</p> : null}
          <button className="save" type="button" disabled={accepting} onClick={acceptConsent}>
            {accepting ? 'Saving…' : 'I understand and agree'}
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <ClientApp
      fullName={data.fullName}
      startedOn={data.startedOn}
      checkIns={data.checkIns}
      reminderOptIn={data.reminderOptIn}
      reminderHour={data.reminderHour}
      deletionPending={data.deletionPending}
      onSave={async (entry) => {
        if (!scoresLookValid(entry)) throw new Error('Choose a score from 0 to 4 for each symptom.');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in again.');
        const { error: saveError } = await supabase.from('check_ins').upsert(
          {
            client_id: user.id,
            enrollment_id: data.enrollmentId,
            entry_date: entry.entry_date,
            skipped: entry.skipped,
            stress: entry.stress,
            fatigue: entry.fatigue,
            physical_tension: entry.physical_tension,
            difficulty_focusing: entry.difficulty_focusing,
            irritability: entry.irritability,
            sleep_disturbance: entry.sleep_disturbance,
          },
          { onConflict: 'client_id,entry_date' },
        );
        if (saveError) throw new Error(saveError.message);
        await load();
      }}
      onReminder={async (optIn, hour) => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in again.');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ reminder_opt_in: optIn, reminder_hour: hour })
          .eq('id', user.id);
        if (updateError) throw new Error(updateError.message);
        await load();
      }}
      onDeletion={async (note) => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in again.');
        const { error: insertError } = await supabase.from('deletion_requests').insert({
          client_id: user.id,
          note: note.trim() || null,
        });
        if (insertError) throw new Error(insertError.message);
        await load();
      }}
      onSignOut={async () => {
        await createClient().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
    />
  );
}
