import React, { useState } from 'react';
import {
  useWindowDimensions,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, User as UserIcon, Wallet, ShieldCheck, Sparkles, Fingerprint, ScanFace } from 'lucide-react-native';
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5', '#3730A3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <Wallet size={34} color="#FFFFFF" strokeWidth={2.2} />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              Personal Money Manager
            </Text>
            
            <View style={[styles.securityBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <ShieldCheck size={12} color="#10B981" />
              <Text style={styles.securityBadgeText}>256-bit AES Encrypted Vault</Text>
            </View>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Sign in to unlock your financial portfolio
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={(val) => {
                setError('');
                setUsername(val);
              }}
              autoCapitalize="none"
              icon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(val) => {
                setError('');
                setPassword(val);
              }}
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
              variant="primary"
              loading={loading}
              onPress={handleLogin}
              style={{ marginTop: Spacing.xs }}
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
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
  },
});