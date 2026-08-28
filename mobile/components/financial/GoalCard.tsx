import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Target, Trophy, Sparkles, Clock, Plus, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Goal } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing } from '../../constants/theme';

interface GoalCardProps {
  goal: Goal;
  currencySymbol?: string;
  onPress?: () => void;
  onDeposit?: () => void;
}

const CATEGORY_ICONS: Record<string, { icon: string; bg: string; color: string; border: string }> = {
  emergency: { icon: '🛡️', bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.25)' },
  security: { icon: '🛡️', bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.25)' },
  car: { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' },
  vehicle: { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' },
  transport: { icon: '🚗', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' },
  home: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.25)' },
  house: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.25)' },
  land: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.25)' },
  property: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.25)' },
  vacation: { icon: '🏖️', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9', border: 'rgba(14, 165, 233, 0.25)' },
  holiday: { icon: '🏖️', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9', border: 'rgba(14, 165, 233, 0.25)' },
  travel: { icon: '🏖️', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9', border: 'rgba(14, 165, 233, 0.25)' },
  wedding: { icon: '💍', bg: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', border: 'rgba(236, 72, 153, 0.25)' },
  ceremony: { icon: '💍', bg: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', border: 'rgba(236, 72, 153, 0.25)' },
  laptop: { icon: '💻', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: 'rgba(168, 85, 247, 0.25)' },
  tech: { icon: '💻', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: 'rgba(168, 85, 247, 0.25)' },
  gadget: { icon: '💻', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: 'rgba(168, 85, 247, 0.25)' },
  business: { icon: '💼', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' },
  investment: { icon: '💼', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' },
  startup: { icon: '💼', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' },
};

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currencySymbol = 'UGX',
  onPress,
  onDeposit,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  // Match category
  const lowerCat = `${goal.category || ''} ${goal.name || ''}`.toLowerCase();
  const matchedKey = Object.keys(CATEGORY_ICONS).find((k) => lowerCat.includes(k));
  const catStyle = matchedKey
    ? CATEGORY_ICONS[matchedKey]
    : { icon: '🎯', bg: 'rgba(99, 102, 241, 0.14)', color: '#6366F1', border: 'rgba(99, 102, 241, 0.25)' };

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
  let milestoneBadge = '🥉 25% Started';
  let milestoneColor = '#6366F1';
  if (isCompleted) {
    milestoneBadge = '🏆 Goal Achieved!';
    milestoneColor = '#10B981';
  } else if (pct >= 75) {
    milestoneBadge = '🥇 75% Almost There';
    milestoneColor = '#F59E0B';
  } else if (pct >= 50) {
    milestoneBadge = '🥈 50% Halfway';
    milestoneColor = '#3B82F6';
  } else if (pct >= 25) {
    milestoneBadge = '🥉 25% Started';
    milestoneColor = '#6366F1';
  } else {
    milestoneBadge = '🚀 In Progress';
    milestoneColor = colors.textSecondary;
  }

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isCompleted
            ? 'rgba(16, 185, 129, 0.4)'
            : isDark ? catStyle.border : colors.borderSubtle,
          borderWidth: 1.2,
        },
      ]}
    >
      {/* Top Row: Icon + Name + Percentage Badge */}
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
            <Text style={{ fontSize: 20 }}>{catStyle.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {goal.name}
            </Text>
            <View style={styles.milestoneRow}>
              <Text style={[styles.milestoneText, { color: milestoneColor }]}>
                {milestoneBadge}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.pctBadge,
            {
              backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)',
            },
          ]}
        >
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
      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E293B' : colors.surfaceElevated }]}>
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
      <View style={[styles.bottomRow, { borderTopColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
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
                  ~{formatAmount(targetDateInfo.monthlyPace, currencySymbol)}/mo pace
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
            style={[
              styles.quickDepositBtn,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
              },
            ]}
          >
            <Plus size={13} color={colors.primary} strokeWidth={2.5} />
            <Text style={[styles.quickDepositBtnText, { color: colors.primary }]}>Deposit</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm + 2,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
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
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  name: {
    fontSize: 15,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pctBadgeText: {
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  quickDepositBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});