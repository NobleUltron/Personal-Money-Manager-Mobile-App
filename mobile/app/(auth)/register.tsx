import React, { useState, useMemo } from 'react';
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
import { Lock, Mail, User as UserIcon, Wallet, ShieldCheck, Sparkles, Check, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

const CURRENCY_OPTIONS = [
  { code: 'UGX', flag: '🇺🇬', name: 'Shilling' },
  { code: 'USD', flag: '🇺🇸', name: 'Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'KES', flag: '🇰🇪', name: 'KSh' },
  { code: 'GBP', flag: '🇬🇧', name: 'Pound' },
  { code: 'TZS', flag: '🇹🇿', name: 'TSh' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { colors, isDark } = useTheme();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '#94A3B8' };
    if (password.length < 6) return { level: 1, label: 'Too short (min. 6)', color: '#EF4444' };
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 3, label: 'Strong password', color: '#10B981' };
    }
    return { level: 2, label: 'Good password', color: '#F59E0B' };
  }, [password]);

  const handleRegister = async () => {
    triggerHaptic.medium();

    if (!username.trim() || !password) {
      triggerHaptic.error();
      setError('Username and password are required');
      return;
    }

    if (password.length < 6) {
      triggerHaptic.error();
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        currency,
        currency_symbol: currency,
      });
      triggerHaptic.success();
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Registration failed. Please try a different username.');
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
              Create Account
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
              Get Started
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Create your secure financial management vault
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Username *"
              placeholder="Choose a unique username"
              value={username}
              onChangeText={(val) => {
                setError('');
                setUsername(val);
              }}
              autoCapitalize="none"
              icon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Email (Optional)"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={(val) => {
                setError('');
                setEmail(val);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              icon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password *"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={(val) => {
                setError('');
                setPassword(val);
              }}
              isPassword
              icon={<Lock size={18} color={colors.textMuted} />}
            />

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthMeterRow}>
                  {[1, 2, 3].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            passwordStrength.level >= step
                              ? passwordStrength.color
                              : isDark ? '#1E293B' : '#E2E8F0',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            {/* Currency selector chips */}
            <View style={{ marginTop: Spacing.xs, marginBottom: Spacing.md }}>
              <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>
                Preferred Base Currency
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRow}>
                {CURRENCY_OPTIONS.map((curr) => {
                  const isSelected = currency === curr.code;
                  return (
                    <TouchableOpacity
                      key={curr.code}
                      activeOpacity={0.7}
                      onPress={() => {
                        triggerHaptic.selection();
                        setCurrency(curr.code);
                      }}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)')
                            : (isDark ? '#0B0F19' : colors.surfaceElevated),
                          borderColor: isSelected
                            ? colors.primary
                            : (isDark ? '#1E293B' : colors.borderSubtle),
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 13 }}>{curr.flag}</Text>
                      <Text
                        style={[
                          styles.currencyText,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {curr.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Button
              title="Create Account"
              size="lg"
              variant="primary"
              loading={loading}
              onPress={handleRegister}
              style={{ marginTop: Spacing.xs }}
            />
          </View>

          {/* Footer Login Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                router.push('/(auth)/login');
              }}
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                Sign In
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
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
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
  strengthContainer: {
    marginBottom: Spacing.sm,
    gap: 4,
  },
  strengthMeterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
  currencyLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 6,
  },
  currencyText: {
    fontWeight: '800',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
  },
});