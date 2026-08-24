import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, CheckCircle2, ChevronRight, Edit3, Flame, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Budget } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

interface BudgetProgressProps {
  budget: Budget;
  currencySymbol?: string;
  onPress?: () => void;
  onEdit?: () => void;
}

const CATEGORY_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  'food & dining': { icon: '🍔', bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' },
  'food': { icon: '🍔', bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' },
  'housing & rent': { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' },
  'housing': { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' },
  'rent': { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' },
  'transportation': { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
  'transport': { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
  'utilities': { icon: '💡', bg: 'rgba(234, 179, 8, 0.15)', color: '#EAB308' },
  'shopping': { icon: '🛍️', bg: 'rgba(236, 72, 153, 0.15)', color: '#EC4899' },
  'healthcare': { icon: '💊', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  'health': { icon: '💊', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  'entertainment': { icon: '🎬', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' },
  'salary & wages': { icon: '💼', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  'business income': { icon: '📈', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' },
  'investments': { icon: '🪙', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' },
};

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  budget,
  currencySymbol = 'UGX',
  onPress,
  onEdit,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const lowerCat = budget.category.toLowerCase();
  const matchedKey = Object.keys(CATEGORY_ICONS).find((k) => lowerCat.includes(k));
  const catStyle = matchedKey
    ? CATEGORY_ICONS[matchedKey]
    : { icon: '📊', bg: 'rgba(99, 102, 241, 0.15)', color: colors.primary };

  const pct = Math.min(Math.max(Number(budget.percentage) || 0, 0), 100);
  const isOver = budget.isOver || Number(budget.spent) > Number(budget.amount);
  const isNearLimit = !isOver && pct >= 80;

  // Status colors & labels
  let badgeBg = 'rgba(16, 185, 129, 0.15)';
  let badgeColor = '#10B981';
  let badgeLabel = `${pct}% Used`;
  let progressGradient: string[] = ['#10B981', '#059669'];

  if (isOver) {
    badgeBg = 'rgba(239, 68, 68, 0.15)';
    badgeColor = '#EF4444';
    badgeLabel = 'Over Budget!';
    progressGradient = ['#EF4444', '#DC2626'];
  } else if (isNearLimit) {
    badgeBg = 'rgba(245, 158, 11, 0.15)';
    badgeColor = '#F59E0B';
    badgeLabel = `${pct}% (Near Limit)`;
    progressGradient = ['#F59E0B', '#D97706'];
  }

  const remaining = Number(budget.remaining) || (Number(budget.amount) - Number(budget.spent));

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={[
        styles.card,
        isOver && { borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1.5 },
      ]}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: catStyle.bg }]}>
            <Text style={{ fontSize: 20 }}>{catStyle.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.categoryTitle, { color: colors.text }]} numberOfLines={1}>
              {budget.category}
            </Text>
            <Text style={[styles.limitSubtext, { color: colors.textSecondary }]}>
              Limit: {formatAmount(budget.amount, currencySymbol)}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          {isOver ? (
            <AlertCircle size={12} color={badgeColor} />
          ) : isNearLimit ? (
            <AlertTriangle size={12} color={badgeColor} />
          ) : (
            <CheckCircle2 size={12} color={badgeColor} />
          )}
          <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
        <LinearGradient
          colors={progressGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBarFill, { width: `${pct}%` }]}
        />
      </View>

      {/* Bottom Spending Metrics */}
      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.spentLabel, { color: colors.textSecondary }]}>Spent</Text>
          <Text style={[styles.spentValue, { color: isOver ? colors.danger : colors.text }]}>
            {formatAmount(budget.spent, currencySymbol)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.spentLabel, { color: colors.textSecondary }]}>
            {isOver ? 'Over Limit' : 'Remaining'}
          </Text>
          <Text style={[styles.remainingValue, { color: isOver ? colors.danger : colors.success }]}>
            {isOver
              ? `+${formatAmount(Math.abs(remaining), currencySymbol)}`
              : formatAmount(remaining, currencySymbol)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  limitSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  spentLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  spentValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  remainingValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
