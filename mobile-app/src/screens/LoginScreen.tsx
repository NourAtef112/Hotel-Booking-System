import React from 'react';
import { View, Text } from 'react-native';

/**
 * LoginScreen — User login form.
 * TODO: Integrate useAuth() hook
 * TODO: Validate email + password fields
 * TODO: Navigate to HomeScreen on success
 * TODO: Show error message on invalid credentials
 */
export default function LoginScreen() {
  // TODO: const { login, loading, error } = useAuth();

  const handleLogin = () => {
    // TODO: call login(email, password)
  };

  return (
    <View>
      {/* TODO: Email input */}
      {/* TODO: Password input */}
      {/* TODO: Login button → handleLogin() */}
      {/* TODO: Link to RegisterScreen */}
      <Text>LoginScreen — Stub</Text>
    </View>
  );
}
