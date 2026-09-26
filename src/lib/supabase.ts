import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '@/lib/config';

let client: SupabaseClient | null = null;

/** The Supabase client. Only valid outside demo mode (config.useMocks). */
export function getSupabase(): SupabaseClient {
  if (config.useMocks) throw new Error('Supabase is not used in demo mode');
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    if (Platform.OS !== 'web') {
      // Only refresh tokens while the app is in the foreground.
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
