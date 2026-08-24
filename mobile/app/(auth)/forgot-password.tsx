import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KeyRound, Lock, User as UserIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Radius, Spacing, Typography } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestToken = async () => {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ username: username.trim() });
      setMessage(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setStep('reset');
    } catch (e: any) {
      setError(e.message || 'Failed to generate password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim() || !newPassword) {
      setError('Token and new password are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ token: resetToken.trim(), password: newPassword });
      Alert.alert('Success', 'Password has been reset! Please sign in with your new password.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      setError(e.message || 'Invalid or expired reset token.');
    } finally {
      setLoading(false);
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
              <KeyRound size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'request' ? 'Forgot Password' : 'Reset Password'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'request'
                ? 'Enter your username to receive reset instructions'
                : 'Enter your reset token and new password'}
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

            {step === 'request' ? (
              <>
                <Input
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  icon={<UserIcon size={18} color={colors.textMuted} />}
                />

                <Button
                  title="Send Reset Instructions"
                  size="lg"
                  loading={loading}
                  onPress={handleRequestToken}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            ) : (
              <>
                <Input
                  label="Reset Token"
                  placeholder="Paste your reset token"
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                  icon={<KeyRound size={18} color={colors.textMuted} />}
                />

                <Input
                  label="New Password"
                  placeholder="Enter min. 6 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  isPassword
                  icon={<Lock size={18} color={colors.textMuted} />}
                />

                <Button
                  title="Update Password"
                  size="lg"
                  loading={loading}
                  onPress={handleResetPassword}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
  backLink: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
