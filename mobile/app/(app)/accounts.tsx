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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Send,
  Landmark,
  Smartphone,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowLeftRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Edit2,
  Trash2,
  Layers,
  ChevronRight,
  Users,
} from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { accountsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AccountCard } from '../../components/financial/AccountCard';
import { ManageMembersModal } from '../../components/financial/ManageMembersModal';
import { JoinSharedWalletModal } from '../../components/financial/JoinSharedWalletModal';
import { P2PTransferModal } from '../../components/financial/P2PTransferModal';
import { SkeletonList } from '../../components/ui/Skeleton';
import { triggerHaptic } from '../../utils/haptics';
import { Account } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

const ACCOUNT_TYPES = [
  { type: 'bank', label: 'Bank Account', icon: Landmark, color: '#6366F1' },
  { type: 'mobile_money', label: 'Mobile Money', icon: Smartphone, color: '#10B981' },
  { type: 'cash', label: 'Cash Wallet', icon: Wallet, color: '#3B82F6' },
  { type: 'credit_card', label: 'Credit Card', icon: CreditCard, color: '#F59E0B' },
  { type: 'savings', label: 'Savings Vault', icon: PiggyBank, color: '#A855F7' },
];

const PRESET_INSTITUTIONS = [
  { name: 'MTN Mobile Money', bank_name: 'MTN', type: 'mobile_money' },
  { name: 'Airtel Money', bank_name: 'Airtel', type: 'mobile_money' },
  { name: 'Stanbic Bank', bank_name: 'Stanbic', type: 'bank' },
  { name: 'Centenary Bank', bank_name: 'Centenary', type: 'bank' },
  { name: 'Absa Bank', bank_name: 'Absa', type: 'bank' },
  { name: 'Equity Bank', bank_name: 'Equity', type: 'bank' },
  { name: 'Cash Wallet', bank_name: 'Cash', type: 'cash' },
];

export default function AccountsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const { openQuickEntry } = useQuickEntry();
  const queryClient = useQueryClient();
  const router = useRouter();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filters & State
  const [filterType, setFilterType] = useState('all');
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Sharing & Member Modals
  const [manageMembersAccount, setManageMembersAccount] = useState<Account | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState<boolean>(false);
  const [p2pModalVisible, setP2pModalVisible] = useState<boolean>(false);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to create account');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      accountsApi.update(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
      if (selectedAccountForDetail) setSelectedAccountForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to update account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: accountsApi.remove,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedAccountForDetail) setSelectedAccountForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete account');
    },
  });

  // 3. Modal Handlers
  const openCreateModal = () => {
    triggerHaptic.selection();
    setEditingAccount(null);
    setName('');
    setType('bank');
    setBankName('');
    setAccountNumber('');
    setInitialBalance('');
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (account: Account) => {
    triggerHaptic.selection();
    setEditingAccount(account);
    setName(account.name);
    setType(account.type.toLowerCase() || 'bank');
    setBankName(account.bank_name || '');
    setAccountNumber(account.account_number || '');
    setInitialBalance(account.initial_balance ? account.initial_balance.toString() : '');
    setFormError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAccount(null);
    setFormError('');
  };

  const handleSelectPreset = (preset: (typeof PRESET_INSTITUTIONS)[0]) => {
    triggerHaptic.selection();
    setName(preset.name);
    setType(preset.type);
    setBankName(preset.bank_name);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setFormError('Account name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      bank_name: bankName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      initial_balance: initialBalance ? parseFloat(initialBalance) : 0,
    };

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (account: Account) => {
    triggerHaptic.warning();
    setAccountToDelete(account);
  };

  // 4. Portfolio Breakdown Calculations
  const {
    totalLiquidBalance,
    bankTotal,
    momoTotal,
    cashTotal,
    cardsTotal,
    savingsTotal,
    typeCounts,
    percentages,
  } = useMemo(() => {
    let total = 0;
    let bank = 0;
    let momo = 0;
    let cash = 0;
    let cards = 0;
    let savings = 0;

    const counts: Record<string, number> = {
      all: accounts.length,
      bank: 0,
      mobile_money: 0,
      cash: 0,
      credit_card: 0,
      savings: 0,
      shared: 0,
    };

    accounts.forEach((acc) => {
      const bal = Number(acc.balance) || 0;
      total += bal;
      const t = (acc.type || 'cash').toLowerCase().replace(/[\s-]+/g, '_');
      if (counts[t] !== undefined) counts[t]++;
      if (acc.is_shared || (acc.members_count && acc.members_count > 1)) {
        counts.shared++;
      }

      if (t.includes('bank')) bank += bal;
      else if (t.includes('momo') || t.includes('mobile')) momo += bal;
      else if (t.includes('cash')) cash += bal;
      else if (t.includes('credit')) cards += bal;
      else if (t.includes('saving')) savings += bal;
    });

    const safeTotal = total > 0 ? total : 1;
    const pBank = Math.max(0, Math.round((bank / safeTotal) * 100));
    const pMomo = Math.max(0, Math.round((momo / safeTotal) * 100));
    const pCash = Math.max(0, Math.round((cash / safeTotal) * 100));
    const pSavings = Math.max(0, Math.round((savings / safeTotal) * 100));

    return {
      totalLiquidBalance: total,
      bankTotal: bank,
      momoTotal: momo,
      cashTotal: cash,
      cardsTotal: cards,
      savingsTotal: savings,
      typeCounts: counts,
      percentages: { bank: pBank, momo: pMomo, cash: pCash, savings: pSavings },
    };
  }, [accounts]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    if (filterType === 'all') return accounts;
    if (filterType === 'shared') {
      return accounts.filter((a) => a.is_shared || (a.members_count && a.members_count > 1));
    }
    return accounts.filter((a) => (a.type || 'cash').toLowerCase() === filterType);
  }, [accounts, filterType]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Accounts & Wallets"
        subtitle="Manage your banks, mobile money & shared wallets"
        showBack
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setJoinModalVisible(true);
              }}
              style={[
                styles.joinButton,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Users size={14} color={colors.primary} />
              <Text style={[styles.joinButtonText, { color: colors.primary }]}>Join</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openCreateModal}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* 1. Hero Portfolio Summary Card */}
        <LinearGradient
          colors={isDark ? ['#0B0F19', '#030712'] : ['#F8FAFC', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Total Net Liquidity
              </Text>
              <Text style={[styles.heroTotalAmount, { color: colors.text }]} numberOfLines={1}>
                {formatAmount(totalLiquidBalance, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.heroBadge, { backgroundColor: colors.primaryLight }]}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>
                {accounts.length} Active {accounts.length === 1 ? 'Wallet' : 'Wallets'}
              </Text>
            </View>
          </View>

          {/* Allocation Progress Bar */}
          {totalLiquidBalance > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                {momoTotal > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      { width: `${Math.max(4, (momoTotal / totalLiquidBalance) * 100)}%`, backgroundColor: '#10B981' },
                    ]}
                  />
                )}
                {bankTotal > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      { width: `${Math.max(4, (bankTotal / totalLiquidBalance) * 100)}%`, backgroundColor: '#6366F1' },
                    ]}
                  />
                )}
                {cashTotal > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      { width: `${Math.max(4, (cashTotal / totalLiquidBalance) * 100)}%`, backgroundColor: '#0EA5E9' },
                    ]}
                  />
                )}
                {cardsTotal > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      { width: `${Math.max(4, (cardsTotal / totalLiquidBalance) * 100)}%`, backgroundColor: '#F59E0B' },
                    ]}
                  />
                )}
              </View>
            </View>
          )}

          {/* 4-Column Category Summary Grid */}
          <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.heroStatItem}>
              <View style={styles.statDotRow}>
                <View style={[styles.statDot, { backgroundColor: '#6366F1' }]} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Banks {percentages.bank > 0 ? `(${percentages.bank}%)` : ''}</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {formatAmount(bankTotal, currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <View style={styles.statDotRow}>
                <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>MoMo {percentages.momo > 0 ? `(${percentages.momo}%)` : ''}</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {formatAmount(momoTotal, currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <View style={styles.statDotRow}>
                <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cash {percentages.cash > 0 ? `(${percentages.cash}%)` : ''}</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {formatAmount(cashTotal, currencySymbol)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: `All (${accounts.length})` },
              { id: 'shared', label: `Shared (${typeCounts.shared || 0})` },
              { id: 'bank', label: `Banks (${typeCounts.bank || 0})` },
              { id: 'mobile_money', label: `Mobile Money (${typeCounts.mobile_money || 0})` },
              { id: 'cash', label: `Cash (${typeCounts.cash || 0})` },
              { id: 'credit_card', label: `Cards (${typeCounts.credit_card || 0})` },
            ].map((f) => {
              const isSelected = filterType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setFilterType(f.id);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : (isDark ? '#0F172A' : colors.surfaceElevated),
                      borderColor: isSelected ? colors.primary : (isDark ? '#1E293B' : colors.border),
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

      {/* P2P User Transfer Modal */}
      <P2PTransferModal visible={p2pModalVisible} onClose={() => setP2pModalVisible(false)} />
        </View>

        {/* 3. Accounts List */}
        {isLoading ? (
          <SkeletonList count={4} />
        ) : filteredAccounts.length === 0 ? (
          <EmptyState
            icon={<Landmark size={36} color={colors.textMuted} />}
            title="No Accounts Found"
            description="Add your first bank account, mobile money wallet, or join a shared wallet to start tracking."
            actionTitle="Add New Account"
            onAction={openCreateModal}
          />
        ) : (
          filteredAccounts.map((item) => (
            <AccountCard
              key={item.id}
              account={item}
              currencySymbol={currencySymbol}
              onPress={() => setSelectedAccountForDetail(item)}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDelete(item)}
              onTransfer={() => router.push({ pathname: '/(app)/transfer', params: { fromId: item.id } })}
              onAddTransaction={() => openQuickEntry()}
              onManageMembers={() => setManageMembersAccount(item)}
            />
          ))
        )}
      </ScrollView>

      {/* MODAL 1: Add / Edit Account Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={editingAccount ? 'Edit Account' : 'New Account / Wallet'}
      >
        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
          </View>
        ) : null}

        {/* Quick Presets (Only on Create) */}
        {!editingAccount && (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Popular Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PRESET_INSTITUTIONS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  activeOpacity={0.7}
                  onPress={() => handleSelectPreset(preset)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: name === preset.name ? colors.primaryLight : colors.surfaceElevated,
                      borderColor: name === preset.name ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: name === preset.name ? '700' : '600',
                      color: name === preset.name ? colors.primary : colors.text,
                    }}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Input
          label="Account Name *"
          placeholder="e.g. Centenary Bank / MTN Mobile Money"
          value={name}
          onChangeText={setName}
        />

        {/* Type Selector Grid with Icons */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Account Type
          </Text>
          <View style={styles.typeChipsGrid}>
            {ACCOUNT_TYPES.map(({ type: t, label: l, icon: Icon, color }) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.75}
                  onPress={() => {
                    triggerHaptic.selection();
                    setType(t);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Icon
                    size={16}
                    color={isSelected ? '#FFFFFF' : color}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : '600',
                    }}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label="Bank / Provider Name (Optional)"
          placeholder="e.g. Stanbic, Absa, MTN"
          value={bankName}
          onChangeText={setBankName}
        />

        <Input
          label="Account Number (Optional)"
          placeholder="e.g. 3200123456"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
        />

        <Input
          label={`Initial Starting Balance (${currencySymbol})`}
          placeholder="0.00"
          value={initialBalance}
          onChangeText={setInitialBalance}
          keyboardType="decimal-pad"
        />

        <Button
          title={editingAccount ? 'Save Changes' : 'Create Account'}
          size="lg"
          loading={createMutation.isPending || updateMutation.isPending}
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Account Details Sheet */}
      {selectedAccountForDetail && (
        <Modal
          visible={!!selectedAccountForDetail}
          onClose={() => setSelectedAccountForDetail(null)}
          title="Account Overview"
        >
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View>
                <Text style={[styles.detailAccName, { color: colors.text }]}>
                  {selectedAccountForDetail.name}
                </Text>
                <Text style={[styles.detailBankLabel, { color: colors.textSecondary }]}>
                  {selectedAccountForDetail.bank_name || 'Personal Wallet'} • {selectedAccountForDetail.type}
                </Text>
              </View>

              <Text style={[styles.detailBalanceAmount, { color: colors.primary }]}>
                {formatAmount(selectedAccountForDetail.balance, currencySymbol)}
              </Text>
            </View>

            {/* Metrics 2x2 Grid */}
            <View style={[styles.detailInfoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Current Balance</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {formatAmount(selectedAccountForDetail.balance, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Starting Balance</Text>
                <Text style={[styles.detailGridValue, { color: colors.textSecondary }]}>
                  {formatAmount(selectedAccountForDetail.initial_balance || 0, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Account Number</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {selectedAccountForDetail.account_number ? `•••• ${selectedAccountForDetail.account_number.slice(-4)}` : 'N/A'}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Sharing Status</Text>
                <Text style={[styles.detailGridValue, { color: selectedAccountForDetail.is_shared ? colors.primary : colors.textSecondary }]}>
                  {selectedAccountForDetail.is_shared ? `Shared (${selectedAccountForDetail.members_count || 2} members)` : 'Private'}
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={{ gap: Spacing.sm }}>
              <Button
                title="Manage Members & Sharing (👥)"
                variant="secondary"
                size="md"
                onPress={() => {
                  const target = selectedAccountForDetail;
                  setSelectedAccountForDetail(null);
                  setManageMembersAccount(target);
                }}
              />

              <Button
                title="Transfer Money"
                size="md"
                onPress={() => {
                  const accId = selectedAccountForDetail.id;
                  setSelectedAccountForDetail(null);
                  router.push({ pathname: '/(app)/transfer', params: { fromId: accId } });
                }}
              />

              <Button
                title="Add Transaction"
                variant="outline"
                size="md"
                onPress={() => {
                  const accId = selectedAccountForDetail.id;
                  setSelectedAccountForDetail(null);
                  openQuickEntry();
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 3: Manage Members & Sharing */}
      <ManageMembersModal
        visible={!!manageMembersAccount}
        onClose={() => setManageMembersAccount(null)}
        account={manageMembersAccount}
      />

      {/* MODAL 4: Join Shared Wallet */}
      <JoinSharedWalletModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSuccess={() => refetch()}
      />

      {/* Confirmation Dialog: Delete */}
      <ConfirmDialog
        visible={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={() => {
          if (accountToDelete) {
            deleteMutation.mutate(accountToDelete.id);
            setAccountToDelete(null);
          }
        }}
        title="Delete Account"
        message={`Are you sure you want to delete "${accountToDelete?.name}"? All associated transactions will be permanently deleted.`}
        confirmText="Delete"
        type="danger"
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
    paddingBottom: 100,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTotalAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  heroStatItem: {
    flex: 1,
  },
  statDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  typeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailCard: {
    gap: Spacing.md,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailAccName: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailBankLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  detailBalanceAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  detailGridItem: {
    width: '46%',
  },
  detailGridLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailGridValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});