import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartIcon, HomeIcon, ReportIcon } from '../components/Icons';
import { Logo } from '../components/Logo';
import {
  PROGRAM_DAYS,
  SYMPTOMS,
  addDays,
  averages,
  baselineVsRecent,
  chartWindow,
  completionRate,
  dailyValues,
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
} from '../lib/program';
import { colors, serif } from '../theme';

type Tab = 'today' | 'progress' | 'report';

export type JournalProps = {
  fullName: string;
  startedOn: string;
  checkIns: CheckIn[];
  reminderOptIn: boolean;
  reminderHour: number;
  deletionPending: boolean;
  onSave: (entry: CheckIn) => Promise<void>;
  onReminder: (optIn: boolean, hour: number) => Promise<void>;
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

export function Journal(props: JournalProps) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const [account, setAccount] = useState(false);
  const day = Math.min(Math.max(programDay(props.startedOn), 0), PROGRAM_DAYS);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Logo width={88} />
            <Text style={styles.private}>PRIVATE</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => setAccount(true)} accessibilityLabel="Account">
            <Text style={styles.avatarText}>{initial(props.fullName)}</Text>
          </Pressable>
        </View>
        {tab === 'today' ? <Today {...props} /> : null}
        {tab === 'progress' ? <Progress {...props} day={day} /> : null}
        {tab === 'report' ? <Report {...props} day={day} /> : null}
      </ScrollView>
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TabButton label="Today" active={tab === 'today'} icon="home" onPress={() => setTab('today')} />
        <TabButton label="Progress" active={tab === 'progress'} icon="chart" onPress={() => setTab('progress')} />
        <TabButton label="Report" active={tab === 'report'} icon="report" onPress={() => setTab('report')} />
      </View>
      {account ? <Account {...props} day={day} onClose={() => setAccount(false)} /> : null}
    </View>
  );
}

function TabButton({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: 'home' | 'chart' | 'report';
  onPress: () => void;
}) {
  const color = active ? colors.forest : colors.quiet;
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      {icon === 'home' ? <HomeIcon color={color} /> : null}
      {icon === 'chart' ? <ChartIcon color={color} /> : null}
      {icon === 'report' ? <ReportIcon color={color} /> : null}
      <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function Today(props: JournalProps) {
  const [selected, setSelected] = useState(() => defaultDate(props.startedOn));
  const [showDays, setShowDays] = useState(false);
  const day = programDay(props.startedOn);
  const existing = props.checkIns.find(row => row.entry_date === selected);
  const started = day >= 1;

  return (
    <View>
      <Text style={styles.eyebrow}>YOUR PRIVATE SPACE</Text>
      <Text style={styles.greeting}>
        {greeting()},{'\n'}
        {firstName(props.fullName)}.
      </Text>
      <Text style={styles.lede}>A small moment to check in with yourself.</Text>
      <View style={styles.journey}>
        <View style={styles.row}>
          <Text style={styles.journeyTitle}>Your 90-day journey</Text>
          <Text style={styles.day}>{started ? `Day ${Math.min(day, PROGRAM_DAYS)} / ${PROGRAM_DAYS}` : 'Not started'}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.min(100, Math.max(0, (day / PROGRAM_DAYS) * 100))}%` }]} />
        </View>
        <Text style={styles.journeyNote}>Small observations. Meaningful patterns.</Text>
      </View>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Daily check-in</Text>
        <Text style={styles.pill}>About 1 minute</Text>
      </View>
      <Text style={styles.prompt}>How strongly did you experience each symptom today?</Text>
      <Text style={styles.recall}>Rate the day from morning until now. Sleep disturbance means last night.</Text>
      {started ? (
        <Pressable style={styles.changeDay} hitSlop={8} onPress={() => setShowDays(open => !open)}>
          <Text style={styles.link}>
            {selected === todayISO() ? 'Today' : shortDate(selected)} · {showDays ? 'close' : 'change day'}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.prompt}>Your program begins {shortDate(props.startedOn)}.</Text>
      )}
      {showDays ? (
        <View style={styles.days}>
          {recentDays(props.startedOn).map(iso => (
            <Pressable
              key={iso}
              style={[styles.dayChip, iso === selected && styles.dayChipOn]}
              onPress={() => {
                setSelected(iso);
                setShowDays(false);
              }}>
              <Text style={[styles.dayChipText, iso === selected && styles.dayChipTextOn]}>
                {iso === todayISO() ? 'Today' : shortDate(iso)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {started ? (
        <DayEditor
          key={`${selected}:${existing?.skipped ? 'skip' : 'open'}`}
          entryDate={selected}
          existing={existing}
          onSave={props.onSave}
        />
      ) : null}
    </View>
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
  const [message, setMessage] = useState<string | null>(
    existing?.skipped ? 'This day was left blank. You can fill it in now.' : null,
  );
  const [error, setError] = useState<string | null>(null);

  function setScore(key: SymptomKey, value: number) {
    setScores(current => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function save(skipped: boolean) {
    setSaving(true);
    setError(null);
    try {
      await onSave({ entry_date: entryDate, skipped, ...(skipped ? emptyScores() : scores) });
      setMessage(skipped ? 'Day left blank. That does not count against you.' : 'Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this check-in.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.legend}>0 · None</Text>
          <Text style={styles.legend}>4 · Severe</Text>
        </View>
        {SYMPTOMS.map((symptom, index) => (
          <View key={symptom.key} style={[styles.symptom, index === 0 && styles.symptomFirst]}>
            <Text style={styles.symptomTitle}>{symptom.label}</Text>
            <View style={styles.scale}>
              {[0, 1, 2, 3, 4].map(value => {
                const on = scores[symptom.key] === value;
                return (
                  <Pressable key={value} style={[styles.scaleBtn, on && styles.scaleBtnOn]} onPress={() => setScore(symptom.key, value)}>
                    <Text style={[styles.scaleText, on && styles.scaleTextOn]}>{value}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.save, (!isComplete(scores) || saving) && styles.saveOff]}
        disabled={!isComplete(scores) || saving}
        onPress={() => save(false)}>
        <Text style={styles.saveText}>
          {saving ? 'Saving…' : entryDate === todayISO() ? "Save today's check-in →" : `Save ${shortDate(entryDate)} →`}
        </Text>
      </Pressable>
      {!isComplete(scores) ? <Text style={styles.hint}>Choose a score for each symptom to save.</Text> : null}
      <Text style={styles.fine}>
        Your answers are private. This check-in is not a diagnosis or emergency monitoring service.
      </Text>
      <Pressable onPress={() => save(true)} disabled={saving}>
        <Text style={styles.skip}>Skip this day</Text>
      </Pressable>
      {message ? <Text style={styles.note}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Progress({ checkIns, startedOn, day }: JournalProps & { day: number }) {
  const window = chartWindow(startedOn);
  const weeks = weekWindow(startedOn);
  return (
    <View>
      <Text style={styles.pageTitle}>Progress</Text>
      <Text style={styles.lede}>Lower is quieter. Bars show the last few weeks of your program.</Text>
      <Text style={styles.prompt}>
        Day {day} · {percent(completionRate(checkIns, startedOn))} of days acknowledged
      </Text>
      <View style={styles.card}>
        {SYMPTOMS.map((symptom, index) => {
          const values = dailyValues(checkIns, symptom.key, window.from, window.to);
          const trend = trendFor(
            averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo))[symptom.key],
            averages(inRange(checkIns, weeks.previousFrom, weeks.previousTo))[symptom.key],
          );
          return (
            <View key={symptom.key} style={[styles.symptom, index === 0 && styles.symptomFirst]}>
              <View style={styles.row}>
                <Text style={styles.symptomTitle}>{symptom.label}</Text>
                <Text style={[styles.trend, trend === 'improving' && styles.ease, trend === 'higher' && styles.clay]}>
                  {trendLabel(trend)}
                </Text>
              </View>
              <View style={styles.bars}>
                {values.map((value, barIndex) => (
                  <View
                    key={`${symptom.key}-${barIndex}`}
                    style={[
                      styles.bar,
                      {
                        height: value === null ? 3 : 8 + (value / 4) * 48,
                        opacity: value === null ? 0.18 : 0.88,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Report({ checkIns, startedOn, fullName, day }: JournalProps & { day: number }) {
  const weeks = weekWindow(startedOn);
  const weekAvg = averages(inRange(checkIns, weeks.currentFrom, weeks.currentTo));
  const lines = observations(checkIns, startedOn);
  const span = baselineVsRecent(checkIns);
  const closing = day >= PROGRAM_DAYS || span.count >= 14;
  const text = useMemo(() => reportText({ fullName, startedOn, checkIns }), [fullName, startedOn, checkIns]);

  return (
    <View>
      <Text style={styles.pageTitle}>Report</Text>
      <Text style={styles.lede}>A weekly note you and your coach can read together.</Text>
      <Text style={styles.blockTitle}>
        This week · {shortDate(weeks.currentFrom)} – {shortDate(weeks.currentTo)}
      </Text>
      {SYMPTOMS.map(symptom => (
        <View key={symptom.key} style={styles.reportRow}>
          <Text style={styles.reportLabel}>{symptom.label}</Text>
          <Text style={styles.reportValue}>{formatScore(weekAvg[symptom.key])}</Text>
        </View>
      ))}
      <Text style={styles.blockTitle}>What changed</Text>
      {lines.map(line => (
        <Text key={line} style={styles.obs}>
          {line}
        </Text>
      ))}
      <View style={styles.reportRow}>
        <Text style={styles.reportLabel}>Days acknowledged</Text>
        <Text style={styles.reportValue}>{percent(completionRate(checkIns, startedOn))}</Text>
      </View>
      <Text style={styles.blockTitle}>{day >= PROGRAM_DAYS ? 'End of program' : 'Since you began'}</Text>
      {closing ? (
        SYMPTOMS.map(symptom => (
          <View key={symptom.key} style={styles.reportRow}>
            <Text style={styles.reportLabel}>{symptom.label}</Text>
            <Text style={styles.reportValue}>
              {formatScore(span.first[symptom.key])} → {formatScore(span.last[symptom.key])}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.obs}>The longer view opens once two weeks of check-ins are here.</Text>
      )}
      <Text style={styles.fine}>
        Averages use 0 for none and 4 for severe. A lower number is a quieter day. This checklist is not a clinical diagnosis.
      </Text>
      <Pressable style={styles.save} onPress={() => Share.share({ message: text })}>
        <Text style={styles.saveText}>Share this report</Text>
      </Pressable>
    </View>
  );
}

function Account(props: JournalProps & { day: number; onClose: () => void }) {
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

  async function download() {
    const payload = {
      exported_at: new Date().toISOString(),
      full_name: props.fullName,
      started_on: props.startedOn,
      check_ins: props.checkIns,
    };
    await Share.share({ message: JSON.stringify(payload, null, 2) });
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

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.sheetWrap} behavior="padding">
      <Pressable style={styles.sheetBackdrop} onPress={props.onClose} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.sheetScroll}
        contentContainerStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.row}>
          <Text style={styles.pageTitle}>{props.fullName}</Text>
          <Pressable onPress={props.onClose}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.prompt}>
          Day {props.day} of {PROGRAM_DAYS}
        </Text>
        <View style={styles.row}>
          <Text>Daily reminder</Text>
          <Switch value={optIn} onValueChange={setOptIn} trackColor={{ true: colors.sage, false: colors.line }} />
        </View>
        <View style={styles.hours}>
          {[7, 8, 9, 20, 21].map(value => (
            <Pressable key={value} style={[styles.dayChip, hour === value && styles.dayChipOn]} onPress={() => setHour(value)}>
              <Text style={[styles.dayChipText, hour === value && styles.dayChipTextOn]}>{String(value).padStart(2, '0')}:00</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.recall}>Saved on your account. This phone sends it after notifications are allowed.</Text>
        <Pressable style={[styles.ghost, pending === 'reminder' && styles.saveOff]} onPress={saveReminder} disabled={pending !== null}>
          <Text style={styles.ghostText}>{pending === 'reminder' ? 'Saving…' : 'Save reminder'}</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={download}>
          <Text style={styles.ghostText}>Download my data</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Optional note for deletion"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          style={[styles.ghost, (props.deletionPending || pending === 'deletion') && styles.saveOff]}
          onPress={requestDeletion}
          disabled={props.deletionPending || pending !== null}>
          <Text style={styles.ghostText}>
            {props.deletionPending ? 'Deletion already requested' : pending === 'deletion' ? 'Sending…' : 'Request deletion'}
          </Text>
        </Pressable>
        {props.onSignOut ? (
          <Pressable onPress={() => props.onSignOut?.()}>
            <Text style={styles.skip}>Sign out</Text>
          </Pressable>
        ) : null}
        {message ? <Text style={styles.note}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  scroll: { paddingHorizontal: 22, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  private: { marginTop: 2, fontSize: 10, letterSpacing: 4, color: '#5d6c64' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3ece2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: serif, fontSize: 18, color: colors.forest },
  eyebrow: { marginTop: 28, fontSize: 11, letterSpacing: 2.4, color: '#7d8b82' },
  greeting: { marginTop: 12, fontFamily: serif, fontSize: 44, lineHeight: 46, color: colors.forest },
  lede: { marginTop: 14, color: colors.muted, fontSize: 16, lineHeight: 22 },
  journey: { marginTop: 22, backgroundColor: colors.mist, borderRadius: 22, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  journeyTitle: { fontSize: 16, fontWeight: '600', color: colors.forest },
  day: { color: '#6f8778', fontSize: 15 },
  track: { marginTop: 14, height: 6, borderRadius: 99, backgroundColor: colors.track, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: colors.forest },
  journeyNote: { marginTop: 12, color: colors.muted, fontSize: 14 },
  sectionHead: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: serif, fontSize: 32, color: colors.forest },
  pill: { backgroundColor: '#e5efe4', color: '#5e7364', borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7, fontSize: 13 },
  prompt: { marginTop: 8, color: colors.muted, fontSize: 15, lineHeight: 21 },
  recall: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 18 },
  changeDay: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 8 },
  link: { color: '#5e7364', textDecorationLine: 'underline', fontSize: 15 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  dayChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  dayChipText: { color: colors.forest, fontSize: 12 },
  dayChipTextOn: { color: colors.paper },
  card: { marginTop: 16, backgroundColor: colors.paper, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: 'rgba(28,51,44,0.05)' },
  legend: { color: '#8b948e', fontSize: 13 },
  symptom: { paddingTop: 14, marginTop: 14, borderTopWidth: 1, borderTopColor: '#eceee9' },
  symptomFirst: { borderTopWidth: 0, marginTop: 8, paddingTop: 4 },
  symptomTitle: { fontSize: 16, fontWeight: '600', color: colors.forest, marginBottom: 12 },
  scale: { flexDirection: 'row', gap: 8 },
  scaleBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dfd8',
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  scaleText: { fontSize: 16, color: colors.forest },
  scaleTextOn: { color: colors.ivory },
  save: { marginTop: 18, height: 56, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  saveOff: { opacity: 0.45 },
  saveText: { color: colors.inkOnSage, fontSize: 16 },
  fine: { marginTop: 14, textAlign: 'center', color: '#8a918b', fontSize: 12.5, lineHeight: 18 },
  hint: { marginTop: 12, textAlign: 'center', color: colors.muted, fontSize: 14 },
  skip: { marginTop: 12, color: colors.muted, fontSize: 15 },
  note: { marginTop: 8, color: colors.ease, fontSize: 14 },
  error: { marginTop: 8, color: colors.clay, fontSize: 14 },
  pageTitle: { marginTop: 18, fontFamily: serif, fontSize: 40, color: colors.forest },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 3 },
  bar: { flex: 1, backgroundColor: colors.forest, borderRadius: 2 },
  trend: { color: colors.muted, fontSize: 13 },
  ease: { color: colors.ease },
  clay: { color: colors.clay },
  blockTitle: { marginTop: 20, marginBottom: 6, fontSize: 15, fontWeight: '600' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line },
  reportLabel: { fontSize: 15, color: colors.forest },
  reportValue: { fontSize: 15, fontWeight: '600', color: colors.forest },
  obs: { fontSize: 15, lineHeight: 22, color: colors.forest, marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(28,51,44,0.06)',
    backgroundColor: colors.ivory,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, color: colors.quiet },
  tabLabelOn: { color: colors.forest, fontWeight: '600' },
  sheetWrap: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,51,44,0.28)' },
  sheetScroll: { maxHeight: '85%', flexGrow: 0 },
  sheet: { backgroundColor: colors.ivory, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 8 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ghost: { marginTop: 8, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#d7dfd8', alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.forest },
  input: { marginTop: 8, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#d5ddd6', backgroundColor: colors.paper, paddingHorizontal: 12 },
});
