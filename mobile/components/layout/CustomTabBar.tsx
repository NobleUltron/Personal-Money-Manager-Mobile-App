import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Platform, Text, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Landmark,
  PieChart,
  MoreHorizontal,
  Plus,
} from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { useTheme } from '../../context/ThemeContext';

// --- Configuration & Constants ---
const TAB_ICONS: Record<string, any> = {
  index: LayoutDashboard,
  accounts: Landmark,
  budgets: PieChart,
  settings: MoreHorizontal,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Dashboard',
  accounts: 'Accounts',
  budgets: 'Budgets',
  settings: 'More',
};

// --- Custom Tab Item Component ---
const TabItem = ({
  routeName,
  isFocused,
  onPress,
  hasBadge,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  hasBadge?: boolean;
}) => {
  const { colors } = useTheme();
  const Icon = TAB_ICONS[routeName];
  const label = TAB_LABELS[routeName];

  // Animation values
  const pillOpacity = useSharedValue(isFocused ? 1 : 0);
  const pillScale = useSharedValue(isFocused ? 1 : 0.8);

  useEffect(() => {
    pillOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    pillScale.value = withSpring(isFocused ? 1 : 0.8, { damping: 14, stiffness: 200 });
  }, [isFocused]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const color = isFocused ? colors.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItemContainer}
      android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true, radius: 30 }}
    >
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.pillBackground, { backgroundColor: colors.primaryLight }, pillAnimatedStyle]} />
        <Icon size={21} color={color} strokeWidth={isFocused ? 2.25 : 2} />
        {hasBadge && <View style={[styles.badge, { borderColor: colors.tabBar }]} />}
      </View>
      <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? '700' : '500' }]}>
        {label}
      </Text>
    </Pressable>
  );
};

// --- Center FAB Component ---
const CenterFAB = ({ onPress }: { onPress: () => void }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };
  const handlePress = () => {
    triggerHaptic.medium();
    onPress();
  };

  return (
    <View style={styles.fabContainer}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View style={[styles.fabRing, { backgroundColor: colors.background, shadowColor: colors.primary }, animatedStyle]}>
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabInner}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={2.25} />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
};

// --- Main Custom Tab Bar ---
export const CustomTabBar = ({ state, descriptors, navigation , badges}: BottomTabBarProps & { badges?: Record<string, boolean> }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { openQuickEntry } = useQuickEntry();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isDesktop) return null; // Don't show bottom tabs on desktop web

  // Filter out hidden routes
  const visibleRoutes = state.routes.filter(
    (route) =>
      ['index', 'accounts', 'transactions', 'budgets', 'settings'].includes(route.name)
  );

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, paddingBottom: insets.bottom || 12 }]}>
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === state.routes.findIndex((r) => r.key === route.key);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        if (route.name === 'transactions') {
          return <CenterFAB key={route.key} onPress={openQuickEntry} />;
        }

        // Read dynamic badge state injected from _layout
          const hasBadge = badges?.[route.name] || false;

        return (
          <TabItem
            key={route.key}
            routeName={route.name}
            isFocused={isFocused}
            onPress={onPress}
            hasBadge={hasBadge}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 0,
  },
  tabItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
    marginBottom: 4,
  },
  pillBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 1.5,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fabRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});