import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT";
  school: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuth: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuth: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuth: true }),

      setToken: (accessToken) => set({ accessToken }),

      logout: () => set({ user: null, accessToken: null, isAuth: false }),
    }),
    {
      name: "educore-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuth: state.isAuth,
      }),
    },
  ),
);
