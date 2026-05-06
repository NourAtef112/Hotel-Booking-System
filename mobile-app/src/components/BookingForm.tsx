import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

/**
 * BookingForm — Date selection and submission form.
 * Embedded inside BookingScreen.
 * TODO: Integrate date picker library (e.g., react-native-date-picker)
 * TODO: Emit onSubmit with form data
 */
interface BookingFormProps {
  roomId: number;
  pricePerNight: number;
  onSubmit: (data: { checkIn: string; checkOut: string; specialRequests?: string }) => void;
  loading?: boolean;
}

export default function BookingForm({ roomId, pricePerNight, onSubmit, loading }: BookingFormProps) {
  // TODO: useState for checkIn, checkOut, specialRequests
  // TODO: Compute total nights and total price
  // TODO: Validate check_out > check_in

  const handleSubmit = () => {
    // TODO: call onSubmit({ checkIn, checkOut, specialRequests })
  };

  return (
    <View>
      {/* TODO: Check-in DatePicker */}
      {/* TODO: Check-out DatePicker */}
      {/* TODO: Nights count + total price display */}
      {/* TODO: Special requests TextInput */}
      {/* TODO: Submit button */}
      <Text>BookingForm — Stub</Text>
    </View>
  );
}
