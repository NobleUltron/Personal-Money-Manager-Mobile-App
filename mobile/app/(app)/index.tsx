import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  Plus,
  Repeat,
  Target,
  TrendingUp,
  Wallet,
  PieChart,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Clock,
  Sliders,
  Settings,
  Bell,
  Calendar,
  AlertCircle,
  HandCoins,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationCenterModal } from '../../components/ui/NotificationCenterModal';
import { analyticsApi, subscriptionsApi } from '../../services/api';
import { triggerHaptic } from '../../utils/haptics';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { TransactionItem } from '../../components/financial/TransactionItem';
import { GoalCard } from '../../components/financial/GoalCard';
import { BudgetProgress } from '../../components/financial/BudgetProgress';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { hideBalances, toggleHideBalances, formatAmount } = usePrivacy();
  const { openQuickEntry } = useQuickEntry();
  const { unreadCount, syncAllBillReminders, checkAndNotifyBudgetLimits } = useNotifications();
  const [notifModalVisible, setNotifModalVisible] = React.useState(false);
  const router = useRouter();

  // Queries
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.getAll(),
  });

  // Auto-sync bill reminders & budget alerts
  React.useEffect(() => {
    if (subscriptions && subscriptions.length > 0) {
      syncAllBillReminders(subscriptions, user?.currency_symbol || user?.currency || 'UGX');
    }
  }, [subscriptions, user?.currency, user?.currency_symbol, syncAllBillReminders]);

  React.useEffect(() => {
    if (data?.budgets && data.budgets.length > 0) {
      checkAndNotifyBudgetLimits(data.budgets, user?.currency_symbol || user?.currency || 'UGX');
    }
  }, [data?.budgets, user?.currency, user?.currency_symbol, checkAndNotifyBudgetLimits]);

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Dynamic Time-of-Day Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const totalCalculatedNetWorth =
    data?.accounts && data.accounts.length > 0
      ? data.accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
      : (data?.totalBalance || 0);

  const activeAccountsCount = data?.accounts?.length || 0;
  const totalIncome = Number(data?.totalDeposits) || 0;
  const totalExpenses = Number(data?.totalWithdrawals) || 0;
  const netCashFlow = totalIncome - totalExpenses;

  // Upcoming bills count
  const upcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return subscriptions.filter((s) => {
      const due = new Date(s.next_due_date);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    });
  }, [subscriptions]);

  const handleTogglePrivacy = () => {
    triggerHaptic.selection();
    toggleHideBalances();
  };

  const FINTECH_SERVICES = [
    {
      id: 'transfer',
      title: 'Transfers',
      icon: ArrowLeftRight,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.15)',
      route: '/(app)/transfer',
    },
    {
      id: 'entry',
      title: 'Quick Entry',
      icon: Plus,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
      action: openQuickEntry,
    },
    {
      id: 'accounts',
      title: 'Accounts',
      icon: Landmark,
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.15)',
      route: '/(app)/accounts',
    },
    {
      id: 'budgets',
      title: 'Budgets',
      icon: PieChart,
      color: '#0EA5E9',
      bg: 'rgba(14, 165, 233, 0.15)',
      route: '/(app)/budgets',
    },
    {
      id: 'goals',
      title: 'Goals',
      icon: Target,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.15)',
      route: '/(app)/goals',
    },
    {
      id: 'subscriptions',
      title: 'Bills',
      icon: Repeat,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.15)',
      route: '/(app)/subscriptions',
    },
    {
      id: 'loans',
      title: 'Debts & Loans',
      icon: HandCoins,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.15)',
      route: '/(app)/loans',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: TrendingUp,
      color: '#14B8A6',
      bg: 'rgba(20, 184, 166, 0.15)',
      route: '/(app)/analytics',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* 1. Top Header with User Greeting & Settings Shortcut */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
              {greeting},
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.userNameText, { color: colors.text }]}>
                {user?.username || 'Noble'}
              </Text>
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ShieldCheck size={12} color="#10B981" />
                <Text style={styles.verifiedBadgeText}>Encrypted</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setNotifModalVisible(true);
              }}
              style={[
                styles.headerIconBtn,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Bell size={18} color={colors.text} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                router.push('/(app)/settings');
              }}
              style={styles.avatarButtonWrapper}
            >
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={[styles.headerAvatarImage, { borderColor: colors.border }]}
                />
              ) : (
                <LinearGradient
                  colors={Gradients.primary as any}
                  style={styles.headerInitialsCircle}
                >
                  <Text style={styles.headerInitialsText}>
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : 'NU'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <SkeletonDashboard />
        ) : (
          <>
            {/* 2. Primary Net Worth Banner with Quick Glassmorphism Actions */}
            <LinearGradient
              colors={Gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceCardHeader}>
                <View style={styles.netWorthLabelRow}>
                  <Text style={styles.balanceCardLabel}>Total Net Worth</Text>
                  <View style={styles.activePillBadge}>
                    <Text style={styles.activePillBadgeText}>{currencySymbol}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleTogglePrivacy}
                  style={styles.privacyEyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {hideBalances ? (
                    <EyeOff size={18} color="#FFFFFF" />
                  ) : (
                    <Eye size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              <Text
                style={styles.balanceCardAmount}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                numberOfLines={1}
              >
                {formatAmount(totalCalculatedNetWorth, currencySymbol)}
              </Text>

              <View style={styles.cardSubRow}>
                <Text style={styles.balanceCardSub}>
                  Across {activeAccountsCount} active {activeAccountsCount === 1 ? 'account' : 'accounts & wallets'}
                </Text>
                {netCashFlow !== 0 && (
                  <Text style={[styles.netFlowTag, { color: netCashFlow >= 0 ? '#6EE7B7' : '#FCA5A5' }]}>
                    {netCashFlow >= 0 ? '▲ Net Positive' : '▼ Net Negative'}
                  </Text>
                )}
              </View>

              {/* Action Bar inside Banner */}
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic.medium();
                    openQuickEntry();
                  }}
                  style={styles.actionPill}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.actionPillText}>Add Entry</Text>
                </TouchableOpacity>

                <View style={styles.actionPillDivider} />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic.light();
                    router.push('/(app)/transfer');
                  }}
                  style={styles.actionPill}
                >
                  <ArrowLeftRight size={15} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.actionPillText}>Transfer</Text>
                </TouchableOpacity>

                <View style={styles.actionPillDivider} />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic.light();
                    router.push('/(app)/analytics');
                  }}
                  style={styles.actionPill}
                >
                  <TrendingUp size={15} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.actionPillText}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* 3. Three-Metric Financial Flow Strip */}
            <View style={styles.flowStripContainer}>
              <View style={[styles.flowStripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <ArrowDownLeft size={14} color="#10B981" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Income</Text>
                </View>
                <Text style={[styles.flowItemAmount, { color: colors.text }]}>
                  {formatAmount(totalIncome, currencySymbol)}
                </Text>
              </View>

              <View style={[styles.flowStripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <ArrowUpRight size={14} color="#EF4444" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Spent</Text>
                </View>
                <Text style={[styles.flowItemAmount, { color: colors.text }]}>
                  {formatAmount(totalExpenses, currencySymbol)}
                </Text>
              </View>

              <View style={[styles.flowStripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <PiggyBank size={14} color="#6366F1" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Savings</Text>
                </View>
                <Text style={[styles.flowItemAmount, { color: netCashFlow >= 0 ? colors.success : colors.danger }]}>
                  {formatAmount(netCashFlow, currencySymbol)}
                </Text>
              </View>
            </View>

            {/* 4. Upcoming Bills Alert Widget */}
            {upcomingBills.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  router.push('/(app)/subscriptions');
                }}
                style={[styles.upcomingWidget, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', borderColor: '#F59E0B' }]}
              >
                <View style={styles.upcomingWidgetLeft}>
                  <View style={styles.upcomingIconBox}>
                    <Calendar size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.upcomingWidgetTitle, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                      {upcomingBills.length} Bill{upcomingBills.length > 1 ? 's' : ''} Due in Next 7 Days
                    </Text>
                    <Text style={[styles.upcomingWidgetSub, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                      {upcomingBills.map(b => b.name).slice(0, 2).join(', ')}{upcomingBills.length > 2 ? '...' : ''}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={isDark ? '#FCD34D' : '#92400E'} />
              </TouchableOpacity>
            )}

            {/* 5. Fintech 8-Icon Quick Services Hub */}
            <View style={[styles.servicesCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={styles.servicesGrid}>
                {FINTECH_SERVICES.map((srv) => {
                  const SrvIcon = srv.icon;
                  return (
                    <TouchableOpacity
                      key={srv.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        triggerHaptic.light();
                        if (srv.action) {
                          srv.action();
                        } else if (srv.route) {
                          router.push(srv.route as any);
                        }
                      }}
                      style={styles.serviceItem}
                    >
                      <View style={[styles.serviceIconBubble, { backgroundColor: srv.bg }]}>
                        <SrvIcon size={22} color={srv.color} strokeWidth={2.2} />
                      </View>
                      <Text style={[styles.serviceLabel, { color: colors.text }]} numberOfLines={1}>
                        {srv.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6. Recent Transactions */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Transactions
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.light();
                  router.push('/(app)/transactions');
                }}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  See All →
                </Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.transactionCardContainer}>
              {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                data.recentTransactions.slice(0, 5).map((tx, idx, arr) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    currencySymbol={currencySymbol}
                    isLast={idx === arr.length - 1}
                    onPress={() => router.push('/(app)/transactions')}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<ArrowLeftRight size={28} color={colors.textMuted} />}
                  title="No transactions yet"
                  description="Record your first deposit or expense to start tracking."
                  actionTitle="Add Transaction"
                  onAction={() => openQuickEntry()}
                />
              )}
            </Card>

            {/* 7. Active Savings Goals Preview */}
            {data?.goals && data.goals.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Savings Goals
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.light();
                      router.push('/(app)/goals');
                    }}
                  >
                    <Text style={[styles.seeAllText, { color: colors.primary }]}>
                      View All →
                    </Text>
                  </TouchableOpacity>
                </View>
                {data.goals.slice(0, 2).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currencySymbol={currencySymbol}
                    onPress={() => router.push('/(app)/goals')}
                  />
                ))}
              </>
            )}

            {/* 8. Budgets Preview */}
            {data?.budgets && data.budgets.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Budget Overview
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.light();
                      router.push('/(app)/budgets');
                    }}
                  >
                    <Text style={[styles.seeAllText, { color: colors.primary }]}>
                      Manage →
                    </Text>
                  </TouchableOpacity>
                </View>
                {data.budgets.slice(0, 2).map((b) => (
                  <BudgetProgress
                    key={b.id}
                    budget={b}
                    currencySymbol={currencySymbol}
                    onPress={() => router.push('/(app)/budgets')}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      <NotificationCenterModal visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl * 4,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userNameText: {
    ...Typography.titleMedium,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarButtonWrapper: {
    position: 'relative',
  },
  headerAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    backgroundColor: '#334155',
  },
  headerInitialsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInitialsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  balanceCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netWorthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceCardLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activePillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  activePillBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  privacyEyeButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: Radius.full,
  },
  balanceCardAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -0.8,
  },
  cardSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  balanceCardSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  netFlowTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  actionPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  flowStripContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  flowStripItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  flowItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  flowIconDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowItemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  flowItemAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  upcomingWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  upcomingWidgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  upcomingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingWidgetTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  upcomingWidgetSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  servicesCard: {
    borderRadius: Radius.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  serviceItem: {
    width: '24%',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  serviceIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    fontSize: 16,
    fontWeight: '800',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  transactionCardContainer: {
    borderRadius: Radius.xl,
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
});



