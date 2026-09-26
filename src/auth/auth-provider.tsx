import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import { authBackend, type AuthUser } from '@/auth/auth-backend';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    let currentId: string | null | undefined; // undefined until the first result
    const apply = (next: AuthUser | null) => {
      if (!active) return;
      const nextId = next?.id ?? null;
      // Never show one user's cached data to another.
      if (currentId !== undefined && currentId !== nextId) queryClient.clear();
      currentId = nextId;
      setUser(next);
      setStatus(next ? 'signedIn' : 'signedOut');
    };
    authBackend
      .getUser()
      .then(apply)
      .catch(() => apply(null));
    const unsubscribe = authBackend.subscribe(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const value: AuthContextValue = {
    status,
    user,
    sendCode: (email) => authBackend.sendCode(email),
    verifyCode: (email, code) => authBackend.verifyCode(email, code),
    signOut: () => authBackend.signOut(),
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
