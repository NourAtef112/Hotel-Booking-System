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
