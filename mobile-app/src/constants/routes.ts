/**
 * routes.ts
 * Single source of truth for all Expo Router route strings.
 * Import these constants instead of inline string literals.
 */

export const ROUTES = {
  LOGIN:    '/(auth)/login'    as const,
  HOME:     '/(tabs)'          as const,
  BOOKINGS: '/(tabs)/bookings' as const,
  PROFILE:  '/(tabs)/profile'  as const,
} as const;
