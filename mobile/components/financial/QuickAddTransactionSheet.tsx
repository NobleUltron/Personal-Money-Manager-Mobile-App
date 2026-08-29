import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Delete,
  Landmark,
  PiggyBank,
  Smartphone,
  Tag,
  Wallet,
  X,
} from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { accountsApi, transactionsApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Account, DashboardSummary, Transaction } from '../../types';
import { Button } from '../ui/Button';
import { CategoryIcon } from '../ui/CategoryIcon';
import { CATEGORIES } from '../../constants/categories';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface QuickAddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional: if provided, called instead of internal save */
  onSave?: (data: {
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'income' | 'expense';
    amount: number;
    date: string;
    reason?: string;
    category: string;
  }) => void;
  isLoading?: boolean;
  /** Optional: if not provided, fetched internally */
  accounts?: Account[];
  currencySymbol?: string;
  initialTransaction?: Transaction | null;
}



const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const QuickAddTransactionSheet: React.FC<QuickAddTransactionSheetProps> = ({
  visible,
  onClose,
  onSave: externalOnSave,
  isLoading: externalLoading = false,
  accounts: externalAccounts,
  currencySymbol: externalCurrencySymbol,
  initialTransaction,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Internal data fetching (used when no external accounts provided)
  const { data: internalAccounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
    enabled: !externalAccounts,
  });

  const accounts = externalAccounts ?? internalAccounts;
  const currencySymbol = externalCurrencySymbol ?? user?.currency_symbol ?? 'UGX';

  // Internal mutation (used when no external onSave provided)
  const { isOnline, enqueueOfflineMutation } = useSync();

  // Internal mutation with optimistic updates & offline queue fallback
  const internalMutation = useMutation({
    mutationFn: async (data: Parameters<typeof transactionsApi.create>[0]) => {
      if (initialTransaction) {
        return transactionsApi.update(initialTransaction.id, data as any);
      }
      return transactionsApi.create(data);
    },
    onMutate: async (newTxData) => {
      triggerHaptic.success();
      onClose(); // Instant zero-latency dismiss!

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });

      // Snapshot previous cache state
      const prevTransactions = queryClient.getQueryData(['transactions']);
      const prevAccounts = queryClient.getQueryData<Account[]>(['accounts']);
      const prevDashboard = queryClient.getQueryData<DashboardSummary>(['dashboard']);

      const targetAccount = (prevAccounts || accounts)?.find((a) => a.id === newTxData.accountId);
      const isDeposit = newTxData.type === 'deposit' || (newTxData.type as string) === 'income';
      const balanceDelta = isDeposit ? newTxData.amount : -newTxData.amount;

      // 1. Optimistic Transaction
      const optimisticTx: Transaction = {
        id: initialTransaction ? initialTransaction.id : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        accountId: newTxData.accountId,
        type: newTxData.type as any,
        amount: newTxData.amount,
        date: newTxData.date,
        reason: newTxData.reason,
        category: newTxData.category || 'Other',
        created_at: new Date().toISOString(),
        account: targetAccount,
      };

      // 2. Optimistically update ['transactions']
      queryClient.setQueryData(['transactions'], (old: any) => {
        if (!old) return { data: [optimisticTx], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
        if (Array.isArray(old)) return [optimisticTx, ...old];
        if (old.data && Array.isArray(old.data)) {
          if (initialTransaction) {
            return {
              ...old,
              data: old.data.map((t: Transaction) => (t.id === initialTransaction.id ? optimisticTx : t)),
            };
          }
          return {
            ...old,
            data: [optimisticTx, ...old.data],
            meta: old.meta ? { ...old.meta, total: (old.meta.total || 0) + 1 } : old.meta,
          };
        }
        return old;
      });

      // 3. Optimistically update ['accounts']
      queryClient.setQueryData<Account[]>(['accounts'], (old) => {
        if (!old) return old;
        return old.map((acc) => {
          if (acc.id === newTxData.accountId) {
            return { ...acc, balance: Number(acc.balance || 0) + balanceDelta };
          }
          return acc;
        });
      });

      // 4. Optimistically update ['dashboard']
      queryClient.setQueryData<DashboardSummary>(['dashboard'], (old) => {
        if (!old) return old;
        const updatedAccounts = (old.accounts || []).map((acc) => {
          if (acc.id === newTxData.accountId) {
            return { ...acc, balance: Number(acc.balance || 0) + balanceDelta };
          }
          return acc;
        });
        const updatedRecent = initialTransaction
          ? (old.recentTransactions || []).map((t) => (t.id === initialTransaction.id ? optimisticTx : t))
          : [optimisticTx, ...(old.recentTransactions || [])].slice(0, 10);

        return {
          ...old,
          accounts: updatedAccounts,
          recentTransactions: updatedRecent,
          totalBalance: Number(old.totalBalance || 0) + balanceDelta,
          totalDeposits: isDeposit ? Number(old.totalDeposits || 0) + newTxData.amount : Number(old.totalDeposits || 0),
          totalWithdrawals: !isDeposit ? Number(old.totalWithdrawals || 0) + newTxData.amount : Number(old.totalWithdrawals || 0),
        };
      });

      return { prevTransactions, prevAccounts, prevDashboard, newTxData };
    },
    onError: async (err: any, newTxData, context: any) => {
      const isNetworkError =
        err?.message?.includes('Network') ||
        err?.message?.includes('connect') ||
        err?.code === 'ECONNABORTED' ||
        !err?.response;

      if (isNetworkError) {
        await enqueueOfflineMutation('create_transaction', newTxData);
      } else {
        if (context?.prevTransactions) queryClient.setQueryData(['transactions'], context.prevTransactions);
        if (context?.prevAccounts) queryClient.setQueryData(['accounts'], context.prevAccounts);
        if (context?.prevDashboard) queryClient.setQueryData(['dashboard'], context.prevDashboard);
        triggerHaptic.error();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const isLoading = externalLoading || internalMutation.isPending;

  const [type, setType] = useState<'deposit' | 'withdrawal'>('withdrawal');
  const [amountStr, setAmountStr] = useState('0');
  const [reason, setReason] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Food & Dining');
  
  // Date states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());

  // Sub-selectors open states
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialTransaction) {
        setType(
          initialTransaction.type === 'deposit' || initialTransaction.type === 'income'
            ? 'deposit'
            : 'withdrawal'
        );
        setAmountStr(initialTransaction.amount.toString());
        setReason(initialTransaction.reason || '');
        setSelectedAccountId(initialTransaction.accountId);
        setSelectedCategory(initialTransaction.category || 'Food & Dining');
        
        const txDate = initialTransaction.date ? initialTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0];
        setSelectedDate(txDate);
        const parsed = new Date(txDate);
        if (!isNaN(parsed.getTime())) {
          setViewYear(parsed.getFullYear());
          setViewMonth(parsed.getMonth());
        }
      } else {
        setType('withdrawal');
        setAmountStr('0');
        setReason('');
        setSelectedAccountId(accounts && accounts.length > 0 ? accounts[0].id : '');
        setSelectedCategory('Food & Dining');
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDate(todayStr);
        setViewYear(new Date().getFullYear());
        setViewMonth(new Date().getMonth());
      }
      setShowAccountPicker(false);
      setShowCategoryPicker(false);
      setShowDatePicker(false);
    }
  }, [visible, initialTransaction, accounts]);

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId) || accounts?.[0];

  const handleKeyPress = (val: string) => {
    triggerHaptic.light();
    if (val === 'backspace') {
      if (amountStr.length <= 1 || amountStr === '0') {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      if (amountStr.replace('.', '').length < 10) {
        setAmountStr(amountStr + val);
      }
    }
  };

  const handleSave = () => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      triggerHaptic.error();
      return;
    }
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }

    const payload = {
      accountId: selectedAccountId || (accounts.length > 0 ? accounts[0].id : ''),
      type,
      amount: numAmount,
      date: selectedDate,
      reason: reason.trim() || undefined,
      category: selectedCategory,
    };

    if (externalOnSave) {
      triggerHaptic.success();
      externalOnSave(payload);
    } else {
      internalMutation.mutate(payload);
    }
  };

  const getDateLabel = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (selectedDate === today) return 'Today';
    if (selectedDate === yesterday) return 'Yesterday';
    
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return selectedDate;
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    triggerHaptic.selection();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    triggerHaptic.selection();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    triggerHaptic.selection();
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${viewYear}-${mStr}-${dStr}`;
    setSelectedDate(fullDate);
    setShowDatePicker(false);
  };

  const handleSetQuickDate = (type: 'today' | 'yesterday' | '2days') => {
    triggerHaptic.selection();
    const target = new Date();
    if (type === 'yesterday') target.setDate(target.getDate() - 1);
    if (type === '2days') target.setDate(target.getDate() - 2);
    
    const dateStr = target.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setShowDatePicker(false);
  };

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : colors.background }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.light();
              onClose();
            }}
            style={[styles.closeBtn, { backgroundColor: isDark ? '#0F172A' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle, borderWidth: 1 }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Type Segmented Pill */}
          <View style={[styles.typePillContainer, { backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle, borderWidth: 1 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setType('withdrawal');
              }}
              style={[
                styles.typePillBtn,
                type === 'withdrawal' && { backgroundColor: colors.danger },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  { color: type === 'withdrawal' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Expense (-)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setType('deposit');
              }}
              style={[
                styles.typePillBtn,
                type === 'deposit' && { backgroundColor: colors.success },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  { color: type === 'deposit' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Income (+)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Selector Pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setShowDatePicker(!showDatePicker);
              setShowAccountPicker(false);
              setShowCategoryPicker(false);
            }}
            style={[styles.dateBadge, { backgroundColor: showDatePicker ? (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)') : (isDark ? '#0B0F19' : colors.surfaceElevated), borderColor: showDatePicker ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle), borderWidth: 1 }]}
          >
            <Calendar size={14} color={colors.primary} />
            <Text style={[styles.dateBadgeText, { color: colors.text }]}>{getDateLabel()}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Giant Amount Display */}
          <View style={styles.amountHeroContainer}>
            <Text
              style={[
                styles.heroAmountText,
                { color: type === 'deposit' ? colors.success : colors.text },
              ]}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              numberOfLines={1}
            >
              {currencySymbol} {parseFloat(amountStr || '0').toLocaleString() || '0'}
              {amountStr.endsWith('.') ? '.' : ''}
            </Text>
          </View>

          {/* Reason / Note Input */}
          <View style={[styles.noteInputContainer, { backgroundColor: isDark ? '#0F172A' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle, borderWidth: 1.2 }]}>
            <TextInput
              placeholder="Name / Note (e.g. Coffee at airport, Uber, Groceries)"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              style={[styles.noteTextInput, { color: colors.text }]}
              returnKeyType="done"
            />
          </View>

          {/* Selector Pills Row */}
          <View style={styles.selectorsRow}>
            {/* Account Selector Pill */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setShowAccountPicker(!showAccountPicker);
                setShowCategoryPicker(false);
                setShowDatePicker(false);
              }}
              style={[
                styles.selectorPill,
                {
                  backgroundColor: showAccountPicker ? (isDark ? 'rgba(99, 102, 241, 0.2)' : colors.primaryLight) : (isDark ? '#0F172A' : colors.surfaceElevated),
                  borderColor: showAccountPicker ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                },
              ]}
            >
              <CreditCard size={15} color={colors.primary} />
              <Text style={[styles.selectorPillText, { color: colors.text }]} numberOfLines={1}>
                {selectedAccount?.name || 'Select Wallet'}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Category Selector Pill */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setShowCategoryPicker(!showCategoryPicker);
                setShowAccountPicker(false);
                setShowDatePicker(false);
              }}
              style={[
                styles.selectorPill,
                {
                  backgroundColor: showCategoryPicker ? (isDark ? 'rgba(99, 102, 241, 0.2)' : colors.primaryLight) : (isDark ? '#0F172A' : colors.surfaceElevated),
                  borderColor: showCategoryPicker ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                },
              ]}
            >
              <CategoryIcon categoryName={selectedCategory} size={18} iconSize={14} showBackground={false} customColor={showCategoryPicker ? colors.primary : colors.secondary} />
              <Text style={[styles.selectorPillText, { color: colors.text }]} numberOfLines={1}>
                {selectedCategory}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Expanded Calendar & Date Picker Drawer */}
          {showDatePicker && (
            <View style={[styles.drawerBox, { backgroundColor: isDark ? '#0F172A' : colors.surface, borderColor: isDark ? '#1E293B' : colors.border, borderWidth: 1.2 }]}>
              {/* Quick Shortcuts */}
              <View style={styles.dateShortcutsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSetQuickDate('today')}
                  style={[styles.dateShortcutBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.dateShortcutText, { color: colors.primary }]}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSetQuickDate('yesterday')}
                  style={[styles.dateShortcutBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.dateShortcutText, { color: colors.primary }]}>Yesterday</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSetQuickDate('2days')}
                  style={[styles.dateShortcutBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.dateShortcutText, { color: colors.primary }]}>2 Days Ago</Text>
                </TouchableOpacity>
              </View>

              {/* Month Navigator Header */}
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePrevMonth}
                  style={[styles.navArrowBtn, { backgroundColor: colors.surfaceElevated }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>

                <Text style={[styles.monthYearTitle, { color: colors.text }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleNextMonth}
                  style={[styles.navArrowBtn, { backgroundColor: colors.surfaceElevated }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View style={styles.daysOfWeekRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <Text key={d} style={[styles.dayOfWeekText, { color: colors.textMuted }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar Days Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <View key={idx} style={styles.calendarEmptyCell} />;
                  }

                  const mStr = String(viewMonth + 1).padStart(2, '0');
                  const dStr = String(day).padStart(2, '0');
                  const cellDate = `${viewYear}-${mStr}-${dStr}`;
                  const isSelected = selectedDate === cellDate;
                  const isToday = new Date().toISOString().split('T')[0] === cellDate;

                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => handleSelectDay(day)}
                      style={[
                        styles.calendarDayCell,
                        isSelected && { backgroundColor: colors.primary },
                        !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : isToday
                              ? colors.primary
                              : colors.text,
                            fontWeight: isSelected || isToday ? '700' : '500',
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Manual Input Fallback */}
              <View style={[styles.manualDateBox, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.manualDateLabel, { color: colors.textMuted }]}>
                  Selected ISO:
                </Text>
                <TextInput
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.manualDateInput, { color: colors.text, backgroundColor: colors.surfaceElevated }]}
                />
              </View>
            </View>
          )}

          {/* Expanded Account Picker Drawer */}
          {showAccountPicker && (
            <View style={[styles.drawerBox, { backgroundColor: isDark ? '#0F172A' : colors.surface, borderColor: isDark ? '#1E293B' : colors.border, borderWidth: 1.2 }]}>
              <Text style={[styles.drawerTitle, { color: colors.textSecondary }]}>Choose Wallet</Text>
              <View style={styles.chipsWrapper}>
                {accounts?.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSelectedAccountId(acc.id);
                        setShowAccountPicker(false);
                      }}
                      style={[
                        styles.drawerChip,
                        {
                          backgroundColor: isSelected ? colors.primary : (isDark ? '#0B0F19' : colors.surfaceElevated),
                          borderColor: isSelected ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : colors.text,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Expanded Category Picker Drawer */}
          {showCategoryPicker && (
            <View style={[styles.drawerBox, { backgroundColor: isDark ? '#0F172A' : colors.surface, borderColor: isDark ? '#1E293B' : colors.border, borderWidth: 1.2 }]}>
              <Text style={[styles.drawerTitle, { color: colors.textSecondary }]}>Choose Category</Text>
              <View style={styles.chipsWrapper}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSelectedCategory(cat.name);
                        setShowCategoryPicker(false);
                      }}
                      style={[
                        styles.drawerChip,
                        {
                          backgroundColor: isSelected ? colors.primary : (isDark ? '#0B0F19' : colors.surfaceElevated),
                          borderColor: isSelected ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                        },
                      ]}
                    >
                      <CategoryIcon
                        categoryName={cat.name}
                        size={18}
                        iconSize={12}
                        showBackground={false}
                        customColor={isSelected ? '#FFFFFF' : cat.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : colors.text,
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '600',
                        }}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Built-in Custom Keypad & Save Button */}
        <View style={[styles.keypadContainer, { backgroundColor: isDark ? '#0B0F19' : colors.surface, borderTopColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
          {/* Save Button — always pinned above keypad */}
          <View style={styles.saveBtnRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={isLoading}
              style={[
                styles.saveBtn,
                { backgroundColor: isLoading ? colors.textMuted : (type === 'deposit' ? '#10B981' : '#6366F1'), opacity: isLoading ? 0.7 : 1, shadowColor: type === 'deposit' ? '#10B981' : '#6366F1' },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
              )}
              <Text style={styles.saveBtnText}>
                {isLoading ? 'Saving...' : initialTransaction ? 'Update Entry' : 'Save Transaction'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3x4 Number Keypad Grid */}
          <View style={styles.keypadGrid}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['.', '0', 'backspace'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.6}
                    onPress={() => handleKeyPress(key)}
                    style={[styles.keypadKey, { backgroundColor: isDark ? '#0F172A' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle, borderWidth: 1 }]}
                  >
                    {key === 'backspace' ? (
                      <Delete size={22} color={colors.text} />
                    ) : (
                      <Text style={[styles.keypadKeyText, { color: colors.text }]}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typePillContainer: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    padding: 3,
  },
  typePillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 5,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  amountHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  heroAmountText: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  noteInputContainer: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  noteTextInput: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  selectorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  selectorPillText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 6,
  },
  drawerBox: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  dateShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  dateShortcutBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateShortcutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: Spacing.xs,
  },
  dayOfWeekText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  calendarEmptyCell: {
    width: 36,
    height: 36,
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 13,
  },
  manualDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: 8,
  },
  manualDateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  manualDateInput: {
    flex: 1,
    height: 34,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  drawerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  keypadContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  saveBtnRow: {
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.xl,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  keypadGrid: {
    gap: 6,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadKey: {
    flex: 1,
    height: 46,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyText: {
    fontSize: 22,
    fontWeight: '700',
  },
  amountDisplayCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
    alignItems: 'center',
    width: '100%',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  currencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  currencyPillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  flowSubtext: {
    fontSize: 12,
    fontWeight: '600',
  },
});