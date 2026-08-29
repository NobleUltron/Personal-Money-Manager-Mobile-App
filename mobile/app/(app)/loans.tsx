import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  TrendingDown,
  TrendingUp,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Layers,
  ChevronDown,
  Check,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { accountsApi, loansApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { LoanCard } from '../../components/financial/LoanCard';
import { triggerHaptic } from '../../utils/haptics';
import { Loan } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

export default function LoansScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filters & Tabs
  const [filterType, setFilterType] = useState<'all' | 'borrowed' | 'lent' | 'settled'>('all');
  const [payoffStrategy, setPayoffStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [showPayoffPlanner, setShowPayoffPlanner] = useState(false);
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<Loan | null>(null);

  // Form Fields
  const [loanType, setLoanType] = useState<'borrowed' | 'lent'>('borrowed');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [syncAccount, setSyncAccount] = useState(true);
  const [formError, setFormError] = useState('');
  const [showLoanAccountDropdown, setShowLoanAccountDropdown] = useState(false);
  const [showRepayAccountDropdown, setShowRepayAccountDropdown] = useState(false);

  // Repay Form Fields
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repaySyncAccount, setRepaySyncAccount] = useState(true);
  const [repayError, setRepayError] = useState('');

  // 1. Fetch Loans & Accounts
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loansApi.getAll(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  const loans = data?.loans || [];
  const summary = data?.summary || {
    totalBorrowed: 0,
    borrowedPaid: 0,
    borrowedRemaining: 0,
    totalLent: 0,
    lentPaid: 0,
    lentRemaining: 0,
  };

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: loansApi.create,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeCreateModal();
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to create loan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.update(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeCreateModal();
      if (selectedLoanForDetail) setSelectedLoanForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to update loan');
    },
  });

  const repayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.repay(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeRepayModal();
      if (selectedLoanForDetail) setSelectedLoanForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setRepayError(err.response?.data?.message || err.message || 'Failed to record repayment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: loansApi.remove,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedLoanForDetail) setSelectedLoanForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete loan');
    },
  });

  // 3. Modal Openers & Handlers
  const openCreateModal = () => {
    triggerHaptic.selection();
    setEditingLoan(null);
    setLoanType('borrowed');
    setName('');
    setAmount('');
    setAmountPaid('');
    setDueDate('');
    setAccountId(accounts[0]?.id || '');
    setSyncAccount(true);
    setFormError('');
    setCreateModalVisible(true);
  };

  const openEditModal = (loan: Loan) => {
    triggerHaptic.selection();
    setEditingLoan(loan);
    setLoanType(loan.type);
    setName(loan.name);
    setAmount(loan.amount.toString());
    setAmountPaid((loan.amount_paid || 0).toString());
    setDueDate(loan.due_date ? loan.due_date.split('T')[0] : '');
    setAccountId(loan.accountId || accounts[0]?.id || '');
    setSyncAccount(false);
    setFormError('');
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setShowLoanAccountDropdown(false);
    setCreateModalVisible(false);
    setEditingLoan(null);
  };

  const openRepayModal = (loan: Loan) => {
    triggerHaptic.selection();
    setSelectedLoanForRepay(loan);
    setRepayAmount('');
    setRepayAccountId(accounts[0]?.id || '');
    setRepaySyncAccount(true);
    setRepayError('');
    setRepayModalVisible(true);
  };

  const closeRepayModal = () => {
    setShowRepayAccountDropdown(false);
    setRepayModalVisible(false);
    setSelectedLoanForRepay(null);
  };

  const handleSaveLoan = () => {
    if (!name.trim()) {
      setFormError('Please enter person or institution name');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid loan principal amount');
      return;
    }

    const numPaid = amountPaid ? parseFloat(amountPaid) : 0;

    if (editingLoan) {
      updateMutation.mutate({
        id: editingLoan.id,
        data: {
          type: loanType,
          name: name.trim(),
          amount: numAmount,
          amount_paid: numPaid,
          due_date: dueDate.trim() || undefined,
          accountId: accountId || undefined,
        },
      });
    } else {
      createMutation.mutate({
        type: loanType,
        name: name.trim(),
        amount: numAmount,
        amount_paid: numPaid,
        due_date: dueDate.trim() || undefined,
        accountId: syncAccount && accountId ? accountId : undefined,
        sync_account: syncAccount,
      });
    }
  };

  const handleRecordRepayment = () => {
    if (!selectedLoanForRepay) return;

    const numRepay = parseFloat(repayAmount);
    if (isNaN(numRepay) || numRepay <= 0) {
      setRepayError('Please enter a valid repayment amount');
      return;
    }

    if (numRepay > Number(selectedLoanForRepay.remaining)) {
      setRepayError(`Amount exceeds remaining balance of ${currencySymbol} ${selectedLoanForRepay.remaining.toLocaleString()}`);
      return;
    }

    repayMutation.mutate({
      id: selectedLoanForRepay.id,
      data: {
        repayment_amount: numRepay,
        accountId: repaySyncAccount && repayAccountId ? repayAccountId : undefined,
        sync_account: repaySyncAccount,
      },
    });
  };

  const handleDelete = (loan: Loan) => {
    triggerHaptic.warning();
    setLoanToDelete(loan);
  };

  // Quick Repay Percentage Helper
  const handleQuickRepayPercent = (fraction: number) => {
    if (!selectedLoanForRepay) return;
    triggerHaptic.selection();
    const val = Math.round(Number(selectedLoanForRepay.remaining) * fraction);
    setRepayAmount(val.toString());
  };

  // Quick Date Preset
  const handleSetQuickDueDate = (monthsAhead: number) => {
    triggerHaptic.selection();
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // 4. Payoff Queue (Snowball vs Avalanche)
  const activeDebts = useMemo(() => {
    return loans
      .filter((l) => l.type === 'borrowed' && !l.isPaidOff && Number(l.remaining) > 0)
      .sort((a, b) => {
        if (payoffStrategy === 'snowball') {
          // Lowest balance first
          return Number(a.remaining) - Number(b.remaining);
        } else {
          // Highest balance first
          return Number(b.remaining) - Number(a.remaining);
        }
      });
  }, [loans, payoffStrategy]);

  // Net Debt calculation
  const netDebtPosition = summary.lentRemaining - summary.borrowedRemaining;

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (filterType === 'all') return true;
      if (filterType === 'borrowed') return l.type === 'borrowed' && !l.isPaidOff;
      if (filterType === 'lent') return l.type === 'lent' && !l.isPaidOff;
      if (filterType === 'settled') return l.isPaidOff;
      return true;
    });
  }, [loans, filterType]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Debts & Loans"
        subtitle="Track debts, borrower payoffs & strategies"
        showBack
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openCreateModal}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Hero Debt & Loan Summary Portfolio Card */}
        <LinearGradient
          colors={isDark ? ['#0B0F19', '#030712'] : ['#F8FAFC', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: isDark ? '#1E293B' : '#E2E8F0', borderWidth: 1.2 }]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Net Debt Position
              </Text>
              <Text style={[styles.heroAmount, { color: netDebtPosition >= 0 ? colors.success : colors.danger }]}>
                {netDebtPosition >= 0 ? '+' : ''}{formatAmount(netDebtPosition, currencySymbol)}
              </Text>
              <Text style={[styles.heroSubText, { color: colors.textSecondary }]}>
                {netDebtPosition >= 0 ? 'Net Creditor (More Lent Out)' : 'Net Debtor (More Owed)'}
              </Text>
            </View>

            <View
              style={[
                styles.netPill,
                {
                  backgroundColor: netDebtPosition >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderColor: netDebtPosition >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                },
              ]}
            >
              <Text
                style={[
                  styles.netPillText,
                  { color: netDebtPosition >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {netDebtPosition >= 0 ? 'Surplus' : 'Deficit'}
              </Text>
            </View>
          </View>

          {/* 2-Column Split: Debts (I Owe) vs Lent (Owed to Me) */}
          <View style={[styles.heroSplitRow, { borderTopColor: colors.borderSubtle }]}>
            {/* I Owe */}
            <View style={styles.heroSplitCol}>
              <View style={styles.splitHeader}>
                <View style={[styles.splitDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>I Owe (Debts)</Text>
              </View>
              <Text style={[styles.splitAmount, { color: colors.danger }]}>
                {formatAmount(summary.borrowedRemaining, currencySymbol)}
              </Text>
              <Text style={[styles.splitSub, { color: colors.textMuted }]}>
                {formatAmount(summary.borrowedPaid, currencySymbol)} paid
              </Text>
            </View>

            <View style={[styles.splitDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Owed to Me */}
            <View style={styles.heroSplitCol}>
              <View style={styles.splitHeader}>
                <View style={[styles.splitDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>Owed to Me (Lent)</Text>
              </View>
              <Text style={[styles.splitAmount, { color: colors.success }]}>
                {formatAmount(summary.lentRemaining, currencySymbol)}
              </Text>
              <Text style={[styles.splitSub, { color: colors.textMuted }]}>
                {formatAmount(summary.lentPaid, currencySymbol)} collected
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Debt Payoff Strategy Planner Toggle Banner */}
        {activeDebts.length > 0 && (
          <Card style={[styles.payoffCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0', borderWidth: 1.2 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setShowPayoffPlanner(!showPayoffPlanner);
              }}
              style={styles.payoffHeaderRow}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Zap size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.payoffTitle, { color: colors.text }]}>
                    Debt Payoff Accelerator
                  </Text>
                  <Text style={[styles.payoffSubtitle, { color: colors.textSecondary }]}>
                    {payoffStrategy === 'snowball' ? 'Snowball: Smallest balance first' : 'Avalanche: Highest balance first'}
                  </Text>
                </View>
              </View>

              <View style={[styles.strategyPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.strategyPillText, { color: colors.primary }]}>
                  {showPayoffPlanner ? 'Hide' : 'View Plan'}
                </Text>
              </View>
            </TouchableOpacity>

            {showPayoffPlanner && (
              <View style={styles.payoffBody}>
                {/* Strategy Switcher */}
                <View style={styles.strategySwitchRow}>
                  <TouchableOpacity
                    activeOpacity={0.7} delayPressIn={0}
                    onPress={() => {
                      triggerHaptic.selection();
                      setPayoffStrategy('snowball');
                    }}
                    style={[
                      styles.strategyBtn,
                      {
                        backgroundColor: payoffStrategy === 'snowball' ? colors.primary : colors.surfaceElevated,
                        borderColor: payoffStrategy === 'snowball' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.strategyBtnText,
                        { color: payoffStrategy === 'snowball' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      🚀 Snowball (Quick Wins)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7} delayPressIn={0}
                    onPress={() => {
                      triggerHaptic.selection();
                      setPayoffStrategy('avalanche');
                    }}
                    style={[
                      styles.strategyBtn,
                      {
                        backgroundColor: payoffStrategy === 'avalanche' ? colors.primary : colors.surfaceElevated,
                        borderColor: payoffStrategy === 'avalanche' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.strategyBtnText,
                        { color: payoffStrategy === 'avalanche' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      ⚡ Avalanche (Highest First)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Priority Queue Order */}
                <Text style={[styles.queueTitle, { color: colors.textSecondary }]}>
                  RECOMMENDED PAYOFF QUEUE ({activeDebts.length} DEBTS):
                </Text>

                <View style={styles.queueList}>
                  {activeDebts.map((debt, idx) => (
                    <View key={debt.id} style={[styles.queueItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? colors.danger : colors.surface }]}>
                        <Text style={[styles.rankText, { color: idx === 0 ? '#FFFFFF' : colors.textSecondary }]}>
                          #{idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.queueItemName, { color: colors.text }]}>{debt.name}</Text>
                        <Text style={[styles.queueItemRemaining, { color: colors.danger }]}>
                          Remaining: {formatAmount(debt.remaining, currencySymbol)}
                        </Text>
                      </View>
                      {idx === 0 && (
                        <View style={[styles.focusPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Text style={styles.focusPillText}>Focus First</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 3. Filter Tabs */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: `All (${loans.length})` },
              { id: 'borrowed', label: `I Owe (${loans.filter(l => l.type === 'borrowed' && !l.isPaidOff).length})` },
              { id: 'lent', label: `Owed to Me (${loans.filter(l => l.type === 'lent' && !l.isPaidOff).length})` },
              { id: 'settled', label: `Settled (${loans.filter(l => l.isPaidOff).length})` },
            ].map((f) => {
              const isSelected = filterType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7} delayPressIn={0}
                  onPress={() => {
                    triggerHaptic.selection();
                    setFilterType(f.id as any);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : (isDark ? '#0F172A' : colors.surfaceElevated),
                      borderColor: isSelected ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : '600',
                    }}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Loans List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredLoans.length === 0 ? (
          <EmptyState
            icon={<HandCoins size={36} color={colors.textMuted} />}
            title="No Loan Records"
            description="Keep track of personal debts, borrowed money, or funds lent out to friends and colleagues."
            actionTitle="Record First Loan"
            onAction={openCreateModal}
          />
        ) : (
          filteredLoans.map((item) => (
            <LoanCard
              key={item.id}
              loan={item}
              currencySymbol={currencySymbol}
              onRepay={() => openRepayModal(item)}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDelete(item)}
              onPress={() => setSelectedLoanForDetail(item)}
            />
          ))
        )}
      </ScrollView>

      {/* MODAL 1: Add / Edit Loan Modal */}
      <Modal
        visible={createModalVisible}
        onClose={closeCreateModal}
        title={editingLoan ? 'Edit Loan Record' : 'Record New Loan / Debt'}
      >
        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
          </View>
        ) : null}

        {/* Type Toggle: Borrowed (I Owe) vs Lent (Owed to Me) */}
        <View style={styles.typeToggleRow}>
          <TouchableOpacity
            activeOpacity={0.7} delayPressIn={0}
            onPress={() => {
              triggerHaptic.selection();
              setLoanType('borrowed');
            }}
            style={[
              styles.typeToggleBtn,
              {
                backgroundColor: loanType === 'borrowed' ? colors.danger : colors.surfaceElevated,
                borderColor: loanType === 'borrowed' ? colors.danger : colors.border,
              },
            ]}
          >
            <ArrowDownLeft size={16} color={loanType === 'borrowed' ? '#FFFFFF' : colors.danger} />
            <Text
              style={[
                styles.typeToggleText,
                { color: loanType === 'borrowed' ? '#FFFFFF' : colors.text },
              ]}
            >
              I Borrowed (Debt)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7} delayPressIn={0}
            onPress={() => {
              triggerHaptic.selection();
              setLoanType('lent');
            }}
            style={[
              styles.typeToggleBtn,
              {
                backgroundColor: loanType === 'lent' ? colors.success : colors.surfaceElevated,
                borderColor: loanType === 'lent' ? colors.success : colors.border,
              },
            ]}
          >
            <ArrowUpRight size={16} color={loanType === 'lent' ? '#FFFFFF' : colors.success} />
            <Text
              style={[
                styles.typeToggleText,
                { color: loanType === 'lent' ? '#FFFFFF' : colors.text },
              ]}
            >
              I Lent Out
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label={loanType === 'borrowed' ? 'Lender / Bank Name *' : 'Borrower / Friend Name *'}
          placeholder="e.g. John Doe, Stanbic Bank, Dian"
          value={name}
          onChangeText={setName}
        />

        <Input
          label={`Principal Loan Amount (${currencySymbol}) *`}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {editingLoan && (
          <Input
            label={`Amount Already Paid (${currencySymbol})`}
            placeholder="0.00"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="decimal-pad"
          />
        )}

        {/* Due / Settlement Date Picker */}
        <DatePickerField
          label="Due / Settlement Date (Optional)"
          value={dueDate}
          onChange={setDueDate}
        />

        {/* Linked Account Selector (only on create) */}
        {!editingLoan && (
          <>
            <TouchableOpacity
              activeOpacity={0.7} delayPressIn={0}
              onPress={() => {
                triggerHaptic.selection();
                setSyncAccount(!syncAccount);
              }}
              style={[styles.syncCheckboxRow, { backgroundColor: colors.surfaceElevated }]}
            >
              <Text style={[styles.syncText, { color: colors.text }]}>
                {syncAccount ? '☑' : '☐'} Sync with Account Balance
              </Text>
              <Text style={[styles.syncSubtext, { color: colors.textSecondary }]}>
                {loanType === 'borrowed'
                  ? 'Automatically credit funds to selected account'
                  : 'Automatically deduct funds from selected account'}
              </Text>
            </TouchableOpacity>

            {syncAccount && (
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Account</Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    triggerHaptic.selection();
                    setShowLoanAccountDropdown(!showLoanAccountDropdown);
                  }}
                  style={[
                    styles.dropdownSelector,
                    {
                      backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                      borderColor: showLoanAccountDropdown ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                      borderWidth: 1.2,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Landmark size={18} color={colors.primary} />
                    <Text style={[styles.dropdownValueText, { color: colors.text }]}>
                      {accounts.find((a) => a.id === accountId)?.name || 'Select Account'}
                    </Text>
                    {accountId && (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto', marginRight: 8 }}>
                        {formatAmount(accounts.find((a) => a.id === accountId)?.balance, currencySymbol)}
                      </Text>
                    )}
                  </View>
                  <ChevronDown
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: showLoanAccountDropdown ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {showLoanAccountDropdown && (
                  <View
                    style={[
                      styles.dropdownList,
                      {
                        backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                        borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                        borderWidth: 1.2,
                      },
                    ]}
                  >
                    {accounts.map((acc) => {
                        const isSelected = accountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            activeOpacity={0.7} delayPressIn={0}
                            onPress={() => {
                              triggerHaptic.selection();
                              setAccountId(acc.id);
                              setShowLoanAccountDropdown(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                              },
                              { borderBottomColor: isDark ? '#1E293B' : colors.borderSubtle },
                            ]}
                          >
                            <Landmark size={16} color={isSelected ? colors.primary : colors.textSecondary} style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  {
                                    color: isSelected ? colors.primary : colors.text,
                                    fontWeight: isSelected ? '800' : '600',
                                  },
                                ]}
                              >
                                {acc.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                Balance: {formatAmount(acc.balance, currencySymbol)}
                              </Text>
                            </View>
                            {isSelected && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <Button
          title={editingLoan ? 'Save Changes' : 'Record Loan'}
          size="lg"
          loading={createMutation.isPending || updateMutation.isPending}
          onPress={handleSaveLoan}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Record Repayment Modal */}
      {selectedLoanForRepay && (
        <Modal
          visible={repayModalVisible}
          onClose={closeRepayModal}
          title={selectedLoanForRepay.type === 'borrowed' ? 'Make Debt Repayment' : 'Record Received Payment'}
        >
          {repayError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{repayError}</Text>
            </View>
          ) : null}

          {/* Header Banner */}
          <View style={[styles.repayHeaderBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.repayLoanTitle, { color: colors.text }]}>
              {selectedLoanForRepay.name}
            </Text>
            <Text style={[styles.repayRemainingText, { color: selectedLoanForRepay.type === 'borrowed' ? colors.danger : colors.success }]}>
              Remaining Balance: {formatAmount(selectedLoanForRepay.remaining, currencySymbol)}
            </Text>
          </View>

          {/* Quick Percent Pills */}
          <View style={styles.quickPercentRow}>
            {[
              { label: '25%', val: 0.25 },
              { label: '50%', val: 0.5 },
              { label: '75%', val: 0.75 },
              { label: '100% (Full)', val: 1.0 },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => handleQuickRepayPercent(item.val)}
                style={[styles.quickPercentBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Text style={[styles.quickPercentText, { color: colors.primary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={`Payment Amount (${currencySymbol}) *`}
            placeholder="0.00"
            value={repayAmount}
            onChangeText={setRepayAmount}
            keyboardType="decimal-pad"
          />

          {/* Sync Account Checkbox */}
          <TouchableOpacity
            activeOpacity={0.7} delayPressIn={0}
            onPress={() => {
              triggerHaptic.selection();
              setRepaySyncAccount(!repaySyncAccount);
            }}
            style={[styles.syncCheckboxRow, { backgroundColor: colors.surfaceElevated }]}
          >
            <Text style={[styles.syncText, { color: colors.text }]}>
              {repaySyncAccount ? '☑' : '☐'} Sync with Account Balance
            </Text>
            <Text style={[styles.syncSubtext, { color: colors.textSecondary }]}>
              {selectedLoanForRepay.type === 'borrowed'
                ? 'Deduct payment from your selected account'
                : 'Credit received payment to your selected account'}
            </Text>
          </TouchableOpacity>

          {repaySyncAccount && (
            <View style={{ marginBottom: Spacing.md }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account</Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic.selection();
                  setShowRepayAccountDropdown(!showRepayAccountDropdown);
                }}
                style={[
                  styles.dropdownSelector,
                  {
                    backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                    borderColor: showRepayAccountDropdown ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                    borderWidth: 1.2,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                  <Landmark size={18} color={colors.primary} />
                  <Text style={[styles.dropdownValueText, { color: colors.text }]}>
                    {accounts.find((a) => a.id === repayAccountId)?.name || 'Select Account'}
                  </Text>
                  {repayAccountId && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto', marginRight: 8 }}>
                      {formatAmount(accounts.find((a) => a.id === repayAccountId)?.balance, currencySymbol)}
                    </Text>
                  )}
                </View>
                <ChevronDown
                  size={18}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: showRepayAccountDropdown ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {showRepayAccountDropdown && (
                <View
                  style={[
                    styles.dropdownList,
                    {
                      backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                      borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                      borderWidth: 1.2,
                    },
                  ]}
                >
                  {accounts.map((acc) => {
                      const isSelected = repayAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          activeOpacity={0.7} delayPressIn={0}
                          onPress={() => {
                            triggerHaptic.selection();
                            setRepayAccountId(acc.id);
                            setShowRepayAccountDropdown(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            isSelected && {
                              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                            },
                            { borderBottomColor: isDark ? '#1E293B' : colors.borderSubtle },
                          ]}
                        >
                          <Landmark size={16} color={isSelected ? colors.primary : colors.textSecondary} style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isSelected ? colors.primary : colors.text,
                                  fontWeight: isSelected ? '800' : '600',
                                },
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                              Balance: {formatAmount(acc.balance, currencySymbol)}
                            </Text>
                          </View>
                          {isSelected && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>
          )}

          <Button
            title="Confirm Settlement"
            size="lg"
            loading={repayMutation.isPending}
            onPress={handleRecordRepayment}
            style={{ marginTop: Spacing.sm }}
          />
        </Modal>
      )}

      {/* MODAL 3: Loan Details Sheet */}
      {selectedLoanForDetail && (
        <Modal
          visible={!!selectedLoanForDetail}
          onClose={() => setSelectedLoanForDetail(null)}
          title="Loan Breakdown"
        >
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View>
                <Text style={[styles.detailLoanName, { color: colors.text }]}>
                  {selectedLoanForDetail.name}
                </Text>
                <Text style={[styles.detailTypeLabel, { color: selectedLoanForDetail.type === 'borrowed' ? colors.danger : colors.success }]}>
                  {selectedLoanForDetail.type === 'borrowed' ? 'I Borrowed (Debt)' : 'I Lent Out (Receivable)'}
                </Text>
              </View>

              <Text style={[styles.detailPrincipalAmount, { color: colors.primary }]}>
                {formatAmount(selectedLoanForDetail.amount, currencySymbol)}
              </Text>
            </View>

            {/* Metrics 2x2 Grid */}
            <View style={[styles.detailInfoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Total Principal</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {formatAmount(selectedLoanForDetail.amount, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
                <Text style={[styles.detailGridValue, { color: colors.success }]}>
                  {formatAmount(selectedLoanForDetail.amount_paid, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Remaining Balance</Text>
                <Text style={[styles.detailGridValue, { color: selectedLoanForDetail.isPaidOff ? colors.success : selectedLoanForDetail.type === 'borrowed' ? colors.danger : colors.primary }]}>
                  {formatAmount(selectedLoanForDetail.remaining, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Due Date</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {selectedLoanForDetail.due_date ? selectedLoanForDetail.due_date.split('T')[0] : 'No deadline'}
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            {!selectedLoanForDetail.isPaidOff && (
              <Button
                title={selectedLoanForDetail.type === 'borrowed' ? 'Make Repayment' : 'Record Received Payment'}
                size="md"
                onPress={() => {
                  const l = selectedLoanForDetail;
                  setSelectedLoanForDetail(null);
                  openRepayModal(l);
                }}
              />
            )}

            <View style={[styles.detailSecondaryActions, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => {
                  const l = selectedLoanForDetail;
                  setSelectedLoanForDetail(null);
                  openEditModal(l);
                }}
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Edit2 size={15} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Loan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => handleDelete(selectedLoanForDetail)}
                style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete Loan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* MODAL 4: Custom Confirm Delete Dialog */}
      <ConfirmDialog
        visible={loanToDelete !== null}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => {
          if (loanToDelete) {
            deleteMutation.mutate(loanToDelete.id);
            setLoanToDelete(null);
          }
        }}
        title="Delete Loan Record"
        message={`Are you sure you want to delete "${loanToDelete?.name}"? This loan balance and settlement logs will be removed.`}
        confirmText="Delete Loan"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 3,
  },
  heroCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  netPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  netPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  heroSplitCol: {
    flex: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  splitAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  splitSub: {
    fontSize: 11,
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.sm,
  },
  payoffCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  payoffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoffTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  payoffSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  strategyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  strategyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  payoffBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  strategySwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  strategyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  strategyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  queueTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginVertical: 6,
  },
  queueList: {
    gap: 6,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  queueItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  queueItemRemaining: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  focusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  focusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  filterSection: {
    marginBottom: Spacing.sm,
  },
  filterRow: {
    gap: 6,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  loadingBox: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  typeToggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  typeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncCheckboxRow: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  syncText: {
    fontSize: 13,
    fontWeight: '700',
  },
  syncSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  repayHeaderBox: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  repayLoanTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  repayRemainingText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  quickPercentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  quickPercentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailCard: {
    gap: Spacing.md,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLoanName: {
    fontSize: 20,
    fontWeight: '800',
  },
  detailTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  detailPrincipalAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  detailGridItem: {
    width: '45%',
  },
  detailGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailGridValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailSecondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Radius.lg,
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 13,
    flex: 1,
  },
});