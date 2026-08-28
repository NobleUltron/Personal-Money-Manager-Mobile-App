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
  Target,
  Trophy,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Edit2,
  Trash2,
  Tag,
  Zap,
  ArrowRight,
  Layers,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { goalsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { GoalCard } from '../../components/financial/GoalCard';
import { triggerHaptic } from '../../utils/haptics';
import { Goal } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

const GOAL_TEMPLATES = [
  { name: 'Emergency Fund', category: 'Savings & Security', color: '#EF4444', icon: '🛡️' },
  { name: 'New Car / Vehicle', category: 'Transport', color: '#3B82F6', icon: '🚗' },
  { name: 'Home / Land Deposit', category: 'Property', color: '#6366F1', icon: '🏠' },
  { name: 'Vacation & Holiday', category: 'Travel', color: '#0EA5E9', icon: '🏖️' },
  { name: 'Wedding & Ceremony', category: 'Personal', color: '#EC4899', icon: '💍' },
  { name: 'New Laptop / Tech', category: 'Gadgets', color: '#A855F7', icon: '💻' },
  { name: 'Business Startup', category: 'Investment', color: '#10B981', icon: '💼' },
];

const GOAL_COLORS = [
  '#6366F1',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
];

export default function GoalsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Filters & Selected State
  const [filterType, setFilterType] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<Goal | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Savings & Security');
  const [color, setColor] = useState('#6366F1');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Deposit Fields
  const [depositAmount, setDepositAmount] = useState('');
  const [depositError, setDepositError] = useState('');

  // 1. Fetch Goals
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.getAll(),
  });

  const goals = data?.goals || [];
  const summary = data?.summary || { totalTarget: 0, totalCurrent: 0, completedCount: 0, overallPercentage: 0 };

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeCreateModal();
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to create goal');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => goalsApi.update(id, data),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeCreateModal();
      if (selectedGoalForDetail) setSelectedGoalForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setFormError(err.response?.data?.message || err.message || 'Failed to update goal');
    },
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      goalsApi.deposit(id, amount),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeDepositModal();
      if (selectedGoalForDetail) setSelectedGoalForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setDepositError(err.response?.data?.message || err.message || 'Failed to record deposit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedGoalForDetail) setSelectedGoalForDetail(null);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete goal');
    },
  });

  // 3. Modal Handlers
  const openCreateModal = () => {
    triggerHaptic.selection();
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setCategory('Savings & Security');
    setColor('#6366F1');
    setNotes('');
    setFormError('');
    setCreateModalVisible(true);
  };

  const openEditModal = (g: Goal) => {
    triggerHaptic.selection();
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(g.target_amount.toString());
    setCurrentAmount(g.current_amount.toString());
    setTargetDate(g.target_date ? g.target_date.split('T')[0] : '');
    setCategory(g.category || 'Savings & Security');
    setColor(g.color || '#6366F1');
    setNotes(g.notes || '');
    setFormError('');
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setEditingGoal(null);
  };

  const openDepositModal = (g: Goal) => {
    triggerHaptic.selection();
    setSelectedGoalForDeposit(g);
    setDepositAmount('');
    setDepositError('');
    setDepositModalVisible(true);
  };

  const closeDepositModal = () => {
    setDepositModalVisible(false);
    setSelectedGoalForDeposit(null);
  };

  const handleSaveGoal = () => {
    if (!name.trim()) {
      setFormError('Goal title is required');
      return;
    }

    const numTarget = parseFloat(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      setFormError('Please enter a valid target amount');
      return;
    }

    const numCurrent = currentAmount ? parseFloat(currentAmount) : 0;

    if (editingGoal) {
      updateMutation.mutate({
        id: editingGoal.id,
        data: {
          name: name.trim(),
          target_amount: numTarget,
          current_amount: numCurrent,
          target_date: targetDate.trim() || undefined,
          category,
          color,
          notes: notes.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        target_amount: numTarget,
        current_amount: numCurrent,
        target_date: targetDate.trim() || undefined,
        category,
        color,
        notes: notes.trim() || undefined,
      });
    }
  };

  const handleDeposit = () => {
    if (!selectedGoalForDeposit) return;

    const numDeposit = parseFloat(depositAmount);
    if (isNaN(numDeposit) || numDeposit <= 0) {
      setDepositError('Please enter a valid deposit amount greater than 0');
      return;
    }

    depositMutation.mutate({
      id: selectedGoalForDeposit.id,
      amount: numDeposit,
    });
  };

  const handleDelete = (g: Goal) => {
    triggerHaptic.warning();
    setGoalToDelete(g);
  };

  // 4. Quick Template Selection
  const handleSelectTemplate = (tpl: typeof GOAL_TEMPLATES[0]) => {
    triggerHaptic.selection();
    setName(tpl.name);
    setCategory(tpl.category);
    setColor(tpl.color);
  };

  // Quick Date presets
  const handleSetQuickDate = (monthsAhead: number) => {
    triggerHaptic.selection();
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const isComp = g.isCompleted || Number(g.current_amount) >= Number(g.target_amount);
      if (filterType === 'all') return true;
      if (filterType === 'active') return !isComp;
      if (filterType === 'completed') return isComp;
      return true;
    });
  }, [goals, filterType]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Savings Goals"
        subtitle="Turn your targets into visual milestones"
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
        {/* 1. Hero Savings Portfolio & Milestone Card */}
        <LinearGradient
          colors={isDark ? ['#0B0F19', '#030712'] : ['#F8FAFC', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: colors.border }]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Total Saved Portfolio
              </Text>
              <Text style={[styles.heroAmount, { color: colors.text }]}>
                {formatAmount(summary.totalCurrent, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.trophyBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Trophy size={14} color="#10B981" />
              <Text style={styles.trophyBadgeText}>
                {summary.completedCount || 0} Done
              </Text>
            </View>
          </View>

          {/* Master Progress Bar Track */}
          <View style={[styles.masterProgressTrack, { backgroundColor: colors.surfaceElevated }]}>
            <LinearGradient
              colors={Gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.masterProgressBarFill, { width: `${Math.min(summary.overallPercentage, 100)}%` }]}
            />
          </View>

          {/* Milestone Ticks */}
          <View style={styles.milestoneTicksRow}>
            <Text style={[styles.milestoneTickLabel, { color: colors.textMuted }]}>0%</Text>
            <Text style={[styles.milestoneTickLabel, { color: summary.overallPercentage >= 25 ? colors.primary : colors.textMuted }]}>25%</Text>
            <Text style={[styles.milestoneTickLabel, { color: summary.overallPercentage >= 50 ? colors.primary : colors.textMuted }]}>50%</Text>
            <Text style={[styles.milestoneTickLabel, { color: summary.overallPercentage >= 75 ? colors.primary : colors.textMuted }]}>75%</Text>
            <Text style={[styles.milestoneTickLabel, { color: summary.overallPercentage >= 100 ? '#10B981' : colors.textMuted }]}>100%</Text>
          </View>

          {/* Sub Metrics Grid */}
          <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Goal Target</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatAmount(summary.totalTarget, currencySymbol)}
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overall Progress</Text>
              <Text style={[styles.statValue, { color: summary.overallPercentage >= 100 ? colors.success : colors.text }]}>
                {summary.overallPercentage}% Complete
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 1.5 Quick Presets Horizontal Strip */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 6 }]}>
            QUICK GOAL TEMPLATES (1-TAP)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: Spacing.md }}>
            {GOAL_TEMPLATES.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.name}
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic.selection();
                  setEditingGoal(null);
                  setName(tmpl.name);
                  setCategory(tmpl.category);
                  setColor(tmpl.color);
                  setTargetAmount('');
                  setCurrentAmount('0');
                  setTargetDate('');
                  setNotes('');
                  setFormError('');
                  setCreateModalVisible(true);
                }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isDark ? '#0F172A' : colors.surfaceElevated,
                    borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                  },
                ]}
              >
                <Text style={{ fontSize: 13 }}>{tmpl.icon}</Text>
                <Text style={[styles.presetChipText, { color: colors.text }]}>{tmpl.name}</Text>
                <Plus size={11} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 2. Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: `All Goals (${goals.length})` },
              { id: 'active', label: `In Progress (${goals.filter(g => !g.isCompleted).length})` },
              { id: 'completed', label: `Achieved (${summary.completedCount || 0})` },
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
        </View>

        {/* 3. Goals List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={36} color={colors.textMuted} />}
            title="No Savings Goals Found"
            description="Set targets for an emergency fund, home deposit, car, or dream vacation."
            actionTitle="Create First Goal"
            onAction={openCreateModal}
          />
        ) : (
          filteredGoals.map((item) => (
            <GoalCard
              key={item.id}
              goal={item}
              currencySymbol={currencySymbol}
              onDeposit={() => openDepositModal(item)}
              onPress={() => setSelectedGoalForDetail(item)}
            />
          ))
        )}
      </ScrollView>

      {/* MODAL 1: Create / Edit Goal Modal */}
      <Modal
        visible={createModalVisible}
        onClose={closeCreateModal}
        title={editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
      >
        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
          </View>
        ) : null}

        {/* Preset Templates (only on create) */}
        {!editingGoal && (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Popular Goal Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {GOAL_TEMPLATES.map((tpl) => (
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
          label="Goal Name *"
          placeholder="e.g. Emergency Fund, New Car, Home Deposit"
          value={name}
          onChangeText={setName}
        />

        <Input
          label={`Target Amount (${currencySymbol}) *`}
          placeholder="e.g. 5000000"
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="decimal-pad"
        />

        <Input
          label={`Current / Starting Amount (${currencySymbol})`}
          placeholder="0.00"
          value={currentAmount}
          onChangeText={setCurrentAmount}
          keyboardType="decimal-pad"
        />

        {/* Target Completion Date Picker */}
        <DatePickerField
          label="Target Completion Date (Optional)"
          value={targetDate}
          onChange={setTargetDate}
        />

        {/* Color Palette */}
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Theme Accent Color</Text>
          <View style={styles.colorPaletteRow}>
            {GOAL_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setColor(c);
                }}
                style={[
                  styles.colorCircle,
                  {
                    backgroundColor: c,
                    borderColor: color === c ? '#FFFFFF' : 'transparent',
                    borderWidth: color === c ? 3 : 0,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <Input
          label="Notes / Why are you saving for this?"
          placeholder="Keep me motivated..."
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title={editingGoal ? 'Update Goal' : 'Create Goal'}
          size="lg"
          loading={createMutation.isPending || updateMutation.isPending}
          onPress={handleSaveGoal}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Quick Deposit Modal */}
      {selectedGoalForDeposit && (
        <Modal
          visible={depositModalVisible}
          onClose={closeDepositModal}
          title="Deposit to Goal"
        >
          {depositError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{depositError}</Text>
            </View>
          ) : null}

          {/* Goal Progress Banner */}
          <View style={[styles.depositGoalBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.depositGoalName, { color: colors.text }]}>
                {selectedGoalForDeposit.name}
              </Text>
              <Text style={[styles.depositGoalPct, { color: colors.primary }]}>
                {selectedGoalForDeposit.percentage}%
              </Text>
            </View>

            <Text style={[styles.depositGoalSubtext, { color: colors.textSecondary }]}>
              Saved: {formatAmount(selectedGoalForDeposit.current_amount, currencySymbol)} of {formatAmount(selectedGoalForDeposit.target_amount, currencySymbol)}
            </Text>
          </View>

          <Input
            label={`Deposit Amount (${currencySymbol}) *`}
            placeholder="e.g. 100000"
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="decimal-pad"
          />

          {/* Deposit Preset Chips */}
          <View style={[styles.chipsRow, { marginBottom: Spacing.md, marginTop: -Spacing.xs }]}>
            {[25000, 50000, 100000, 500000].map((val) => (
              <TouchableOpacity
                key={val}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setDepositAmount(val.toString());
                }}
                style={[styles.presetChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Text style={[styles.presetText, { color: colors.primary }]}>
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Confirm Deposit"
            size="lg"
            loading={depositMutation.isPending}
            onPress={handleDeposit}
            style={{ marginTop: Spacing.sm }}
          />
        </Modal>
      )}

      {/* MODAL 3: Goal Details & Milestones Sheet */}
      {selectedGoalForDetail && (
        <Modal
          visible={!!selectedGoalForDetail}
          onClose={() => setSelectedGoalForDetail(null)}
          title="Goal Details"
        >
          <View style={styles.detailCard}>
            <View style={styles.detailTopRow}>
              <View>
                <Text style={[styles.detailGoalName, { color: colors.text }]}>
                  {selectedGoalForDetail.name}
                </Text>
                <Text style={[styles.detailCategoryLabel, { color: colors.textSecondary }]}>
                  {selectedGoalForDetail.category || 'Savings & Security'}
                </Text>
              </View>

              <Text style={[styles.detailTargetAmount, { color: colors.primary }]}>
                {formatAmount(selectedGoalForDetail.target_amount, currencySymbol)}
              </Text>
            </View>

            {/* Milestones Checklist */}
            <View style={[styles.milestonesBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.milestoneBoxTitle, { color: colors.textSecondary }]}>Milestone Trackers</Text>
              <View style={styles.milestoneGrid}>
                {[
                  { label: '25% Kickoff', pct: 25 },
                  { label: '50% Halfway', pct: 50 },
                  { label: '75% Major Step', pct: 75 },
                  { label: '100% Target Met', pct: 100 },
                ].map((m) => {
                  const reached = selectedGoalForDetail.percentage >= m.pct;
                  return (
                    <View key={m.pct} style={[styles.milestoneItem, { backgroundColor: reached ? 'rgba(16, 185, 129, 0.15)' : 'rgba(150, 150, 150, 0.08)' }]}>
                      <CheckCircle2 size={14} color={reached ? '#10B981' : colors.textMuted} />
                      <Text style={[styles.milestoneItemText, { color: reached ? '#10B981' : colors.textMuted }]}>
                        {m.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            {!selectedGoalForDetail.isCompleted && (
              <Button
                title="Deposit to Goal"
                size="md"
                onPress={() => {
                  const g = selectedGoalForDetail;
                  setSelectedGoalForDetail(null);
                  openDepositModal(g);
                }}
              />
            )}

            <View style={[styles.detailSecondaryActions, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const g = selectedGoalForDetail;
                  setSelectedGoalForDetail(null);
                  openEditModal(g);
                }}
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Edit2 size={15} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Goal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDelete(selectedGoalForDetail)}
                style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* MODAL 4: Custom Confirm Delete Dialog */}
      <ConfirmDialog
        visible={goalToDelete !== null}
        onClose={() => setGoalToDelete(null)}
        onConfirm={() => {
          if (goalToDelete) {
            deleteMutation.mutate(goalToDelete.id);
            setGoalToDelete(null);
          }
        }}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete "${goalToDelete?.name}"? All milestone progress for this goal will be cleared.`}
        confirmText="Delete Goal"
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
  trophyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  trophyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  masterProgressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  masterProgressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  milestoneTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  milestoneTickLabel: {
    fontSize: 10,
    fontWeight: '700',
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
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  depositGoalBanner: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  depositGoalName: {
    fontSize: 17,
    fontWeight: '800',
  },
  depositGoalPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  depositGoalSubtext: {
    fontSize: 12,
    marginTop: 3,
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
  detailGoalName: {
    fontSize: 20,
    fontWeight: '800',
  },
  detailCategoryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  detailTargetAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  milestonesBox: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  milestoneBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  milestoneItemText: {
    fontSize: 11,
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
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});


