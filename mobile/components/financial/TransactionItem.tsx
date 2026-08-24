import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  Laptop,
  HandCoins,
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Briefcase,
  Gift,
  Film,
  Dumbbell,
  ArrowLeftRight,
  PiggyBank,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Transaction } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface TransactionItemProps {
  transaction: Transaction;
  currencySymbol?: string;
  isLast?: boolean;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  currencySymbol = 'UGX',
  isLast = false,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { hideBalances } = usePrivacy();

  const isDeposit = transaction.type === 'deposit' || transaction.type === 'income';
  const numAmount = Number(transaction.amount) || 0;

  const formattedAmount = hideBalances
    ? `${isDeposit ? '+' : '-'}${currencySymbol} ••••••`
    : `${isDeposit ? '+' : '-'}${currencySymbol} ${numAmount.toLocaleString()}`;

  const txDate = new Date(transaction.date);
  const dateFormatted = isNaN(txDate.getTime())
    ? transaction.date
    : txDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

  // Smart Category / Merchant Icon Matcher
  const textToScan = `${transaction.reason || ''} ${transaction.category || ''}`.toLowerCase();

  const getSmartIcon = () => {
    if (textToScan.includes('iphone') || textToScan.includes('fold') || textToScan.includes('phone') || textToScan.includes('samsung') || textToScan.includes('pixel')) {
      return { icon: <Smartphone size={18} color="#A855F7" />, bg: 'rgba(168, 85, 247, 0.15)', tag: 'Gadgets' };
    }
    if (textToScan.includes('laptop') || textToScan.includes('macbook') || textToScan.includes('computer')) {
      return { icon: <Laptop size={18} color="#6366F1" />, bg: 'rgba(99, 102, 241, 0.15)', tag: 'Tech' };
    }
    if (textToScan.includes('loan') || textToScan.includes('borrow') || textToScan.includes('lend') || textToScan.includes('debt')) {
      return { icon: <HandCoins size={18} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.15)', tag: 'Loan' };
    }
    if (textToScan.includes('food') || textToScan.includes('dining') || textToScan.includes('restaurant') || textToScan.includes('cafe') || textToScan.includes('lunch') || textToScan.includes('dinner')) {
      return { icon: <Utensils size={18} color="#EF4444" />, bg: 'rgba(239, 68, 68, 0.15)', tag: 'Food' };
    }
    if (textToScan.includes('car') || textToScan.includes('transport') || textToScan.includes('uber') || textToScan.includes('boda') || textToScan.includes('fuel')) {
      return { icon: <Car size={18} color="#3B82F6" />, bg: 'rgba(59, 130, 246, 0.15)', tag: 'Transport' };
    }
    if (textToScan.includes('rent') || textToScan.includes('housing') || textToScan.includes('home')) {
      return { icon: <Home size={18} color="#6366F1" />, bg: 'rgba(99, 102, 241, 0.15)', tag: 'Housing' };
    }
    if (textToScan.includes('umeme') || textToScan.includes('power') || textToScan.includes('water') || textToScan.includes('wifi') || textToScan.includes('utility') || textToScan.includes('bill')) {
      return { icon: <Zap size={18} color="#EAB308" />, bg: 'rgba(234, 179, 8, 0.15)', tag: 'Bills' };
    }
    if (textToScan.includes('shopping') || textToScan.includes('clothes') || textToScan.includes('shoes') || textToScan.includes('market')) {
      return { icon: <ShoppingBag size={18} color="#EC4899" />, bg: 'rgba(236, 72, 153, 0.15)', tag: 'Shopping' };
    }
    if (textToScan.includes('salary') || textToScan.includes('business') || textToScan.includes('wage') || textToScan.includes('income')) {
      return { icon: <Briefcase size={18} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.15)', tag: 'Income' };
    }
    if (textToScan.includes('savings') || textToScan.includes('deposit')) {
      return { icon: <PiggyBank size={18} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.15)', tag: 'Savings' };
    }
    if (textToScan.includes('transfer')) {
      return { icon: <ArrowLeftRight size={18} color="#6366F1" />, bg: 'rgba(99, 102, 241, 0.15)', tag: 'Transfer' };
    }

    // Default Fallback
    return {
      icon: isDeposit ? <ArrowDownLeft size={18} color={colors.success} /> : <ArrowUpRight size={18} color={colors.danger} />,
      bg: isDeposit ? colors.successLight : colors.dangerLight,
      tag: isDeposit ? 'Credit' : 'Debit',
    };
  };

  const itemMeta = getSmartIcon();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={[
        styles.container,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
      ]}
    >
      {/* Visual Category / Merchant Icon */}
      <View style={[styles.iconBox, { backgroundColor: itemMeta.bg }]}>
        {itemMeta.icon}
      </View>

      {/* Main Description & Account / Date Info */}
      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {transaction.reason || transaction.category || 'Transaction'}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
          {transaction.account?.name || 'Wallet'} • {dateFormatted}
        </Text>
      </View>

      {/* Right Column: Category Tag Pill + Amount */}
      <View style={styles.amountContainer}>
        <View
          style={[
            styles.typePill,
            {
              backgroundColor: isDeposit ? 'rgba(16, 185, 129, 0.15)' : isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            },
          ]}
        >
          <Text
            style={[
              styles.typePillText,
              { color: isDeposit ? '#10B981' : '#EF4444' },
            ]}
          >
            {itemMeta.tag}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            { color: isDeposit ? colors.success : colors.danger },
          ]}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
        >
          {formattedAmount}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm + 2,
  },
  details: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  title: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
    maxWidth: '48%',
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: 3,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
