import { create } from 'zustand';

interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => void;
}

const TOKEN_KEY = 'mm_auth_token';
const USER_KEY  = 'mm_auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ loading: false, error: msg });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, error: null });
  },

  restoreSession: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw   = localStorage.getItem(USER_KEY);
      if (token && raw) {
        const user = JSON.parse(raw) as AuthUser;
        set({ token, user });
      }
    } catch {
      // corrupted storage — ignore
    }
  },
}));

/** Returns the stored token synchronously (for non-hook contexts like useApi). */
export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
