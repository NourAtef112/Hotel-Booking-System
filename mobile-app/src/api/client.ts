/**
 * client.ts
 * Axios instance for the Hotel Booking System API.
 * Reads JWT from SecureStore and attaches it as a Bearer token.
 * Clears the token automatically on 401 responses.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Attach stored JWT to every outgoing request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: delete the token — AuthContext will react and route guard will redirect
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt');
    }
    return Promise.reject(error);
  },
);
