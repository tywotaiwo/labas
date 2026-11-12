import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { colors, serif } from '../theme';

type Props = {
  onSignedIn: () => void;
};

export function LoginScreen({ onSignedIn }: Props) {
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: boolean) {
    setCreating(next);
    setError(null);
    setInfo(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setInfo(null);
    const address = email.trim();

    if (creating) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: address,
        password,
        options: { data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('An account with this email already exists. Sign in instead.');
        return;
      }
      if (!data.session) {
        setInfo('Check your email to confirm the account, then sign in.');
        setCreating(false);
        return;
      }
      onSignedIn();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    onSignedIn();
  }

  const passwordTooShort = creating && password.length > 0 && password.length < 8;
  const emailReady = email.trim().includes('@');
  const canSubmit =
    !loading &&
    emailReady &&
    password.length > 0 &&
    (!creating || (name.trim().length > 0 && password.length >= 8));
  const hint = passwordTooShort
    ? 'Use at least 8 characters.'
    : creating && password.length >= 8 && name.trim().length === 0
      ? 'Add your name.'
      : creating && password.length >= 8 && name.trim().length > 0 && !emailReady
        ? 'Add a valid email.'
        : !creating && password.length > 0 && !emailReady
          ? 'Add a valid email.'
          : !creating && emailReady && password.length === 0
            ? 'Enter your password.'
            : creating
              ? 'At least 8 characters.'
              : null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}>
      <Logo />
      <Text style={styles.brand}>LABAS.</Text>
      <Text style={styles.private}>PRIVATE</Text>
      <Text style={styles.title}>{creating ? 'Create your space.' : 'Welcome back.'}</Text>
      <Text style={styles.lede}>
        {creating
          ? 'Use your email and a password. Your ninety days begin when the account is open.'
          : 'Sign in with the email and password for your private space.'}
      </Text>
      {supabaseConfigured ? (
        <>
          {creating ? (
            <TextInput
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          ) : null}
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
          />
          {hint ? (
            <Text style={hint === 'At least 8 characters.' || hint === 'Enter your password.' ? styles.hint : styles.error}>{hint}</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.lede}>{info}</Text> : null}
          <Pressable
            style={[styles.primary, !canSubmit && styles.disabled]}
            onPress={submit}
            disabled={!canSubmit}>
            <Text style={styles.primaryText}>
              {loading ? (creating ? 'Creating…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => switchMode(!creating)}>
            <Text style={styles.secondaryText}>{creating ? 'I already have an account' : 'Create an account'}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.lede}>Add Supabase keys to mobile/.env and rebuild.</Text>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { marginTop: 10, fontFamily: serif, fontSize: 28, color: colors.forest },
  private: { marginTop: 6, letterSpacing: 4, fontSize: 10, color: '#5d6c64' },
  title: { marginTop: 28, fontFamily: serif, fontSize: 42, color: colors.forest },
  lede: { marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 22 },
  input: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5ddd6',
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    color: colors.forest,
  },
  primary: { marginTop: 16, height: 48, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.ivory },
  disabled: { opacity: 0.45 },
  hint: { marginTop: 10, color: colors.muted, fontSize: 14 },
  secondary: { marginTop: 12, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#c9d2cb', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.forest },
  error: { marginTop: 10, color: colors.clay },
});
