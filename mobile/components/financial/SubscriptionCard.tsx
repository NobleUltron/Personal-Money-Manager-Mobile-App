import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Repeat, AlertCircle, CheckCircle2, ChevronRight, Landmark, Clock, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Subscription } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing } from '../../constants/theme';

interface SubscriptionCardProps {
  subscription: Subscription;
  currencySymbol?: string;
  onPress?: () => void;
  onQuickRenew?: () => void;
}

const SERVICE_PRESETS: Record<string, { icon: string; bg: string; color: string }> = {
  netflix: { icon: '🎬', bg: 'rgba(229, 9, 20, 0.15)', color: '#E50914' },
  spotify: { icon: '🎵', bg: 'rgba(29, 185, 84, 0.15)', color: '#1DB954' },
  youtube: { icon: '▶️', bg: 'rgba(255, 0, 0, 0.15)', color: '#FF0000' },
  chatgpt: { icon: '🤖', bg: 'rgba(16, 163, 127, 0.15)', color: '#10A37F' },
  openai: { icon: '🤖', bg: 'rgba(16, 163, 127, 0.15)', color: '#10A37F' },
  apple: { icon: '🍎', bg: 'rgba(162, 170, 173, 0.15)', color: '#A2AAAD' },
  icloud: { icon: '☁️', bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
  amazon: { icon: '📦', bg: 'rgba(255, 153, 0, 0.15)', color: '#FF9900' },
  gym: { icon: '🏋️', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' },
  fitness: { icon: '🏋️', bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' },
  internet: { icon: '🌐', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' },
  wifi: { icon: '📶', bg: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' },
  rent: { icon: '🏠', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' },
  electricity: { icon: '⚡', bg: 'rgba(234, 179, 8, 0.15)', color: '#EAB308' },
  power: { icon: '⚡', bg: 'rgba(234, 179, 8, 0.15)', color: '#EAB308' },
  water: { icon: '💧', bg: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' },
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  currencySymbol = 'UGX',
  onPress,
  onQuickRenew,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  // Match preset or default
  const lowerName = subscription.name.toLowerCase();
  const matchedKey = Object.keys(SERVICE_PRESETS).find((k) => lowerName.includes(k));
  const preset = matchedKey ? SERVICE_PRESETS[matchedKey] : { icon: '🔁', bg: 'rgba(99, 102, 241, 0.15)', color: colors.primary };

  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(subscription.next_due_date);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let statusBadgeColor = '#10B981';
  let statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
  let statusText = `In ${diffDays} days`;

  if (diffDays < 0) {
    statusBadgeColor = '#EF4444';
    statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
    statusText = `${Math.abs(diffDays)}d Overdue`;
  } else if (diffDays === 0) {
    statusBadgeColor = '#EF4444';
    statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
    statusText = 'Due Today';
  } else if (diffDays === 1) {
    statusBadgeColor = '#F59E0B';
    statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
    statusText = 'Due Tomorrow';
  } else if (diffDays <= 3) {
    statusBadgeColor = '#F59E0B';
    statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
    statusText = `In ${diffDays} days`;
  }

  // Formatted Due Date
  const dueDateStr = due.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card
      onPress={() => {
        triggerHaptic.selection();
        onPress?.();
      }}
      style={styles.card}
    >
      {/* Top Row: Service Logo + Name + Amount */}
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconBox, { backgroundColor: preset.bg }]}>
            <Text style={{ fontSize: 20 }}>{preset.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {subscription.name}
            </Text>
            <View style={styles.accountRow}>
              <Landmark size={12} color={colors.textSecondary} />
              <Text style={[styles.accountName, { color: colors.textSecondary }]} numberOfLines={1}>
                {subscription.account?.name || 'Main Account'} • {subscription.category || 'General'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rightAmountBox}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatAmount(subscription.amount, currencySymbol)}
          </Text>
          <Text style={[styles.frequencyPill, { color: colors.primary }]}>
            /{subscription.frequency === 'yearly' ? 'yr' : subscription.frequency === 'weekly' ? 'wk' : 'mo'}
          </Text>
        </View>
      </View>

      {/* Middle Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

      {/* Bottom Row: Due Date + Status Badge + Action */}
      <View style={styles.bottomRow}>
        <View style={styles.dueDateBox}>
          <Calendar size={13} color={colors.textMuted} />
          <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
            {dueDateStr}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
          <Clock size={11} color={statusBadgeColor} />
          <Text style={[styles.statusText, { color: statusBadgeColor }]}>
            {statusText}
          </Text>
        </View>

        {onQuickRenew && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic.medium();
              onQuickRenew();
            }}
            style={[styles.renewBtn, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}
          >
            <Repeat size={12} color={colors.primary} />
            <Text style={[styles.renewBtnText, { color: colors.primary }]}>Renew</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  accountName: {
    fontSize: 11,
    fontWeight: '500',
  },
  rightAmountBox: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  frequencyPill: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
