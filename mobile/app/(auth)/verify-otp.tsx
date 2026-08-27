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
import { ShieldCheck, KeyRound, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OtpPinInput } from '../../components/ui/OtpPinInput';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { tempToken, method } = useLocalSearchParams<{ tempToken: string; method?: string }>();
  const { colors, isDark } = useTheme();
  const { verify2FA } = useAuth();

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState('');
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isTotp = method === 'totp' || !method; // Default to TOTP

  const handleVerify = async (codeToSubmit?: string) => {
    const rawCode = codeToSubmit !== undefined ? codeToSubmit : (useBackupCode ? backupCodeInput : code);
    const cleanedCode = rawCode.trim().replace(/\s+/g, '');

    triggerHaptic.medium();

    if (!cleanedCode) {
      triggerHaptic.error();
      setError(useBackupCode ? 'Please enter your recovery backup code' : 'Please enter the 6-digit code');
      return;
    }

    if (!useBackupCode && cleanedCode.length !== 6) {
      triggerHaptic.error();
      setError('Please enter all 6 digits');
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
      await verify2FA(cleanedCode, tempToken);
      triggerHaptic.success();
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || (useBackupCode ? 'Invalid recovery backup code' : 'Invalid or expired 2FA code.'));
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
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              {useBackupCode ? (
                <KeyRound size={32} color={colors.primary} />
              ) : (
                <ShieldCheck size={32} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {useBackupCode ? 'Emergency Recovery' : 'Two-Factor Security'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {useBackupCode
                ? 'Enter one of your 8-character backup recovery codes'
                : 'Enter the 6-digit rolling code from your Authenticator App'}
            </Text>
          </View>

          {/* Form Card */}
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
                <AlertTriangle size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            {!useBackupCode ? (
              <>
                <OtpPinInput
                  value={code}
                  onChange={(val) => {
                    setCode(val);
                    setError('');
                  }}
                  onComplete={(completedCode) => handleVerify(completedCode)}
                  disabled={loading}
                />

                <Button
                  title="Verify Security Code"
                  size="lg"
                  loading={loading}
                  onPress={() => handleVerify()}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            ) : (
              <>
                <Input
                  label="Emergency Backup Code"
                  placeholder="e.g. A7B2-9F41"
                  value={backupCodeInput}
                  onChangeText={(val) => {
                    setBackupCodeInput(val);
                    setError('');
                  }}
                  autoCapitalize="characters"
                  maxLength={12}
                  style={styles.backupInput}
                />

                <Button
                  title="Verify Backup Code"
                  size="lg"
                  loading={loading}
                  onPress={() => handleVerify()}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            )}

            {/* Switch between Authenticator and Backup Code */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setUseBackupCode(!useBackupCode);
                setError('');
                setMessage('');
              }}
              style={styles.switchModeBtn}
            >
              <Text style={[styles.switchModeText, { color: colors.primary }]}>
                {useBackupCode
                  ? '← Use 6-Digit Authenticator App Code'
                  : 'Lost phone? Use an Emergency Backup Code'}
              </Text>
            </TouchableOpacity>

            {!isTotp && !useBackupCode && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleResend}
                disabled={resending}
                style={styles.resendButton}
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>
                  {resending ? 'Sending...' : 'Resend Email Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Back to Sign In Link */}
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
  backupInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  switchModeBtn: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingVertical: 4,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  resendText: {
    fontSize: 12,
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