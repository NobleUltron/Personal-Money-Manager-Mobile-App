import React from 'react';
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
import { Radius, Spacing } from '../../constants/theme';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

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
  } = useNotifications();

  const handleAction = (alert: InAppAlert) => {
    triggerHaptic.selection();
    markAlertAsRead(alert.id);
    onClose();
    if (alert.actionUrl) {
      router.push(alert.actionUrl as any);
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
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.bellBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Bell size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {inAppAlerts.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={markAllAlertsAsRead}
                  style={[styles.actionHeaderBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <CheckCheck size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Alerts List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {inAppAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceElevated }]}>
                  <Bell size={36} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Notifications
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Upcoming bill renewals, budget alerts, and spending digests will appear here.
                </Text>
              </View>
            ) : (
              inAppAlerts.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: item.read ? colors.surfaceElevated : isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
                      borderColor: item.read ? colors.border : colors.primary,
                    },
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <View style={[styles.typeIconBox, { backgroundColor: getAlertBg(item.type) }]}>
                      {getAlertIcon(item.type)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.alertTime, { color: colors.textMuted }]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => dismissAlert(item.id)}
                      style={{ padding: 4 }}
                    >
                      <X size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                    {item.message}
                  </Text>

                  {item.actionUrl && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleAction(item)}
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.actionBtnText}>{item.actionTitle || 'View'}</Text>
                      <ChevronRight size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
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
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    maxHeight: '80%',
    minHeight: '45%',
    overflow: 'hidden',
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
    gap: 10,
    paddingBottom: Spacing.xxl,
  },
  alertCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 6,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 44,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 44,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    gap: 4,
    marginTop: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
