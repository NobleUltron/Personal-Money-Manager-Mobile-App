import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Landmark,
  Smartphone,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowLeftRight,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Account } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

interface AccountCardProps {
  account: Account;
  currencySymbol?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void;
  onAddTransaction?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  bank: {
    label: 'Bank Account',
    icon: Landmark,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.15)',
  },
  mobile_money: {
    label: 'Mobile Money',
    icon: Smartphone,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
  },
  cash: {
    label: 'Cash Wallet',
    icon: Wallet,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
  },
  credit_card: {
    label: 'Credit Card',
    icon: CreditCard,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
  },
  savings: {
    label: 'Savings Vault',
    icon: PiggyBank,
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.15)',
  },
};

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  currencySymbol = 'UGX',
  onPress,
  onEdit,
  onDelete,
  onTransfer,
  onAddTransaction,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const rawType = (account.type || 'cash').toLowerCase();
  const config = TYPE_CONFIG[rawType] || TYPE_CONFIG.cash;
  const Icon = config.icon;

  const currentBal = Number(account.balance) || 0;
  const initialBal = Number(account.initial_balance) || 0;
  const netGrowth = currentBal - initialBal;

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={styles.card}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
            <Icon size={22} color={config.color} strokeWidth={2.2} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
              {account.name}
            </Text>
            <View style={styles.metaRow}>
              {account.bank_name ? (
                <Text style={[styles.bankNameText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {account.bank_name} •{' '}
                </Text>
              ) : null}
              <Text style={[styles.accountTypeText, { color: colors.textSecondary }]}>
                {config.label}
              </Text>
            </View>
          </View>
        </View>

        {account.account_number ? (
          <View style={[styles.accountNumberPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.accountNumberText, { color: colors.textSecondary }]}>
              •••• {account.account_number.slice(-4)}
            </Text>
          </View>
        ) : (
          <Badge label={config.label} variant="neutral" size="sm" />
        )}
      </View>

      {/* Balance Section */}
      <View style={[styles.balanceSection, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.balanceInfo}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            Available Balance
          </Text>
          <Text
            style={[styles.balanceAmount, { color: colors.text }]}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
          >
            {formatAmount(account.balance, currencySymbol)}
          </Text>
        </View>

        {/* Growth badge vs initial balance */}
        {initialBal > 0 && (
          <View style={styles.growthContainer}>
            <View
              style={[
                styles.growthBadge,
                {
                  backgroundColor:
                    netGrowth >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              {netGrowth >= 0 ? (
                <TrendingUp size={11} color="#10B981" />
              ) : (
                <TrendingDown size={11} color="#EF4444" />
              )}
              <Text
                style={[
                  styles.growthText,
                  { color: netGrowth >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {netGrowth >= 0 ? '+' : ''}
                {formatAmount(netGrowth, currencySymbol)}
              </Text>
            </View>
            <Text style={[styles.initialLabel, { color: colors.textMuted }]}>
              Start: {formatAmount(initialBal, currencySymbol)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Footer */}
      <View style={[styles.actionsFooter, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.leftActions}>
          {onTransfer && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic.light();
                onTransfer();
              }}
              style={[styles.quickPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <ArrowLeftRight size={13} color={colors.primary} />
              <Text style={[styles.quickPillText, { color: colors.primary }]}>Transfer</Text>
            </TouchableOpacity>
          )}

          {onAddTransaction && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic.light();
                onAddTransaction();
              }}
              style={[styles.quickPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Plus size={13} color={colors.textSecondary} strokeWidth={2.4} />
              <Text style={[styles.quickPillText, { color: colors.textSecondary }]}>Entry</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightActions}>
          {onEdit && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic.selection();
                onEdit();
              }}
              style={[styles.smallIconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Edit2 size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic.warning();
                onDelete();
              }}
              style={[styles.smallIconBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Trash2 size={13} color={colors.danger} />
            </TouchableOpacity>
          )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bankNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  accountNumberPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  accountNumberText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  balanceInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  growthContainer: {
    alignItems: 'flex-end',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 3,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
  },
  initialLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
