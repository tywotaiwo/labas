import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { LiveSpace } from './src/screens/LiveSpace';
import { LoginScreen } from './src/screens/LoginScreen';
import { supabase } from './src/lib/supabase';
import { colors } from './src/theme';

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onSignedIn={() => undefined} />;
  }

  return <LiveSpace onSignedOut={() => setSession(null)} />;
}

function App() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.ivory} />
        <Root />
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory },
});

export default App;
