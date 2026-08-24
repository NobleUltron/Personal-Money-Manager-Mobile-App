import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../constants/theme';

interface CardProps extends ViewProps {
  onPress?: () => void;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  elevated = false,
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
      borderColor: colors.border,
      borderWidth: isDark ? 1 : 1,
      shadowColor: isDark ? '#000000' : '#64748B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={cardStyle}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
});
