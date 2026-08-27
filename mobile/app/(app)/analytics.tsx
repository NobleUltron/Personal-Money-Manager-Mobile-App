import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Calendar,
  Zap,
  Sparkles,
  PieChart,
  ShieldCheck,
  Landmark,
  Smartphone,
  Wallet,
  CreditCard,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Clock,
  ChevronRight,
  Info,
  Download,
  Award,
  Store,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { accountsApi, analyticsApi, transactionsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { DonutChart, SliceData } from '../../components/financial/DonutChart';
import { SpendingVelocityChart } from '../../components/financial/SpendingVelocityChart';
import { IncomeExpenseBarChart } from '../../components/financial/IncomeExpenseBarChart';
import { AssetAllocationCard } from '../../components/financial/AssetAllocationCard';
import { CategoryDrilldownModal } from '../../components/financial/CategoryDrilldownModal';
import { StatementExportModal } from '../../components/ui/StatementExportModal';
import { triggerHaptic } from '../../utils/haptics';
import { Transaction } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

type TimePeriod = 7 | 30 | 90 | 365;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const currencySymbol = user?.currency_symbol || 'UGX';

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(30);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<SliceData | null>(null);

  // Fetch Analytics Overview for the selected period
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['analytics-overview', selectedPeriod],
    queryFn: () => analyticsApi.getOverview(selectedPeriod),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['transactions', 'analytics-export'],
    queryFn: () => transactionsApi.getAll({ limit: 500 }),
  });

  const overview = data?.overview;
  const isSpendingUp = (overview?.spendingChangePct || 0) > 0;
  const totalSpending = overview?.totalSpending || 0;
  const totalIncome = overview?.totalIncome || 0;
  const netSavings =
    overview?.netSavings !== undefined ? overview.netSavings : totalIncome - totalSpending;
  const dailyAvg = overview?.dailyAvg || 0;

  // Runway & Forecast Calculations
  const { projectedMonthlyBurn, runwayMonths, runwayRating, weekendRatioText } = useMemo(() => {
    const projected = Math.round(dailyAvg * 30);
    const liquidTotal = dashboardData?.totalBalance || 0;
    const months = projected > 0 ? Math.round((liquidTotal / projected) * 10) / 10 : 99;

    let rating = {
      label: 'Ultra Safe',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
    };
    if (months < 1) {
      rating = {
        label: 'Critical Runway',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.15)',
      };
    } else if (months < 3) {
      rating = {
        label: 'Tight Buffer',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
      };
    } else if (months < 6) {
      rating = {
        label: 'Healthy (3–6 Mo)',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.15)',
      };
    }

    // Weekend vs Weekday analysis
    const weekend = overview?.weekendSpent || 0;
    const weekday = overview?.weekdaySpent || 0;
    let weekendTxt = 'Balanced weekly spend';
    if (weekend > 0 && weekday > 0) {
      const weekendRatio = Math.round((weekend / (weekend + weekday)) * 100);
      if (weekendRatio > 45) {
        weekendTxt = `${weekendRatio}% of spending occurs on weekends`;
      } else {
        weekendTxt = `${100 - weekendRatio}% of spending is during weekdays`;
      }
    }

    return {
      projectedMonthlyBurn: projected,
      runwayMonths: months,
      runwayRating: rating,
      weekendRatioText: weekendTxt,
    };
  }, [dailyAvg, dashboardData?.totalBalance, overview]);

  const rawTransactions: Transaction[] = allTransactions?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Financial Analytics"
        subtitle="Visual cash flow & predictive intelligence"
        showBack
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              triggerHaptic.selection();
              setExportModalVisible(true);
            }}
            style={[styles.headerActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Download size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* 1. Time Horizon Filter Tabs */}
        <View style={styles.periodTabsContainer}>
          {[
            { days: 7, label: '7 Days' },
            { days: 30, label: '30 Days' },
            { days: 90, label: '90 Days' },
            { days: 365, label: '1 Year' },
          ].map((tab) => {
            const isSelected = selectedPeriod === tab.days;
            return (
              <TouchableOpacity
                key={tab.days}
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic.selection();
                  setSelectedPeriod(tab.days as TimePeriod);
                }}
                style={[
                  styles.periodTab,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.periodTabText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* 2. Executive 4-Stat Pulse Grid */}
            <View style={styles.statGrid}>
              {/* Total Spending */}
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
                  <View
                    style={[
                      styles.microTag,
                      { backgroundColor: isSpendingUp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
                    ]}
                  >
                    {isSpendingUp ? <TrendingUp size={11} color="#EF4444" /> : <TrendingDown size={11} color="#10B981" />}
                    <Text style={[styles.microTagText, { color: isSpendingUp ? '#EF4444' : '#10B981' }]}>
                      {isSpendingUp ? '+' : ''}{overview?.spendingChangePct || 0}%
                    </Text>
                  </View>
                </View>
                <Text style={[styles.statAmount, { color: '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmount(totalSpending, currencySymbol)}
                </Text>
                <Text style={[styles.statSub, { color: colors.textMuted }]}>
                  vs prev {selectedPeriod} days
                </Text>
              </View>

              {/* Total Income */}
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
                  <View style={[styles.microTag, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <ArrowDownLeft size={11} color="#10B981" />
                    <Text style={[styles.microTagText, { color: '#10B981' }]}>Inflow</Text>
                  </View>
                </View>
                <Text style={[styles.statAmount, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmount(totalIncome, currencySymbol)}
                </Text>
                <Text style={[styles.statSub, { color: colors.textMuted }]}>
                  Recorded in period
                </Text>
              </View>

              {/* Net Cash Flow */}
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Cash Flow</Text>
                  <View
                    style={[
                      styles.microTag,
                      { backgroundColor: netSavings >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                    ]}
                  >
                    <Text style={[styles.microTagText, { color: netSavings >= 0 ? '#10B981' : '#EF4444' }]}>
                      {netSavings >= 0 ? 'Surplus' : 'Deficit'}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.statAmount, { color: netSavings >= 0 ? '#10B981' : '#EF4444' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {netSavings >= 0 ? '+' : ''}{formatAmount(netSavings, currencySymbol)}
                </Text>
                <Text style={[styles.statSub, { color: colors.textMuted }]}>
                  Net retained capital
                </Text>
              </View>

              {/* Daily Average Burn */}
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeaderRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Average</Text>
                  <View style={[styles.microTag, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Flame size={11} color="#6366F1" />
                    <Text style={[styles.microTagText, { color: '#6366F1' }]}>Burn</Text>
                  </View>
                </View>
                <Text style={[styles.statAmount, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmount(dailyAvg, currencySymbol)}
                </Text>
                <Text style={[styles.statSub, { color: colors.textMuted }]}>
                  Average daily velocity
                </Text>
              </View>
            </View>

            {/* 3. Smooth SVG Spending Velocity Curve Chart */}
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <TrendingUp size={18} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Outflow Velocity</Text>
                    <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                      Smooth spending curve vs daily average
                    </Text>
                  </View>
                </View>
              </View>

              <SpendingVelocityChart
                data={data?.dailyTrend || []}
                dailyAvg={dailyAvg}
                currencySymbol={currencySymbol}
              />
            </Card>

            {/* 4. 6-Month Cash Flow Dual-Bar Inflow vs Outflow */}
            {data?.monthlyCashflowTrend && data.monthlyCashflowTrend.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <BarChart3 size={18} color="#10B981" />
                    </View>
                    <View>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>6-Month Cash Flow Trend</Text>
                      <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                        Monthly Inflow vs Outflow & Savings Rate
                      </Text>
                    </View>
                  </View>
                </View>

                <IncomeExpenseBarChart
                  data={data.monthlyCashflowTrend}
                  currencySymbol={currencySymbol}
                />
              </Card>
            )}

            {/* 5. Category Spending Breakdown with Interactive Donut */}
            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <PieChart size={18} color="#6366F1" />
                    </View>
                    <View>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Breakdown</Text>
                      <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                        {data.categoryBreakdown.length} active sectors (tap to inspect)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* SVG Interactive Donut Chart */}
                <DonutChart
                  data={data.categoryBreakdown}
                  totalAmount={totalSpending}
                  currencySymbol={currencySymbol}
                  onCategoryPress={(slice) => {
                    setDrilldownCategory(slice);
                  }}
                />

                {/* Category List Drilldown */}
                <View style={styles.categoryList}>
                  {data.categoryBreakdown.map((cat, idx) => (
                    <TouchableOpacity
                      key={cat.category}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic.selection();
                        setDrilldownCategory({
                          category: cat.category,
                          amount: cat.amount,
                          percentage: cat.percentage,
                          color: cat.color || '#6366F1',
                        });
                      }}
                      style={[styles.catRow, { borderBottomColor: colors.borderSubtle }]}
                    >
                      <View style={styles.catLeft}>
                        <View style={[styles.catColorDot, { backgroundColor: cat.color || '#6366F1' }]} />
                        <View>
                          <Text style={[styles.catName, { color: colors.text }]}>{cat.category}</Text>
                          {cat.count !== undefined && (
                            <Text style={[styles.catCount, { color: colors.textMuted }]}>
                              {cat.count} transaction{cat.count === 1 ? '' : 's'} • Tap to inspect
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.catRight}>
                        <Text style={[styles.catAmount, { color: colors.text }]}>
                          {formatAmount(cat.amount, currencySymbol)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[styles.catPct, { color: colors.textSecondary }]}>
                            {cat.percentage}%
                          </Text>
                          <ChevronRight size={13} color={colors.textMuted} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}

            {/* 6. Liquid Asset Distribution Allocation Card */}
            <AssetAllocationCard
              accounts={allAccounts}
              currencySymbol={currencySymbol}
            />

            {/* 7. Top Spending Destinations / Merchants */}
            {data?.topMerchants && data.topMerchants.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Store size={18} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Top Expense Destinations</Text>
                      <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                        Highest frequency & volume payees
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ gap: 12, marginTop: 4 }}>
                  {data.topMerchants.map((merchant, idx) => {
                    const sharePct =
                      totalSpending > 0
                        ? Math.round((merchant.amount / totalSpending) * 1000) / 10
                        : 0;
                    const fillPct = Math.max(3, Math.min(100, Math.round(sharePct)));

                    return (
                      <View key={merchant.name} style={styles.merchantItem}>
                        <View style={styles.merchantHeader}>
                          <View style={styles.merchantLeft}>
                            <View
                              style={[
                                styles.rankBadge,
                                {
                                  backgroundColor:
                                    idx === 0 ? 'rgba(245, 158, 11, 0.2)' : colors.surfaceElevated,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.rankText,
                                  { color: idx === 0 ? '#F59E0B' : colors.textSecondary },
                                ]}
                              >
                                #{idx + 1}
                              </Text>
                            </View>
                            <Text
                              style={[styles.merchantName, { color: colors.text }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {merchant.name}
                            </Text>
                          </View>
                          <View style={styles.merchantRight}>
                            <Text style={[styles.merchantAmount, { color: colors.text }]}>
                              {formatAmount(merchant.amount, currencySymbol)}
                            </Text>
                            <Text style={[styles.merchantPct, { color: colors.textSecondary }]}>
                              {sharePct}% of total
                            </Text>
                          </View>
                        </View>

                        <ProgressBar
                          progress={fillPct}
                          color={idx === 0 ? '#F59E0B' : colors.primary}
                          height={6}
                        />
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* 8. Cash Runway & Burn Rate Forecast Card */}
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <ShieldCheck size={18} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Capital Runway Forecast</Text>
                    <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                      Liquid runway vs monthly burn
                    </Text>
                  </View>
                </View>
                <View style={[styles.runwayBadge, { backgroundColor: runwayRating.bg }]}>
                  <Text style={[styles.runwayBadgeText, { color: runwayRating.color }]}>
                    {runwayMonths > 0 ? `${runwayMonths} Mo` : '< 1 Mo'}
                  </Text>
                </View>
              </View>

              <View style={styles.runwayInfoBox}>
                <View style={styles.runwayStatRow}>
                  <Text style={[styles.runwayStatLabel, { color: colors.textSecondary }]}>
                    Projected 30-Day Burn:
                  </Text>
                  <Text style={[styles.runwayStatVal, { color: colors.text }]}>
                    {formatAmount(projectedMonthlyBurn, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.runwayStatRow}>
                  <Text style={[styles.runwayStatLabel, { color: colors.textSecondary }]}>
                    Total Liquid Reserves:
                  </Text>
                  <Text style={[styles.runwayStatVal, { color: '#10B981' }]}>
                    {formatAmount(dashboardData?.totalBalance || 0, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.runwayStatRow}>
                  <Text style={[styles.runwayStatLabel, { color: colors.textSecondary }]}>
                    Behavioral Velocity:
                  </Text>
                  <Text style={[styles.runwayStatVal, { color: colors.primary }]}>
                    {weekendRatioText}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Category Itemized Drilldown Modal */}
      {drilldownCategory && (
        <CategoryDrilldownModal
          visible={drilldownCategory !== null}
          onClose={() => setDrilldownCategory(null)}
          categoryName={drilldownCategory.category}
          categoryColor={drilldownCategory.color}
          totalSpent={drilldownCategory.amount}
          categoryPercentage={drilldownCategory.percentage}
          transactions={rawTransactions}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Statement Export Modal (PDF & Excel) */}
      <StatementExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        transactions={rawTransactions}
        accounts={allAccounts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl * 3,
  },
  centerContainer: {
    paddingVertical: Spacing.xxl * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.sm,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  statBox: {
    width: '48.5%',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 4,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  microTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  microTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryList: {
    marginTop: Spacing.md,
    gap: 2,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
  },
  catCount: {
    fontSize: 10,
    fontWeight: '500',
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  catPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  merchantItem: {
    gap: 6,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  merchantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  merchantRight: {
    alignItems: 'flex-end',
  },
  merchantAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  merchantPct: {
    fontSize: 10,
    fontWeight: '600',
  },
  runwayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  runwayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  runwayInfoBox: {
    gap: 8,
    marginTop: Spacing.xs,
  },
  runwayStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runwayStatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  runwayStatVal: {
    fontSize: 13,
    fontWeight: '800',
  },
});