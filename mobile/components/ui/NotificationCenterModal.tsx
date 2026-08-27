import React, { useState, useMemo } from 'react';
import {
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  PieChart,
  Repeat,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications, InAppAlert } from '../../context/NotificationsContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'bills' | 'budgets' | 'system';

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  visible,
  onClose,
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

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredAlerts = useMemo(() => {
    switch (activeTab) {
      case 'bills':
        return inAppAlerts.filter((a) => a.type === 'bill_due');
      case 'budgets':
        return inAppAlerts.filter((a) => a.type === 'budget_warning');
      case 'system':
        return inAppAlerts.filter((a) => a.type === 'daily_digest' || a.type === 'general' || a.type === 'test');
      default:
        return inAppAlerts;
    }
  }, [inAppAlerts, activeTab]);

  const handleAction = (alert: InAppAlert) => {
    triggerHaptic.selection();
    markAlertAsRead(alert.id);
    onClose();

    if (alert.actionUrl) {
      router.push(alert.actionUrl as any);
    } else if (alert.type === 'bill_due') {
      router.push('/(app)/subscriptions' as any);
    } else if (alert.type === 'budget_warning') {
      router.push('/(app)/budgets' as any);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'bill_due':
        return <Repeat size={18} color="#EC4899" />;
      case 'budget_warning':
        return <PieChart size={18} color="#F59E0B" />;
      case 'daily_digest':
        return <Clock size={18} color="#3B82F6" />;
      default:
        return <Bell size={18} color="#6366F1" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'bill_due':
        return 'rgba(236, 72, 153, 0.15)';
      case 'budget_warning':
        return 'rgba(245, 158, 11, 0.15)';
      case 'daily_digest':
        return 'rgba(59, 130, 246, 0.15)';
      default:
        return 'rgba(99, 102, 241, 0.15)';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.bellBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Bell size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Notification Center</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {inAppAlerts.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={markAllAlertsAsRead}
                      style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <CheckCheck size={16} color="#10B981" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={clearAllAlerts}
                    style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.light();
                  onClose();
                }}
                style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabsRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'bills', label: 'Bills 🔔' },
              { id: 'budgets', label: 'Budgets ⚠️' },
              { id: 'system', label: 'System' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    triggerHaptic.selection();
                    setActiveTab(tab.id as FilterTab);
                  }}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alerts Scrollable Feed */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceElevated }]}>
                  <Sparkles size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {activeTab === 'all'
                    ? "You're all set! Upcoming bill reminders and budget alerts will appear here."
                    : `No ${activeTab} alerts recorded right now.`}
                </Text>
              </View>
            ) : (
              filteredAlerts.map((alert) => {
                const actionText =
                  alert.actionTitle ||
                  (alert.type === 'bill_due'
                    ? 'View Bill'
                    : alert.type === 'budget_warning'
                    ? 'View Budget'
                    : undefined);

                return (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor: alert.read ? colors.surface : colors.surfaceElevated,
                        borderColor: alert.read ? colors.borderSubtle : colors.primary,
                      },
                    ]}
                  >
                    <View style={styles.alertTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.iconBox, { backgroundColor: getAlertBg(alert.type) }]}>
                          {getAlertIcon(alert.type)}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.alertTitle, { color: colors.text }]}>
                            {alert.title}
                          </Text>
                          <Text style={[styles.alertTime, { color: colors.textMuted }]}>
                            {formatTimestamp(alert.timestamp)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => dismissAlert(alert.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.dismissBtn}
                      >
                        <X size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                      {alert.message}
                    </Text>

                    {actionText && (
                      <View style={styles.actionFooter}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleAction(alert)}
                          style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                            {actionText}
                          </Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    maxHeight: '82%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  bellBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  sub: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
    gap: 8,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  alertCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 6,
  },
  alertTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  dismissBtn: {
    padding: 4,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});