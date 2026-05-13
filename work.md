# Golden Prompt — Issues #9 & #10
# Hotel Booking System · Mobile App (Expo / React Native)

---

## 0. YOUR IDENTITY & MISSION

You are a senior React Native engineer. Your job is to fully resolve **Issue #9
(Navigation & Route Guarding)** and **Issue #10 (Screen Scaffolding & Form UX)**
for the University Guest Housing Booking System mobile app.

You will:
1. Create and check out the correct Git branch from `main`
2. Update `.gitignore` to protect secrets and generated files
3. Install all required npm packages
4. Create every file listed — complete, working code, no pseudocode
5. Write the two required documentation files
6. Print a final checklist confirming every deliverable is done

Do **not** ask clarifying questions. Do **not** skip steps. Execute everything in order.

---

## 1. REPOSITORY CONTEXT

```
Repository : https://github.com/NourAtef112/Hotel-Booking-System
Base branch: main
Tech stack  : Expo SDK (latest stable) · TypeScript · Expo Router
              React Hook Form · Zod · expo-secure-store · axios
              @expo/vector-icons
```

**Existing repo layout (relevant files only):**
```
Hotel-Booking-System/
├── mobile-app/
│   ├── src/                 ← all new mobile code goes here
│   └── package.json
├── backend/
│   └── main.py              ← FastAPI: routers /auth /rooms /bookings /admin
├── docs/
│   └── validation.md        ← EXISTS — do NOT touch or overwrite
├── gherkin/
│   ├── booking.feature
│   └── admin.feature
├── .gitignore               ← EXISTS — you will APPEND to it, not replace it
└── docker-compose.yml
```

**Backend auth contract:**
```
POST  /auth/login      body: { email, password }              → { access_token: string }
GET   /auth/me         header: Authorization: Bearer <token>  → { name, email, phone }
PATCH /auth/profile    header: Authorization: Bearer <token>
                       body:   { name?, phone? }              → 200 OK
```

---

## 2. GIT SETUP  (do this FIRST, before touching any file)

Run these commands exactly:

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create and switch to the feature branch
git checkout -b feature/navigation-and-screens

# Confirm
git branch --show-current
# Expected output: feature/navigation-and-screens
```

> Every file created in steps 3–7 lives on this branch.
> Do NOT commit to main directly.

---

## 3. UPDATE .gitignore

**APPEND** the following block to the existing root `.gitignore`.
Do NOT replace the file — use `echo` or open the file and add at the bottom.

```gitignore

# ── Mobile app — environment & secrets ────────────────────────────────────────
mobile-app/.env
mobile-app/.env.local
mobile-app/.env.development
mobile-app/.env.staging
mobile-app/.env.production

# ── Expo generated ────────────────────────────────────────────────────────────
mobile-app/.expo/
mobile-app/dist/
mobile-app/web-build/
mobile-app/expo-env.d.ts

# ── Node ──────────────────────────────────────────────────────────────────────
mobile-app/node_modules/

# ── Native build artefacts ────────────────────────────────────────────────────
mobile-app/android/
mobile-app/ios/
mobile-app/*.jks
mobile-app/*.p8
mobile-app/*.p12
mobile-app/*.mobileprovision
mobile-app/*.orig.*

# ── OS noise ──────────────────────────────────────────────────────────────────
.DS_Store
Thumbs.db

# ── IDE ───────────────────────────────────────────────────────────────────────
.idea/
.vscode/settings.json
*.swp
*.swo
```

---

## 4. INSTALL PACKAGES

```bash
cd mobile-app

npx expo install expo-secure-store expo-router @expo/vector-icons

npm install axios zod react-hook-form @hookform/resolvers
```

After install, verify these keys exist in `package.json` dependencies:
`expo-secure-store` · `expo-router` · `axios` · `zod` · `react-hook-form` · `@hookform/resolvers`

---

## 5. ISSUE #9 — NAVIGATION & ROUTE GUARDING

### 5.1 Complete file tree to produce

```
mobile-app/src/
├── api/
│   └── client.ts                    ← Axios instance + JWT interceptors
├── constants/
│   └── routes.ts                    ← Typed route constants
├── context/
│   └── AuthContext.tsx              ← Token state, login(), logout()
├── hooks/
│   └── useAuth.ts                   ← Thin alias over useAuthContext
└── app/
    ├── _layout.tsx                  ← ROOT layout: AuthProvider + route guard
    ├── (auth)/
    │   ├── _layout.tsx              ← Stack navigator, no header
    │   └── login.tsx                ← Scaffold (full form added in §6)
    └── (tabs)/
        ├── _layout.tsx              ← Tab navigator: Home · Bookings · Profile
        ├── index.tsx                ← Home stub
        ├── bookings.tsx             ← Bookings stub
        └── profile.tsx             ← Scaffold (full form added in §6)
```

---

### 5.2 FILE: `mobile-app/src/api/client.ts`

```ts
/**
 * client.ts
 * Axios instance for the Hotel Booking System API.
 * Reads JWT from SecureStore and attaches it as a Bearer token.
 * Clears the token automatically on 401 responses.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Attach stored JWT to every outgoing request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: delete the token — AuthContext will react and route guard will redirect
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt');
    }
    return Promise.reject(error);
  },
);
```

---

### 5.3 FILE: `mobile-app/src/constants/routes.ts`

```ts
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
```

---

### 5.4 FILE: `mobile-app/src/context/AuthContext.tsx`

```tsx
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
```

---

### 5.5 FILE: `mobile-app/src/hooks/useAuth.ts`

```ts
/**
 * useAuth.ts
 * Re-exports useAuthContext under a shorter name.
 * Components import from here — never directly from AuthContext.
 */

export { useAuthContext as useAuth } from '../context/AuthContext';
```

---

### 5.6 FILE: `mobile-app/src/app/_layout.tsx`  ← CRITICAL: route guard lives here

```tsx
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
```

---

### 5.7 FILE: `mobile-app/src/app/(auth)/_layout.tsx`

```tsx
/**
 * (auth)/_layout.tsx
 * Stack navigator for unauthenticated screens.
 * Header is hidden — each screen manages its own title.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

---

### 5.8 FILE: `mobile-app/src/app/(auth)/login.tsx`  ← scaffold only at this step

```tsx
/**
 * (auth)/login.tsx
 * Login screen scaffold. Full React Hook Form implementation in §6.4.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {/* Form implemented in Issue #10 — see §6.4 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title:     { fontSize: 28, fontWeight: '600', marginBottom: 32 },
});
```

---

### 5.9 FILE: `mobile-app/src/app/(tabs)/_layout.tsx`

```tsx
/**
 * (tabs)/_layout.tsx
 * Bottom tab navigator for all authenticated screens.
 * Tabs: Home · Bookings · Profile
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',    title: 'Home',     icon: 'home-outline',   iconActive: 'home'   },
  { name: 'bookings', title: 'Bookings', icon: 'list-outline',   iconActive: 'list'   },
  { name: 'profile',  title: 'Profile',  icon: 'person-outline', iconActive: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
```

---

### 5.10 FILE: `mobile-app/src/app/(tabs)/index.tsx`

```tsx
/**
 * (tabs)/index.tsx
 * Home / Room Search tab — stub screen.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Home</Text>
      <Text style={styles.sub}>Room search coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading:   { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  sub:       { fontSize: 15, color: '#6B7280' },
});
```

---

### 5.11 FILE: `mobile-app/src/app/(tabs)/bookings.tsx`

```tsx
/**
 * (tabs)/bookings.tsx
 * My Bookings tab — stub screen.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function BookingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Bookings</Text>
      <Text style={styles.sub}>Booking list coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading:   { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  sub:       { fontSize: 15, color: '#6B7280' },
});
```

---

### 5.12 FILE: `mobile-app/src/app/(tabs)/profile.tsx`  ← scaffold only at this step

```tsx
/**
 * (tabs)/profile.tsx
 * Profile tab scaffold. Full React Hook Form implementation in §6.5.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      {/* Form implemented in Issue #10 — see §6.5 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading:   { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
```

---

### 5.13 FILE: `docs/navigation.md`

Create at repo root `docs/navigation.md`:

```markdown
# Navigation Architecture

## Screen Tree

```
(auth)/                       ← Stack navigator, header hidden
  └── login.tsx               Unauthenticated entry point

(tabs)/                       ← Tab navigator, persistent bottom bar
  ├── index.tsx               Home / Room Search
  ├── bookings.tsx            My Bookings
  └── profile.tsx             User Profile
```

## Route Guard Logic

The root `app/_layout.tsx` wraps the app in `<AuthProvider>` and runs a
`useEffect` after every navigation event:

| Condition | Action |
|---|---|
| No JWT + not on `(auth)` route | `router.replace('/(auth)/login')` |
| Has JWT + is on `(auth)` route | `router.replace('/(tabs)')` |
| All other cases | Render normally — no redirect |

Token is read on app start from `expo-secure-store` (key: `jwt`).
A full-screen `ActivityIndicator` is shown while the store resolves so
the guard never fires before it has real data.

## Auth Flow

```
[Cold start — no JWT]
  └─► /(auth)/login
        └─(POST /auth/login)─► { access_token }
              └─► SecureStore.setItemAsync('jwt')
                    └─► AuthContext.token set
                          └─► route guard ─► /(tabs)

[Cold start — JWT in SecureStore]
  └─► AuthContext.token restored ─► route guard ─► /(tabs)
      (login screen is never shown)

[Logout]
  └─► SecureStore.deleteItemAsync('jwt')
        └─► AuthContext.token = null
              └─► route guard ─► /(auth)/login
```

## Stack vs Tab Decision

| Group | Navigator | Reason |
|---|---|---|
| `(auth)` | `Stack` | No persistent UI; login is a one-shot screen |
| `(tabs)` | `Tabs` | Persistent bottom bar; free navigation between screens |
```

---

## 6. ISSUE #10 — SCREEN SCAFFOLDING & FORM UX

### 6.1 Additional files to produce

```
mobile-app/src/
├── schemas/
│   └── authSchemas.ts           ← Zod schemas + inferred TypeScript types
└── components/
    └── FormInput.tsx             ← Reusable label + input + inline error
```

Plus **replace** the scaffolds from §5.8 and §5.12 with the full implementations below.

---

### 6.2 FILE: `mobile-app/src/schemas/authSchemas.ts`

```ts
/**
 * authSchemas.ts
 * Zod validation schemas for all auth-related forms.
 * Single source of truth for field rules and error messages.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email address'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
});

export type LoginFormValues   = z.infer<typeof loginSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
```

---

### 6.3 FILE: `mobile-app/src/components/FormInput.tsx`

```tsx
/**
 * FormInput.tsx
 * Reusable controlled input for React Hook Form.
 * Renders: label → TextInput → inline error message.
 * Used in Login and Profile screens.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> extends TextInputProps {
  name:    FieldPath<T>;
  control: Control<T>;
  label:   string;
  error?:  string;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  error,
  ...inputProps
}: FormInputProps<T>) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, error ? styles.inputError : undefined]}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value as string}
            placeholderTextColor="#9CA3AF"
            {...inputProps}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: '#EF4444' },
  errorText:  { fontSize: 12, color: '#EF4444', marginTop: 4 },
});
```

---

### 6.4 FILE: `mobile-app/src/app/(auth)/login.tsx`  ← REPLACE §5.8 scaffold

```tsx
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
```

---

### 6.5 FILE: `mobile-app/src/app/(tabs)/profile.tsx`  ← REPLACE §5.12 scaffold

```tsx
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
```

---

### 6.6 FILE: `docs/ux_flow.md`

Create at repo root `docs/ux_flow.md`:

```markdown
# UX Flow & Input Validation

## User Journeys

### 1. New / unauthenticated user
1. App opens → `AuthContext` reads `SecureStore` → no JWT found
2. Route guard redirects to `/(auth)/login`
3. User fills Email + Password → Zod validates **on submit** (not on keystroke)
4. If invalid → inline error messages appear below each field; no network call is made
5. If valid → `POST /auth/login` called with `{ email, password }`
6. On success → `access_token` saved to `SecureStore` → `AuthContext.token` updated
7. Route guard detects token → `router.replace('/(tabs)')` → Home screen

### 2. Returning user (JWT already in SecureStore)
1. App opens → `AuthContext` reads JWT from `SecureStore`
2. Route guard sees valid token → `router.replace('/(tabs)')` immediately
3. Login screen is never shown to the user

### 3. Profile edit
1. User navigates to Profile tab → `GET /auth/me` fires on mount
2. Response pre-populates the form via `reset(userData)`
3. Email field is **read-only** (non-editable `TextInput`)
4. User edits Name and/or Phone → taps "Save Changes"
5. Zod validates → `PATCH /auth/profile` called with `{ name, phone }`
6. On success → green success banner shown for 3 seconds
7. On failure → red error banner with the API error message

### 4. Logout
1. User taps "Log Out" on Profile screen
2. `authContext.logout()` → `SecureStore.deleteItemAsync('jwt')` → `token = null`
3. Route guard detects null token → `router.replace('/(auth)/login')`

---

## Input Validation Rules

| Screen  | Field    | Rule                                          | Error message                              |
|---------|----------|-----------------------------------------------|--------------------------------------------|
| Login   | Email    | Required · valid email format                 | "Invalid email address"                    |
| Login   | Password | Required · minimum 8 characters              | "Password must be at least 8 characters"   |
| Profile | Name     | Required · minimum 2 characters              | "Name must be at least 2 characters"       |
| Profile | Email    | Read-only — not editable by the user          | —                                          |
| Profile | Phone    | Optional · 10–15 digits · optional `+` prefix | "Invalid phone number"                    |

---

## Validation Strategy

| Concern | Decision |
|---|---|
| Schema library | Zod — type-safe, composable, TypeScript inference |
| Form library | React Hook Form with `zodResolver` |
| Validation trigger | On form submit only (not on every keystroke) |
| Error display | Inline, below each field, in red |
| Network error display | Red banner above the form |
| 401 response | `axios` interceptor clears token → route guard redirects to login |
| 422 response | Server error message displayed in the red banner |

---

## Component Responsibility Map

| File | Responsibility |
|---|---|
| `context/AuthContext.tsx` | Owns JWT state; exposes `login()` and `logout()` |
| `hooks/useAuth.ts` | Clean re-export alias |
| `app/_layout.tsx` | Only place that calls `router.replace()` for auth redirects |
| `api/client.ts` | Axios instance; attaches token; handles 401 auto-logout |
| `schemas/authSchemas.ts` | Single source of truth for field rules and error messages |
| `components/FormInput.tsx` | Reusable label + input + error; used in both screens |
| `(auth)/login.tsx` | Login form; calls `login()` on success |
| `(tabs)/profile.tsx` | Profile form; fetches on mount; calls `logout()` on button press |
```

---

## 7. FINAL GIT COMMANDS

After all files are created and verified, commit and push:

```bash
# Return to repo root if still inside mobile-app/
cd ..

# Stage everything
git add .

# Sanity check — confirm only expected files are staged
git status

# Commit referencing both issues
git commit -m "feat(mobile): navigation, route guard, and screen forms

- Expo Router (auth)/(tabs) groups with JWT route guard  [#9]
- AuthContext backed by expo-secure-store                [#9]
- Axios client with JWT request/response interceptors    [#9]
- docs/navigation.md: screen tree + auth flow           [#9]
- Login screen: React Hook Form + Zod + show/hide pw    [#10]
- Profile screen: pre-populated form + save + logout    [#10]
- Reusable FormInput component                          [#10]
- docs/ux_flow.md: journeys + validation table          [#10]
- .gitignore: exclude .env, node_modules, build artefacts

Closes #9
Closes #10"

# Push the branch
git push -u origin feature/navigation-and-screens

# Confirm
git log --oneline -3
```

> Do NOT merge to `main` yourself.
> Open a Pull Request: `feature/navigation-and-screens` → `main`

---

## 8. FULL ACCEPTANCE CHECKLIST

Tick every box before opening the PR.

### Git & branch
- [ ] `git branch --show-current` outputs `feature/navigation-and-screens`
- [ ] `git log --oneline` shows exactly one new commit ahead of `main`
- [ ] Branch has been pushed: `git push -u origin feature/navigation-and-screens`

### .gitignore
- [ ] `mobile-app/.env` is listed
- [ ] `mobile-app/node_modules/` is listed
- [ ] `mobile-app/.expo/` is listed
- [ ] `mobile-app/android/` and `mobile-app/ios/` are listed
- [ ] `*.jks`, `*.p12`, `*.p8` key files are listed
- [ ] `.DS_Store` and `Thumbs.db` are listed

### Issue #9 — Navigation
- [ ] `mobile-app/src/api/client.ts` exists — axios instance with both interceptors
- [ ] `mobile-app/src/context/AuthContext.tsx` exists — token state, login, logout
- [ ] `mobile-app/src/app/_layout.tsx` wraps app in `<AuthProvider>`
- [ ] Route guard redirects unauthenticated user to `/(auth)/login`
- [ ] Route guard redirects authenticated user away from `/(auth)` to `/(tabs)`
- [ ] `(auth)/_layout.tsx` uses `<Stack>` with `headerShown: false`
- [ ] `(tabs)/_layout.tsx` renders **three** tabs: Home · Bookings · Profile with icons
- [ ] `npx expo start` boots with zero TypeScript errors
- [ ] `docs/navigation.md` exists with screen tree + route guard table + auth flow

### Issue #10 — Forms
- [ ] `mobile-app/src/schemas/authSchemas.ts` defines `loginSchema` + `profileSchema`
- [ ] `mobile-app/src/components/FormInput.tsx` exists and is generic over form types
- [ ] Login form shows inline errors **without** a network call when fields are invalid
- [ ] Login password field has a working show/hide toggle button
- [ ] Login form calls `POST /auth/login` and stores JWT on success
- [ ] Profile screen shows `ActivityIndicator` while fetching
- [ ] Profile form pre-populates from `GET /auth/me` via `reset()`
- [ ] Profile email field is non-editable
- [ ] Profile "Save Changes" calls `PATCH /auth/profile` and shows green banner
- [ ] Profile "Log Out" calls `logout()` and route guard redirects to login
- [ ] `FormInput` is used (not duplicated) in both Login and Profile
- [ ] `docs/ux_flow.md` exists with all four journeys + validation table

### Code quality
- [ ] Zero `.js` files anywhere in `mobile-app/src/`
- [ ] No `AsyncStorage` — only `expo-secure-store`
- [ ] No hardcoded secrets, tokens, or API URLs (use `EXPO_PUBLIC_API_URL`)
- [ ] Every created file has a JSDoc block comment at the top

---

## 9. HARD CONSTRAINTS

| Rule | Why it is non-negotiable |
|---|---|
| TypeScript only, no `.js` | Project language standard |
| Functional components + hooks only | No class components |
| No `<form>` element | React Native has no DOM |
| Expo Router file-based routing | Do not use React Navigation directly |
| `expo-secure-store` for JWT, never `AsyncStorage` | AsyncStorage is unencrypted |
| No hardcoded secrets | Use `EXPO_PUBLIC_*` env vars |
| JSDoc at top of every new file | Required for the course defense |
| Axios 401 interceptor must clear token | Session expiry must be automatic |
| Append to `.gitignore`, do not replace | Existing entries must be preserved |
| Branch from `main`, never commit directly to `main` | Git workflow standard |