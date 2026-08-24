import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PieChart,
  MoreHorizontal,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { QuickAddTransactionSheet } from '../../components/financial/QuickAddTransactionSheet';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius } from '../../constants/theme';

interface TabIconProps {
  icon: any;
  color: string;
  focused: boolean;
  activeColor: string;
}

const TabIconWithIndicator: React.FC<TabIconProps> = ({
  icon: Icon,
  color,
  focused,
  activeColor,
}) => (
  <View style={styles.iconContainer}>
    <Icon size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
    {focused ? (
      <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />
    ) : (
      <View style={styles.indicatorPlaceholder} />
    )}
  </View>
);

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const { isOpen, openQuickEntry, closeQuickEntry } = useQuickEntry();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const handleCenterAction = () => {
    triggerHaptic.medium();
    openQuickEntry();
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: -2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithIndicator
                icon={LayoutDashboard}
                color={color}
                focused={focused}
                activeColor={colors.primary}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Accounts',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithIndicator
                icon={Landmark}
                color={color}
                focused={focused}
                activeColor={colors.primary}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Entry',
            tabBarIcon: () => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCenterAction}
                style={styles.floatingCenterWrapper}
              >
                <LinearGradient
                  colors={Gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.floatingCenterBtn}
                >
                  <Plus size={24} color="#FFFFFF" strokeWidth={2.6} />
                </LinearGradient>
              </TouchableOpacity>
            ),
          }}
        />

        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithIndicator
                icon={PieChart}
                color={color}
                focused={focused}
                activeColor={colors.primary}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithIndicator
                icon={MoreHorizontal}
                color={color}
                focused={focused}
                activeColor={colors.primary}
              />
            ),
          }}
        />

        {/* Hidden sub-routes */}
        <Tabs.Screen name="transfer" options={{ href: null }} />
        <Tabs.Screen name="subscriptions" options={{ href: null }} />
        <Tabs.Screen name="loans" options={{ href: null }} />
        <Tabs.Screen name="goals" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="currency-converter" options={{ href: null }} />
      </Tabs>

      {/* Global Quick Entry Sheet — accessible from any tab */}
      <QuickAddTransactionSheet
        visible={isOpen}
        onClose={closeQuickEntry}
      />
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
  },
  activeIndicator: {
    width: 14,
    height: 3,
    borderRadius: Radius.full,
    marginTop: 3,
  },
  indicatorPlaceholder: {
    width: 14,
    height: 3,
    marginTop: 3,
  },
  floatingCenterWrapper: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});


