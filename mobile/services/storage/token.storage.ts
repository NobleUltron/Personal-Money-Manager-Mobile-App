import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'pmm_access_token';
const REFRESH_TOKEN_KEY = 'pmm_refresh_token';

export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to save access token:', e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to save refresh token:', e);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to clear tokens:', e);
    }
  },
};
