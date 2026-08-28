import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  Smartphone,
  Wallet,
  CreditCard,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  Check,
  Percent,
  X,
  FileText,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { accountsApi, transfersApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { Modal } from '../../components/ui/Modal';
import { triggerHaptic } from '../../utils/haptics';
import { Account } from '../../types';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

export default function TransferScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  // Transfer Fields
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Picker & Confirmation Modals
  const [accountPickerType, setAccountPickerType] = useState<'from' | 'to' | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [transferReceipt, setTransferReceipt] = useState<any>(null);

  // Auto-select first two accounts
  useEffect(() => {
    if (accounts.length >= 2) {
      if (!fromAccountId) setFromAccountId(accounts[0].id);
      if (!toAccountId) setToAccountId(accounts[1].id);
    } else if (accounts.length === 1) {
      if (!fromAccountId) setFromAccountId(accounts[0].id);
    }
  }, [accounts]);

  // Selected Accounts
  const fromAccount = useMemo(() => accounts.find((a) => a.id === fromAccountId), [accounts, fromAccountId]);
  const toAccount = useMemo(() => accounts.find((a) => a.id === toAccountId), [accounts, toAccountId]);

  // Transfer Amount Calculations
  const numericAmount = parseFloat(amountStr) || 0;
  const fromBalance = Number(fromAccount?.balance) || 0;
  const toBalance = Number(toAccount?.balance) || 0;

  const isInsufficient = numericAmount > fromBalance && fromBalance > 0;
  const projectedFromBalance = fromBalance - numericAmount;
  const projectedToBalance = toBalance + numericAmount;

  // Swap From & To Accounts
  const handleSwapAccounts = () => {
    triggerHaptic.selection();
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  // Percentage shortcut
  const handleSetPercentage = (pct: number) => {
    triggerHaptic.selection();
    if (fromBalance <= 0) return;
    const calc = Math.floor(fromBalance * (pct / 100));
    setAmountStr(calc.toString());
  };

  // Preset quick addition
  const handleAddPreset = (val: number) => {
    triggerHaptic.selection();
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + val).toString());
  };

  // Mutation
  const transferMutation = useMutation({
    mutationFn: transfersApi.transfer,
    onSuccess: (data: any) => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setConfirmModalVisible(false);
      setTransferReceipt({
        amount: numericAmount,
        fromName: fromAccount?.name || 'Source Account',
        toName: toAccount?.name || 'Destination Account',
        date,
        reason,
        projectedFrom: projectedFromBalance,
        projectedTo: projectedToBalance,
        message: data.message || 'Funds transferred successfully.',
      });
      setSuccessModalVisible(true);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setError(err.response?.data?.message || err.message || 'Transfer failed');
      setConfirmModalVisible(false);
    },
  });

  const handleValidateAndReview = () => {
    if (!fromAccountId || !toAccountId) {
      setError('Please select both source and destination accounts');
      triggerHaptic.error();
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('Source and destination accounts must be different');
      triggerHaptic.error();
      return;
    }

    if (numericAmount <= 0) {
      setError('Please enter a valid transfer amount');
      triggerHaptic.error();
      return;
    }

    if (isInsufficient) {
      setError(`Insufficient balance. Available in ${fromAccount?.name}: ${currencySymbol} ${fromBalance.toLocaleString()}`);
      triggerHaptic.error();
      return;
    }

    setError('');
    triggerHaptic.medium();
    setConfirmModalVisible(true);
  };

  const handleExecuteTransfer = () => {
    transferMutation.mutate({
      fromAccountId,
      toAccountId,
      amount: numericAmount,
      date,
      reason: reason.trim() || undefined,
    });
  };

  const getAccountIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'bank':
        return <Landmark size={20} color="#6366F1" />;
      case 'mobile_money':
      case 'mobile money':
        return <Smartphone size={20} color="#10B981" />;
      case 'savings':
        return <PiggyBank size={20} color="#A855F7" />;
      case 'credit_card':
      case 'credit':
        return <CreditCard size={20} color="#F59E0B" />;
      default:
        return <Wallet size={20} color="#3B82F6" />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Inter-Account Transfer"
        subtitle="Move money instantly between accounts"
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <AlertCircle size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* 1. Interactive Source & Destination Flow Cards */}
          <View style={styles.transferFlowContainer}>
            {/* FROM Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setAccountPickerType('from');
              }}
              style={[
                styles.accountSelectCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: fromAccountId ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.accountCardHeader}>
                <Text style={[styles.flowBadgeText, { color: colors.primary }]}>FROM (SOURCE)</Text>
                <View style={styles.pickerHint}>
                  <Text style={[styles.pickerHintText, { color: colors.textSecondary }]}>Change</Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </View>
              </View>

              {fromAccount ? (
                <View style={styles.accountInfoRow}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    {getAccountIcon(fromAccount.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountNameText, { color: colors.text }]} numberOfLines={1}>
                      {fromAccount.name}
                    </Text>
                    <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                      Balance: {formatAmount(fromAccount.balance, currencySymbol)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  Select source account...
                </Text>
              )}
            </TouchableOpacity>

            {/* Central SWAP Button */}
            <View style={styles.swapBtnWrapper}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSwapAccounts}
                style={[styles.swapButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              >
                <ArrowLeftRight size={18} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* TO Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setAccountPickerType('to');
              }}
              style={[
                styles.accountSelectCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: toAccountId ? colors.success : colors.border,
                },
              ]}
            >
              <View style={styles.accountCardHeader}>
                <Text style={[styles.flowBadgeText, { color: colors.success }]}>TO (DESTINATION)</Text>
                <View style={styles.pickerHint}>
                  <Text style={[styles.pickerHintText, { color: colors.textSecondary }]}>Change</Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </View>
              </View>

              {toAccount ? (
                <View style={styles.accountInfoRow}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    {getAccountIcon(toAccount.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountNameText, { color: colors.text }]} numberOfLines={1}>
                      {toAccount.name}
                    </Text>
                    <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                      Balance: {formatAmount(toAccount.balance, currencySymbol)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  Select destination account...
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 2. Amount Input & Percentage Shortcuts Card */}
          <Card style={styles.amountCard}>
            <Text style={[styles.amountCardLabel, { color: colors.textSecondary }]}>
              TRANSFER AMOUNT ({currencySymbol})
            </Text>

            <View style={styles.amountInputRow}>
              <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currencySymbol}</Text>
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                style={[styles.heroAmountInput, { color: colors.text }]}
              />
            </View>

            {/* Percentage Quick Chips */}
            <View style={styles.pctRow}>
              {[25, 50, 75, 100].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  activeOpacity={0.7}
                  onPress={() => handleSetPercentage(pct)}
                  style={[
                    styles.pctChip,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.pctText, { color: colors.text }]}>
                    {pct === 100 ? 'MAX (100%)' : `${pct}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Amount Additions */}
            <View style={styles.presetsRow}>
              {[10000, 50000, 100000, 500000].map((val) => (
                <TouchableOpacity
                  key={val}
                  activeOpacity={0.7}
                  onPress={() => handleAddPreset(val)}
                  style={[styles.presetChip, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)', borderColor: colors.border }]}
                >
                  <Text style={[styles.presetText, { color: colors.primary }]}>
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* 3. Instant Balance Projection Preview */}
          {numericAmount > 0 && fromAccount && toAccount && (
            <LinearGradient
              colors={isDark ? ['#1E1B4B', '#0F172A'] : ['#EEF2FF', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.projectionCard, { borderColor: isInsufficient ? colors.danger : colors.border }]}
            >
              <View style={styles.projectionHeader}>
                <Sparkles size={14} color={isInsufficient ? colors.danger : colors.primary} />
                <Text style={[styles.projectionTitle, { color: isInsufficient ? colors.danger : colors.primary }]}>
                  {isInsufficient ? 'Warning: Insufficient Balance' : 'Live Balance Projection Preview'}
                </Text>
              </View>

              <View style={styles.projectionRow}>
                <View style={styles.projectionCol}>
                  <Text style={[styles.projLabel, { color: colors.textSecondary }]}>{fromAccount.name} (Source)</Text>
                  <Text style={[styles.projCurrent, { color: colors.textMuted }]}>
                    Current: {formatAmount(fromBalance, currencySymbol)}
                  </Text>
                  <Text style={[styles.projAfter, { color: isInsufficient ? colors.danger : colors.danger }]}>
                    After: {formatAmount(projectedFromBalance, currencySymbol)}
                  </Text>
                </View>

                <View style={styles.projArrowCol}>
                  <ArrowRightIcon color={colors.textMuted} />
                </View>

                <View style={styles.projectionCol}>
                  <Text style={[styles.projLabel, { color: colors.textSecondary }]}>{toAccount.name} (Dest)</Text>
                  <Text style={[styles.projCurrent, { color: colors.textMuted }]}>
                    Current: {formatAmount(toBalance, currencySymbol)}
                  </Text>
                  <Text style={[styles.projAfter, { color: colors.success }]}>
                    After: {formatAmount(projectedToBalance, currencySymbol)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* 4. Note & Date Fields */}
          <Card style={{ marginBottom: Spacing.lg }}>
            <Input
              label="Transfer Note / Description (Optional)"
              placeholder="e.g. Monthly savings allocation, Cash out to mobile wallet"
              value={reason}
              onChangeText={setReason}
            />

            <DatePickerField
              label="Execution Date"
              value={date}
              onChange={setDate}
            />
          </Card>

          {/* 5. Review & Transfer Button */}
          <Button
            title="Review & Confirm Transfer"
            size="lg"
            disabled={isInsufficient || numericAmount <= 0}
            onPress={handleValidateAndReview}
            style={{ marginBottom: Spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL 1: Account Picker Modal */}
      <Modal
        visible={accountPickerType !== null}
        onClose={() => setAccountPickerType(null)}
        title={accountPickerType === 'from' ? 'Select Source Account (From)' : 'Select Destination Account (To)'}
      >
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={styles.pickerList}>
            {accounts.map((acc) => {
              const isSelected = (accountPickerType === 'from' ? fromAccountId : toAccountId) === acc.id;
              const isOpposite = (accountPickerType === 'from' ? toAccountId : fromAccountId) === acc.id;

              return (
                <TouchableOpacity
                  key={acc.id}
                  activeOpacity={0.7}
                  disabled={isOpposite}
                  onPress={() => {
                    triggerHaptic.selection();
                    if (accountPickerType === 'from') {
                      setFromAccountId(acc.id);
                    } else {
                      setToAccountId(acc.id);
                    }
                    setAccountPickerType(null);
                  }}
                  style={[
                    styles.pickerRowItem,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : isOpposite
                        ? colors.surface
                        : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: isOpposite ? 0.4 : 1,
                    },
                  ]}
                >
                  <View style={[styles.pickerIconBox, { backgroundColor: isSelected ? colors.primary : 'rgba(99, 102, 241, 0.15)' }]}>
                    {getAccountIcon(acc.type)}
                  </View>

                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text
                      style={[
                        styles.pickerAccName,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text style={[styles.pickerAccBalance, { color: colors.textSecondary }]}>
                      Available: {formatAmount(acc.balance, currencySymbol)}
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}

                  {isOpposite && (
                    <Text style={[styles.inUseText, { color: colors.textMuted }]}>
                      {accountPickerType === 'from' ? 'Selected as To' : 'Selected as From'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Modal>

      {/* MODAL 2: Transfer Confirmation Receipt Modal */}
      <Modal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        title="Confirm Transfer"
      >
        <View style={styles.receiptContainer}>
          {/* Amount Badge Header */}
          <View style={[styles.receiptAmountHeader, { backgroundColor: isDark ? '#0F172A' : '#EEF2FF' }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Total Transfer Amount</Text>
            <Text style={[styles.receiptAmount, { color: colors.primary }]}>
              {formatAmount(numericAmount, currencySymbol)}
            </Text>
          </View>

          {/* Transfer Flow Details */}
          <View style={[styles.receiptDetailsBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptRowLabel, { color: colors.textSecondary }]}>From Account</Text>
              <Text style={[styles.receiptRowValue, { color: colors.text }]}>{fromAccount?.name}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptRowLabel, { color: colors.textSecondary }]}>To Account</Text>
              <Text style={[styles.receiptRowValue, { color: colors.success }]}>{toAccount?.name}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptRowLabel, { color: colors.textSecondary }]}>Transfer Fee</Text>
              <Text style={[styles.receiptRowValue, { color: '#10B981', fontWeight: '800' }]}>FREE ($0.00)</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptRowLabel, { color: colors.textSecondary }]}>Execution Date</Text>
              <Text style={[styles.receiptRowValue, { color: colors.text }]}>{date}</Text>
            </View>

            {reason ? (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textSecondary }]}>Note</Text>
                <Text style={[styles.receiptRowValue, { color: colors.text }]} numberOfLines={1}>{reason}</Text>
              </View>
            ) : null}
          </View>

          {/* Balance Preview inside Receipt */}
          <View style={styles.receiptProjSummary}>
            <Text style={[styles.receiptProjText, { color: colors.textSecondary }]}>
              • {fromAccount?.name} will be debited {formatAmount(numericAmount, currencySymbol)}
            </Text>
            <Text style={[styles.receiptProjText, { color: colors.textSecondary }]}>
              • {toAccount?.name} will be credited {formatAmount(numericAmount, currencySymbol)}
            </Text>
          </View>

          {/* Confirm Button */}
          <Button
            title="Slide to Confirm & Execute"
            size="lg"
            loading={transferMutation.isPending}
            onPress={handleExecuteTransfer}
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </Modal>

      {/* Custom Fintech Success Alert Dialog */}
      <RNModal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View
            style={[
              styles.alertDialogCard,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            {/* Glowing Emerald Check Icon */}
            <View style={styles.alertIconBubble}>
              <CheckCircle2 size={26} color="#10B981" strokeWidth={2.5} />
            </View>

            {/* Alert Title */}
            <Text style={[styles.alertTitle, { color: colors.text }]}>Transfer Completed</Text>

            {/* Alert Body Message */}
            <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
              Successfully transferred{' '}
              <Text style={{ fontWeight: '800', color: colors.primary }}>
                {transferReceipt ? formatAmount(transferReceipt.amount, currencySymbol) : ''}
              </Text>
              {' '}from{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {transferReceipt?.fromName}
              </Text>
              {' '}to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {transferReceipt?.toName}
              </Text>
              .
            </Text>

            {/* Action Buttons (App Themed) */}
            <View style={styles.alertActionsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic.selection();
                  setSuccessModalVisible(false);
                  router.replace('/(app)/accounts');
                }}
                style={[
                  styles.alertButton,
                  {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
                  },
                ]}
              >
                <Text style={[styles.alertButtonText, { color: colors.primary }]}>VIEW ACCOUNTS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic.light();
                  setSuccessModalVisible(false);
                  router.back();
                }}
                style={[
                  styles.alertButton,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Text style={[styles.alertButtonText, { color: colors.textSecondary }]}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
      </SafeAreaView>
  );
}

const ArrowRightIcon: React.FC<{ color: string }> = ({ color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <ArrowLeftRight size={16} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  transferFlowContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  accountSelectCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  flowBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pickerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pickerHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  accountNameText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6,
  },
  swapBtnWrapper: {
    alignItems: 'center',
    marginVertical: -14,
    zIndex: 20,
  },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#020617',
  },
  amountCard: {
    padding: Spacing.md,
    borderRadius: Radius.xxl,
    marginBottom: Spacing.md,
  },
  amountCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 6,
  },
  heroAmountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    padding: 0,
  },
  pctRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  pctChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
  },
  projectionCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  projectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectionCol: {
    flex: 1,
  },
  projArrowCol: {
    paddingHorizontal: Spacing.sm,
  },
  projLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  projCurrent: {
    fontSize: 11,
    fontWeight: '500',
  },
  projAfter: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  pickerList: {
    gap: 8,
  },
  pickerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  pickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAccName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerAccBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inUseText: {
    fontSize: 11,
    fontWeight: '600',
  },
  receiptContainer: {
    gap: Spacing.md,
  },
  receiptAmountHeader: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.xl,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  receiptDetailsBox: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptRowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  receiptProjSummary: {
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  receiptProjText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  alertDialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  alertIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  alertMessage: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  alertActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  alertButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});