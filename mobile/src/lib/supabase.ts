import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const rawUrl = (Config.SUPABASE_URL ?? '').trim();
const rawKey = (Config.SUPABASE_ANON_KEY ?? '').trim();

const supabaseUrl = rawUrl || 'https://missing-env.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-missing-anon-key';

if (__DEV__ && (!rawUrl || !rawKey)) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY missing from .env');
}

export const supabaseConfigured = Boolean(rawUrl && rawKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
