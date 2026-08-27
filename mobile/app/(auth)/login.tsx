import React, { useState } from 'react';
import { useWindowDimensions, Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, User as UserIcon, Wallet } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { colors, isDark } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    triggerHaptic.medium();

    if (!username.trim() || !password) {
      triggerHaptic.error();
      setError('Please enter both username and password');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.requires2FA && result.tempToken) {
        triggerHaptic.selection();
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { tempToken: result.tempToken, method: result.method || 'totp' },
        });
      } else {
        triggerHaptic.success();
      }
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const desktopScrollContent = isDesktop ? { maxWidth: 500, alignSelf: 'center', width: '100%', paddingTop: 60 } : {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >

        <ScrollView
          contentContainerStyle={[styles.scrollContent, desktopScrollContent as any]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={Gradients.primary as any}
              style={styles.logoBadge}
            >
              <Wallet size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              Personal Money Manager
            </Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
              SaaS Wealth & Expense Tracker
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
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Sign in to manage your financial portfolio
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              icon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              icon={<Lock size={18} color={colors.textMuted} />}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                router.push('/(auth)/forgot-password');
              }}
              style={styles.forgotButton}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={{ marginTop: Spacing.sm }}
            />
          </View>

          {/* Footer Register Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                router.push('/(auth)/register');
              }}
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
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
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: Radius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    ...Typography.titleMedium,
    fontSize: 24,
    textAlign: 'center',
  },
  appTagline: {
    ...Typography.bodyMedium,
    marginTop: 4,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
  },
  welcomeTitle: {
    ...Typography.titleSmall,
    fontSize: 20,
  },
  welcomeSubtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
    marginBottom: Spacing.lg,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
