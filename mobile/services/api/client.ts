import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { TokenStorage } from '../storage/token.storage';

// Determine default backend host:
// In dev on Android emulator: 10.0.2.2
// On iOS simulator / web: localhost
// Or custom EXPO_PUBLIC_API_URL / local LAN IP
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Detect host from Expo Constants (works with Expo Go on physical device)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return "http://" + ip + ":3000";
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Format errors nicely
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.response?.data) {
      const data = error.response.data;
      if (Array.isArray(data.message)) {
        errorMessage = data.message.join(', ');
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      }
    } else if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check your internet connection or server status.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please try again.';
    }

    return Promise.reject(new Error(errorMessage));
  },
);
