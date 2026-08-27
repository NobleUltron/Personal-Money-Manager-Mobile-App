import React from 'react';
import { ActivityIndicator, StyleSheet, Text, Pressable, PressableProps, View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Gradients, Radius, Spacing } from '../../constants/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  gradientColors?: readonly string[] | string[];
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  gradientColors,
  size = 'md',
  loading = false,
  icon,
  fullWidth = true,
  style,
  disabled,
  onPress,
  ...props
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = (e: any) => {
    if (!loading && !disabled && onPress) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      onPress(e);
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 38;
      case 'lg': return 56;
      default: return 48;
    }
  };

  const getPaddingHorizontal = () => {
    switch (size) {
      case 'sm': return Spacing.md;
      case 'lg': return Spacing.xl;
      default: return Spacing.lg;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 13;
      case 'lg': return 16;
      default: return 15;
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'danger': return colors.danger;
      case 'success': return '#10B981';
      case 'secondary': return colors.surfaceElevated;
      case 'outline':
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') return colors.border;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') return colors.primary;
    if (variant === 'secondary') return colors.text;
    return '#FFFFFF';
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, { fontSize: getFontSize(), color: getTextColor() }]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const isGradient = (variant === 'primary' || variant === 'success' || Boolean(gradientColors)) && !disabled;

  const buttonStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      height: getHeight(),
      paddingHorizontal: getPaddingHorizontal(),
      backgroundColor: !isGradient ? getBackgroundColor() : 'transparent',
      borderColor: getBorderColor(),
      borderWidth: variant === 'outline' ? 1 : 0,
      borderRadius: Radius.full,
    },
    fullWidth ? { width: '100%' } : undefined,
    disabled ? { opacity: 0.6 } : undefined,
    style,
  ];

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const activeGradient = gradientColors || (variant === 'success' ? ['#10B981', '#059669'] : (Gradients.primary as any));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={fullWidth ? { width: '100%' } : undefined}
      {...props}
    >
      <Animated.View style={[buttonStyle, animatedStyle]}>
        {isGradient ? (
          <LinearGradient
            colors={activeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.full }]}
          />
        ) : null}
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});