import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Access the variables directly from process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Configure storage based on platform
const getStorage = () => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  }
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: Platform.OS !== 'web' || typeof window !== 'undefined',
    detectSessionInUrl: Platform.OS === 'web',
  },
});