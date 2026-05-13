/**
 * (auth)/_layout.tsx
 * Stack navigator for unauthenticated screens.
 * Header is hidden — each screen manages its own title.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
