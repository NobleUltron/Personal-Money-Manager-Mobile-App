import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
}) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: colors.info };
      case 'neutral':
        return { bg: colors.surfaceElevated, text: colors.textSecondary };
      default:
        return { bg: colors.primaryLight, text: colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: size === 'sm' ? 8 : 12,
          paddingVertical: size === 'sm' ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: size === 'sm' ? 11 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
