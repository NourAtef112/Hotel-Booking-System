/**
 * (auth)/login.tsx
 * Login screen — React Hook Form + Zod.
 * Submits to POST /auth/login, stores JWT on success, lets the route
 * guard redirect to /(tabs) automatically.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { loginSchema, LoginFormValues } from '../../schemas/authSchemas';
import { FormInput } from '../../components/FormInput';
import { useAuthContext } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

export default function LoginScreen() {
  const { login } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError]         = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      const res = await apiClient.post<{ access_token: string }>('/auth/login', data);
      await login(res.data.access_token);
      // Route guard detects the new token and navigates to /(tabs)
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Login failed. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        ) : null}

        <FormInput<LoginFormValues>
          name="email"
          control={control}
          label="Email address"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email?.message}
        />

        {/* Password field wrapped in a View so the eye button can be overlaid */}
        <View>
          <FormInput<LoginFormValues>
            name="password"
            control={control}
            label="Password"
            placeholder="Min. 8 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            error={errors.password?.message}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {isSubmitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>Sign In</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: '#FFFFFF' },
  container:       { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  title:           { fontSize: 30, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle:        { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  errorBanner:     { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorBannerText: { color: '#B91C1C', fontSize: 14 },
  eyeButton:       { position: 'absolute', right: 14, bottom: 28 },
  button:          { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled:  { opacity: 0.6 },
  buttonText:      { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
