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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail, User as UserIcon, Wallet, Coins } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            <LinearGradient
              colors={Gradients.primary as any}
              style={styles.logoBadge}
            >
              <Wallet size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              Create Account
            </Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
              Start tracking your income, expenses & loans
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
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Username *"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              icon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Email (Optional)"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              icon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password *"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
              icon={<Lock size={18} color={colors.textMuted} />}
            />

            {/* Currency selector chips */}
            <View style={{ marginBottom: Spacing.md }}>
              <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>
                Preferred Currency
              </Text>
              <View style={styles.currencyRow}>
                {['UGX', 'USD', 'EUR', 'KES'].map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.selection();
                      setCurrency(curr);
                    }}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor:
                          currency === curr ? colors.primary : colors.surfaceElevated,
                        borderColor: currency === curr ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        { color: currency === curr ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Create Account"
              size="lg"
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
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appName: {
    ...Typography.titleMedium,
    fontSize: 22,
    textAlign: 'center',
  },
  appTagline: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
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
  currencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontWeight: '700',
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
