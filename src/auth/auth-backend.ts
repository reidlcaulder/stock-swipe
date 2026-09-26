import { config } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Email one-time-code sign-in, implemented by Supabase Auth or a demo stand-in. */
export interface AuthBackend {
  getUser(): Promise<AuthUser | null>;
  /** Calls back with the current user whenever the session changes. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

const supabaseAuth: AuthBackend = {
  async getUser() {
    const { data } = await getSupabase().auth.getSession();
    const user = data.session?.user;
    return user ? { id: user.id, email: user.email ?? null } : null;
  },
  subscribe(listener) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      listener(user ? { id: user.id, email: user.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  },
  async sendCode(email) {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  },
  async verifyCode(email, code) {
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  },
};

// Demo mode: any 6-digit code signs in; nothing is persisted.
let demoUser: AuthUser | null = null;
const demoListeners = new Set<(user: AuthUser | null) => void>();
const setDemoUser = (user: AuthUser | null) => {
  demoUser = user;
  demoListeners.forEach((listener) => listener(user));
};

const demoAuth: AuthBackend = {
  async getUser() {
    return demoUser;
  },
  subscribe(listener) {
    demoListeners.add(listener);
    return () => demoListeners.delete(listener);
  },
  async sendCode() {},
  async verifyCode(email, code) {
    if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code');
    setDemoUser({ id: 'demo-user', email });
  },
  async signOut() {
    setDemoUser(null);
  },
};

export const authBackend: AuthBackend = config.useMocks ? demoAuth : supabaseAuth;
