// EXPO_PUBLIC_* variables are inlined at build time, so they must be read with
// direct `process.env.NAME` access (no destructuring or dynamic keys).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const config = {
  supabaseUrl,
  supabasePublishableKey,
  /**
   * Demo mode: bundled mock data and a fake sign-in, no backend needed.
   * On when explicitly requested or when Supabase isn't configured yet.
   */
  useMocks:
    process.env.EXPO_PUBLIC_USE_MOCKS === 'true' || !supabaseUrl || !supabasePublishableKey,
} as const;
