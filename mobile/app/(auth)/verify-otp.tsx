import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { tempToken } = useLocalSearchParams<{ tempToken: string }>();
  const { colors, isDark } = useTheme();
  const { verify2FA } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    triggerHaptic.medium();

    if (!code.trim() || code.length !== 6) {
      triggerHaptic.error();
      setError('Please enter the 6-digit security code');
      return;
    }

    if (!tempToken) {
      triggerHaptic.error();
      setError('Session expired. Please log in again.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verify2FA(code.trim(), tempToken);
      triggerHaptic.success();
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Invalid or expired 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempToken) return;
    triggerHaptic.selection();
    setResending(true);
    setError('');
    try {
      const res = await authApi.resend2FA({ tempToken });
      triggerHaptic.success();
      setMessage(res.message);
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <ShieldCheck size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Two-Factor Security
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the 6-digit verification code sent to your registered email
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            {message ? (
              <View style={[styles.messageBox, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.messageText, { color: colors.success }]}>
                  {message}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="6-Digit Code"
              placeholder="000000"
              value={code}
              onChangeText={(val) => {
                setCode(val);
                if (val.length === 6) {
                  triggerHaptic.selection();
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.codeInput}
            />

            <Button
              title="Verify Security Code"
              size="lg"
              loading={loading}
              onPress={handleVerify}
              style={{ marginTop: Spacing.sm }}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleResend}
              disabled={resending}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, { color: colors.primary }]}>
                {resending ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.replace('/(auth)/login');
            }}
            style={styles.backLink}
          >
            <Text style={[styles.backText, { color: colors.textSecondary }]}>
              ← Back to Sign In
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleMedium,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
  },
  messageBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backLink: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
