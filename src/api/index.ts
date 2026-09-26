import { mockApi } from '@/api/mock-api';
import { supabaseApi } from '@/api/supabase-api';
import type { Api } from '@/api/types';
import { config } from '@/lib/config';

/** The backend for this build: Supabase, or in-memory mocks in demo mode. */
export const api: Api = config.useMocks ? mockApi : supabaseApi;

export * from '@/api/types';
