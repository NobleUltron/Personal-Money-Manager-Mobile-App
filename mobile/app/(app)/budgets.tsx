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
  PieChart,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  Check,
  Edit2,
  Trash2,
  Tag,
  Clock,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { budgetsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BudgetProgress } from '../../components/financial/BudgetProgress';
import { triggerHaptic } from '../../utils/haptics';
import { Budget } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { CATEGORIES } from '../../constants/categories';



export default function BudgetsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filters & State
  const [filterType, setFilterType] = useState<'all' | 'attention' | 'healthy'>('all');
  const [selectedBudgetForDetail, setSelectedBudgetForDetail] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState('Food & Dining');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // 1. Fetch Budgets
  const { data: budgets = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.getAll(),
  });

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: budgetsApi.createOrUpdate,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
      if (selectedBudgetForDetail) setSelectedBudgetForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to save budget');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: budgetsApi.remove,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedBudgetForDetail) setSelectedBudgetForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete budget');
    },
  });

  // 3. Modal Openers
  const openCreateModal = () => {
    triggerHaptic.selection();
    setEditingBudget(null);
    setCategory('Food & Dining');
    setAmount('');
    setFormError('');
    setShowCategoryDropdown(false);
    setModalVisible(true);
  };

  const openEditModal = (b: Budget) => {
    triggerHaptic.selection();
    setEditingBudget(b);
    setCategory(b.category);
    setAmount(b.amount.toString());
    setFormError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBudget(null);
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid monthly budget limit greater than 0');
      return;
    }

    saveMutation.mutate({
      category,
      amount: numAmount,
    });
  };

  const handleDelete = (b: Budget) => {
    triggerHaptic.warning();
    setBudgetToDelete(b);
  };

  // 4. Budget Metrics & Burn Calculations
  const {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    overallPercentage,
    overBudgetCount,
    nearLimitCount,
    attentionCount,
    daysRemainingInMonth,
    dailySafeAllowance,
  } = useMemo(() => {
    let budgeted = 0;
    let spent = 0;
    let overCount = 0;
    let nearCount = 0;

    budgets.forEach((b) => {
      budgeted += Number(b.amount) || 0;
      spent += Number(b.spent) || 0;
      const pct = Number(b.percentage) || 0;
      if (b.isOver || pct > 100) overCount++;
      else if (pct >= 80) nearCount++;
    });

    const remaining = Math.max(budgeted - spent, 0);
    const pctTotal = budgeted > 0 ? Math.min(Math.round((spent / budgeted) * 100), 100) : 0;

    // Calculate remaining days in current month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(lastDayOfMonth - now.getDate() + 1, 1);
    const dailyAllowance = remaining > 0 ? Math.round(remaining / daysLeft) : 0;

    return {
      totalBudgeted: budgeted,
      totalSpent: spent,
      totalRemaining: remaining,
      overallPercentage: pctTotal,
      overBudgetCount: overCount,
      nearLimitCount: nearCount,
      attentionCount: overCount + nearCount,
      daysRemainingInMonth: daysLeft,
      dailySafeAllowance: dailyAllowance,
    };
  }, [budgets]);

  // 5. Filtered Budgets List
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const pct = Number(b.percentage) || 0;
      const isOver = b.isOver || pct > 100;
      if (filterType === 'all') return true;
      if (filterType === 'attention') return isOver || pct >= 80;
      if (filterType === 'healthy') return !isOver && pct < 80;
      return true;
    });
  }, [budgets, filterType]);

  // Quick Preset Additions
  const handleSetPresetLimit = (val: number) => {
    triggerHaptic.selection();
    setAmount(val.toString());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Monthly Budgets"
        subtitle="Track limits, danger alerts & burn rates"
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
        {/* 1. Hero Monthly Budget Health & Spend Meter Card */}
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#0F172A'] : ['#EEF2FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: colors.border }]}
        >
          {/* Header Row */}
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Total Budgeted Limit
              </Text>
              <Text style={[styles.heroAmount, { color: colors.text }]}>
                {formatAmount(totalBudgeted, currencySymbol)}
              </Text>
            </View>

            <View
              style={[
                styles.healthBadge,
                {
                  backgroundColor:
                    overallPercentage > 100
                      ? 'rgba(239, 68, 68, 0.15)'
                      : overallPercentage >= 80
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  borderColor:
                    overallPercentage > 100
                      ? 'rgba(239, 68, 68, 0.3)'
                      : overallPercentage >= 80
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              <Text
                style={[
                  styles.healthBadgeText,
                  {
                    color:
                      overallPercentage > 100
                        ? '#EF4444'
                        : overallPercentage >= 80
                        ? '#F59E0B'
                        : '#10B981',
                  },
                ]}
              >
                {overallPercentage}% Spent
              </Text>
            </View>
          </View>

          {/* Master Progress Bar Track */}
          <View style={[styles.masterProgressTrack, { backgroundColor: colors.surfaceElevated }]}>
            <LinearGradient
              colors={
                overallPercentage > 100
                  ? ['#EF4444', '#DC2626']
                  : overallPercentage >= 80
                  ? ['#F59E0B', '#D97706']
                  : (Gradients.primary as any)
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.masterProgressBarFill, { width: `${Math.min(overallPercentage, 100)}%` }]}
            />
          </View>

          {/* Sub Metrics Breakdown Grid */}
          <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatAmount(totalSpent, currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Safe Spend Left</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatAmount(totalRemaining, currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Allowance</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                ~{formatAmount(dailySafeAllowance, currencySymbol)}/d
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Danger Alert / Attention Threshold Banner */}
        {attentionCount > 0 && (
          <View
            style={[
              styles.alertStrip,
              {
                backgroundColor: overBudgetCount > 0 ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2') : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
                borderColor: overBudgetCount > 0 ? '#EF4444' : '#F59E0B',
              },
            ]}
          >
            <View style={styles.alertHeader}>
              {overBudgetCount > 0 ? (
                <AlertCircle size={18} color="#EF4444" />
              ) : (
                <AlertTriangle size={18} color="#F59E0B" />
              )}
              <Text
                style={[
                  styles.alertTitle,
                  { color: overBudgetCount > 0 ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#FCD34D' : '#92400E') },
                ]}
              >
                {overBudgetCount > 0
                  ? `${overBudgetCount} category is OVER budget limit!`
                  : `${nearLimitCount} category near spending threshold (>80%)`}
              </Text>
            </View>
            <Text
              style={[
                styles.alertSubtext,
                { color: overBudgetCount > 0 ? (isDark ? '#FECACA' : '#7F1D1D') : (isDark ? '#FDE68A' : '#78350F') },
              ]}
            >
              {daysRemainingInMonth} days left in this month. Slow down discretionary spending in flagged categories.
            </Text>
          </View>
        )}

        {/* 3. Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: `All (${budgets.length})` },
              { id: 'attention', label: `Attention (${attentionCount})` },
              { id: 'healthy', label: 'Healthy (< 80%)' },
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

        {/* 4. Budgets List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredBudgets.length === 0 ? (
          <EmptyState
            icon={<PieChart size={36} color={colors.textMuted} />}
            title="No Budgets in View"
            description="Create monthly category budgets to keep your spending disciplined and prevent budget overruns."
            actionTitle="Set Category Budget"
            onAction={openCreateModal}
          />
        ) : (
          filteredBudgets.map((item) => (
            <BudgetProgress
              key={item.id}
              budget={item}
              currencySymbol={currencySymbol}
              onPress={() => setSelectedBudgetForDetail(item)}
            />
          ))
        )}
      </ScrollView>

      {/* MODAL 1: Add / Edit Budget */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={editingBudget ? 'Adjust Monthly Budget' : 'Set Category Budget'}
      >
        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
          </View>
        ) : null}

        {/* Category Dropdown Selector */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Category *</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={!!editingBudget}
            onPress={() => {
              triggerHaptic.selection();
              setShowCategoryDropdown(!showCategoryDropdown);
            }}
            style={[
              styles.dropdownSelector,
              {
                backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                borderColor: showCategoryDropdown ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                borderWidth: 1.2,
                opacity: editingBudget ? 0.7 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <CategoryIcon
                categoryName={category}
                size={22}
                iconSize={14}
                showBackground={false}
                customColor={colors.primary}
              />
              <Text style={[styles.dropdownValueText, { color: colors.text }]}>
                {category}
              </Text>
            </View>
            {!editingBudget && (
              <ChevronDown
                size={18}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: showCategoryDropdown ? '180deg' : '0deg' }] }}
              />
            )}
          </TouchableOpacity>

          {/* Collapsible Dropdown List */}
          {showCategoryDropdown && (
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
              {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      activeOpacity={0.7} delayPressIn={0}
                      onPress={() => {
                        triggerHaptic.selection();
                        setCategory(cat.name);
                        setShowCategoryDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        isSelected && {
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                        },
                        { borderBottomColor: isDark ? '#1E293B' : colors.borderSubtle },
                      ]}
                    >
                      <CategoryIcon
                        categoryName={cat.name}
                        size={20}
                        iconSize={13}
                        showBackground={false}
                        customColor={isSelected ? colors.primary : cat.color}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && <Check size={16} color={colors.primary} strokeWidth={2.6} />}
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}
        </View>

        {/* Amount Input */}
        <Input
          label={`Monthly Limit Amount (${currencySymbol}) *`}
          placeholder="e.g. 500000"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {/* Preset Limit Chips */}
        <View style={{ marginBottom: Spacing.md, marginTop: -Spacing.xs }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quick Limits</Text>
          <View style={styles.chipsRow}>
            {[100000, 250000, 500000, 1000000, 2000000].map((presetVal) => (
              <TouchableOpacity
                key={presetVal}
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => handleSetPresetLimit(presetVal)}
                style={[styles.presetChip, { backgroundColor: amount === presetVal.toString() ? colors.primary : (isDark ? '#0B0F19' : colors.surfaceElevated), borderColor: amount === presetVal.toString() ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle), borderWidth: 1.2 }]}
              >
                <Text style={[styles.presetText, { color: amount === presetVal.toString() ? '#FFFFFF' : colors.primary, fontWeight: '800' }]}>
                  {presetVal >= 1000000 ? `${presetVal / 1000000}M` : `${presetVal / 1000}k`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title={editingBudget ? 'Save Adjusted Limit' : 'Set Category Budget'}
          size="lg"
          loading={saveMutation.isPending}
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Budget Details Sheet */}
      {selectedBudgetForDetail && (
        <Modal
          visible={!!selectedBudgetForDetail}
          onClose={() => setSelectedBudgetForDetail(null)}
          title="Budget Breakdown"
        >
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View>
                <Text style={[styles.detailCategoryName, { color: colors.text }]}>
                  {selectedBudgetForDetail.category}
                </Text>
                <Text style={[styles.detailCycleLabel, { color: colors.textSecondary }]}>
                  Monthly Cycle • {daysRemainingInMonth} days left
                </Text>
              </View>

              <Text style={[styles.detailLimitAmount, { color: colors.primary }]}>
                {formatAmount(selectedBudgetForDetail.amount, currencySymbol)}
              </Text>
            </View>

            {/* Metrics 2x2 Grid */}
            <View style={[styles.detailInfoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                <Text style={[styles.detailGridValue, { color: selectedBudgetForDetail.isOver ? colors.danger : colors.text }]}>
                  {formatAmount(selectedBudgetForDetail.spent, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.detailGridValue, { color: selectedBudgetForDetail.isOver ? colors.danger : colors.success }]}>
                  {selectedBudgetForDetail.isOver
                    ? `Over by ${formatAmount(Math.abs(selectedBudgetForDetail.remaining || 0), currencySymbol)}`
                    : formatAmount(selectedBudgetForDetail.remaining || 0, currencySymbol)}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Budget Used</Text>
                <Text style={[styles.detailGridValue, { color: colors.text }]}>
                  {selectedBudgetForDetail.percentage}%
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text style={[styles.detailGridLabel, { color: colors.textSecondary }]}>Daily Run Rate</Text>
                <Text style={[styles.detailGridValue, { color: colors.primary }]}>
                  ~{formatAmount(
                    Math.round(
                      (Number(selectedBudgetForDetail.spent) || 0) /
                        Math.max(new Date().getDate(), 1)
                    ),
                    currencySymbol
                  )}/d
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.detailActionsRow, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => {
                  const b = selectedBudgetForDetail;
                  setSelectedBudgetForDetail(null);
                  openEditModal(b);
                }}
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Edit2 size={15} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Adjust Limit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7} delayPressIn={0}
                onPress={() => handleDelete(selectedBudgetForDetail)}
                style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* MODAL 3: Custom Confirm Delete Dialog */}
      <ConfirmDialog
        visible={budgetToDelete !== null}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={() => {
          if (budgetToDelete) {
            deleteMutation.mutate(budgetToDelete.id);
            setBudgetToDelete(null);
          }
        }}
        title="Delete Category Budget"
        message={`Are you sure you want to remove the monthly budget limit for "${budgetToDelete?.category}"?`}
        confirmText="Delete Budget"
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
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  masterProgressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  masterProgressBarFill: {
    height: '100%',
    borderRadius: 5,
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
    fontSize: 13,
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
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  presetText: {
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
  detailCategoryName: {
    fontSize: 20,
    fontWeight: '800',
  },
  detailCycleLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  detailLimitAmount: {
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