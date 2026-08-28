import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Copy,
  Share2,
  Crown,
  Shield,
  Eye,
  Trash2,
  LogOut,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { accountsApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/haptics';
import { Account, AccountMember } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface ManageMembersModalProps {
  visible: boolean;
  onClose: () => void;
  account: Account | null;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  visible,
  onClose,
  account,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState<AccountMember | null>(null);

  const accountId = account?.id || '';
  const isOwner = account?.is_owner ?? (account?.user_role === 'OWNER');

  // Fetch members and invitations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['account-members', accountId],
    queryFn: () => accountsApi.getMembers(accountId),
    enabled: visible && !!accountId,
  });

  // Create Invitation mutation
  const inviteMutation = useMutation({
    mutationFn: () => accountsApi.createInvitation(accountId, { role: inviteRole }),
    onSuccess: (invitation) => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['account-members', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Invite Error', err.message || 'Failed to create invite code');
    },
  });

  // Update Member Role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'EDITOR' | 'VIEWER' }) =>
      accountsApi.updateMemberRole(accountId, memberId, role),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['account-members', accountId] });
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.message || 'Failed to update member role');
    },
  });

  // Remove Member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => accountsApi.removeMember(accountId, memberId),
    onSuccess: () => {
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['account-members', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedMemberToRemove(null);
      if (!isOwner) {
        onClose();
      }
    },
    onError: (err: any) => {
      triggerHaptic.error();
      Alert.alert('Error', err.message || 'Failed to remove member');
    },
  });

  const latestInvitation = data?.active_invitations?.[0];

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    triggerHaptic.selection();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareInvite = async (code: string) => {
    try {
      triggerHaptic.selection();
      await Share.share({
        message: `Join my shared wallet "${account?.name}" on Personal Money Manager!\n\nInvite Code: ${code}\n\nDownload the app and enter this code in Accounts > Join Shared Wallet.`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Members • ${account?.name || 'Wallet'}`}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading members...
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          {/* 1. Shareable Invite Code Section (For Owner) */}
          {isOwner && (
            <Card style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <View style={[styles.inviteIconBox, { backgroundColor: colors.primaryLight }]}>
                  <UserPlus size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inviteTitle, { color: colors.text }]}>
                    Invite Partner or Roommate
                  </Text>
                  <Text style={[styles.inviteSubtitle, { color: colors.textSecondary }]}>
                    Share a 6-digit code for joint expense tracking
                  </Text>
                </View>
              </View>

              {/* Role Picker for Invite */}
              <View style={styles.roleToggleRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setInviteRole('EDITOR');
                  }}
                  style={[
                    styles.roleToggleBtn,
                    inviteRole === 'EDITOR' && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                    inviteRole !== 'EDITOR' && {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Shield size={14} color={inviteRole === 'EDITOR' ? '#FFFFFF' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.roleToggleText,
                      { color: inviteRole === 'EDITOR' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    Editor (Can Add)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setInviteRole('VIEWER');
                  }}
                  style={[
                    styles.roleToggleBtn,
                    inviteRole === 'VIEWER' && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                    inviteRole !== 'VIEWER' && {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Eye size={14} color={inviteRole === 'VIEWER' ? '#FFFFFF' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.roleToggleText,
                      { color: inviteRole === 'VIEWER' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    Viewer (Read Only)
                  </Text>
                </TouchableOpacity>
              </View>

              {latestInvitation ? (
                <View style={[styles.codeDisplayBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)', borderColor: colors.primary }]}>
                  <View>
                    <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Active Invite Code</Text>
                    <Text style={[styles.codeText, { color: colors.primary }]}>
                      {latestInvitation.inviteCode}
                    </Text>
                    <Text style={[styles.codeExpiry, { color: colors.textMuted }]}>
                      Expires in 7 days • Role: {latestInvitation.role}
                    </Text>
                  </View>

                  <View style={styles.codeActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCopyCode(latestInvitation.inviteCode)}
                      style={[styles.codeActionBtn, { backgroundColor: colors.surface }]}
                    >
                      {copiedCode ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.primary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleShareInvite(latestInvitation.inviteCode)}
                      style={[styles.codeActionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Share2 size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Button
                  title="Generate Invite Code"
                  variant="primary"
                  size="md"
                  loading={inviteMutation.isPending}
                  onPress={() => inviteMutation.mutate()}
                  style={{ marginTop: Spacing.sm }}
                />
              )}
            </Card>
          )}

          {/* 2. Active Members List */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACTIVE MEMBERS ({1 + (data?.members?.length || 0)})
          </Text>

          {/* Owner Row */}
          {data?.owner && (
            <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                {data.owner.profile_picture ? (
                  <Image source={{ uri: data.owner.profile_picture }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                    {data.owner.username.slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {data.owner.username} {data.owner.id === user?.id && '(You)'}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                  {data.owner.email || 'Wallet Owner'}
                </Text>
              </View>

              <View style={[styles.roleBadge, { backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
                <Crown size={12} color="#F59E0B" />
                <Text style={[styles.roleBadgeText, { color: '#F59E0B' }]}>Owner</Text>
              </View>
            </View>
          )}

          {/* Shared Members */}
          {data?.members?.map((member: AccountMember) => (
            <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                {member.profile_picture ? (
                  <Image source={{ uri: member.profile_picture }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.text }]}>
                    {member.username.slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.username} {member.id === user?.id && '(You)'}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                  {member.email || `Joined ${new Date(member.joined_at || '').toLocaleDateString()}`}
                </Text>
              </View>

              {/* Role Selector or Badge */}
              {isOwner ? (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const nextRole = member.role === 'EDITOR' ? 'VIEWER' : 'EDITOR';
                      updateRoleMutation.mutate({ memberId: member.id, role: nextRole });
                    }}
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: member.role === 'EDITOR' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        borderColor: member.role === 'EDITOR' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(148, 163, 184, 0.3)',
                      },
                    ]}
                  >
                    {member.role === 'EDITOR' ? (
                      <Shield size={12} color={colors.primary} />
                    ) : (
                      <Eye size={12} color={colors.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: member.role === 'EDITOR' ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {member.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSelectedMemberToRemove(member)}
                    style={styles.removeBtn}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: member.role === 'EDITOR' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                      borderColor: member.role === 'EDITOR' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(148, 163, 184, 0.3)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: member.role === 'EDITOR' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {member.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* Leave Wallet Button (For Non-Owners) */}
          {!isOwner && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setConfirmLeaveVisible(true)}
              style={[styles.leaveWalletBtn, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
            >
              <LogOut size={16} color={colors.danger} />
              <Text style={[styles.leaveWalletText, { color: colors.danger }]}>
                Leave this Shared Wallet
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Dialog: Confirm Member Removal */}
      <ConfirmDialog
        visible={!!selectedMemberToRemove}
        onClose={() => setSelectedMemberToRemove(null)}
        onConfirm={() => {
          if (selectedMemberToRemove) {
            removeMemberMutation.mutate(selectedMemberToRemove.id);
          }
        }}
        title="Remove Member"
        message={`Are you sure you want to remove ${selectedMemberToRemove?.username} from "${account?.name}"? They will lose access immediately.`}
        confirmText="Remove Member"
        type="danger"
      />

      {/* Dialog: Confirm Leave Wallet */}
      <ConfirmDialog
        visible={confirmLeaveVisible}
        onClose={() => setConfirmLeaveVisible(false)}
        onConfirm={() => {
          setConfirmLeaveVisible(false);
          if (user?.id) {
            removeMemberMutation.mutate(user.id);
          }
        }}
        title="Leave Shared Wallet"
        message={`Are you sure you want to leave "${account?.name}"? You will need an invite code to rejoin.`}
        confirmText="Leave Wallet"
        type="danger"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inviteCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inviteIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  inviteSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  roleToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codeDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  codeExpiry: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeActionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 6,
  },
  leaveWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  leaveWalletText: {
    fontSize: 13,
    fontWeight: '700',
  },
});