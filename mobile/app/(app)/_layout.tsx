import React, { useEffect } from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { QuickAddTransactionSheet } from '../../components/financial/QuickAddTransactionSheet';
import { WebSidebar } from '../../components/layout/WebSidebar';
import { CustomTabBar } from '../../components/layout/CustomTabBar';
import { useTabBadges } from '../../hooks/useTabBadges';
import { useSmartNotificationSync } from '../../hooks/useSmartNotificationSync';

export default function AppLayout() {
  const badges = useTabBadges();
  useSmartNotificationSync();
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const { isOpen, closeQuickEntry } = useQuickEntry();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const LayoutWrapper = isDesktop ? View : React.Fragment;
  const layoutProps = isDesktop ? { style: { flex: 1, flexDirection: 'row', backgroundColor: colors.background } } : {};

  return (
    <LayoutWrapper {...layoutProps as any}>
      {isDesktop && <WebSidebar />}
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} badges={badges as any} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="accounts" />
          <Tabs.Screen name="transactions" />
          <Tabs.Screen name="budgets" />
          <Tabs.Screen name="settings" />

          {/* Hidden sub-routes */}
          <Tabs.Screen name="transfer" options={{ href: null }} />
          <Tabs.Screen name="subscriptions" options={{ href: null }} />
          <Tabs.Screen name="loans" options={{ href: null }} />
          <Tabs.Screen name="goals" options={{ href: null }} />
          <Tabs.Screen name="analytics" options={{ href: null }} />
          <Tabs.Screen name="currency-converter" options={{ href: null }} />
        </Tabs>
      </View>

      {/* Global Quick Entry Sheet */}
      <QuickAddTransactionSheet
        visible={isOpen}
        onClose={closeQuickEntry}
      />
    </LayoutWrapper>
  );
}