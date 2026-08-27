import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Coins,
  Camera,
  Download,
  KeyRound,
  LogOut,
  Moon,
  Repeat,
  ShieldCheck,
  Sun,
  User as UserIcon,
  HandCoins,
  Target,
  BarChart3,
  ChevronRight,
  Upload,
  Fingerprint,
  ScanFace,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  Edit3,
  Check,
  Search,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Info,
  Timer,
  Shield,
  Bell,
  Clock,
} from 'lucide-react-native';
import { useNotifications } from '../../context/NotificationsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBiometrics } from '../../context/BiometricsContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { settingsApi } from '../../services/api';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AvatarPickerModal } from '../../components/ui/AvatarPickerModal';
import { CurrencyConversionModal } from '../../components/ui/CurrencyConversionModal';
import { PinCodeModal } from '../../components/ui/PinCodeModal';
import { StatementExportModal } from '../../components/ui/StatementExportModal';
import { TwoFactorSetupModal } from '../../components/ui/TwoFactorSetupModal';
import { Disable2faModal } from '../../components/ui/Disable2faModal';
import { accountsApi, transactionsApi } from '../../services/api';
import { triggerHaptic } from '../../utils/haptics';
import { Gradients, Radius, Spacing, Typography } from '../../constants/theme';

const CURRENCIES = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: 'ðŸ‡ºðŸ‡¬' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: 'ðŸ‡ºðŸ‡¸' },
  { code: 'EUR', name: 'Euro', symbol: 'â‚¬', flag: 'ðŸ‡ªðŸ‡º' },
  { code: 'GBP', name: 'British Pound', symbol: 'Â£', flag: 'ðŸ‡¬ðŸ‡§' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: 'ðŸ‡°ðŸ‡ª' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: 'ðŸ‡¹ðŸ‡¿' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', flag: 'ðŸ‡·ðŸ‡¼' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: 'â‚¦', flag: 'ðŸ‡³ðŸ‡¬' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GHâ‚µ', flag: 'ðŸ‡¬ðŸ‡­' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: 'ðŸ‡¿ðŸ‡¦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: 'ðŸ‡¨ðŸ‡¦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: 'ðŸ‡¦ðŸ‡º' },
  { code: 'INR', name: 'Indian Rupee', symbol: 'â‚¹', flag: 'ðŸ‡®ðŸ‡³' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: 'ðŸ‡¦ðŸ‡ª' },
  { code: 'JPY', name: 'Japanese Yen', symbol: 'Â¥', flag: 'ðŸ‡¯ðŸ‡µ' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'Â¥', flag: 'ðŸ‡¨ðŸ‡³' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: 'ðŸ‡¨ðŸ‡­' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: 'ðŸ‡§ðŸ‡·' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout, updateUserData, refreshUser } = useAuth();
  const { isDark, setMode, colors } = useTheme();
  const {
    isBiometricsEnabled,
    isHardwareSupported,
    isEnrolled,
    biometricType,
    autoLockTimeout,
    hasCustomPin,
    toggleBiometrics,
    setAutoLockTimeout,
    setCustomPin,
    removeCustomPin,
    manualLock,
  } = useBiometrics();
  const {
    hideBalances,
    toggleHideBalances,
    isPrivacyShieldEnabled,
    togglePrivacyShield,
  } = usePrivacy();

  // Notifications State
  const {
    hasPermission,
    billRemindersEnabled,
    budgetAlertsEnabled,
    dailyDigestEnabled,
    reminderDaysBefore,
    toggleBillReminders,
    toggleBudgetAlerts,
    toggleDailyDigest,
    setReminderDaysBefore,
    sendTestNotification,
  } = useNotifications();
  const [reminderDaysModalVisible, setReminderDaysModalVisible] = useState(false);
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);
  const [statementExportModalVisible, setStatementExportModalVisible] = useState(false);

  // PIN & Security State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"setup" | "change" | "verify">("setup");
  const [timeoutModalVisible, setTimeoutModalVisible] = useState(false);
  const [removePinConfirmVisible, setRemovePinConfirmVisible] = useState(false);

  // Modals
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [setup2faVisible, setSetup2faVisible] = useState(false);
  const [disable2faVisible, setDisable2faVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [targetCurrencyForConversion, setTargetCurrencyForConversion] = useState<{ code: string; name: string; symbol: string; flag: string } | null>(null);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll(),
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => transactionsApi.getAll({ limit: 500 }),
  });

  // Edit Profile States
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Currency Search
  const [currencySearch, setCurrencySearch] = useState('');

  // Import State
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);

  // 1. Handle Biometrics Toggle
  const handleToggleBiometrics = async (value: boolean) => {
    if (!isHardwareSupported) {
      Alert.alert(
        'Not Supported',
        'Biometric authentication is not supported or not available on this device.'
      );
      return;
    }
    if (!isEnrolled) {
      Alert.alert(
        'No Biometrics Enrolled',
        'Please enroll your Face ID or Fingerprint in your device system settings first.'
      );
      return;
    }

    const success = await toggleBiometrics(value);
    if (success) {
      Alert.alert(
        value ? `${biometricType} Enabled` : `${biometricType} Disabled`,
        value
          ? `Your app will now require ${biometricType} authentication when unlocked or resumed.`
          : `${biometricType} lock has been disabled.`
      );
    }
  };

  // 2. Handle 2FA Toggle (Authenticator App & Backup Codes)
  const handleToggle2FA = (value: boolean) => {
    triggerHaptic.selection();
    if (value) {
      setSetup2faVisible(true);
    } else {
      setDisable2faVisible(true);
    }
  };

  // Handle Update Avatar
  const handleUpdateAvatar = async (avatarUri: string | null) => {
    try {
      await settingsApi.updateProfile({
        username: user?.username || '',
        profile_picture: avatarUri ?? '',
      });
      updateUserData({ profile_picture: avatarUri });
    } catch (e: any) {
      throw e;
    }
  };

  // 3. Handle Update Profile
  const handleUpdateProfile = async () => {
    if (!usernameInput.trim()) {
      setProfileError('Username cannot be empty');
      return;
    }

    setProfileError('');
    setProfileLoading(true);
    try {
      const updated = await settingsApi.updateProfile({
        username: usernameInput.trim(),
        email: emailInput.trim() || undefined,
      });
      updateUserData(updated);
      triggerHaptic.success();
      setProfileModalVisible(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (e: any) {
      triggerHaptic.error();
      setProfileError(e.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // 4. Handle Currency Change with Smart Conversion Modal
  const handleChangeCurrency = (curr: typeof CURRENCIES[0]) => {
    triggerHaptic.selection();
    setTargetCurrencyForConversion(curr);
    setConversionModalVisible(true);
  };

  const handleConfirmConversion = async (convertBalances: boolean, rate: number, fromCode: string) => {
    if (!targetCurrencyForConversion) return;
    setConversionLoading(true);
    try {
      const updated = await settingsApi.convertCurrency({
        to_currency: targetCurrencyForConversion.code,
        to_symbol: targetCurrencyForConversion.symbol,
        rate,
        convert_balances: convertBalances,
      });
      updateUserData(updated);
      await refreshUser();
      triggerHaptic.success();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setConversionModalVisible(false);
      setCurrencyModalVisible(false);
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Conversion Failed', e.message || 'Could not convert currency');
    } finally {
      setConversionLoading(false);
    }
  };

  // 5. Handle Password Change
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in both current and new password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordError('');
    setPasswordLoading(true);
    try {
      await settingsApi.updatePassword({ currentPassword, newPassword });
      triggerHaptic.success();
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (e: any) {
      triggerHaptic.error();
      setPasswordError(e.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 6. Handle Export Data Backup
  const handleExportBackup = async () => {
    triggerHaptic.medium();
    try {
      const data = await settingsApi.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      
      const summaryMsg = `Personal Money Manager Backup\nExport Date: ${new Date().toLocaleDateString()}\nAccounts: ${data.accounts?.length || 0}\nTransactions: ${data.transactions?.length || 0}\n\nBackup JSON:\n${jsonStr}`;
      
      if (Platform.OS !== 'web') {
        await Share.share({
          title: 'Personal Money Manager Backup',
          message: summaryMsg,
        });
      } else {
        Alert.alert(
          'Backup Generated',
          `Export ready with ${data.accounts?.length || 0} accounts and ${data.transactions?.length || 0} transactions.`
        );
      }
      triggerHaptic.success();
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Export Failed', e.message || 'Could not generate backup file');
    }
  };

  // 7. Handle Import Backup
  const handleImportBackup = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('Error', 'Please paste valid JSON backup data.');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      Alert.alert(
        'Confirm Restore',
        'Are you sure you want to import this backup? This will restore accounts, transactions, and categories.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            style: 'destructive',
            onPress: async () => {
              setImportLoading(true);
              try {
                await settingsApi.importData(parsed);
                triggerHaptic.success();
                setImportModalVisible(false);
                setImportJsonText('');
                Alert.alert('Backup Restored', 'Your financial records have been restored successfully.');
              } catch (err: any) {
                triggerHaptic.error();
                Alert.alert('Restore Failed', err.message || 'Could not import backup');
              } finally {
                setImportLoading(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      triggerHaptic.error();
      Alert.alert('Invalid JSON', 'The provided data is not a valid JSON structure.');
    }
  };

  // 8. Sign Out
  const handleSignOut = () => {
    triggerHaptic.warning();
    setSignOutConfirmVisible(true);
  };

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Settings & Hub"
        subtitle="Manage your profile, security, and data"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Profile Hero Card */}
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#0F172A'] : ['#EEF2FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileHeroCard, { borderColor: colors.border }]}
        >
          <View style={styles.profileHeroHeader}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic.selection();
                setAvatarModalVisible(true);
              }}
              style={styles.avatarWrapper}
            >
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={styles.avatarImage}
                />
              ) : (
                <LinearGradient
                  colors={Gradients.primary as any}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarInitials}>{getInitials(user?.username)}</Text>
                </LinearGradient>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                <Camera size={11} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <View style={styles.usernameRow}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {user?.username || 'Financial Explorer'}
                </Text>
                <View style={styles.proBadge}>
                  <Sparkles size={10} color="#6366F1" />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>

              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {user?.email || 'No email attached'}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setUsernameInput(user?.username || '');
                setEmailInput(user?.email || '');
                setProfileModalVisible(true);
              }}
              style={[styles.editProfileBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Edit3 size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.profileFooterRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.securityIndicator}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={[styles.securityIndicatorText, { color: colors.textSecondary }]}>
                256-bit Encrypted Vault
              </Text>
            </View>

            <Text style={[styles.currencyTag, { color: colors.primary, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}>
              {user?.currency || 'UGX'} â€¢ {user?.currency_symbol || 'USh'}
            </Text>
          </View>
        </LinearGradient>

        {/* 2. Financial Services Hub */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Financial Hub</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.push('/(app)/subscriptions');
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Repeat size={18} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Subscriptions & Bills</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Recurring commitments & cycles</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.push('/(app)/loans');
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <HandCoins size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Loans & Debts</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Borrowed & lent trackers</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.push('/(app)/goals');
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Target size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Savings Goals</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Target milestones & progress</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.push('/(app)/analytics');
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <BarChart3 size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Cash Flow Analytics</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Deep financial intelligence</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              router.push('/(app)/currency-converter');
            }}
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Coins size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Currency Converter</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Live FX rates for 16 currencies</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* 3. Security & Biometrics */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security & Privacy Shield</Text>
        <Card style={styles.menuCard}>
          {/* Biometric App Lock */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              {biometricType === 'Face ID' ? (
                <ScanFace size={18} color="#6366F1" />
              ) : (
                <Fingerprint size={18} color="#6366F1" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>
                {biometricType !== 'None' ? `${biometricType} App Lock` : 'Biometric Lock'}
              </Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                {isHardwareSupported
                  ? isEnrolled
                    ? 'Requires authentication on launch & resume'
                    : 'Not enrolled in device settings'
                  : 'Hardware not available'}
              </Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              disabled={!isHardwareSupported}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Auto-Lock Timeout Picker */}
          {(isBiometricsEnabled || hasCustomPin) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setTimeoutModalVisible(true);
              }}
              style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Timer size={18} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: colors.text }]}>Auto-Lock Timeout</Text>
                <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                  {autoLockTimeout === 'immediately'
                    ? 'Immediately upon leaving app'
                    : autoLockTimeout === '1min'
                    ? 'After 1 minute in background'
                    : autoLockTimeout === '5min'
                    ? 'After 5 minutes in background'
                    : 'After 15 minutes in background'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.valueText, { color: colors.primary }]}>
                  {autoLockTimeout === 'immediately' ? 'Instant' : autoLockTimeout}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          {/* App Passcode (PIN) Setup / Manage */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <KeyRound size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>4-Digit App Passcode</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                {hasCustomPin ? 'Passcode protection is active' : 'Set fallback PIN for quick unlocking'}
              </Text>
            </View>
            {hasCustomPin ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setPinModalMode('change');
                    setPinModalVisible(true);
                  }}
                  style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.warning();
                    setRemovePinConfirmVisible(true);
                  }}
                  style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic.selection();
                  setPinModalMode('setup');
                  setPinModalVisible(true);
                }}
                style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: Radius.md }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Set PIN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* App Switcher Task Shield */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Shield size={18} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>App Switcher Privacy Shield</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Hides balance snapshots in multitasking screen
              </Text>
            </View>
            <Switch
              value={isPrivacyShieldEnabled}
              onValueChange={(val) => {
                triggerHaptic.selection();
                togglePrivacyShield(val);
              }}
              trackColor={{ false: colors.border, true: '#A855F7' }}
            />
          </View>

          {/* Privacy Mode (Mask Balances) */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              {hideBalances ? (
                <EyeOff size={18} color="#3B82F6" />
              ) : (
                <Eye size={18} color="#3B82F6" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Hide Balances (Privacy Mode)</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Mask all numbers with •••••• on Dashboard & Accounts
              </Text>
            </View>
            <Switch
              value={hideBalances}
              onValueChange={() => {
                triggerHaptic.selection();
                toggleHideBalances();
              }}
              trackColor={{ false: colors.border, true: '#3B82F6' }}
            />
          </View>

          {/* 2FA Toggle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleToggle2FA(!user?.two_factor_enabled)}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <ShieldCheck size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>
                Two-Factor Authentication (2FA)
              </Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Google Authenticator & backup recovery codes
              </Text>
            </View>
            <Switch
              value={user?.two_factor_enabled || false}
              onValueChange={handleToggle2FA}
              trackColor={{ false: colors.border, true: colors.success }}
            />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setPasswordModalVisible(true);
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceElevated }]}>
              <KeyRound size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Update account login credentials
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Lock App Now (Manual Quick Lock) */}
          {(isBiometricsEnabled || hasCustomPin) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.medium();
                manualLock();
              }}
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Lock size={18} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: '#EF4444' }]}>Lock App Now</Text>
                <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                  Instantly engage the biometric lock shield
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </Card>


        {/* 4. Notifications & Reminders */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications & Reminders</Text>
        <Card style={styles.menuCard}>
          {/* Bill Due Date Reminders */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Repeat size={18} color="#EC4899" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Bill Due Date Reminders</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Alerts for upcoming subscriptions & recurring bills
              </Text>
            </View>
            <Switch
              value={billRemindersEnabled}
              onValueChange={async (val) => {
                triggerHaptic.selection();
                await toggleBillReminders(val);
              }}
              trackColor={{ false: colors.border, true: '#EC4899' }}
            />
          </View>

          {/* Reminder Timing Selector */}
          {billRemindersEnabled && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                setReminderDaysModalVisible(true);
              }}
              style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Timer size={18} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: colors.text }]}>Remind Me</Text>
                <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                  {reminderDaysBefore === 0
                    ? 'On the due date at 9:00 AM'
                    : reminderDaysBefore === 1
                    ? '1 day before due date'
                    : '2 days before due date'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.valueText, { color: colors.primary }]}>
                  {reminderDaysBefore === 0 ? 'Same Day' : `${reminderDaysBefore} day${reminderDaysBefore === 1 ? '' : 's'} prior`}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          {/* Budget Limit Alerts */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <BarChart3 size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Budget Spending Alerts</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Warning notification when reaching 80% & 100% of limits
              </Text>
            </View>
            <Switch
              value={budgetAlertsEnabled}
              onValueChange={async (val) => {
                triggerHaptic.selection();
                await toggleBudgetAlerts(val);
              }}
              trackColor={{ false: colors.border, true: '#F59E0B' }}
            />
          </View>

          {/* Daily Spending Digest */}
          <View style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Clock size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Daily Evening Summary</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                8:00 PM daily reminder to record today's spending
              </Text>
            </View>
            <Switch
              value={dailyDigestEnabled}
              onValueChange={async (val) => {
                triggerHaptic.selection();
                await toggleDailyDigest(val);
              }}
              trackColor={{ false: colors.border, true: '#3B82F6' }}
            />
          </View>

          {/* Send Test Notification Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              const sent = await sendTestNotification();
              if (sent) {
                setTestNotifSuccess(true);
                setTimeout(() => setTestNotifSuccess(false), 3000);
              }
            }}
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Bell size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Send Test Notification</Text>
              <Text style={[styles.menuSubtext, { color: testNotifSuccess ? '#10B981' : colors.textSecondary }]}>
                {testNotifSuccess ? 'âœ“ Test banner sent successfully!' : 'Preview push notification appearance'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* 5. Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
        <Card style={styles.menuCard}>
          {/* Currency Selection */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setCurrencySearch('');
              setCurrencyModalVisible(true);
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceElevated }]}>
              <Coins size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Default Currency</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Active format & symbols
              </Text>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={[styles.valueText, { color: colors.primary }]}>
                {user?.currency || 'UGX'} ({user?.currency_symbol || 'USh'})
              </Text>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Theme Toggle */}
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceElevated }]}>
              {isDark ? (
                <Moon size={18} color={colors.primary} />
              ) : (
                <Sun size={18} color={colors.warning} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                {isDark ? 'OLED sleek night theme' : 'High-clarity daytime theme'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => {
                triggerHaptic.selection();
                setMode(val ? 'dark' : 'light');
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        {/* 6. Data, Statements & Backup */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Statements & Data Backup</Text>
        <Card style={styles.menuCard}>
          {/* Export Financial Statement (PDF & Excel) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setStatementExportModalVisible(true);
            }}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <FileText size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Export Financial Statements</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Download official PDF report or Excel .CSV
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Export Backup */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleExportBackup}
            style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Download size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Export Encrypted Backup</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Share or save JSON snapshot
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Restore / Import Backup */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.selection();
              setImportJsonText('');
              setImportModalVisible(true);
            }}
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Upload size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Restore from Backup</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                Import JSON backup data
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* 6. Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSignOut}
          style={[styles.signOutButton, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' }]}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* 7. App Info Footer */}
        <View style={styles.appFooter}>
          <Text style={[styles.appVersionText, { color: colors.textMuted }]}>
            Personal Money Manager â€¢ v1.0.0
          </Text>
          <Text style={[styles.appLegalText, { color: colors.textMuted }]}>
            Self-hosted & Local Encrypted Storage
          </Text>
        </View>
      </ScrollView>

      {/* MODAL 1: Edit Profile */}
      <Modal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        title="Edit Profile"
      >
        {profileError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{profileError}</Text>
          </View>
        ) : null}

        <Input
          label="Username"
          placeholder="Enter username"
          value={usernameInput}
          onChangeText={setUsernameInput}
        />

        <Input
          label="Email Address"
          placeholder="Enter your email"
          value={emailInput}
          onChangeText={setEmailInput}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title="Save Changes"
          size="lg"
          loading={profileLoading}
          onPress={handleUpdateProfile}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 2: Change Password */}
      <Modal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        title="Change Password"
      >
        {passwordError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{passwordError}</Text>
          </View>
        ) : null}

        <Input
          label="Current Password"
          placeholder="Enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          isPassword
        />

        <Input
          label="New Password"
          placeholder="Enter at least 6 characters"
          value={newPassword}
          onChangeText={setNewPassword}
          isPassword
        />

        <Input
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
        />

        <Button
          title="Update Password"
          size="lg"
          loading={passwordLoading}
          onPress={handlePasswordChange}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* MODAL 3: Currency Picker */}
      <Modal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
        title="Select Currency"
      >
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Search currency code or name..."
            placeholderTextColor={colors.textMuted}
            value={currencySearch}
            onChangeText={setCurrencySearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={styles.currencyList}>
            {filteredCurrencies.map((curr) => {
              const isSelected = user?.currency === curr.code;
              return (
                <TouchableOpacity
                  key={curr.code}
                  activeOpacity={0.7}
                  onPress={() => handleChangeCurrency(curr)}
                  style={[
                    styles.currencyRowItem,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.currencyFlagBox}>
                    <Text style={{ fontSize: 24 }}>{curr.flag}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.currencyCodeText,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {curr.code}
                      </Text>
                      <Text style={[styles.currencySymbolPill, { color: colors.textSecondary }]}>
                        {curr.symbol}
                      </Text>
                    </View>
                    <Text style={[styles.currencyNameText, { color: colors.textSecondary }]}>
                      {curr.name}
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Modal>

      {/* MODAL 4: Import Backup Data */}
      <Modal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        title="Restore Data"
      >
        <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={[styles.infoBannerText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
            Restoring from backup will merge accounts and transactions. Ensure your backup is from a trusted export.
          </Text>
        </View>

        <Text style={[styles.importLabel, { color: colors.textSecondary }]}>
          Paste JSON Backup Payload:
        </Text>
        <TextInput
          multiline
          numberOfLines={6}
          placeholder='{"accounts": [...], "transactions": [...]}'
          placeholderTextColor={colors.textMuted}
          value={importJsonText}
          onChangeText={setImportJsonText}
          style={[
            styles.jsonTextArea,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        <Button
          title="Restore Backup"
          size="lg"
          loading={importLoading}
          onPress={handleImportBackup}
          style={{ marginTop: Spacing.md }}
        />
      </Modal>
      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        visible={signOutConfirmVisible}
        onClose={() => setSignOutConfirmVisible(false)}
        onConfirm={() => {
          setSignOutConfirmVisible(false);
          logout();
        }}
        title="Sign Out"
        message="Are you sure you want to sign out of Personal Money Manager?"
        confirmText="Sign Out"
        type="danger"
      />
      {/* Avatar / Profile Picture Picker Modal */}
      <AvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        currentAvatarUri={user?.profile_picture}
        onSelectAvatar={handleUpdateAvatar}
      />

      {/* MODAL: Bill Reminder Timing Picker */}
      <Modal
        visible={reminderDaysModalVisible}
        onClose={() => setReminderDaysModalVisible(false)}
        title="Reminder Timing"
      >
        <Text style={[styles.menuSubtext, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
          When would you like to receive bill due date reminders?
        </Text>
        <View style={{ gap: 8 }}>
          {[
            { days: 0, label: 'On the Due Date', sub: '9:00 AM morning reminder on payment day' },
            { days: 1, label: '1 Day Before', sub: 'Advance notification the day before due date' },
            { days: 2, label: '2 Days Before', sub: 'Extra preparation window for large recurring bills' },
          ].map((item) => {
            const isSelected = reminderDaysBefore === item.days;
            return (
              <TouchableOpacity
                key={item.days}
                activeOpacity={0.75}
                onPress={async () => {
                  triggerHaptic.selection();
                  await setReminderDaysBefore(item.days);
                  setReminderDaysModalVisible(false);
                }}
                style={[
                  styles.currencyRowItem,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currencyCodeText, { color: colors.text, fontSize: 14 }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.currencyNameText, { color: colors.textSecondary }]}>
                    {item.sub}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
      {/* MODAL: Auto-Lock Timeout Picker */}
      <Modal
        visible={timeoutModalVisible}
        onClose={() => setTimeoutModalVisible(false)}
        title="Auto-Lock Timeout"
      >
        <Text style={[styles.menuSubtext, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
          Choose how quickly the app locks when placed in the background:
        </Text>
        <View style={{ gap: 8 }}>
          {[
            { key: 'immediately', label: 'Immediately', sub: 'Locks as soon as you switch apps' },
            { key: '1min', label: 'After 1 minute', sub: 'Convenient for quick OTP copying' },
            { key: '5min', label: 'After 5 minutes', sub: 'Balanced privacy & convenience' },
            { key: '15min', label: 'After 15 minutes', sub: 'Extended working window' },
          ].map((item) => {
            const isSelected = autoLockTimeout === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.75}
                onPress={async () => {
                  triggerHaptic.selection();
                  await setAutoLockTimeout(item.key as any);
                  setTimeoutModalVisible(false);
                }}
                style={[
                  styles.currencyRowItem,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currencyCodeText, { color: colors.text, fontSize: 14 }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.currencyNameText, { color: colors.textSecondary }]}>
                    {item.sub}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* MODAL: PIN Code Setup / Change */}
      <PinCodeModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        mode={pinModalMode}
        onSuccess={(pin) => {
          if (pin) {
            setCustomPin(pin);
            Alert.alert('Passcode Saved', 'Your 4-digit passcode is now active.');
          }
        }}
      />

      {/* Remove PIN Confirmation */}
      <ConfirmDialog
        visible={removePinConfirmVisible}
        onClose={() => setRemovePinConfirmVisible(false)}
        onConfirm={async () => {
          setRemovePinConfirmVisible(false);
          await removeCustomPin();
          Alert.alert('Passcode Removed', '4-digit passcode protection has been removed.');
        }}
        title="Remove Passcode"
        message="Are you sure you want to remove your 4-digit passcode?"
        confirmText="Remove Passcode"
        type="danger"
      />
      {/* Statement Export Modal (PDF & Excel) */}
      <StatementExportModal
        visible={statementExportModalVisible}
        onClose={() => setStatementExportModalVisible(false)}
        transactions={allTransactions?.data || []}
        accounts={allAccounts || []}
      />

      {/* Smart Currency Conversion Modal */}
      <CurrencyConversionModal
        visible={conversionModalVisible}
        onClose={() => setConversionModalVisible(false)}
        currentCurrencyCode={user?.currency || 'UGX'}
        currentCurrencySymbol={user?.currency_symbol || 'USh'}
        targetCurrency={targetCurrencyForConversion}
        onConfirm={handleConfirmConversion}
        loading={conversionLoading}
      />

      {/* Two-Factor Authentication Setup Modal */}
      <TwoFactorSetupModal
        visible={setup2faVisible}
        onClose={() => setSetup2faVisible(false)}
        onSuccess={() => {
          updateUserData({ two_factor_enabled: true });
        }}
      />

      {/* Disable 2FA Security Modal */}
      <Disable2faModal
        visible={disable2faVisible}
        onClose={() => setDisable2faVisible(false)}
        onSuccess={() => {
          updateUserData({ two_factor_enabled: false });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  profileHeroCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#334155',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  editProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  currencyTag: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubtext: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '800',
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 8,
    marginTop: Spacing.lg,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  appFooter: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 2,
  },
  appVersionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appLegalText: {
    fontSize: 10,
    fontWeight: '500',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    fontWeight: '600',
  },
  currencyList: {
    gap: 8,
  },
  currencyRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  currencyFlagBox: {
    width: 32,
    alignItems: 'center',
  },
  currencyCodeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  currencySymbolPill: {
    fontSize: 12,
    fontWeight: '700',
  },
  currencyNameText: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  importLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  jsonTextArea: {
    height: 120,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
  },
});









