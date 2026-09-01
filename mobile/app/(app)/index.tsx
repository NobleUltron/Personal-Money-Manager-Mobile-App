import React, { useMemo } from 'react';
import {
  Platform,
  useWindowDimensions,
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
  Send,
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
  Smartphone,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { WeeklyDigestModal } from '../../components/notifications/WeeklyDigestModal';
import { NetWorthBreakdownModal } from '../../components/ui/NetWorthBreakdownModal';
import { analyticsApi, subscriptionsApi, loansApi, accountsApi } from '../../services/api';
import { triggerHaptic } from '../../utils/haptics';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { TransactionItem } from '../../components/financial/TransactionItem';
import { GoalCard } from '../../components/financial/GoalCard';
import { BudgetProgress } from '../../components/financial/BudgetProgress';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';
import { Account } from '../../types';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { hideBalances, toggleHideBalances, formatAmount } = usePrivacy();
  const { openQuickEntry } = useQuickEntry();
  const { unreadCount, syncAllBillReminders, checkAndNotifyBudgetLimits } = useNotifications();
  const [notifModalVisible, setNotifModalVisible] = React.useState(false);
  const [weeklyDigestVisible, setWeeklyDigestVisible] = React.useState(false);
  const [p2pModalVisible, setP2pModalVisible] = React.useState(false);
  const [netWorthBreakdownVisible, setNetWorthBreakdownVisible] = React.useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Queries
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.getAll(),
  });

  const { data: loansData } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loansApi.getAll(),
  });

  // Auto-sync bill & loan reminders
  React.useEffect(() => {
    const loansList = Array.isArray(loansData) ? loansData : (loansData as any)?.loans || [];
    syncAllBillReminders(subscriptions, loansList, user?.currency_symbol || user?.currency || 'UGX');
  }, [subscriptions, loansData, user?.currency, user?.currency_symbol, syncAllBillReminders]);

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

  const activeAccountsCount = accounts.length || (data?.accounts?.length || 0);
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

  // Smart Financial Pulse Insight Generator
  const smartPulse = useMemo(() => {
    if (upcomingBills.length > 0) {
      return {
        type: 'warning',
        icon: Calendar,
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        title: `${upcomingBills.length} Bill${upcomingBills.length > 1 ? 's' : ''} Due Soon`,
        subtitle: `${upcomingBills.map((b) => b.name).slice(0, 2).join(', ')} due in the next 7 days`,
        action: () => router.push('/(app)/subscriptions'),
      };
    }

    if (totalIncome > 0 && totalExpenses > 0) {
      const savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
      if (savingsRate >= 20) {
        return {
          type: 'success',
          icon: Zap,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          title: `Strong Financial Pace (${savingsRate}% Saved)`,
          subtitle: `You've retained ${formatAmount(totalIncome - totalExpenses, currencySymbol)} this month`,
          action: () => setWeeklyDigestVisible(true),
        };
      }
    }

    return {
      type: 'info',
      icon: Sparkles,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.12)',
      borderColor: 'rgba(99, 102, 241, 0.25)',
      title: 'Weekly Financial Pulse Ready',
      subtitle: 'Review your 7-day spending trends & forecasts',
      action: () => setWeeklyDigestVisible(true),
    };
  }, [upcomingBills, totalIncome, totalExpenses, currencySymbol, formatAmount, router]);

  const handleTogglePrivacy = () => {
    triggerHaptic.selection();
    toggleHideBalances();
  };

  const getAccountMiniIcon = (type?: string) => {
    const t = (type || 'cash').toLowerCase();
    if (t.includes('bank')) return Landmark;
    if (t.includes('momo') || t.includes('mobile')) return Smartphone;
    if (t.includes('credit')) return CreditCard;
    if (t.includes('saving')) return PiggyBank;
    return Wallet;
  };

  const FINTECH_SERVICES = [
    {
      id: 'p2p',
      title: 'Send Money',
      icon: Send,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.14)',
      action: () => setP2pModalVisible(true),
    },
    {
      id: 'transfer',
      title: 'Transfers',
      icon: ArrowLeftRight,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.14)',
      route: '/(app)/transfer',
    },
    {
      id: 'entry',
      title: 'Quick Entry',
      icon: Plus,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.14)',
      action: openQuickEntry,
    },
    {
      id: 'accounts',
      title: 'Accounts',
      icon: Landmark,
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.14)',
      route: '/(app)/accounts',
    },
    {
      id: 'budgets',
      title: 'Budgets',
      icon: PieChart,
      color: '#0EA5E9',
      bg: 'rgba(14, 165, 233, 0.14)',
      route: '/(app)/budgets',
    },
    {
      id: 'goals',
      title: 'Goals',
      icon: Target,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.14)',
      route: '/(app)/goals',
    },
    {
      id: 'subscriptions',
      title: 'Bills',
      icon: Repeat,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.14)',
      route: '/(app)/subscriptions',
    },
    {
      id: 'loans',
      title: 'Debts & Loans',
      icon: HandCoins,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.14)',
      route: '/(app)/loans',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: TrendingUp,
      color: '#14B8A6',
      bg: 'rgba(20, 184, 166, 0.14)',
      route: '/(app)/analytics',
    },
  ];
  const desktopScrollContent = isDesktop ? { maxWidth: 1000, alignSelf: 'center', width: '100%', paddingTop: 20 } : {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, desktopScrollContent as any]}
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
        {/* 1. Top Header with User Greeting & Notifications */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
              {greeting},
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.userNameText, { color: colors.text }]}>
                {user?.username || 'Noble'}
              </Text>
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <ShieldCheck size={11} color="#10B981" />
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
                { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
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
                  style={[styles.headerAvatarImage, { borderColor: colors.borderSubtle }]}
                />
              ) : (
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
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
            {/* 2. Primary Net Worth Banner */}
            <LinearGradient
              colors={['#4F46E5', '#3730A3', '#1E1B4B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceCardHeader}>
                <View style={styles.netWorthLabelRow}>
                  <Text style={styles.balanceCardLabel}>TOTAL NET WORTH</Text>
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
                    <EyeOff size={17} color="#FFFFFF" />
                  ) : (
                    <Eye size={17} color="#FFFFFF" />
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
                  Across {activeAccountsCount} active {activeAccountsCount === 1 ? 'wallet' : 'wallets'}
                </Text>
                {netCashFlow !== 0 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      triggerHaptic.selection();
                      setNetWorthBreakdownVisible(true);
                    }}
                    style={[
                      styles.netFlowPill,
                      {
                        backgroundColor:
                          netCashFlow >= 0 ? 'rgba(110, 231, 183, 0.22)' : 'rgba(252, 165, 165, 0.22)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.netFlowTag,
                        { color: netCashFlow >= 0 ? '#6EE7B7' : '#FCA5A5' },
                      ]}
                    >
                      {netCashFlow >= 0 ? '↗ +' : '↘ -'}
                      {formatAmount(Math.abs(netCashFlow), currencySymbol)} Net Flow
                    </Text>
                  </TouchableOpacity>
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

            {/* 3. Smart Financial Pulse Insight Banner */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                smartPulse.action();
              }}
              style={[
                styles.pulseCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? smartPulse.borderColor : colors.borderSubtle,
                },
              ]}
            >
              <View style={[styles.pulseIconBox, { backgroundColor: smartPulse.bg }]}>
                <smartPulse.icon size={16} color={smartPulse.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.pulseTitle, { color: colors.text }]}>{smartPulse.title}</Text>
                  <View style={[styles.pulseTag, { backgroundColor: smartPulse.bg }]}>
                    <Text style={[styles.pulseTagText, { color: smartPulse.color }]}>Insight</Text>
                  </View>
                </View>
                <Text style={[styles.pulseSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {smartPulse.subtitle}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* 4. Horizontal Quick Wallets Glance Strip */}
            <View style={styles.walletsSection}>
              <View style={styles.walletsHeaderRow}>
                <Text style={[styles.walletsSectionTitle, { color: colors.textSecondary }]}>
                  QUICK WALLETS
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic.selection();
                    router.push('/(app)/accounts');
                  }}
                >
                  <Text style={[styles.walletsSeeAllText, { color: colors.primary }]}>
                    Manage ({accounts.length}) →
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.walletsScrollRow}
              >
                {accounts.map((acc: Account) => {
                  const Icon = getAccountMiniIcon(acc.type);
                  const isNeg = Number(acc.balance) < 0;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        triggerHaptic.selection();
                        router.push('/(app)/accounts');
                      }}
                      style={[
                        styles.walletMiniCard,
                        {
                          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          borderColor: isDark ? '#1E293B' : '#E2E8F0',
                        },
                      ]}
                    >
                      <View style={styles.walletMiniTop}>
                        <View style={[styles.walletMiniIconBox, { backgroundColor: colors.surfaceElevated }]}>
                          <Icon size={14} color={colors.primary} />
                        </View>
                        {acc.is_shared && (
                          <View style={styles.walletSharedDot} />
                        )}
                      </View>
                      <Text style={[styles.walletMiniName, { color: colors.text }]} numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text
                        style={[
                          styles.walletMiniBalance,
                          { color: isNeg ? colors.danger : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {formatAmount(acc.balance, currencySymbol)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Quick Add Wallet Pill */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    triggerHaptic.selection();
                    router.push('/(app)/accounts');
                  }}
                  style={[
                    styles.walletAddCard,
                    {
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                    },
                  ]}
                >
                  <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.walletAddText, { color: colors.primary }]}>Add Wallet</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* 5. 3-Column Obsidian Cash Flow Grid */}
            <View style={styles.flowStripContainer}>
              {/* Inflow Card */}
              <View
                style={[
                  styles.flowStripItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <ArrowDownLeft size={13} color="#10B981" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Inflow</Text>
                </View>
                <Text
                  style={[styles.flowItemAmount, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {formatAmount(totalIncome, currencySymbol)}
                </Text>
              </View>

              {/* Spent Card */}
              <View
                style={[
                  styles.flowStripItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <ArrowUpRight size={13} color="#EF4444" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Spent</Text>
                </View>
                <Text
                  style={[styles.flowItemAmount, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {formatAmount(totalExpenses, currencySymbol)}
                </Text>
              </View>

              {/* Net Savings Card */}
              <View
                style={[
                  styles.flowStripItem,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.flowItemHeader}>
                  <View style={[styles.flowIconDot, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <PiggyBank size={13} color="#6366F1" />
                  </View>
                  <Text style={[styles.flowItemLabel, { color: colors.textSecondary }]}>Savings</Text>
                </View>
                <Text
                  style={[
                    styles.flowItemAmount,
                    { color: netCashFlow >= 0 ? colors.success : colors.danger },
                  ]}
                  numberOfLines={1}
                >
                  {formatAmount(netCashFlow, currencySymbol)}
                </Text>
              </View>
            </View>

            {/* 6. Upcoming Bills Alert Widget */}
            {upcomingBills.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  router.push('/(app)/subscriptions');
                }}
                style={[
                  styles.upcomingWidget,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#F59E0B',
                  },
                ]}
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
                      {upcomingBills.map((b) => b.name).slice(0, 2).join(', ')}{upcomingBills.length > 2 ? '...' : ''}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={isDark ? '#FCD34D' : '#92400E'} />
              </TouchableOpacity>
            )}

            {/* 7. Fintech 8-Icon Quick Services Hub */}
            <View
              style={[
                styles.servicesCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                  borderWidth: 1.2,
                },
              ]}
            >
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
                      style={[styles.serviceItem, isDesktop && { width: 100 }]}
                    >
                      <View style={[styles.serviceIconBubble, { backgroundColor: srv.bg }]}>
                        <SrvIcon size={20} color={srv.color} strokeWidth={2.2} />
                      </View>
                      <Text style={[styles.serviceLabel, { color: colors.text }]} numberOfLines={1}>
                        {srv.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 8. Recent Transactions */}
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

            {/* 9. Active Savings Goals Preview */}
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

            {/* 10. Budget Health Preview */}
            {data?.budgets && data.budgets.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Monthly Budgets
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
                <Card style={{ padding: Spacing.md, gap: Spacing.md }}>
                  {data.budgets.slice(0, 3).map((budget) => (
                    <BudgetProgress
                      key={budget.id}
                      budget={budget}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* MODALS */}
      <NotificationCenterModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
      />

      <WeeklyDigestModal
        visible={weeklyDigestVisible}
        onClose={() => setWeeklyDigestVisible(false)}
      />

      <NetWorthBreakdownModal
        visible={netWorthBreakdownVisible}
        onClose={() => setNetWorthBreakdownVisible(false)}
        accounts={accounts.length > 0 ? accounts : (data?.accounts || [])}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        currencySymbol={currencySymbol}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#020617',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
  headerInitialsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInitialsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#020617',
  },
  balanceCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm + 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  netWorthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceCardLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  activePillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  activePillBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  privacyEyeButton: {
    padding: 4,
  },
  balanceCardAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  balanceCardSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  netFlowPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  netFlowTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: Radius.xl,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pulseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
    marginBottom: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pulseIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pulseTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  pulseTagText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pulseSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  walletsSection: {
    marginBottom: Spacing.md,
  },
  walletsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  walletsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  walletsSeeAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  walletsScrollRow: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: Spacing.md,
  },
  walletMiniCard: {
    width: 130,
    padding: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    gap: 2,
  },
  walletMiniTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletMiniIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletSharedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  walletMiniName: {
    fontSize: 12,
    fontWeight: '700',
  },
  walletMiniBalance: {
    fontSize: 11,
    fontWeight: '600',
  },
  walletAddCard: {
    width: 100,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  walletAddText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flowStripContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  flowStripItem: {
    flex: 1,
    padding: Spacing.sm + 2,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
  },
  flowItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  flowIconDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowItemLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  flowItemAmount: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  upcomingWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
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
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
    padding: Spacing.md,
    borderRadius: Radius.xxl,
    marginBottom: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  serviceItem: {
    width: '23%',
    alignItems: 'center',
  },
  serviceIconBubble: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
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
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transactionCardContainer: {
    borderRadius: Radius.xxl,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
});