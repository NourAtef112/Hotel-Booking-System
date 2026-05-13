/**
 * app/_layout.tsx
 * Root layout for the entire app.
 * Wraps everything in AuthProvider and runs the JWT-based route guard.
 *
 * Guard logic:
 *   • No token + not on (auth) route  →  push to /(auth)/login
 *   • Has token + on (auth) route     →  push to /(tabs)
 *   • All other cases                 →  render normally
 */

import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';

function RouteGuard() {
  const { token, isLoading } = useAuthContext();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait for SecureStore to resolve

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace(ROUTES.LOGIN);     // Not authenticated → force to login
    } else if (token && inAuthGroup) {
      router.replace(ROUTES.HOME);     // Authenticated → skip auth screens
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  );
}
