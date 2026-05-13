/**
 * useAuth.ts
 * Re-exports useAuthContext under a shorter name.
 * Components import from here — never directly from AuthContext.
 */

export { useAuthContext as useAuth } from '../context/AuthContext';
