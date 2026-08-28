import React, { useMemo } from 'react';
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
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi, subscriptionsApi, loansApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/haptics';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface WeeklyDigestModalProps {
  visible: boolean;
  onClose: () => void;
  currencySymbol?: string;
  onNavigateAnalytics?: () => void;
  onNavigateSubscriptions?: () => void;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  visible,
  onClose,
  currencySymbol = 'UGX',
  onNavigateAnalytics,
  onNavigateSubscriptions,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // 1. Fetch recent transactions
  const { data: txData } = useQuery({
    queryKey: ['transactions', { limit: 100 }],
    queryFn: () => transactionsApi.getAll({ limit: 100 }),
    enabled: visible,
  });

  // 2. Fetch upcoming subscriptions
  const { data: subs = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.getAll(),
    enabled: visible,
  });

  // 3. Fetch active loans
  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loansApi.getAll(),
    enabled: visible,
  });

  // Compute Weekly Stats
  const stats = useMemo(() => {
    const transactions = Array.isArray(txData) ? txData : txData?.data || [];
    const now = new Date();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    let thisWeekExpense = 0;
    let thisWeekIncome = 0;
    let prevWeekExpense = 0;

    const categoryMap: Record<string, number> = {};

    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.date);
      const isDeposit = tx.type === 'deposit' || tx.type === 'income';
      const amount = Number(tx.amount || 0);

      if (txDate >= sevenDaysAgo && txDate <= now) {
        if (isDeposit) {
          thisWeekIncome += amount;
        } else {
          thisWeekExpense += amount;
          const cat = tx.category || 'Other';
          categoryMap[cat] = (categoryMap[cat] || 0) + amount;
        }
      } else if (txDate >= fourteenDaysAgo && txDate < sevenDaysAgo) {
        if (!isDeposit) {
          prevWeekExpense += amount;
        }
      }
    });

    const diff = prevWeekExpense > 0
      ? ((thisWeekExpense - prevWeekExpense) / prevWeekExpense) * 100
      : 0;

    const isLower = diff <= 0;

    // Top 3 Categories
    const topCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: thisWeekExpense > 0 ? (amount / thisWeekExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Upcoming bills in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingBills = subs.filter((s: any) => {
      if (!s.next_due_date) return false;
      const due = new Date(s.next_due_date);
      return due >= now && due <= nextWeek;
    });

    return {
      thisWeekExpense,
      thisWeekIncome,
      prevWeekExpense,
      diff: Math.abs(diff).toFixed(1),
      isLower,
      topCategories,
      upcomingBills,
      txCount: transactions.filter((t: any) => new Date(t.date) >= sevenDaysAgo).length,
    };
  }, [txData, subs, loans]);

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.sparkleBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Sparkles size={20} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly Financial Digest</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                7-day spending recap & health check
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Spending Card */}
          <Card
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.heroHeader}>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>TOTAL SPENT THIS WEEK</Text>
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: stats.isLower ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  },
                ]}
              >
                {stats.isLower ? (
                  <TrendingDown size={13} color="#10B981" />
                ) : (
                  <TrendingUp size={13} color="#EF4444" />
                )}
                <Text
                  style={[
                    styles.trendText,
                    { color: stats.isLower ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {stats.diff}% {stats.isLower ? 'less' : 'more'} vs last week
                </Text>
              </View>
            </View>

            <Text style={[styles.heroAmount, { color: colors.text }]}>
              {currencySymbol} {stats.thisWeekExpense.toLocaleString()}
            </Text>

            {/* Income vs Expense Pills */}
            <View style={styles.flowRow}>
              <View style={[styles.flowBox, { backgroundColor: colors.surfaceElevated }]}>
                <ArrowDownLeft size={16} color={colors.success} />
                <View>
                  <Text style={[styles.flowLabel, { color: colors.textMuted }]}>Inflow</Text>
                  <Text style={[styles.flowVal, { color: colors.success }]}>
                    +{currencySymbol} {stats.thisWeekIncome.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={[styles.flowBox, { backgroundColor: colors.surfaceElevated }]}>
                <ArrowUpRight size={16} color={colors.danger} />
                <View>
                  <Text style={[styles.flowLabel, { color: colors.textMuted }]}>Outflow</Text>
                  <Text style={[styles.flowVal, { color: colors.danger }]}>
                    -{currencySymbol} {stats.thisWeekExpense.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Top Spending Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Flame size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spending Categories</Text>
            </View>

            {stats.topCategories.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No expenses logged this week.</Text>
            ) : (
              <Card style={{ padding: Spacing.sm }}>
                {stats.topCategories.map((cat, idx) => (
                  <View
                    key={cat.name}
                    style={[
                      styles.categoryRow,
                      idx < stats.topCategories.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <CategoryIcon categoryName={cat.name} size={36} iconSize={18} />
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: Spacing.sm }}>
                      <Text style={[styles.catAmount, { color: colors.text }]}>
                        {currencySymbol} {cat.amount.toLocaleString()}
                      </Text>
                      <Text style={[styles.catPercent, { color: colors.textMuted }]}>
                        {cat.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>

          {/* Upcoming Bills in Next 7 Days */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color="#EC4899" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Due in the Next 7 Days</Text>
            </View>

            {stats.upcomingBills.length === 0 ? (
              <Card style={[styles.cleanBillsCard, { backgroundColor: colors.surfaceElevated }]}>
                <CheckCircle2 size={24} color={colors.success} />
                <Text style={[styles.cleanBillsTitle, { color: colors.text }]}>No Bills Due This Week</Text>
                <Text style={[styles.cleanBillsSub, { color: colors.textMuted }]}>
                  Your recurring subscriptions are clear for the next 7 days.
                </Text>
              </Card>
            ) : (
              <Card style={{ padding: Spacing.sm }}>
                {stats.upcomingBills.map((sub: any, idx: number) => {
                  const dueDateFormatted = new Date(sub.next_due_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <View
                      key={sub.id}
                      style={[
                        styles.billRow,
                        idx < stats.upcomingBills.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={[styles.billIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                        <CreditCard size={18} color="#EC4899" />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text style={[styles.billName, { color: colors.text }]}>{sub.name}</Text>
                        <Text style={[styles.billDueText, { color: '#EC4899' }]}>Due {dueDateFormatted}</Text>
                      </View>
                      <Text style={[styles.billAmount, { color: colors.text }]}>
                        {currencySymbol} {Number(sub.amount).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xl }}>
            {onNavigateAnalytics && (
              <Button
                title="View Full Analytics & Trends"
                variant="primary"
                size="lg"
                onPress={() => {
                  triggerHaptic.selection();
                  onClose();
                  setTimeout(() => {
                    onNavigateAnalytics();
                  }, 250);
                }}
              />
            )}

            <Button
              title="Close Digest"
              variant="outline"
              size="md"
              onPress={() => {
                triggerHaptic.light();
                onClose();
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sparkleBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xxl,
    borderWidth: 1.5,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  heroSub: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '900',
    marginVertical: Spacing.xs,
  },
  flowRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  flowBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
  },
  flowLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  flowVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  catPercent: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cleanBillsCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cleanBillsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cleanBillsSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  billIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billName: {
    fontSize: 13,
    fontWeight: '700',
  },
  billDueText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
});