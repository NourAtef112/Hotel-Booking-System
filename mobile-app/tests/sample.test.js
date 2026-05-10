import React from 'react';
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';

const SampleComponent = () => (
  <View>
    <Text>Hello, Expo!</Text>
  </View>
);

describe('SampleComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<SampleComponent />);
    expect(getByText('Hello, Expo!')).toBeTruthy();
  });
});
