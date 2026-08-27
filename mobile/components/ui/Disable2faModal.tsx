import React, { useState } from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ShieldOff, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { settingsApi } from '../../services/api';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from './Button';
import { Input } from './Input';
import { Radius, Spacing } from '../../constants/theme';

interface Disable2faModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const Disable2faModal: React.FC<Disable2faModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDisable = async () => {
    if (!password) {
      triggerHaptic.error();
      setError('Please enter your account password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await settingsApi.disable2FA({ password });
      triggerHaptic.success();
      onSuccess();
      onClose();
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Incorrect password. Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBadge, { backgroundColor: colors.dangerLight }]}>
              <ShieldOff size={16} color={colors.danger} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Disable 2FA</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Turn off Two-Factor Authentication
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.warnCard, { backgroundColor: colors.dangerLight }]}>
            <AlertTriangle size={18} color={colors.danger} />
            <Text style={[styles.warnText, { color: colors.danger }]}>
              Disabling 2FA will remove Google Authenticator protection and backup recovery codes from your account.
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Confirm Account Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setError('');
            }}
            secureTextEntry
          />

          <Button
            title="Deactivate 2FA"
            variant="danger"
            loading={loading}
            onPress={handleDisable}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.md,
    gap: 12,
  },
  warnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  warnText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  errorBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
});