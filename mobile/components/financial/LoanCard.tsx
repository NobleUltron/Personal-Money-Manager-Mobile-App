import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  HandCoins,
  AlertTriangle,
  Sparkles,
} from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Loan } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface LoanCardProps {
  loan: Loan;
  currencySymbol?: string;
  onRepay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan,
  currencySymbol = 'UGX',
  onRepay,
  onEdit,
  onDelete,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const isBorrowed = loan.type === 'borrowed';
  const percentPaid = Math.min(100, Math.max(0, Math.round((Number(loan.amount_paid) / Math.max(Number(loan.amount), 1)) * 100)));

  // Due Date Calculations
  let dueDateFormatted = '';
  let isOverdue = false;
  let daysRemaining = 0;

  if (loan.due_date) {
    const d = new Date(loan.due_date);
    if (!isNaN(d.getTime())) {
      dueDateFormatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = !loan.isPaidOff && daysRemaining < 0;
    }
  }

  // Avatar Initials
  const initial = (loan.name || 'L').trim().charAt(0).toUpperCase();

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={[
        styles.card,
        isOverdue && { borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1.5 },
        loan.isPaidOff && { borderColor: 'rgba(16, 185, 129, 0.3)' },
      ]}
    >
      {/* Top Header: Avatar + Name + Badges */}
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View
            style={[
              styles.avatarBox,
              {
                backgroundColor: isBorrowed
                  ? isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)'
                  : isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: isBorrowed ? colors.danger : colors.success }]}>
              {initial}
            </Text>
          </View>

          <View style={styles.titleTextContainer}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {loan.name}
            </Text>
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
              {isBorrowed ? 'Debt to Repay' : 'Money Lent Out'}
            </Text>
          </View>
        </View>

        <Badge
          label={loan.isPaidOff ? 'Settled 🎉' : isBorrowed ? 'I Owe' : 'Owed to Me'}
          variant={loan.isPaidOff ? 'success' : isBorrowed ? 'danger' : 'success'}
          size="sm"
        />
      </View>

      {/* Due Date & Overdue Tag */}
      {dueDateFormatted ? (
        <View
          style={[
            styles.dueDateBadge,
            {
              backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : colors.surfaceElevated,
            },
          ]}
        >
          {isOverdue ? (
            <AlertTriangle size={12} color={colors.danger} />
          ) : (
            <Calendar size={12} color={colors.textSecondary} />
          )}
          <Text
            style={[
              styles.dueDateText,
              { color: isOverdue ? colors.danger : colors.textSecondary },
            ]}
          >
            {isOverdue
              ? `Overdue by ${Math.abs(daysRemaining)} days (${dueDateFormatted})`
              : `Due: ${dueDateFormatted} (${daysRemaining}d left)`}
          </Text>
        </View>
      ) : null}

      {/* Progress Track */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            Settlement Progress
          </Text>
          <Text
            style={[
              styles.progressPercent,
              { color: loan.isPaidOff ? colors.success : colors.text },
            ]}
          >
            {percentPaid}%
          </Text>
        </View>
        <ProgressBar
          progress={percentPaid}
          color={loan.isPaidOff ? colors.success : isBorrowed ? colors.danger : colors.success}
          height={7}
        />
      </View>

      {/* 3-Column Financial Metrics */}
      <View style={[styles.statsRow, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
            {formatAmount(loan.amount, currencySymbol)}
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paid</Text>
          <Text style={[styles.statValue, { color: colors.success }]} numberOfLines={1}>
            {formatAmount(loan.amount_paid, currencySymbol)}
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Remaining</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: loan.isPaidOff
                  ? colors.success
                  : isBorrowed
                  ? colors.danger
                  : colors.primary,
              },
            ]}
            numberOfLines={1}
          >
            {formatAmount(loan.remaining, currencySymbol)}
          </Text>
        </View>
      </View>

      {/* Action Footer: Repay + Edit + Delete */}
      <View style={[styles.actionFooter, { borderTopColor: colors.borderSubtle }]}>
        {!loan.isPaidOff && onRepay ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic.medium();
              onRepay();
            }}
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor: isBorrowed ? colors.danger : colors.success,
              },
            ]}
          >
            {isBorrowed ? (
              <ArrowDownLeft size={15} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.4} />
            )}
            <Text style={styles.primaryActionText}>
              {isBorrowed ? 'Make Repayment' : 'Record Received'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.settledRow}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={[styles.settledText, { color: colors.success }]}>
              Fully Settled
            </Text>
          </View>
        )}

        {/* Edit Button */}
        {onEdit && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic.selection();
              onEdit();
            }}
            style={[styles.smallIconBtn, { backgroundColor: colors.surfaceElevated }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Edit2 size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic.warning();
              onDelete();
            }}
            style={[styles.smallIconBtn, { backgroundColor: colors.dangerLight }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Trash2 size={14} color={colors.danger} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: Spacing.xs,
  },
  titleTextContainer: {
    flex: 1,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  typeText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 5,
    marginBottom: Spacing.sm,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm + 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: Radius.md,
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  settledText: {
    fontSize: 13,
    fontWeight: '700',
  },
  smallIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
