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
  AlertCircle,
  Shield,
  Eye,
  MoreVertical,
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

const ACCOUNT_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string; accentBorder: string }> = {
  bank: {
    icon: Landmark,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.14)',
    accentBorder: 'rgba(99, 102, 241, 0.25)',
    label: 'Bank Account',
  },
  mobile_money: {
    icon: Smartphone,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.14)',
    accentBorder: 'rgba(16, 185, 129, 0.25)',
    label: 'Mobile Money',
  },
  cash: {
    icon: Wallet,
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.14)',
    accentBorder: 'rgba(14, 165, 233, 0.25)',
    label: 'Cash Wallet',
  },
  savings: {
    icon: PiggyBank,
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.14)',
    accentBorder: 'rgba(168, 85, 247, 0.25)',
    label: 'Savings Vault',
  },
  credit_card: {
    icon: CreditCard,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.14)',
    accentBorder: 'rgba(245, 158, 11, 0.25)',
    label: 'Credit Card',
  },
};

const getAccountConfig = (type: string) => {
  const norm = (type || 'cash').toLowerCase().replace(/[\s-]+/g, '_');
  if (norm.includes('bank')) return ACCOUNT_TYPE_CONFIG.bank;
  if (norm.includes('momo') || norm.includes('mobile')) return ACCOUNT_TYPE_CONFIG.mobile_money;
  if (norm.includes('credit')) return ACCOUNT_TYPE_CONFIG.credit_card;
  if (norm.includes('saving')) return ACCOUNT_TYPE_CONFIG.savings;
  return ACCOUNT_TYPE_CONFIG.cash;
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

  const config = getAccountConfig(account.type);
  const IconComponent = config.icon;

  const currentBal = Number(account.balance) || 0;
  const isNegative = currentBal < 0;
  const initialBal = Number(account.initial_balance) || 0;
  const netGrowth = currentBal - initialBal;
  const isShared = account.is_shared || (account.members_count && account.members_count > 1);
  const isViewer = account.user_role === 'VIEWER';

  // Clean institution label (prevent "Cash • Cash Wallet")
  const getSubLabel = () => {
    if (account.bank_name && account.bank_name.toLowerCase() !== config.label.toLowerCase() && account.bank_name.toLowerCase() !== 'cash') {
      return `${account.bank_name} • ${config.label}`;
    }
    return config.label;
  };

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark
            ? (isShared ? 'rgba(99, 102, 241, 0.35)' : config.accentBorder)
            : (isShared ? 'rgba(99, 102, 241, 0.25)' : colors.border),
          borderWidth: 1.2,
        },
      ]}
      onPress={onPress}
    >
      {/* 1. Header Info Row */}
      <View style={styles.headerRow}>
        <View style={styles.leftInfo}>
          {/* Themed Icon Box */}
          <View style={[styles.iconBox, { backgroundColor: config.bg, borderColor: config.accentBorder }]}>
            <IconComponent size={20} color={config.color} strokeWidth={2.2} />
          </View>

          <View style={styles.titleContainer}>
            <View style={styles.nameBadgeRow}>
              <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                {account.name}
              </Text>
            </View>

            <Text style={[styles.accountTypeText, { color: colors.textSecondary }]} numberOfLines={1}>
              {getSubLabel()}
            </Text>
          </View>
        </View>

        {/* Right Tag / Badge */}
        {isShared ? (
          <View style={[styles.sharedBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)', borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.2)' }]}>
            <Users size={11} color={colors.primary} />
            <Text style={[styles.sharedBadgeText, { color: colors.primary }]}>
              Shared{account.members_count ? ` · ${account.members_count}` : ''}
            </Text>
          </View>
        ) : account.account_number ? (
          <View style={[styles.accountNumberPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.accountNumberText, { color: colors.textSecondary }]}>
              •••• {account.account_number.slice(-4)}
            </Text>
          </View>
        ) : (
          <View style={[styles.accountNumberPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.accountNumberText, { color: colors.textMuted }]}>
              {config.label}
            </Text>
          </View>
        )}
      </View>

      {/* 2. Balance & Performance Section */}
      <View style={[styles.balanceSection, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.balanceInfo}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            Available Balance
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: isNegative ? colors.danger : colors.text },
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
          >
            {formatAmount(account.balance, currencySymbol)}
          </Text>
        </View>

        {/* Overdrawn Alert or Growth Badge */}
        {isNegative ? (
          <View style={[styles.negativeBadge, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <AlertCircle size={11} color={colors.danger} />
            <Text style={[styles.negativeBadgeText, { color: colors.danger }]}>
              Negative Balance
            </Text>
          </View>
        ) : initialBal > 0 ? (
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
        ) : null}
      </View>

      {/* 3. Floating Action Controls */}
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
              style={[
                styles.quickPill,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
                },
              ]}
            >
              <ArrowLeftRight size={12} color={colors.primary} />
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
              style={[styles.quickPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}
            >
              <Plus size={12} color={colors.textSecondary} strokeWidth={2.5} />
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
                  backgroundColor: isShared
                    ? (isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.08)')
                    : colors.surfaceElevated,
                  borderColor: isShared ? (isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)') : colors.borderSubtle,
                },
              ]}
            >
              <Users size={12} color={isShared ? colors.primary : colors.textSecondary} />
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
              style={[styles.smallIconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Edit2 size={12} color={colors.textSecondary} />
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
              <Trash2 size={12} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
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
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  titleContainer: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sharedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accountTypeText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  accountNumberPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  accountNumberText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  negativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Radius.md,
    gap: 4,
    borderWidth: 1,
  },
  negativeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});