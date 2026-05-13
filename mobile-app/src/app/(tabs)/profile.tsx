/**
 * (tabs)/profile.tsx
 * Profile screen — React Hook Form + Zod.
 * Fetches user data on mount, allows editing name and phone,
 * saves via PATCH /auth/profile, and provides a logout button.
 */

import React, { useEffect, useState } from 'react';
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

import { profileSchema, ProfileFormValues } from '../../schemas/authSchemas';
import { FormInput } from '../../components/FormInput';
import { useAuthContext } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function ProfileScreen() {
  const { logout } = useAuthContext();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  // Load user profile on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get<ProfileFormValues>('/auth/me');
        reset({ name: data.name ?? '', email: data.email ?? '', phone: data.phone ?? '' });
      } catch {
        setLoadError('Could not load profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    setSaveState('saving');
    setSaveError(null);
    try {
      await apiClient.patch('/auth/profile', {
        name:  data.name,
        phone: data.phone || undefined,
      });
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Save failed. Please try again.';
      setSaveError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setSaveState('error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadErrorText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>My Profile</Text>

        {saveState === 'success' ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>Profile updated successfully.</Text>
          </View>
        ) : null}

        {saveError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        <FormInput<ProfileFormValues>
          name="name"
          control={control}
          label="Full name"
          placeholder="Your name"
          autoCapitalize="words"
          error={errors.name?.message}
        />

        <FormInput<ProfileFormValues>
          name="email"
          control={control}
          label="Email address"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false}          // email is read-only
          error={errors.email?.message}
        />

        <FormInput<ProfileFormValues>
          name="phone"
          control={control}
          label="Phone number (optional)"
          placeholder="+201234567890"
          keyboardType="phone-pad"
          error={errors.phone?.message}
        />

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          {isSubmitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveButtonText}>Save Changes</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:             { flex: 1, backgroundColor: '#FFFFFF' },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container:        { flexGrow: 1, padding: 24, paddingTop: 60 },
  title:            { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  successBanner:    { backgroundColor: '#D1FAE5', borderRadius: 8, padding: 12, marginBottom: 16 },
  successText:      { color: '#065F46', fontSize: 14 },
  errorBanner:      { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorBannerText:  { color: '#B91C1C', fontSize: 14 },
  loadErrorText:    { color: '#B91C1C', fontSize: 15, textAlign: 'center' },
  saveButton:       { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  buttonDisabled:   { opacity: 0.6 },
  saveButtonText:   { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  logoutButton:     { borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
