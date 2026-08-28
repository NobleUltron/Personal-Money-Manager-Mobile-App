import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Landmark,
  Smartphone,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Plus,
  Users,
  Shield,
  Eye,
} from 'lucide-react-native';

import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { usePrivacy } from '../../context/PrivacyContext';
import { Account } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void;
  onAddTransaction?: () => void;
  onManageMembers?: () => void;
  currencySymbol?: string;
}

const ACCOUNT_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Bank: {
    icon: Landmark,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    label: 'Bank Account',
  },
  'Mobile Money': {
    icon: Smartphone,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
    label: 'Mobile Money',
  },
  Cash: {
    icon: Wallet,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
    label: 'Cash Wallet',
  },
  Savings: {
    icon: PiggyBank,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.15)',
    label: 'Savings Vault',
  },
  'Credit Card': {
    icon: CreditCard,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    label: 'Credit Card',
  },
};

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onEdit,
  onDelete,
  onTransfer,
  onAddTransaction,
  onManageMembers,
  currencySymbol,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const config = ACCOUNT_TYPE_CONFIG[account.type] || ACCOUNT_TYPE_CONFIG.Bank;
  const IconComponent = config.icon;

  const initialBal = Number(account.initial_balance) || 0;
  const netGrowth = Number(account.balance) - initialBal;
  const isShared = account.is_shared || (account.members_count && account.members_count > 1);
  const isViewer = account.user_role === 'VIEWER';

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isShared ? colors.primary : colors.border,
          borderWidth: isDark ? (isShared ? 1.5 : 1) : (isShared ? 1.5 : 0),
        },
      ]}
      onPress={onPress}
    >
      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
            <IconComponent size={22} color={config.color} />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.nameBadgeRow}>
              <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                {account.name}
              </Text>
              {isShared && (
                <View style={[styles.sharedBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)', borderColor: colors.primary }]}>
                  <Users size={11} color={colors.primary} />
                  <Text style={[styles.sharedBadgeText, { color: colors.primary }]}>
                    Shared{account.members_count ? ` (${account.members_count})` : ''}
                  </Text>
                </View>
              )}
            </View>

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
          {!isViewer && onTransfer && (
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

          {!isViewer && onAddTransaction && (
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

          {onManageMembers && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic.selection();
                onManageMembers();
              }}
              style={[
                styles.quickPill,
                {
                  backgroundColor: isShared ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)') : colors.surfaceElevated,
                  borderColor: isShared ? colors.primary : colors.border,
                },
              ]}
            >
              <Users size={13} color={isShared ? colors.primary : colors.textSecondary} />
              <Text style={[styles.quickPillText, { color: isShared ? colors.primary : colors.textSecondary }]}>
                {isShared ? 'Members' : 'Share'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightActions}>
          {!isViewer && onEdit && (
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
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sharedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    flexWrap: 'wrap',
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