import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { PrivacyProvider } from '../context/PrivacyContext';
import { QuickEntryProvider } from '../context/QuickEntryContext';
import { BiometricsProvider } from '../context/BiometricsContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { SyncProvider } from '../context/SyncContext';
import { OfflineBanner } from '../components/ui/OfflineBanner';

// Ignore Expo Go remote push warning (since Personal Money Manager uses local notifications for bill reminders & budget alerts)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

function RootNavigation() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              <PrivacyProvider>
                <NotificationsProvider>
                  <QuickEntryProvider>
                    <BiometricsProvider>
                      <OfflineBanner />
                      <RootNavigation />
                    </BiometricsProvider>
                  </QuickEntryProvider>
                </NotificationsProvider>
              </PrivacyProvider>
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}