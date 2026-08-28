import React, { useState } from 'react';
import {
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Flame,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react-native';
import { useNotifications, InAppAlert } from '../../context/NotificationsContext';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenWeeklyDigest?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  visible,
  onClose,
  onOpenWeeklyDigest,
}) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const {
    inAppAlerts,
    unreadCount,
    markAlertAsRead,
    markAllAlertsAsRead,
    dismissAlert,
    clearAllAlerts,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'bills' | 'digests'>('all');

  const filteredAlerts = inAppAlerts.filter((alert) => {
    if (activeFilter === 'unread') return !alert.read;
    if (activeFilter === 'bills') return alert.type === 'bill_due' || alert.type === 'loan_due';
    if (activeFilter === 'digests') return alert.type === 'daily_digest' || alert.type === 'weekly_digest';
    return true;
  });

  const getAlertMeta = (alert: InAppAlert) => {
    switch (alert.type) {
      case 'bill_due':
        return {
          icon: <CreditCard size={18} color="#EC4899" />,
          bg: 'rgba(236, 72, 153, 0.15)',
          badgeColor: '#EC4899',
          badgeText: 'Bill Due',
        };
      case 'loan_due':
        return {
          icon: <Calendar size={18} color="#D946EF" />,
          bg: 'rgba(217, 70, 239, 0.15)',
          badgeColor: '#D946EF',
          badgeText: 'Loan Due',
        };
      case 'budget_warning':
        return {
          icon: <Flame size={18} color="#F59E0B" />,
          bg: 'rgba(245, 158, 11, 0.15)',
          badgeColor: '#F59E0B',
          badgeText: 'Budget Alert',
        };
      case 'weekly_digest':
        return {
          icon: <TrendingUp size={18} color="#10B981" />,
          bg: 'rgba(16, 185, 129, 0.15)',
          badgeColor: '#10B981',
          badgeText: 'Weekly Debrief',
        };
      case 'daily_digest':
        return {
          icon: <Zap size={18} color="#3B82F6" />,
          bg: 'rgba(59, 130, 246, 0.15)',
          badgeColor: '#3B82F6',
          badgeText: 'Daily Summary',
        };
      default:
        return {
          icon: <Bell size={18} color={colors.primary} />,
          bg: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
          badgeColor: colors.primary,
          badgeText: 'Alert',
        };
    }
  };

  const handleAlertPress = (alert: InAppAlert) => {
    markAlertAsRead(alert.id);
    triggerHaptic.selection();

    if (alert.type === 'weekly_digest' && onOpenWeeklyDigest) {
      onClose();
      setTimeout(() => {
        onOpenWeeklyDigest();
      }, 250);
      return;
    }

    if (alert.actionUrl) {
      onClose();
      setTimeout(() => {
        router.push(alert.actionUrl as any);
      }, 250);
    }
  };

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.bellBox, { backgroundColor: colors.primaryLight }]}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                Digests, bill reminders & budget alerts
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action Bar (Mark all read / Clear all) */}
        <View style={[styles.actionBar, { borderBottomColor: colors.borderSubtle }]}>
          {/* Segmented Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'bills', label: 'Bills & Loans' },
              { id: 'digests', label: 'Digests' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setActiveFilter(tab.id as any);
                  }}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                      borderColor: isActive ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isActive ? '#FFFFFF' : colors.textSecondary, fontWeight: isActive ? '700' : '600' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {inAppAlerts.length > 0 && (
            <View style={styles.batchActionsRow}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={markAllAlertsAsRead}
                  style={styles.batchBtn}
                >
                  <CheckCheck size={14} color={colors.primary} />
                  <Text style={[styles.batchBtnText, { color: colors.primary }]}>Mark Read</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={clearAllAlerts}
                style={styles.batchBtn}
              >
                <Trash2 size={13} color={colors.textMuted} />
                <Text style={[styles.batchBtnText, { color: colors.textMuted }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* List of Alerts */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
        >
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <BellOff size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {activeFilter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'You will receive reminders for upcoming bills, budget limits, and weekly digests here.'}
              </Text>
            </View>
          ) : (
            filteredAlerts.map((alert) => {
              const meta = getAlertMeta(alert);
              const timeFormatted = new Date(alert.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={alert.id}
                  activeOpacity={0.75}
                  onPress={() => handleAlertPress(alert)}
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: alert.read
                        ? colors.surface
                        : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)'),
                      borderColor: alert.read ? colors.borderSubtle : colors.primary,
                      borderWidth: alert.read ? 1 : 1.5,
                    },
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <View style={styles.alertLeftInfo}>
                      <View style={[styles.alertIconBox, { backgroundColor: meta.bg }]}>
                        {meta.icon}
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: meta.badgeColor }]}>
                          {meta.badgeText}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeFormatted}</Text>
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        style={styles.dismissBtn}
                      >
                        <X size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.alertBody}>
                    <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                      {alert.message}
                    </Text>
                  </View>

                  {(alert.actionTitle || alert.actionUrl) && (
                    <View style={[styles.alertFooter, { borderTopColor: colors.borderSubtle }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.actionPromptText, { color: colors.primary }]}>
                          {alert.actionTitle || 'View Details'}
                        </Text>
                        <ExternalLink size={12} color={colors.primary} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bellBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  unreadCountBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  filterScroll: {
    gap: 8,
    paddingRight: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  batchActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    paddingTop: 4,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  batchBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  alertLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dismissBtn: {
    padding: 4,
  },
  alertBody: {
    marginVertical: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 17,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: '700',
  },
});