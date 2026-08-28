import React, { useState, useMemo } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Download,
  Edit2,
  Filter,
  Landmark,
  Plus,
  Search,
  Smartphone,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useSync } from '../../context/SyncContext';
import { accountsApi, transactionsApi } from '../../services/api';
import { Transaction, Account, DashboardSummary } from '../../types';
import { Header } from '../../components/ui/Header';
import { TransactionItem } from '../../components/financial/TransactionItem';
import { QuickAddTransactionSheet } from '../../components/financial/QuickAddTransactionSheet';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonList } from '../../components/ui/Skeleton';
import { StatementExportModal } from '../../components/ui/StatementExportModal';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';



export default function TransactionsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const { enqueueOfflineMutation } = useSync();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filter States
  const [filterType, setFilterType] = useState<string>('all'); // all, deposit, withdrawal
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals & Selection
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Form states
  const [type, setType] = useState<'deposit' | 'withdrawal' | 'income' | 'expense'>('withdrawal');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', filterType, selectedAccountId, search],
    queryFn: () =>
      transactionsApi.getAll({
        type: filterType !== 'all' ? filterType : undefined,
        accountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
        search: search.trim() || undefined,
        limit: 100,
      }),
  });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.message || 'Failed to create transaction');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
      if (detailModalVisible) setDetailModalVisible(false);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.message || 'Failed to update transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.remove,
    onMutate: async (idToDelete: string) => {
      triggerHaptic.warning();
      if (detailModalVisible) setDetailModalVisible(false);

      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });

      const prevTransactions = queryClient.getQueryData(['transactions']);
      const prevAccounts = queryClient.getQueryData<Account[]>(['accounts']);
      const prevDashboard = queryClient.getQueryData<DashboardSummary>(['dashboard']);

      // Find the transaction to reverse its balance impact
      let deletedTx: Transaction | undefined;
      if (prevTransactions) {
        const list = (prevTransactions as any).data || (Array.isArray(prevTransactions) ? prevTransactions : []);
        deletedTx = list.find((t: Transaction) => t.id === idToDelete);
      }

      const isDeposit = deletedTx ? (deletedTx.type === 'deposit' || (deletedTx.type as string) === 'income') : false;
      const reverseDelta = deletedTx ? (isDeposit ? -deletedTx.amount : deletedTx.amount) : 0;

      // Optimistically remove from ['transactions']
      queryClient.setQueryData(['transactions'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.filter((t: Transaction) => t.id !== idToDelete);
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((t: Transaction) => t.id !== idToDelete),
            meta: old.meta ? { ...old.meta, total: Math.max(0, (old.meta.total || 0) - 1) } : old.meta,
          };
        }
        return old;
      });

      // Optimistically update account balance in ['accounts']
      if (deletedTx && deletedTx.accountId && reverseDelta !== 0) {
        queryClient.setQueryData<Account[]>(['accounts'], (old) => {
          if (!old) return old;
          return old.map((acc) => {
            if (acc.id === deletedTx?.accountId) {
              return { ...acc, balance: Number(acc.balance || 0) + reverseDelta };
            }
            return acc;
          });
        });
      }

      // Optimistically update ['dashboard']
      queryClient.setQueryData<DashboardSummary>(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          recentTransactions: (old.recentTransactions || []).filter((t) => t.id !== idToDelete),
          totalBalance: Number(old.totalBalance || 0) + reverseDelta,
        };
      });

      return { prevTransactions, prevAccounts, prevDashboard, idToDelete };
    },
    onError: async (err: any, idToDelete, context: any) => {
      const isNetworkError =
        err?.message?.includes('Network') ||
        err?.message?.includes('connect') ||
        err?.code === 'ECONNABORTED' ||
        !err?.response;

      if (isNetworkError) {
        await enqueueOfflineMutation('delete_transaction', { id: idToDelete });
      } else {
        if (context?.prevTransactions) queryClient.setQueryData(['transactions'], context.prevTransactions);
        if (context?.prevAccounts) queryClient.setQueryData(['accounts'], context.prevAccounts);
        if (context?.prevDashboard) queryClient.setQueryData(['dashboard'], context.prevDashboard);
        triggerHaptic.error();
        Alert.alert('Error', err.message || 'Failed to delete transaction');
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

  const openCreateModal = () => {
    triggerHaptic.light();
    setEditingTransaction(null);
    setType('withdrawal');
    setAccountId(accounts && accounts.length > 0 ? accounts[0].id : '');
    setAmount('');
    setCategory('Food & Dining');
    setReason('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    triggerHaptic.light();
    setEditingTransaction(tx);
    setType(tx.type);
    setAccountId(tx.accountId);
    setAmount(tx.amount.toString());
    setCategory(tx.category || 'Other');
    setReason(tx.reason || '');
    setDate(tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormError('');
    setDetailModalVisible(false);
    setModalVisible(true);
  };

  const openDetailModal = (tx: Transaction) => {
    triggerHaptic.light();
    setSelectedTxForDetail(tx);
    setDetailModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTransaction(null);
  };

  const handleQuickSave = (payload: {
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'income' | 'expense';
    amount: number;
    date: string;
    reason?: string;
    category: string;
  }) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (tx: Transaction) => {
    triggerHaptic.warning();
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction (${currencySymbol} ${Number(tx.amount).toLocaleString()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(tx.id),
        },
      ],
    );
  };

  // Financial summary of visible transactions
  const transactionsList = data?.data || [];
  const { totalCredits, totalDebits, netFlow } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const t of transactionsList) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit' || t.type === 'income') {
        credits += amt;
      } else {
        debits += amt;
      }
    }
    return { totalCredits: credits, totalDebits: debits, netFlow: credits - debits };
  }, [transactionsList]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Transactions"
        subtitle={`${transactionsList.length} records`}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setExportModalVisible(true);
              }}
              style={[
                styles.headerActionBtn,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Download size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openCreateModal}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Statement Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0', borderWidth: 1.2 }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <ArrowDownLeft size={14} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Inflow</Text>
            </View>
            <Text
              style={[styles.summaryAmount, { color: colors.success }]}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
            >
              {formatAmount(totalCredits, currencySymbol)}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <ArrowUpRight size={14} color={colors.danger} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Outflow</Text>
            </View>
            <Text
              style={[styles.summaryAmount, { color: colors.danger }]}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
            >
              {formatAmount(totalDebits, currencySymbol)}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net</Text>
            </View>
            <Text
              style={[
                styles.summaryAmount,
                { color: netFlow >= 0 ? colors.success : colors.danger },
              ]}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
            >
              {formatAmount(netFlow, currencySymbol)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs & Search */}
      <View style={styles.filtersWrapper}>
        {/* Type Toggle Tabs */}
        <View style={styles.typeFilterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'withdrawal', label: 'Debits (-)' },
            { key: 'deposit', label: 'Credits (+)' },
          ].map((tab) => {
            const isSelected = filterType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setFilterType(tab.key);
                }}
                style={[
                  styles.typeTab,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '600',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Horizontal Account Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountFilterScroll}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setSelectedAccountId('all');
            }}
            style={[
              styles.accountPill,
              {
                backgroundColor: selectedAccountId === 'all' ? colors.primary : colors.surface,
                borderColor: selectedAccountId === 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: selectedAccountId === 'all' ? '#FFFFFF' : colors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              All Wallets
            </Text>
          </TouchableOpacity>

          {accounts?.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setSelectedAccountId(acc.id);
                }}
                style={[
                  styles.accountPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search reason or category..."
            value={search}
            onChangeText={setSearch}
            icon={<Search size={16} color={colors.textMuted} />}
            style={{ height: 42 }}
          />
        </View>
      </View>

      {/* Transaction List */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={transactionsList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
          ListEmptyComponent={() => (
            <EmptyState
              icon={<ArrowLeftRight size={32} color={colors.textMuted} />}
              title="No Transactions Found"
              description="Record deposits, salaries, grocery shopping, or bills."
              actionTitle="Add Transaction"
              onAction={openCreateModal}
            />
          )}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              currencySymbol={currencySymbol}
              onPress={() => openDetailModal(item)}
            />
          )}
        />
      )}

      {/* Transaction Detail Sheet Modal */}
      <Modal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title="Transaction Details"
      >
        {selectedTxForDetail && (
          <View>
            <View
              style={[
                styles.detailHeaderBox,
                {
                  backgroundColor:
                    selectedTxForDetail.type === 'deposit' || selectedTxForDetail.type === 'income'
                      ? colors.successLight
                      : colors.dangerLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.detailAmountText,
                  {
                    color:
                      selectedTxForDetail.type === 'deposit' || selectedTxForDetail.type === 'income'
                        ? colors.success
                        : colors.danger,
                  },
                ]}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
              >
                {formatAmount(selectedTxForDetail.amount, currencySymbol)}
              </Text>
              <Text
                style={[
                  styles.detailTypeText,
                  {
                    color:
                      selectedTxForDetail.type === 'deposit' || selectedTxForDetail.type === 'income'
                        ? colors.success
                        : colors.danger,
                  },
                ]}
              >
                {selectedTxForDetail.type === 'deposit' || selectedTxForDetail.type === 'income'
                  ? 'CREDIT / INFLOW'
                  : 'DEBIT / OUTFLOW'}
              </Text>
            </View>

            <View style={[styles.detailMetaCard, { backgroundColor: colors.surfaceElevated }]}>
              <View style={styles.detailMetaRow}>
                <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Description</Text>
                <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                  {selectedTxForDetail.reason || selectedTxForDetail.category}
                </Text>
              </View>

              <View style={styles.detailMetaRow}>
                <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Category</Text>
                <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                  {selectedTxForDetail.category}
                </Text>
              </View>

              <View style={styles.detailMetaRow}>
                <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Wallet / Account</Text>
                <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                  {selectedTxForDetail.account?.name || 'Wallet'}
                </Text>
              </View>

              <View style={styles.detailMetaRow}>
                <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                  {new Date(selectedTxForDetail.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailActionButtons}>
              <Button
                title="Edit Transaction"
                variant="secondary"
                icon={<Edit2 size={16} color={colors.text} />}
                onPress={() => openEditModal(selectedTxForDetail)}
                style={{ flex: 1 }}
              />
              <Button
                title="Delete"
                variant="danger"
                icon={<Trash2 size={16} color="#FFFFFF" />}
                onPress={() => handleDelete(selectedTxForDetail)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Statement Export Modal (PDF & Excel) */}
      <StatementExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        transactions={transactionsList}
        accounts={accounts || []}
      />

      {/* Full-Screen Keypad Quick Add / Edit Transaction Sheet */}
      <QuickAddTransactionSheet
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleQuickSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
        accounts={accounts || []}
        currencySymbol={currencySymbol}
        initialTransaction={editingTransaction}
      />
      {/* Custom Confirm Delete Dialog */}
      <ConfirmDialog
        visible={txToDelete !== null}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => {
          if (txToDelete) {
            deleteMutation.mutate(txToDelete.id);
            setTxToDelete(null);
            if (selectedTxForDetail?.id === txToDelete.id) {
              setSelectedTxForDetail(null);
            }
          }
        }}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${txToDelete?.reason || txToDelete?.category}" (${currencySymbol} ${Number(txToDelete?.amount || 0).toLocaleString()})?`}
        confirmText="Delete Transaction"
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
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  filtersWrapper: {
    marginBottom: Spacing.xs,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountFilterScroll: {
    paddingHorizontal: Spacing.md,
    gap: 6,
    paddingVertical: 4,
  },
  accountPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    paddingTop: 4,
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
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  quickDatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailHeaderBox: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailAmountText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  detailTypeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  detailMetaCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailMetaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});




