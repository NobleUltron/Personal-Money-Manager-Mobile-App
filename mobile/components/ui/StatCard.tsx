import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../../context/ThemeContext';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface StatCardProps {
  title: string;
  amount: string;
  icon: React.ReactNode;
  subtitle?: string;
  variant?: 'neutral' | 'success' | 'danger' | 'primary';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  icon,
  subtitle,
  variant = 'neutral',
}) => {
  const { colors } = useTheme();

  const getAccentColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'danger':
        return colors.danger;
      case 'primary':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor:
                variant === 'success'
                  ? colors.successLight
                  : variant === 'danger'
                  ? colors.dangerLight
                  : colors.surfaceElevated,
            },
          ]}
        >
          {icon}
        </View>
      </View>

      <Text
        style={[
          styles.amount,
          { color: variant === 'neutral' ? colors.text : getAccentColor() },
        ]}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
      >
        {amount}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 130,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
