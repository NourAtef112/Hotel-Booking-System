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
