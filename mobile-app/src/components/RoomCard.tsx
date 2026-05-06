import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

/**
 * RoomCard — Displays a single room summary.
 * Used in RoomsScreen and HomeScreen.
 * TODO: Implement real styling and navigation
 */
interface RoomCardProps {
  id: number;
  name: string;
  roomType: string;
  pricePerNight: number;
  status: string;
  imageUrl?: string;
  onPress: (roomId: number) => void;
}

export default function RoomCard({ id, name, roomType, pricePerNight, status, onPress }: RoomCardProps) {
  // TODO: Render image thumbnail
  // TODO: Show availability badge
  // TODO: Navigate to BookingScreen on press

  return (
    <TouchableOpacity onPress={() => onPress(id)}>
      <View>
        <Text>{name}</Text>
        <Text>{roomType}</Text>
        <Text>{pricePerNight} EGP / night</Text>
        <Text>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}
