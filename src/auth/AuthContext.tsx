import { createContext } from "react";

export type AuthUser = {
  id: string;
  username: string;
  role: string;
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  permissions: string[];
  login: (_email: string, _password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (_permission: string) => boolean;
  loading: boolean;
};

export const AuthContext = createContext<AuthState | undefined>(undefined);
