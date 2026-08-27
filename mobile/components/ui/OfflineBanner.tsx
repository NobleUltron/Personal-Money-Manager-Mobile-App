import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Spacing, Typography } from '../../constants/theme';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOnline, isSyncing, pendingCount, syncNow } = useSync();
  const { colors } = useTheme();

  const isVisible = !isOnline || isSyncing || pendingCount > 0;

  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const spinValue = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(-80, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isVisible]);

  useEffect(() => {
    if (isSyncing) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [isSyncing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  if (!isVisible && opacity.value === 0) return null;

  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        bg: '#F59E0B',
        text: '#020617',
        message: pendingCount > 0
          ? `Offline — ${pendingCount} change${pendingCount > 1 ? 's' : ''} saved locally`
          : 'Offline Mode — Changes saved locally',
        icon: <CloudOff size={14} color="#020617" strokeWidth={2.5} />,
        action: null,
      };
    }
    if (isSyncing) {
      return {
        bg: '#6366F1',
        text: '#FFFFFF',
        message: `Syncing ${pendingCount} pending change${pendingCount > 1 ? 's' : ''}...`,
        icon: (
          <Animated.View style={spinStyle}>
            <RefreshCw size={14} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>
        ),
        action: null,
      };
    }
    // Online with pending items
    return {
      bg: '#3B82F6',
      text: '#FFFFFF',
      message: `${pendingCount} unsynced change${pendingCount > 1 ? 's' : ''} ready to upload`,
      icon: <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.5} />,
      action: 'Sync Now',
    };
  };

  const config = getBannerConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top ? insets.top + 4 : 8 },
        animatedStyle,
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={config.action ? 0.85 : 1}
        onPress={config.action ? syncNow : undefined}
        style={[styles.pill, { backgroundColor: config.bg }]}
      >
        <View style={styles.contentRow}>
          {config.icon}
          <Text style={[styles.text, { color: config.text }]}>
            {config.message}
          </Text>
          {config.action && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionText}>{config.action}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '90%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  actionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    marginLeft: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});