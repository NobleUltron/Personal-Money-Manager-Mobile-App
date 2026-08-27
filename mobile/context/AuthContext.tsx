import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';
import { TokenStorage } from '../services/storage/token.storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ requires2FA?: boolean; tempToken?: string; method?: string }>;
  register: (data: { username: string; email?: string; password: string; currency?: string; currency_symbol?: string }) => Promise<void>;
  verify2FA: (code: string, tempToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({}),
  register: async () => {},
  verify2FA: async () => {},
  logout: async () => {},
  updateUserData: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  async function loadStoredUser() {
    try {
      const token = await TokenStorage.getAccessToken();
      if (token) {
        const profile = await authApi.getMe();
        setUser(profile);
      }
    } catch {
      await TokenStorage.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password });
    if (res.requires2FA) {
      return { requires2FA: true, tempToken: res.tempToken, method: res.method };
    }

    if (res.accessToken) {
      await TokenStorage.setAccessToken(res.accessToken);
      if (res.refreshToken) {
        await TokenStorage.setRefreshToken(res.refreshToken);
      }
      setUser(res.user);
    }
    return {};
  }

  async function register(data: { username: string; email?: string; password: string; currency?: string; currency_symbol?: string }) {
    const res = await authApi.register(data);
    if (res.accessToken) {
      await TokenStorage.setAccessToken(res.accessToken);
      if (res.refreshToken) {
        await TokenStorage.setRefreshToken(res.refreshToken);
      }
      setUser(res.user);
    }
  }

  async function verify2FA(code: string, tempToken: string) {
    const res = await authApi.verify2FA({ code, tempToken });
    if (res.accessToken) {
      await TokenStorage.setAccessToken(res.accessToken);
      if (res.refreshToken) {
        await TokenStorage.setRefreshToken(res.refreshToken);
      }
      setUser(res.user);
    }
  }

  async function logout() {
    await TokenStorage.clearTokens();
    setUser(null);
  }

  function updateUserData(updatedFields: Partial<User>) {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  }

  async function refreshUser() {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        verify2FA,
        logout,
        updateUserData,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
