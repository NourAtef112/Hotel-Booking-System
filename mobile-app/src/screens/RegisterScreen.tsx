import React from 'react';
import { View, Text } from 'react-native';

/**
 * RegisterScreen — New user registration form.
 * TODO: Integrate useAuth() hook
 * TODO: Validate all fields (name, email, password, role, university_id)
 * TODO: Navigate to LoginScreen on success
 */
export default function RegisterScreen() {
  // TODO: const { register, loading, error } = useAuth();

  const handleRegister = () => {
    // TODO: call register(formData)
  };

  return (
    <View>
      {/* TODO: Full name input */}
      {/* TODO: Email input */}
      {/* TODO: Password input */}
      {/* TODO: Role picker (student / staff / guest) */}
      {/* TODO: University ID input (conditional on role) */}
      {/* TODO: Register button → handleRegister() */}
      <Text>RegisterScreen — Stub</Text>
    </View>
  );
}
