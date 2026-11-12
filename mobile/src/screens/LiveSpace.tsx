import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { Journal } from './Journal';
import { supabase } from '../lib/supabase';
import {
  PRIVACY_NOTICE_VERSION,
  SYMPTOMS,
  emptyScores,
  isComplete,
  type CheckIn,
  type SymptomKey,
} from '../lib/program';
import { colors, serif } from '../theme';

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

function asCheckIn(row: Record<string, unknown>): CheckIn {
  const scores = emptyScores();
  for (const symptom of SYMPTOMS) {
    const value = row[symptom.key];
    scores[symptom.key as SymptomKey] = typeof value === 'number' ? value : null;
  }
  return { entry_date: String(row.entry_date).slice(0, 10), skipped: Boolean(row.skipped), ...scores };
}

function valid(entry: CheckIn) {
  if (entry.skipped) return true;
  return isComplete(entry) && SYMPTOMS.every(symptom => {
    const value = entry[symptom.key];
    return typeof value === 'number' && value >= 0 && value <= 4;
  });
}

export function LiveSpace({ onSignedOut }: { onSignedOut: () => void }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      onSignedOut();
      return;
    }
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, started_on')
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
      checkIns: (rows ?? []).map(row => asCheckIn(row as Record<string, unknown>)),
      reminderOptIn: profile.reminder_opt_in,
      reminderHour: profile.reminder_hour,
      deletionPending: (deletions ?? []).length > 0,
      consented: (consents ?? []).length > 0,
    });
  }, [onSignedOut]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open your space.'));
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  if (!data) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.lede}>{error || 'Opening your space…'}</Text>
      </View>
    );
  }

  if (!data.enrollmentId) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 40 }]}>
        <Logo width={96} />
        <Text style={styles.title}>Not open yet.</Text>
        <Text style={styles.lede}>This account does not have an active program. Sign out and create the account again, or open the link from your coach.</Text>
        <Pressable style={styles.primary} onPress={signOut}>
          <Text style={styles.primaryText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  if (!data.consented) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 40 }]}>
        <Logo width={96} />
        <Text style={styles.title}>Before you begin.</Text>
        <Text style={styles.lede}>
          LABAS Private stores six daily symptom ratings so you and your coach can look at them together. It is not a medical record, a diagnosis, or an emergency service. Your coach can see your check-ins. Your employer cannot.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.primary, accepting && { opacity: 0.45 }]}
          disabled={accepting}
          onPress={async () => {
            setAccepting(true);
            setError(null);
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;
            const { error: insertError } = await supabase.from('consents').insert({
              client_id: userData.user.id,
              notice_version: PRIVACY_NOTICE_VERSION,
            });
            if (insertError) {
              setError(insertError.message);
              setAccepting(false);
              return;
            }
            await load();
            setAccepting(false);
          }}>
          <Text style={styles.primaryText}>{accepting ? 'Saving…' : 'I understand and agree'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Journal
      fullName={data.fullName}
      startedOn={data.startedOn}
      checkIns={data.checkIns}
      reminderOptIn={data.reminderOptIn}
      reminderHour={data.reminderHour}
      deletionPending={data.deletionPending}
      onSignOut={signOut}
      onSave={async entry => {
        if (!valid(entry)) throw new Error('Choose a score from 0 to 4 for each symptom.');
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Sign in again.');
        const { error: saveError } = await supabase.from('check_ins').upsert(
          {
            client_id: userData.user.id,
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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Sign in again.');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ reminder_opt_in: optIn, reminder_hour: hour })
          .eq('id', userData.user.id);
        if (updateError) throw new Error(updateError.message);
        await load();
      }}
      onDeletion={async note => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Sign in again.');
        const { error: insertError } = await supabase.from('deletion_requests').insert({
          client_id: userData.user.id,
          note: note.trim() || null,
        });
        if (insertError) throw new Error(insertError.message);
        await load();
      }}
    />
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: colors.ivory, paddingHorizontal: 24 },
  title: { marginTop: 16, fontFamily: serif, fontSize: 40, color: colors.forest },
  lede: { marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 22 },
  primary: { marginTop: 20, height: 52, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#f7f6f2', fontSize: 16 },
  error: { marginTop: 10, color: colors.clay },
});
