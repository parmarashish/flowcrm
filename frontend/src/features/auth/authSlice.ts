import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "team_leader" | "agent";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamLead: string | null;
}

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  hasHydrated: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  hasHydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: PublicUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hasHydrated = true;
    },
    markHydrated(state) {
      state.hasHydrated = true;
    },
    logout(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setCredentials, markHydrated, logout } = authSlice.actions;
export default authSlice.reducer;

export function selectCurrentUser(state: { auth: AuthState }): PublicUser | null {
  return state.auth.user;
}

export function selectToken(state: { auth: AuthState }): string | null {
  return state.auth.token;
}

export function selectHasHydrated(state: { auth: AuthState }): boolean {
  return state.auth.hasHydrated;
}

const AUTH_STORAGE_KEY = "flowcrm_auth";

export function persistAuth(token: string, user: PublicUser): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearPersistedAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readPersistedAuth(): { token: string; user: PublicUser } | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { token: string; user: PublicUser };
  } catch {
    return null;
  }
}
