import { useState, useEffect } from 'react';

/**
 * useAuth hook — Manages user authentication state.
 * TODO: Implement login, register, and logout logic using authService.
 * TODO: Store JWT in secure storage (Expo SecureStore).
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => { /* TODO */ };
  const register = async () => { /* TODO */ };
  const logout = async () => { /* TODO */ };

  return { user, isAuthenticated, loading, login, register, logout };
};
