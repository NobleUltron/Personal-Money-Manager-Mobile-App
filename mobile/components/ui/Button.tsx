import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
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
      case 'sm':
        return 38;
      case 'lg':
        return 56;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 13;
      case 'lg':
        return 16;
      default:
        return 15;
    }
  };

  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              {
                fontSize: getFontSize(),
                color:
                  variant === 'outline' || variant === 'ghost'
                    ? colors.primary
                    : variant === 'secondary'
                    ? colors.text
                    : '#FFFFFF',
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled || loading}
        onPress={handlePress}
        style={[
          styles.base,
          { height: getHeight(), width: fullWidth ? '100%' : 'auto' },
          style,
        ]}
        {...props}
      >
        <LinearGradient
          colors={Gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: Radius.lg }]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'danger':
        return colors.danger;
      case 'secondary':
        return colors.surfaceElevated;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') return colors.border;
    return 'transparent';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={handlePress}
      style={[
        styles.base,
        {
          height: getHeight(),
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: Radius.lg,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
