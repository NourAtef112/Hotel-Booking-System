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
