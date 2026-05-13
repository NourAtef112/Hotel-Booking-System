/**
 * AuthContext.tsx
 * Provides JWT token state and helpers to the entire app.
 * Token is persisted in expo-secure-store under the key 'jwt'.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'jwt';

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token from secure storage on first mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(JWT_KEY);
        setToken(stored ?? null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string) => {
    await SecureStore.setItemAsync(JWT_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(JWT_KEY);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
