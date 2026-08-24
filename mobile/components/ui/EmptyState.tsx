import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        {icon}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionTitle && onAction && (
        <View style={styles.buttonWrapper}>
          <Button title={actionTitle} onPress={onAction} size="md" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleSmall,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonWrapper: {
    minWidth: 160,
  },
});
