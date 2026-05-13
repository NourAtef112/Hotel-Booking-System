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
