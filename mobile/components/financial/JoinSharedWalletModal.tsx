import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Clipboard as ClipboardIcon, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { accountsApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Account } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface JoinSharedWalletModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (account: Account) => void;
}

export const JoinSharedWalletModal: React.FC<JoinSharedWalletModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [joinedAccount, setJoinedAccount] = useState<Account | null>(null);

  const joinMutation = useMutation<Account, any, string>({
    mutationFn: (code: string) => accountsApi.joinAccount(code),
    onSuccess: (account: Account) => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setJoinedAccount(account);
      onSuccess?.(account);
    },
    onError: (err: any) => {
      triggerHaptic.error();
      setError(err.message || 'Invalid or expired invitation code');
    },
  });

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const cleaned = text.trim().toUpperCase();
      if (cleaned) {
        setInviteCode(cleaned);
        setError('');
        triggerHaptic.selection();
      }
    } catch {
      // Ignored
    }
  };

  const handleJoin = () => {
    const cleaned = inviteCode.trim().toUpperCase();
    if (!cleaned) {
      setError('Please enter a valid invitation code');
      triggerHaptic.error();
      return;
    }

    setError('');
    joinMutation.mutate(cleaned);
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    setJoinedAccount(null);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Join Shared Wallet">
      {joinedAccount ? (
        <View style={styles.successContainer}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.successLight }]}>
            <CheckCircle2 size={40} color={colors.success} />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>
            You're In! 🎉
          </Text>

          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            You have joined <Text style={{ fontWeight: '800', color: colors.text }}>{joinedAccount.name}</Text>. You can now view and record shared household transactions.
          </Text>

          <Button
            title="Open Wallet"
            variant="primary"
            size="lg"
            onPress={handleClose}
            style={{ width: '100%', marginTop: Spacing.lg }}
          />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Top Brand Banner */}
          <View style={styles.banner}>
            <View style={[styles.bannerIconBox, { backgroundColor: colors.primaryLight }]}>
              <Users size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                Have an Invite Code?
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                Enter the 6-8 character code from your family member, partner, or roommate.
              </Text>
            </View>
          </View>

          {/* Code Input Box */}
          <View style={styles.inputWrapper}>
            <TextInput
              value={inviteCode}
              onChangeText={(val) => {
                setInviteCode(val.toUpperCase());
                setError('');
              }}
              placeholder="e.g. FAM-8492"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              style={[
                styles.codeInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: error ? colors.danger : colors.border,
                },
              ]}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePaste}
              style={[styles.pasteBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }]}
            >
              <ClipboardIcon size={12} color={colors.primary} />
              <Text style={[styles.pasteBadgeText, { color: colors.primary }]}>Paste</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {/* Action Button */}
          <Button
            title="Join Shared Wallet"
            variant="primary"
            size="lg"
            loading={joinMutation.isPending}
            onPress={handleJoin}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: Spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  codeInput: {
    height: 56,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  pasteBadge: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  pasteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
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
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
});