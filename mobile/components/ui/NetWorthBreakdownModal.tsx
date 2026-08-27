import React from 'react';
import {
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Landmark,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { triggerHaptic } from '../../utils/haptics';
import { Account } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface NetWorthBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  totalIncome: number;
  totalExpenses: number;
  currencySymbol?: string;
}

export const NetWorthBreakdownModal: React.FC<NetWorthBreakdownModalProps> = ({
  visible,
  onClose,
  accounts = [],
  totalIncome = 0,
  totalExpenses = 0,
  currencySymbol = 'UGX',
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  // Total Initial / Opening balance across all accounts
  const totalStartingBalance = accounts.reduce(
    (sum, a) => sum + (Number(a.initial_balance) || 0),
    0
  );

  const totalCurrentBalance = accounts.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0
  );

  const netFlow = totalIncome - totalExpenses;

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Wallet size={18} color="#6366F1" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Net Worth Breakdown</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Opening capital & net transaction growth
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.light();
              onClose();
            }}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Wealth Card */}
          <View
            style={[
              styles.heroCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              Total Available Wealth
            </Text>
            <Text style={[styles.heroAmount, { color: colors.text }]}>
              {formatAmount(totalCurrentBalance, currencySymbol)}
            </Text>

            <View style={styles.formulaPill}>
              <Text style={[styles.formulaText, { color: colors.primary }]}>
                Start ({formatAmount(totalStartingBalance, currencySymbol)}) {netFlow >= 0 ? '+' : '-'}{' '}
                Net Flow ({formatAmount(Math.abs(netFlow), currencySymbol)})
              </Text>
            </View>
          </View>

          {/* Mathematical Step-by-Step Accounting Card */}
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Financial Equation
            </Text>

            {/* 1. Opening Capital */}
            <View style={styles.breakdownRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.stepDot, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Landmark size={14} color="#6366F1" />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Opening Capital</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    Initial balances when wallets were set up
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowAmount, { color: colors.text }]}>
                {formatAmount(totalStartingBalance, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* 2. Total Inflow */}
            <View style={styles.breakdownRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.stepDot, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <ArrowDownLeft size={14} color="#10B981" />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Total Inflow</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    All recorded income & deposits
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowAmount, { color: '#10B981' }]}>
                +{formatAmount(totalIncome, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* 3. Total Outflow */}
            <View style={styles.breakdownRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.stepDot, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <ArrowUpRight size={14} color="#EF4444" />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Total Outflow</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    All recorded expenses & withdrawals
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowAmount, { color: '#EF4444' }]}>
                -{formatAmount(totalExpenses, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* 4. Net Growth */}
            <View style={styles.breakdownRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.stepDot, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <TrendingUp size={14} color={netFlow >= 0 ? '#10B981' : '#EF4444'} />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Net Cash Growth</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    Retained earnings from activity
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  { color: netFlow >= 0 ? '#10B981' : '#EF4444', fontWeight: '900' },
                ]}
              >
                {netFlow >= 0 ? '+' : ''}{formatAmount(netFlow, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Account Breakdown List */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Wallets & Accounts ({accounts.length})
          </Text>

          <View
            style={[
              styles.accountsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {accounts.map((acc, idx) => {
              const isLast = idx === accounts.length - 1;
              const currentBal = Number(acc.balance) || 0;
              const startBal = Number(acc.initial_balance) || 0;
              const accNet = currentBal - startBal;

              return (
                <View
                  key={acc.id}
                  style={[
                    styles.accItemRow,
                    !isLast && { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={styles.accLeft}>
                    <Text style={[styles.accName, { color: colors.text }]}>{acc.name}</Text>
                    <Text style={[styles.accSub, { color: colors.textMuted }]}>
                      Start: {formatAmount(startBal, currencySymbol)} • Net: {accNet >= 0 ? '+' : ''}
                      {formatAmount(accNet, currencySymbol)}
                    </Text>
                  </View>

                  <Text style={[styles.accBal, { color: colors.text }]}>
                    {formatAmount(currentBal, currencySymbol)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginVertical: 6,
  },
  formulaPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  formulaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breakdownCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  accountsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  accLeft: {
    flex: 1,
    marginRight: 8,
  },
  accName: {
    fontSize: 13,
    fontWeight: '700',
  },
  accSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  accBal: {
    fontSize: 14,
    fontWeight: '800',
  },
});