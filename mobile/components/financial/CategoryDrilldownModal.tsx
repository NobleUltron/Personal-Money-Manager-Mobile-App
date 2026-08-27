import React from 'react';
import {
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Tag,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  Landmark,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { triggerHaptic } from '../../utils/haptics';
import { Transaction } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface CategoryDrilldownModalProps {
  visible: boolean;
  onClose: () => void;
  categoryName: string;
  categoryColor?: string;
  totalSpent: number;
  categoryPercentage?: number;
  transactions: Transaction[];
  currencySymbol?: string;
}

export const CategoryDrilldownModal: React.FC<CategoryDrilldownModalProps> = ({
  visible,
  onClose,
  categoryName,
  categoryColor = '#6366F1',
  totalSpent,
  categoryPercentage = 0,
  transactions = [],
  currencySymbol = 'UGX',
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  // Filter transactions for this category
  const filteredTxs = transactions.filter(
    (t) => (t.category || 'Other').toLowerCase() === categoryName.toLowerCase()
  );

  const txCount = filteredTxs.length;
  const avgTxAmount = txCount > 0 ? totalSpent / txCount : 0;
  const maxTx = filteredTxs.reduce(
    (max, t) => (Number(t.amount) > Number(max.amount) ? t : max),
    filteredTxs[0] || { amount: 0 }
  );

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
            <View style={[styles.catIconBadge, { backgroundColor: `${categoryColor}25` }]}>
              <Tag size={18} color={categoryColor} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{categoryName}</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Category Drilldown & History
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
          {/* Hero Category Summary Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Period Outflow</Text>
              <View style={[styles.pctPill, { backgroundColor: `${categoryColor}20` }]}>
                <Text style={[styles.pctText, { color: categoryColor }]}>
                  {categoryPercentage}% of all spending
                </Text>
              </View>
            </View>

            <Text style={[styles.heroAmount, { color: categoryColor }]}>
              {formatAmount(totalSpent, currencySymbol)}
            </Text>

            {/* 3-Stat Metric Grid */}
            <View style={[styles.metricGrid, { borderTopColor: colors.borderSubtle }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Entries</Text>
                <Text style={[styles.metricVal, { color: colors.text }]}>{txCount}</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Avg / Entry</Text>
                <Text style={[styles.metricVal, { color: colors.text }]}>
                  {formatAmount(avgTxAmount, currencySymbol)}
                </Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Largest</Text>
                <Text style={[styles.metricVal, { color: '#EF4444' }]}>
                  {formatAmount(maxTx.amount, currencySymbol)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transactions Header */}
          <View style={styles.listHeaderRow}>
            <Text style={[styles.listSectionTitle, { color: colors.textSecondary }]}>
              Itemized Records ({txCount})
            </Text>
          </View>

          {/* Itemized Transaction List */}
          {filteredTxs.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                No specific transaction details recorded for this category in the current range.
              </Text>
            </View>
          ) : (
            <View style={[styles.txListContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {filteredTxs.map((tx, idx) => {
                const isLast = idx === filteredTxs.length - 1;
                const formattedDate = tx.date
                  ? new Date(tx.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A';

                return (
                  <View
                    key={tx.id || idx}
                    style={[
                      styles.txRow,
                      !isLast && { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={styles.txLeft}>
                      <View style={[styles.txIconBox, { backgroundColor: `${categoryColor}15` }]}>
                        <ArrowUpRight size={16} color={categoryColor} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={[styles.txReason, { color: colors.text }]} numberOfLines={1}>
                          {tx.reason || categoryName}
                        </Text>
                        <View style={styles.txMetaRow}>
                          <Text style={[styles.txDate, { color: colors.textMuted }]}>
                            {formattedDate}
                          </Text>
                          {tx.account?.name && (
                            <Text style={[styles.txAccount, { color: colors.textSecondary }]}>
                              • {tx.account.name}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.txAmount, { color: '#EF4444' }]}>
                      -{formatAmount(tx.amount, currencySymbol)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
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
  catIconBadge: {
    width: 38,
    height: 38,
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
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pctPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  listHeaderRow: {
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyStateBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  txListContainer: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txReason: {
    fontSize: 13,
    fontWeight: '700',
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  txDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  txAccount: {
    fontSize: 11,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
});