import React from 'react';
import { View, Text } from 'react-native';

/**
 * BookingScreen — Room booking form.
 * Receives room_id from navigation params.
 * TODO: Render check-in / check-out date pickers
 * TODO: Calculate total price dynamically
 * TODO: Submit via useBooking() hook
 * TODO: Navigate to BookingConfirmationScreen on success
 */
export default function BookingScreen() {
  // TODO: const route = useRoute();
  // TODO: const { roomId } = route.params;
  // TODO: const { createBooking, loading, error } = useBooking();

  const handleSubmit = () => {
    // TODO: call createBooking({ room_id, check_in_date, check_out_date, special_requests })
  };

  return (
    <View>
      {/* TODO: Room summary card */}
      {/* TODO: Check-in date picker */}
      {/* TODO: Check-out date picker */}
      {/* TODO: Total price display */}
      {/* TODO: Special requests input */}
      {/* TODO: Confirm booking button → handleSubmit() */}
      <Text>BookingScreen — Stub</Text>
    </View>
  );
}
