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
