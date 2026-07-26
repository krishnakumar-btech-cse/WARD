import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CatalystUser } from '../types/auth.types';

interface AuthState {
  user: CatalystUser | null;
  setSession: (user: CatalystUser) => void;
  clearSession: () => void;
}

/** The signed-in user, persisted to sessionStorage so a reload doesn't sign you out. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setSession: (user) => set({ user }),
      clearSession: () => set({ user: null }),
    }),
    {
      name: 'ward-auth-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
