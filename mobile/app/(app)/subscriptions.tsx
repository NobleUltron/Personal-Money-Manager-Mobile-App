import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Repeat,
  Flame,
  Calendar,
  AlertCircle,
  Clock,
  Landmark,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  DollarSign,
  TrendingUp,
  Tag,
  X,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { accountsApi, subscriptionsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { SubscriptionCard } from '../../components/financial/SubscriptionCard';
import { triggerHaptic } from '../../utils/haptics';
import { Subscription } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

const PRESET_TEMPLATES = [
  { name: 'Netflix', category: 'Entertainment', frequency: 'monthly' as const, icon: '🎬' },
  { name: 'Spotify', category: 'Entertainment', frequency: 'monthly' as const, icon: '🎵' },
  { name: 'YouTube Premium', category: 'Entertainment', frequency: 'monthly' as const, icon: '▶️' },
  { name: 'ChatGPT Plus', category: 'SaaS / AI', frequency: 'monthly' as const, icon: '🤖' },
  { name: 'iCloud Storage', category: 'Cloud / Tech', frequency: 'monthly' as const, icon: '☁️' },
  { name: 'Amazon Prime', category: 'Shopping', frequency: 'yearly' as const, icon: '📦' },
  { name: 'Gym Membership', category: 'Health & Fitness', frequency: 'monthly' as const, icon: '🏋️' },
  { name: 'Fiber Internet', category: 'Utilities', frequency: 'monthly' as const, icon: '🌐' },
  { name: 'House Rent', category: 'Housing', frequency: 'monthly' as const, icon: '🏠' },
  { name: 'Electricity / Power', category: 'Utilities', frequency: 'monthly' as const, icon: '⚡' },
];

export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filters & Selected State
  const [filterType, setFilterType] = useState<'all' | 'due_soon' | 'monthly' | 'yearly' | 'weekly'>('all');
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<Subscription | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);
  const [subToAdvance, setSubToAdvance] = useState<{ sub: Subscription; nextDate: string } | null>(null);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Entertainment');
  const [formError, setFormError] = useState('');

  // 1. Fetch Subscriptions & Accounts
  const { data: subscriptions, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.getAll(),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof subscriptionsApi.create>[0]) =>
      subscriptionsApi.create(data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || 'Failed to create subscription');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      subscriptionsApi.update(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
      if (selectedSubForDetail) setSelectedSubForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || 'Failed to update subscription');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.remove(id),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedSubForDetail) setSelectedSubForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete subscription');
    },
  });

  // 3. Quick Renewal (+1 Cycle)
  const handleQuickAdvanceCycle = (sub: Subscription) => {
    triggerHaptic.medium();
    const currentDue = new Date(sub.next_due_date);
    if (sub.frequency === 'yearly') {
      currentDue.setFullYear(currentDue.getFullYear() + 1);
    } else if (sub.frequency === 'weekly') {
      currentDue.setDate(currentDue.getDate() + 7);
    } else {
      currentDue.setMonth(currentDue.getMonth() + 1);
    }

    const newDateStr = currentDue.toISOString().split('T')[0];
    setSubToAdvance({ sub, nextDate: newDateStr });
  };

  // 4. Modal Handlers
  const openCreateModal = () => {
    triggerHaptic.selection();
    setEditingSub(null);
    setName('');
    setAmount('');
    setAccountId(accounts && accounts.length > 0 ? accounts[0].id : '');
    setFrequency('monthly');
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setCategory('Entertainment');
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (s: Subscription) => {
    triggerHaptic.selection();
    setEditingSub(s);
    setAccountId(s.accountId);
    setName(s.name);
    setAmount(s.amount.toString());
    setFrequency(s.frequency);
    setNextDueDate(s.next_due_date ? s.next_due_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setCategory(s.category || 'General');
    setFormError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingSub(null);
  };

  const handleSave = () => {
    if (!name.trim() || !accountId) {
      setFormError('Please fill in subscription name and select a debit account');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    const payload = {
      accountId,
      name: name.trim(),
      amount: numAmount,
      frequency,
      next_due_date: nextDueDate,
      category,
    };

    if (editingSub) {
      updateMutation.mutate({ id: editingSub.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (s: Subscription) => {
    triggerHaptic.warning();
    setSubToDelete(s);
  };

  // 5. Burn Rate Calculations
  const { totalMonthlySpend, totalAnnualSpend, dueSoonCount, dueSoonList } = useMemo(() => {
    if (!subscriptions) return { totalMonthlySpend: 0, totalAnnualSpend: 0, dueSoonCount: 0, dueSoonList: [] };

    let monthly = 0;
    const soonList: Subscription[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    subscriptions.forEach((s) => {
      const amt = Number(s.amount) || 0;
      if (s.frequency === 'yearly') monthly += amt / 12;
      else if (s.frequency === 'weekly') monthly += amt * 4.33;
      else monthly += amt;

      const due = new Date(s.next_due_date);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 7) {
        soonList.push(s);
      }
    });

    return {
      totalMonthlySpend: monthly,
      totalAnnualSpend: monthly * 12,
      dueSoonCount: soonList.length,
      dueSoonList: soonList,
    };
  }, [subscriptions]);

  // 6. Filtered List
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return subscriptions.filter((s) => {
      if (filterType === 'all') return true;
      if (filterType === 'monthly') return s.frequency === 'monthly';
      if (filterType === 'yearly') return s.frequency === 'yearly';
      if (filterType === 'weekly') return s.frequency === 'weekly';
      if (filterType === 'due_soon') {
        const due = new Date(s.next_due_date);
        due.setHours(0, 0, 0, 0);
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff <= 7;
      }
      return true;
    });
  }, [subscriptions, filterType]);

  // Apply template
  const handleSelectTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    triggerHaptic.selection();
    setName(tpl.name);
    setCategory(tpl.category);
    setFrequency(tpl.frequency);
  };

  // Quick date presets
  const handleSetQuickDate = (type: 'week' | 'end_month' | 'next_1st') => {
    triggerHaptic.selection();
    const d = new Date();
    if (type === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (type === 'end_month') {
      d.setMonth(d.getMonth() + 1, 0);
    } else if (type === 'next_1st') {
      d.setMonth(d.getMonth() + 1, 1);
    }
    setNextDueDate(d.toISOString().split('T')[0]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Subscriptions & Bills"
        subtitle="Manage recurring overheads & cycles"
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
        {/* 1. Hero Burn Rate Metric Card */}
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#0F172A'] : ['#EEF2FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: colors.border }]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Monthly Burn Rate
              </Text>
              <Text style={[styles.heroAmount, { color: colors.text }]}>
                {formatAmount(Math.round(totalMonthlySpend), currencySymbol)}
              </Text>
            </View>

            <View style={[styles.burnBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Flame size={14} color="#EF4444" />
              <Text style={styles.burnBadgeText}>Recurring</Text>
            </View>
          </View>

          {/* Sub Stats Row */}
          <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Annual Projection</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                ~{formatAmount(Math.round(totalAnnualSpend), currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Subscriptions</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {subscriptions?.length || 0} services
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Upcoming 7-Day Alert Strip */}
        {dueSoonCount > 0 && (
          <View style={[styles.alertStrip, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={styles.alertHeader}>
              <AlertCircle size={18} color="#F59E0B" />
              <Text style={[styles.alertTitle, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                {dueSoonCount} bill{dueSoonCount > 1 ? 's' : ''} due in the next 7 days
              </Text>
            </View>
            <Text style={[styles.alertSubtext, { color: isDark ? '#FDE68A' : '#78350F' }]}>
              Ensure sufficient balance in connected accounts to avoid service interruptions.
            </Text>
          </View>
        )}

        {/* 3. Filter Chips Row */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: 'All Subscriptions' },
              { id: 'due_soon', label: `Due Soon (${dueSoonCount})` },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'weekly', label: 'Weekly' },
            ].map((f) => {
              const isSelected = filterType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setFilterType(f.id as any);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
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

        {/* 4. Subscriptions List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredSubscriptions.length === 0 ? (
          <EmptyState
            icon={<Repeat size={36} color={colors.textMuted} />}
            title="No Subscriptions Found"
            description="Track Netflix, Spotify, gym memberships, or cloud software bills with renewal alerts."
            actionTitle="Add New Subscription"
            onAction={openCreateModal}
          />
        ) : (
          filteredSubscriptions.map((item) => (
            <SubscriptionCard
              key={item.id}
              subscription={item}
              currencySymbol={currencySymbol}
              onPress={() => setSelectedSubForDetail(item)}
              onQuickRenew={() => handleQuickAdvanceCycle(item)}
            />
          ))
        )}
      </ScrollView>

      {/* MODAL 1: Add / Edit Subscription */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={editingSub ? 'Edit Subscription' : 'New Subscription'}
      >
        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
          </View>
        ) : null}

        {/* Preset Quick Chips (only on create) */}
        {!editingSub && (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quick Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PRESET_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.name}
                  activeOpacity={0.7}
                  onPress={() => handleSelectTemplate(tpl)}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor: name === tpl.name ? colors.primaryLight : colors.surfaceElevated,
                      borderColor: name === tpl.name ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13 }}>{tpl.icon}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: name === tpl.name ? '700' : '600',
                      color: name === tpl.name ? colors.primary : colors.text,
                    }}
                  >
                    {tpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Input
          label="Subscription Name *"
          placeholder="e.g. Netflix, Spotify, Gym, Fiber Internet"
          value={name}
          onChangeText={setName}
        />

        <Input
          label={`Amount (${currencySymbol}) *`}
          placeholder="e.g. 35000"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {/* Account Chips */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Debit From Account *</Text>
          <View style={styles.chipsRow}>
            {accounts?.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setAccountId(acc.id);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: accountId === acc.id ? colors.primary : colors.surfaceElevated,
                    borderColor: accountId === acc.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Landmark size={12} color={accountId === acc.id ? '#FFFFFF' : colors.text} style={{ marginRight: 4 }} />
                <Text style={{ color: accountId === acc.id ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency Chips */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Billing Frequency</Text>
          <View style={styles.chipsRow}>
            {(['monthly', 'yearly', 'weekly'] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setFrequency(freq);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: frequency === freq ? colors.primary : colors.surfaceElevated,
                    borderColor: frequency === freq ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: frequency === freq ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                  {freq.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Due Date Picker */}
        <DatePickerField
          label="Next Due Date *"
          value={nextDueDate}
          onChange={setNextDueDate}
        />

        <Input
          label="Category"
          placeholder="e.g. Entertainment, Utilities, SaaS"
          value={category}
          onChangeText={setCategory}
        />

        <Button
          title={editingSub ? 'Update Subscription' : 'Create Subscription'}
          size="lg"
          loading={createMutation.isPending || updateMutation.isPending}
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Subscription Detail Sheet */}
      {selectedSubForDetail && (
        <Modal
          visible={!!selectedSubForDetail}
          onClose={() => setSelectedSubForDetail(null)}
          title="Subscription Details"
        >
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View>
                <Text style={[styles.detailName, { color: colors.text }]}>
                  {selectedSubForDetail.name}
                </Text>
                <Text style={[styles.detailCategory, { color: colors.textSecondary }]}>
                  {selectedSubForDetail.category || 'General'}
                </Text>
              </View>

              <Text style={[styles.detailAmount, { color: colors.text }]}>
                {formatAmount(selectedSubForDetail.amount, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.detailInfoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Frequency</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {selectedSubForDetail.frequency.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Next Due Date</Text>
                <Text style={[styles.detailGridValue, { color: colors.primary }]}>
                  {selectedSubForDetail.next_due_date ? selectedSubForDetail.next_due_date.split('T')[0] : 'N/A'}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Debit Account</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {selectedSubForDetail.account?.name || 'Main Account'}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Annual Cost</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  ~{formatAmount(
                    selectedSubForDetail.frequency === 'yearly'
                      ? selectedSubForDetail.amount
                      : selectedSubForDetail.frequency === 'weekly'
                      ? selectedSubForDetail.amount * 52
                      : selectedSubForDetail.amount * 12,
                    currencySymbol
                  )}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.detailActionsRow}>
              <Button
                title="Mark as Paid (+1 Cycle)"
                size="md"
                onPress={() => handleQuickAdvanceCycle(selectedSubForDetail)}
                style={{ flex: 1 }}
              />
            </View>

            <View style={[styles.detailSecondaryActions, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const s = selectedSubForDetail;
                  setSelectedSubForDetail(null);
                  openEditModal(s);
                }}
                style={[styles.secondaryActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Edit2 size={15} color={colors.primary} />
                <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDelete(selectedSubForDetail)}
                style={[styles.secondaryActionBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.secondaryActionText, { color: colors.danger }]}>Cancel Sub</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* MODAL 3: Custom Confirm Delete Dialog */}
      <ConfirmDialog
        visible={subToDelete !== null}
        onClose={() => setSubToDelete(null)}
        onConfirm={() => {
          if (subToDelete) {
            deleteMutation.mutate(subToDelete.id);
            setSubToDelete(null);
          }
        }}
        title="Cancel Recurring Bill"
        message={`Are you sure you want to remove "${subToDelete?.name}" from your active recurring subscriptions?`}
        confirmText="Remove Bill"
        type="danger"
        loading={deleteMutation.isPending}
      />
      {/* MODAL 4: Custom Advance Cycle Dialog */}
      <ConfirmDialog
        visible={subToAdvance !== null}
        onClose={() => setSubToAdvance(null)}
        onConfirm={() => {
          if (subToAdvance) {
            updateMutation.mutate({
              id: subToAdvance.sub.id,
              data: {
                accountId: subToAdvance.sub.accountId,
                name: subToAdvance.sub.name,
                amount: subToAdvance.sub.amount,
                frequency: subToAdvance.sub.frequency,
                next_due_date: subToAdvance.nextDate,
                category: subToAdvance.sub.category,
              },
            });
            setSubToAdvance(null);
            if (selectedSubForDetail?.id === subToAdvance.sub.id) {
              setSelectedSubForDetail(null);
            }
          }
        }}
        title="Advance Billing Cycle"
        message={`Mark "${subToAdvance?.sub.name}" as paid and advance next due date to ${subToAdvance?.nextDate}?`}
        confirmText="Confirm & Advance"
        type="success"
        loading={updateMutation.isPending}
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
    paddingBottom: Spacing.xxl * 2,
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
  burnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  burnBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  heroStatItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertStrip: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertSubtext: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
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
  detailCard: {
    gap: Spacing.md,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
  },
  detailCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  detailAmount: {
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
  detailActionsRow: {
    marginTop: Spacing.xs,
  },
  detailSecondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});




