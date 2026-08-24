import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = Radius.md,
  style,
}) => {
  const { isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  const baseColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: baseColor,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ height?: number; style?: ViewStyle }> = ({
  height = 110,
  style,
}) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
          height,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width={42} height={42} borderRadius={Radius.lg} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="45%" height={22} style={{ marginTop: 12 }} />
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={{ padding: Spacing.md }}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} style={{ marginBottom: Spacing.md }} />
      ))}
    </View>
  );
};

export const SkeletonDashboard: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
      {/* Top Banner Skeleton */}
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.surface, height: 160, marginBottom: Spacing.md },
        ]}
      >
        <Skeleton width={110} height={14} />
        <Skeleton width="70%" height={32} style={{ marginTop: 10 }} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Skeleton width="30%" height={34} borderRadius={Radius.full} />
          <Skeleton width="30%" height={34} borderRadius={Radius.full} />
          <Skeleton width="30%" height={34} borderRadius={Radius.full} />
        </View>
      </View>

      {/* KPI Row */}
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
        <SkeletonCard height={95} style={{ flex: 1 }} />
        <SkeletonCard height={95} style={{ flex: 1 }} />
      </View>

      {/* 2x2 Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.lg }}>
        <Skeleton width="48%" height={74} borderRadius={Radius.xl} />
        <Skeleton width="48%" height={74} borderRadius={Radius.xl} />
        <Skeleton width="48%" height={74} borderRadius={Radius.xl} />
        <Skeleton width="48%" height={74} borderRadius={Radius.xl} />
      </View>

      {/* Transactions placeholder */}
      <SkeletonCard height={140} />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: Spacing.md,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
