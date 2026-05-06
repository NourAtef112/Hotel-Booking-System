import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

/**
 * Header — Top navigation bar component.
 * Shows title, optional back button, and user avatar.
 * TODO: Integrate with navigation stack
 */
interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showBack = false, onBack }: HeaderProps) {
  return (
    <View>
      {showBack && (
        <TouchableOpacity onPress={onBack}>
          {/* TODO: Back arrow icon */}
          <Text>←</Text>
        </TouchableOpacity>
      )}
      <Text>{title}</Text>
      {/* TODO: User avatar / profile icon */}
    </View>
  );
}
