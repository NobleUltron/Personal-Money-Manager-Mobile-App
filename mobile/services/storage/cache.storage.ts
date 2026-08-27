import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CACHE_PREFIX = 'pmm_cache_';

export const CacheStorage = {
  getFilePath(key: string): string {
    return `${FileSystem.documentDirectory || ''}${CACHE_PREFIX}${key}.json`;
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      if (Platform.OS === 'web') {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        return raw ? JSON.parse(raw) : null;
      }

      const path = this.getFilePath(key);
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content) as T;
    } catch (e) {
      console.warn(`[CacheStorage] Failed to read key "${key}":`, e);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (Platform.OS === 'web') {
        localStorage.setItem(`${CACHE_PREFIX}${key}`, serialized);
        return;
      }

      const path = this.getFilePath(key);
      await FileSystem.writeAsStringAsync(path, serialized);
    } catch (e) {
      console.warn(`[CacheStorage] Failed to write key "${key}":`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return;
      }

      const path = this.getFilePath(key);
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch (e) {
      console.warn(`[CacheStorage] Failed to delete key "${key}":`, e);
    }
  },
};