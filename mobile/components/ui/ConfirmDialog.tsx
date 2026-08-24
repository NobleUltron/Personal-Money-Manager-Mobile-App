import React from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

export interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
}) => {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle size={24} color="#F59E0B" strokeWidth={2.4} />,
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          buttonBg: '#F59E0B',
          buttonText: '#FFFFFF',
        };
      case 'info':
        return {
          icon: <Info size={24} color="#6366F1" strokeWidth={2.4} />,
          bg: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.12)',
          buttonBg: '#6366F1',
          buttonText: '#FFFFFF',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={24} color="#10B981" strokeWidth={2.4} />,
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
          buttonBg: '#10B981',
          buttonText: '#FFFFFF',
        };
      case 'danger':
      default:
        return {
          icon: <Trash2 size={24} color="#EF4444" strokeWidth={2.4} />,
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
          buttonBg: '#EF4444',
          buttonText: '#FFFFFF',
        };
    }
  };

  const config = getTypeConfig();

  const handleConfirm = () => {
    if (type === 'danger') {
      triggerHaptic.warning();
    } else {
      triggerHaptic.selection();
    }
    onConfirm();
  };

  const handleCancel = () => {
    triggerHaptic.light();
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialogContainer,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E2E8F0',
                  borderWidth: 1.5,
                },
              ]}
            >
              {/* Icon Bubble */}
              <View style={[styles.iconBubble, { backgroundColor: config.bg }]}>
                {config.icon}
              </View>

              {/* Title & Message */}
              <Text style={[styles.dialogTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
                {message}
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  disabled={loading}
                  onPress={handleCancel}
                  style={[
                    styles.actionBtn,
                    styles.cancelBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={loading}
                  onPress={handleConfirm}
                  style={[
                    styles.actionBtn,
                    styles.confirmBtn,
                    {
                      backgroundColor: config.buttonBg,
                      shadowColor: config.buttonBg,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.confirmBtnText, { color: config.buttonText }]}>
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 12,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
