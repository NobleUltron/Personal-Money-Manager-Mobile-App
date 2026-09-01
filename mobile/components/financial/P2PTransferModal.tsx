import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  User as UserIcon,
  CheckCircle2,
  Landmark,
  ChevronDown,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { accountsApi, transfersApi } from '../../services/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface P2PTransferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  visible,
  onClose,
}) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const queryClient = useQueryClient();

  const currencySymbol = user?.currency_symbol || 'UGX';

  // Form State
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    username: string;
    email: string | null;
    profile_picture: string | null;
  } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successReceipt, setSuccessReceipt] = useState<any>(null);

  // 1. Fetch Source Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
    enabled: visible,
  });

  // Set default source account
  useEffect(() => {
    if (accounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(accounts[0].id);
    }
  }, [accounts, sourceAccountId]);

  // 2. Debounced User Lookup
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!recipientQuery.trim() || selectedRecipient) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await transfersApi.lookupUser(recipientQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [recipientQuery, selectedRecipient]);

  // Reset form
  const handleClose = () => {
    setRecipientQuery('');
    setSelectedRecipient(null);
    setAmount('');
    setReason('');
    setErrorMsg('');
    setSuccessReceipt(null);
    setShowSourceDropdown(false);
    onClose();
  };

  // 3. Send Mutation
  const transferMutation = useMutation({
    mutationFn: (data: Parameters<typeof transfersApi.sendP2P>[0]) => transfersApi.sendP2P(data),
    onSuccess: (data) => {
      triggerHaptic.success();
      setSuccessReceipt(data);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setErrorMsg(err.message || 'Transfer failed. Please check balance and recipient.');
    },
  });

  const handleConfirmTransfer = () => {
    if (!sourceAccountId) {
      setErrorMsg('Please select a source wallet / account');
      return;
    }

    const recipientName = selectedRecipient?.username || recipientQuery.trim().replace(/^@/, '');
    if (!recipientName) {
      setErrorMsg('Please enter or select a recipient');
      return;
    }

    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid transfer amount');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === sourceAccountId);
    if (sourceAcc && Number(sourceAcc.balance) < numAmount) {
      setErrorMsg(`Insufficient funds in ${sourceAcc.name}. Balance: ${formatAmount(sourceAcc.balance, currencySymbol)}`);
      return;
    }

    setErrorMsg('');
    transferMutation.mutate({
      fromAccountId: sourceAccountId,
      recipientUsername: recipientName,
      amount: numAmount,
      reason: reason.trim() || undefined,
    });
  };

  const handleSelectPreset = (val: number) => {
    triggerHaptic.selection();
    setAmount(val.toString());
  };

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId);

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={successReceipt ? 'Transfer Sent!' : 'Send Money to User'}
    >
      {successReceipt ? (
        // SUCCESS RECEIPT VIEW
        <View style={styles.successBox}>
          <View style={[styles.successIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <CheckCircle2 size={44} color="#10B981" />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Transfer Complete</Text>
          <Text style={[styles.successAmount, { color: colors.primary }]}>
            {formatAmount(successReceipt.amount, currencySymbol)}
          </Text>
          <Text style={[styles.successSubtext, { color: colors.textSecondary }]}>
            Successfully transferred to @{successReceipt.recipient?.username}
          </Text>

          <View style={[styles.receiptCard, { backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle }]}>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>From Wallet</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{successReceipt.sender?.account}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>To Recipient</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>@{successReceipt.recipient?.username}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{new Date(successReceipt.date).toLocaleDateString()}</Text>
            </View>
          </View>

          <Button
            title="Done"
            size="lg"
            onPress={handleClose}
            style={{ width: '100%', marginTop: Spacing.md }}
          />
        </View>
      ) : (
        // FORM VIEW
        <View>
          {errorMsg ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* 1. Source Account Dropdown */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Debit From Account *</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              delayPressIn={0}
              onPress={() => {
                triggerHaptic.selection();
                setShowSourceDropdown(!showSourceDropdown);
              }}
              style={[
                styles.dropdownSelector,
                {
                  backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                  borderColor: showSourceDropdown ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                  borderWidth: 1.2,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                <Landmark size={18} color={colors.primary} />
                <Text style={[styles.dropdownValueText, { color: colors.text }]}>
                  {selectedAccount?.name || 'Select Wallet'}
                </Text>
                {selectedAccount && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto', marginRight: 8 }}>
                    {formatAmount(selectedAccount.balance, currencySymbol)}
                  </Text>
                )}
              </View>
              <ChevronDown
                size={18}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: showSourceDropdown ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {/* Collapsible Source List */}
            {showSourceDropdown && (
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
                  const isSelected = sourceAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      activeOpacity={0.7}
                      delayPressIn={0}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSourceAccountId(acc.id);
                        setShowSourceDropdown(false);
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
                        <Text style={[styles.dropdownItemText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '800' : '600' }]}>
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

          {/* 2. Recipient Search & Verification */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Recipient Username / Email *</Text>
            {selectedRecipient ? (
              // VERIFIED SELECTED CARD
              <View style={[styles.verifiedCard, { backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated, borderColor: colors.primary }]}>
                {selectedRecipient.profile_picture ? (
                  <Image source={{ uri: selectedRecipient.profile_picture }} style={styles.recipientAvatar} />
                ) : (
                  <View style={[styles.recipientAvatarInitials, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarInitialsText}>{selectedRecipient.username.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.recipientNameText, { color: colors.text }]}>@{selectedRecipient.username}</Text>
                    <ShieldCheck size={14} color="#10B981" />
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Verified Vault User</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  delayPressIn={0}
                  onPress={() => {
                    setSelectedRecipient(null);
                    setRecipientQuery('');
                  }}
                  style={styles.removeRecipientBtn}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              // INPUT SEARCH
              <View>
                <View
                  style={[
                    styles.searchInputBox,
                    {
                      backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                      borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                      borderWidth: 1.2,
                    },
                  ]}
                >
                  <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search by username or email..."
                    placeholderTextColor={colors.textMuted}
                    value={recipientQuery}
                    onChangeText={setRecipientQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.searchInput, { color: colors.text }]}
                  />
                  {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <View
                    style={[
                      styles.searchResultsList,
                      {
                        backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                        borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                        borderWidth: 1.2,
                      },
                    ]}
                  >
                    {searchResults.map((userItem) => (
                      <TouchableOpacity
                        key={userItem.id}
                        activeOpacity={0.7}
                        delayPressIn={0}
                        onPress={() => {
                          triggerHaptic.selection();
                          setSelectedRecipient(userItem);
                          setSearchResults([]);
                        }}
                        style={[styles.searchResultItem, { borderBottomColor: isDark ? '#1E293B' : colors.borderSubtle }]}
                      >
                        {userItem.profile_picture ? (
                          <Image source={{ uri: userItem.profile_picture }} style={styles.miniAvatar} />
                        ) : (
                          <View style={[styles.miniAvatarInitials, { backgroundColor: colors.primary }]}>
                            <Text style={styles.miniAvatarText}>{userItem.username.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.searchUsername, { color: colors.text }]}>@{userItem.username}</Text>
                          {userItem.email && (
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{userItem.email}</Text>
                          )}
                        </View>
                        <ShieldCheck size={14} color="#10B981" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 3. Transfer Amount & Quick Presets */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Transfer Amount ({currencySymbol}) *
            </Text>
            <View
              style={[
                styles.amountInputBox,
                {
                  backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                  borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                  borderWidth: 1.2,
                },
              ]}
            >
              <Text style={[styles.amountCurrencyPrefix, { color: colors.primary }]}>{currencySymbol}</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={[styles.amountInputText, { color: colors.text }]}
              />
            </View>

            {/* Quick Limit Pills */}
            <View style={styles.quickPresetsRow}>
              {[10000, 25000, 50000, 100000, 250000, 500000].map((presetVal) => {
                const isSelected = amount === presetVal.toString();
                return (
                  <TouchableOpacity
                    key={presetVal}
                    activeOpacity={0.7}
                    delayPressIn={0}
                    onPress={() => handleSelectPreset(presetVal)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? colors.primary : (isDark ? '#0B0F19' : colors.surfaceElevated),
                        borderColor: isSelected ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                        borderWidth: 1.2,
                      },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : colors.primary, fontSize: 11, fontWeight: '800' }}>
                      {presetVal >= 1000000 ? `${presetVal / 1000000}M` : `${presetVal / 1000}k`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Note / Purpose (Optional) */}
          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Transfer Note / Memo (Optional)</Text>
            <TextInput
              placeholder="e.g. Lunch bill, Shared ride, Project fee"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated,
                  borderColor: isDark ? '#1E293B' : colors.borderSubtle,
                  borderWidth: 1.2,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* Submit Button */}
          <Button
            title={
              selectedRecipient && amount
                ? `Send ${currencySymbol} ${parseFloat(amount || '0').toLocaleString()} to @${selectedRecipient.username}`
                : 'Confirm & Send Money'
            }
            size="lg"
            loading={transferMutation.isPending}
            onPress={handleConfirmTransfer}
          />
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Radius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultsList: {
    marginTop: 6,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  miniAvatarInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  searchUsername: {
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  recipientAvatarInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  recipientNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  removeRecipientBtn: {
    padding: 6,
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: Radius.lg,
  },
  amountCurrencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInputText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  noteInput: {
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: Radius.lg,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  receiptCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '800',
  },
});
