import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  User,
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
  onPress?: () => void;
  onRepay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan,
  currencySymbol = 'UGX',
  onPress,
  onRepay,
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const isBorrowed = loan.type === 'borrowed';
  const percentPaid = Math.min(
    100,
    Math.round(((Number(loan.amount_paid) || 0) / (Number(loan.amount) || 1)) * 100)
  );

  // Due Date calculation
  let isOverdue = false;
  let daysRemaining = 0;
  let dueDateFormatted = '';

  if (loan.due_date) {
    const due = new Date(loan.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOverdue = daysRemaining < 0 && !loan.isPaidOff;
    dueDateFormatted = due.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const avatarBg = isBorrowed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  const avatarBorder = isBorrowed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)';
  const avatarColor = isBorrowed ? '#EF4444' : '#10B981';

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
          borderColor: isOverdue
            ? 'rgba(239, 68, 68, 0.4)'
            : loan.isPaidOff
            ? 'rgba(16, 185, 129, 0.3)'
            : isDark ? '#1E293B' : colors.borderSubtle,
          borderWidth: 1.2,
        },
      ]}
    >
      {/* Top Row: Person Avatar / Name / Type Badge */}
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View style={[styles.avatarBox, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>
              {loan.name ? loan.name.substring(0, 2).toUpperCase() : 'LN'}
            </Text>
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {loan.name}
            </Text>
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
              {isBorrowed ? 'Debt (I owe them)' : 'Lent (They owe me)'}
              {loan.account?.name ? ` • ${loan.account.name}` : ''}
            </Text>
          </View>
        </View>

        <Badge
          label={loan.isPaidOff ? 'Settled' : isBorrowed ? 'I Owe' : 'Lent'}
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
              backgroundColor: isOverdue
                ? 'rgba(239, 68, 68, 0.15)'
                : isDark ? '#0B0F19' : colors.surfaceElevated,
              borderColor: isOverdue
                ? 'rgba(239, 68, 68, 0.3)'
                : isDark ? '#1E293B' : colors.borderSubtle,
            },
          ]}
        >
          {isOverdue ? (
            <AlertTriangle size={12} color="#EF4444" />
          ) : (
            <Calendar size={12} color={colors.textSecondary} />
          )}
          <Text
            style={[
              styles.dueDateText,
              { color: isOverdue ? '#EF4444' : colors.textSecondary },
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
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
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
          color={loan.isPaidOff ? '#10B981' : isBorrowed ? '#EF4444' : '#10B981'}
          height={7}
        />
      </View>

      {/* 3-Column Financial Metrics */}
      <View style={[styles.statsRow, { borderTopColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
            {formatAmount(loan.amount, currencySymbol)}
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
          <Text style={[styles.statValue, { color: colors.success }]} numberOfLines={1}>
            {formatAmount(loan.amount_paid, currencySymbol)}
          </Text>
        </View>

        <View style={styles.statColumn}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
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
      <View style={[styles.actionFooter, { borderTopColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
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
                backgroundColor: isBorrowed ? '#EF4444' : '#10B981',
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
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={[styles.settledText, { color: '#10B981' }]}>
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
            style={[
              styles.smallIconBtn,
              {
                backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                borderWidth: 1,
              },
            ]}
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
            style={[
              styles.smallIconBtn,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: 1,
              },
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Trash2 size={14} color="#EF4444" />
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
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  typeText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
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
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: Radius.lg,
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
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});