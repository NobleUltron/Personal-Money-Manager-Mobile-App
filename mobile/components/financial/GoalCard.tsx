import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Target, Plus, CheckCircle2, Calendar, TrendingUp, Sparkles, Trophy, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Goal } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

interface GoalCardProps {
  goal: Goal;
  currencySymbol?: string;
  onDeposit?: () => void;
  onPress?: () => void;
}

const CATEGORY_ICONS: Record<string, { icon: string; bg: string }> = {
  emergency: { icon: '🛡️', bg: 'rgba(239, 68, 68, 0.15)' },
  car: { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)' },
  vehicle: { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)' },
  home: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)' },
  house: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)' },
  vacation: { icon: '🏖️', bg: 'rgba(14, 165, 233, 0.15)' },
  travel: { icon: '✈️', bg: 'rgba(14, 165, 233, 0.15)' },
  wedding: { icon: '💍', bg: 'rgba(236, 72, 153, 0.15)' },
  gadget: { icon: '💻', bg: 'rgba(168, 85, 247, 0.15)' },
  laptop: { icon: '💻', bg: 'rgba(168, 85, 247, 0.15)' },
  tech: { icon: '📱', bg: 'rgba(168, 85, 247, 0.15)' },
  business: { icon: '💼', bg: 'rgba(16, 185, 129, 0.15)' },
  education: { icon: '🎓', bg: 'rgba(245, 158, 11, 0.15)' },
};

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currencySymbol = 'UGX',
  onDeposit,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const lowerName = `${goal.name} ${goal.category}`.toLowerCase();
  const matchedKey = Object.keys(CATEGORY_ICONS).find((k) => lowerName.includes(k));
  const catStyle = matchedKey
    ? CATEGORY_ICONS[matchedKey]
    : { icon: '🎯', bg: goal.color ? `${goal.color}20` : 'rgba(99, 102, 241, 0.15)' };

  const pct = Math.min(Math.max(Number(goal.percentage) || 0, 0), 100);
  const isCompleted = goal.isCompleted || Number(goal.current_amount) >= Number(goal.target_amount);

  // Target date & required monthly pace calculation
  const targetDateInfo = React.useMemo(() => {
    if (!goal.target_date) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(goal.target_date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { daysLeft: 0, text: 'Target Date Reached', monthlyPace: 0 };

    const monthsLeft = Math.max(diffDays / 30.4, 0.5);
    const remaining = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);
    const pace = Math.round(remaining / monthsLeft);

    return {
      daysLeft: diffDays,
      text: `${diffDays} days left`,
      monthlyPace: pace,
    };
  }, [goal.target_date, goal.target_amount, goal.current_amount]);

  // Milestone Tag
  let milestoneBadge = '🥉 25% Milestone';
  if (isCompleted) milestoneBadge = '🏆 Goal Achieved!';
  else if (pct >= 75) milestoneBadge = '🥇 75% Almost There';
  else if (pct >= 50) milestoneBadge = '🥈 50% Halfway';
  else if (pct >= 25) milestoneBadge = '🥉 25% Started';
  else milestoneBadge = '🚀 In Progress';

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={[
        styles.card,
        isCompleted && { borderColor: 'rgba(16, 185, 129, 0.4)', borderWidth: 1.5 },
      ]}
    >
      {/* Top Row: Icon + Name + Percentage Badge */}
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: catStyle.bg }]}>
            <Text style={{ fontSize: 20 }}>{catStyle.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {goal.name}
            </Text>
            <View style={styles.milestoneRow}>
              <Text style={[styles.milestoneText, { color: isCompleted ? '#10B981' : colors.primary }]}>
                {milestoneBadge}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.pctBadge, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)' }]}>
          {isCompleted ? (
            <Trophy size={13} color="#10B981" />
          ) : (
            <Sparkles size={13} color={colors.primary} />
          )}
          <Text style={[styles.pctBadgeText, { color: isCompleted ? '#10B981' : colors.primary }]}>
            {pct}%
          </Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
        <LinearGradient
          colors={isCompleted ? ['#10B981', '#059669'] : (Gradients.primary as any)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBarFill, { width: `${pct}%` }]}
        />
      </View>

      {/* Metrics Row: Saved vs Target */}
      <View style={styles.metricsRow}>
        <View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Saved So Far</Text>
          <Text style={[styles.currentValue, { color: isCompleted ? colors.success : colors.text }]}>
            {formatAmount(goal.current_amount, currencySymbol)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Target Amount</Text>
          <Text style={[styles.targetValue, { color: colors.textSecondary }]}>
            {formatAmount(goal.target_amount, currencySymbol)}
          </Text>
        </View>
      </View>

      {/* Bottom Row: Target Date / Pace & Quick Deposit Button */}
      <View style={[styles.bottomRow, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.targetDateBox}>
          {targetDateInfo ? (
            <View style={styles.paceContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {targetDateInfo.text}
                </Text>
              </View>
              {targetDateInfo.monthlyPace > 0 && !isCompleted && (
                <Text style={[styles.paceText, { color: colors.primary }]}>
                  ~{formatAmount(targetDateInfo.monthlyPace, currencySymbol)}/mo
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.dateText, { color: colors.textMuted }]}>No target date set</Text>
          )}
        </View>

        {!isCompleted && onDeposit && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic.medium();
              onDeposit();
            }}
            style={[styles.quickDepositBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.quickDepositBtnText}>Deposit</Text>
          </TouchableOpacity>
        )}
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
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  milestoneRow: {
    marginTop: 2,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  pctBadgeText: {
    fontSize: 12,
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  targetDateBox: {
    flex: 1,
  },
  paceContainer: {
    gap: 2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickDepositBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
