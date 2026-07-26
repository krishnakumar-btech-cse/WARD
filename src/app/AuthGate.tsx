import type { ReactNode } from 'react';
import { useCurrentUser } from '../hooks/useAuth';
import { LoginPage } from '../features/auth/LoginPage';

/**
 * Resolves the local session before anything else in the app renders.
 * Unauthenticated is a normal, expected state here (not an error banner) —
 * it just means "show the login page."
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isError } = useCurrentUser();

  if (isError) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
