// Session lives in useAuthStore (Zustand + sessionStorage) directly — no
// network round trip, so this reads it reactively instead of a useQuery.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { localAuthService } from '../services/localAuthService';
import { useAuthStore } from './useAuthStore';

/** The currently signed-in local persona, if any. */
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  return {
    data: user ?? undefined,
    isPending: false,
    isError: !user,
  };
}

export type RoleCategory = 'administrator' | 'supervisor' | 'analyst' | 'investigator';

/**
 * Classifies the signed-in user's real Catalyst role name into one of a
 * small set of workspace categories, by keyword — the same pattern-matching
 * approach used everywhere else in this app for schema/data we don't
 * control the exact wording of (statusTone, priorityTone, findColumnByPattern).
 * "Investigator" is the base/default category: the frontline case-working
 * role, and what anyone with an unrecognized or missing role name falls
 * back to.
 *
 * Client-side UX only (default landing page, nav emphasis) — never the
 * authorization boundary. The real check has to happen server-side once
 * Functions exist; this just tailors what's shown, it doesn't restrict data.
 */
export function useUserRoleCategory(): RoleCategory {
  const { data: user } = useCurrentUser();
  const roleName = user?.role_details?.role_name ?? '';
  if (/admin/i.test(roleName)) return 'administrator';
  if (/(supervisor|commander|chief|manager)/i.test(roleName)) return 'supervisor';
  if (/(analyst|intelligence)/i.test(roleName)) return 'analyst';
  return 'investigator';
}

/**
 * Client-side UX gating only (hide/show nav) — never the authorization
 * boundary. The real check has to happen server-side once Functions exist;
 * this just avoids showing an Administrator-only console to everyone.
 */
export function useIsAdministrator(): boolean {
  return useUserRoleCategory() === 'administrator';
}

/** Checks email/password against the local persona roster and starts a session. */
export function useSignIn() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const user = localAuthService.signIn(email, password);
      if (!user) {
        throw new Error('Incorrect email or password.');
      }
      setSession(user);
      return user;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: async () => {
      clearSession();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
