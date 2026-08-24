import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Fingerprint, KeyRound, LogOut, ScanFace, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { triggerHaptic } from '../utils/haptics';
import { Gradients, Radius, Spacing } from '../constants/theme';
import { PinCodeModal } from '../components/ui/PinCodeModal';

export type AutoLockTimeout = 'immediately' | '1min' | '5min' | '15min';

interface BiometricsContextType {
  isBiometricsEnabled: boolean;
  isLocked: boolean;
  isHardwareSupported: boolean;
  isEnrolled: boolean;
  biometricType: string;
  autoLockTimeout: AutoLockTimeout;
  hasCustomPin: boolean;
  toggleBiometrics: (enable: boolean) => Promise<boolean>;
  setAutoLockTimeout: (timeout: AutoLockTimeout) => Promise<void>;
  setCustomPin: (pin: string) => Promise<void>;
  removeCustomPin: () => Promise<void>;
  authenticateAndUnlock: () => Promise<boolean>;
  emergencyUnlock: () => void;
  manualLock: () => void;
}

const BiometricsContext = createContext<BiometricsContextType>({
  isBiometricsEnabled: false,
  isLocked: false,
  isHardwareSupported: false,
  isEnrolled: false,
  biometricType: 'Biometrics',
  autoLockTimeout: 'immediately',
  hasCustomPin: false,
  toggleBiometrics: async () => false,
  setAutoLockTimeout: async () => {},
  setCustomPin: async () => {},
  removeCustomPin: async () => {},
  authenticateAndUnlock: async () => false,
  emergencyUnlock: () => {},
  manualLock: () => {},
});

const BIOMETRICS_KEY = 'pmm_biometrics_enabled_v2';
const AUTOLOCK_TIMEOUT_KEY = 'pmm_autolock_timeout_v2';
const CUSTOM_PIN_KEY = 'pmm_custom_app_pin_v2';

const TIMEOUT_MS_MAP: Record<AutoLockTimeout, number> = {
  immediately: 0,
  '1min': 60 * 1000,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
};

export const BiometricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHardwareSupported, setIsHardwareSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [autoLockTimeout, setAutoLockTimeoutState] = useState<AutoLockTimeout>('immediately');
  const [customPin, setCustomPinState] = useState<string | null>(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  // 1. Detect hardware capabilities and stored preferences
  useEffect(() => {
    checkBiometricsSupport();
  }, []);

  const checkBiometricsSupport = async () => {
    if (Platform.OS === 'web') {
      setIsInitialized(true);
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsHardwareSupported(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris Scan');
        } else {
          setBiometricType('Device Biometrics');
        }
      } else {
        setBiometricType('None');
      }

      // Load stored preferences
      const storedEnabled = await SecureStore.getItemAsync(BIOMETRICS_KEY);
      const isEnabled = storedEnabled === 'true';
      setIsBiometricsEnabled(isEnabled);

      const storedTimeout = (await SecureStore.getItemAsync(AUTOLOCK_TIMEOUT_KEY)) as AutoLockTimeout | null;
      if (storedTimeout && TIMEOUT_MS_MAP[storedTimeout] !== undefined) {
        setAutoLockTimeoutState(storedTimeout);
      }

      const storedPin = await SecureStore.getItemAsync(CUSTOM_PIN_KEY);
      setCustomPinState(storedPin);

      // Lock on initial launch if biometrics is active and user is logged in
      if (isEnabled) {
        setIsLocked(true);
      }
    } catch (e) {
      console.warn('Error initializing biometrics:', e);
    } finally {
      setIsInitialized(true);
    }
  };

  // 2. Authenticate and Unlock
  const authenticateAndUnlock = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setIsLocked(false);
      return true;
    }

    try {
      triggerHaptic.selection();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock Personal Money Manager with ${biometricType}`,
        fallbackLabel: customPin ? 'Use App PIN' : 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        triggerHaptic.success();
        setIsLocked(false);
        backgroundTimestamp.current = null;
        return true;
      } else {
        triggerHaptic.error();
        // If user tapped fallback or canceled, offer PIN modal if available
        if (customPin) {
          setIsPinModalVisible(true);
        }
        return false;
      }
    } catch (e) {
      console.warn('Authentication error:', e);
      if (customPin) {
        setIsPinModalVisible(true);
      }
      return false;
    }
  }, [biometricType, customPin]);

  // 3. Auto-prompt unlock on app launch
  useEffect(() => {
    if (isInitialized && isLocked && isBiometricsEnabled) {
      authenticateAndUnlock();
    }
  }, [isInitialized, isLocked, isBiometricsEnabled, authenticateAndUnlock]);

  // 4. Listen to AppState transitions with configurable Auto-Lock Timeout
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App went to background -> record timestamp
        backgroundTimestamp.current = Date.now();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App returned to foreground
        if (isBiometricsEnabled && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          const requiredThreshold = TIMEOUT_MS_MAP[autoLockTimeout] || 0;

          if (elapsed >= requiredThreshold) {
            setIsLocked(true);
            authenticateAndUnlock();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isBiometricsEnabled, autoLockTimeout, authenticateAndUnlock]);

  // 5. Toggle Biometrics Setting
  const toggleBiometrics = async (enable: boolean): Promise<boolean> => {
    if (enable) {
      if (!isHardwareSupported || !isEnrolled) {
        triggerHaptic.warning();
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Verify your identity to enable ${biometricType}`,
        fallbackLabel: 'Use Device Passcode',
      });

      if (result.success) {
        triggerHaptic.success();
        await SecureStore.setItemAsync(BIOMETRICS_KEY, 'true');
        setIsBiometricsEnabled(true);
        return true;
      } else {
        triggerHaptic.error();
        return false;
      }
    } else {
      triggerHaptic.medium();
      await SecureStore.setItemAsync(BIOMETRICS_KEY, 'false');
      setIsBiometricsEnabled(false);
      setIsLocked(false);
      return true;
    }
  };

  // 6. Update Auto-Lock Timeout
  const setAutoLockTimeout = async (timeout: AutoLockTimeout) => {
    setAutoLockTimeoutState(timeout);
    try {
      await SecureStore.setItemAsync(AUTOLOCK_TIMEOUT_KEY, timeout);
    } catch {}
  };

  // 7. Custom PIN management
  const setCustomPin = async (pin: string) => {
    setCustomPinState(pin);
    try {
      await SecureStore.setItemAsync(CUSTOM_PIN_KEY, pin);
      triggerHaptic.success();
    } catch {}
  };

  const removeCustomPin = async () => {
    setCustomPinState(null);
    try {
      await SecureStore.deleteItemAsync(CUSTOM_PIN_KEY);
      triggerHaptic.medium();
    } catch {}
  };

  // 8. Manual Lock
  const manualLock = () => {
    if (isBiometricsEnabled || customPin) {
      triggerHaptic.medium();
      setIsLocked(true);
    }
  };

  // 9. Emergency Reset
  const emergencyUnlock = () => {
    Alert.alert(
      'Emergency Sign Out',
      'If you cannot authenticate, you can sign out to reset your session. Your stored online data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out & Reset',
          style: 'destructive',
          onPress: () => {
            setIsLocked(false);
            logout();
          },
        },
      ]
    );
  };

  const getBiometricIcon = () => {
    if (biometricType === 'Face ID') {
      return <ScanFace size={40} color="#FFFFFF" strokeWidth={2.2} />;
    }
    return <Fingerprint size={40} color="#FFFFFF" strokeWidth={2.2} />;
  };

  return (
    <BiometricsContext.Provider
      value={{
        isBiometricsEnabled,
        isLocked,
        isHardwareSupported,
        isEnrolled,
        biometricType,
        autoLockTimeout,
        hasCustomPin: !!customPin,
        toggleBiometrics,
        setAutoLockTimeout,
        setCustomPin,
        removeCustomPin,
        authenticateAndUnlock,
        emergencyUnlock,
        manualLock,
      }}
    >
      {children}

      {/* Lock Screen Shield Overlay */}
      {isLocked && (isBiometricsEnabled || !!customPin) && (
        <View style={styles.lockOverlay}>
          <LinearGradient
            colors={['#020617', '#0F172A', '#020617']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.lockContent}>
            {/* App Branding */}
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Shield size={36} color="#6366F1" strokeWidth={2.5} />
              </View>
              <Text style={styles.brandTitle}>Personal Money Manager</Text>
              <Text style={styles.brandSubtitle}>App Locked for Your Privacy</Text>
            </View>

            {/* Biometric Trigger Card */}
            {isBiometricsEnabled && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={authenticateAndUnlock}
                style={styles.unlockCard}
              >
                <LinearGradient
                  colors={Gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.unlockIconWrapper}
                >
                  {getBiometricIcon()}
                </LinearGradient>

                <Text style={styles.unlockPromptText}>
                  Tap to Unlock with {biometricType !== 'None' ? biometricType : 'Biometrics'}
                </Text>
                <Text style={styles.unlockSubtext}>
                  Tap here to prompt scanner
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick Actions Row */}
            <View style={styles.actionsRow}>
              {customPin ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsPinModalVisible(true)}
                  style={styles.pinUnlockBtn}
                >
                  <KeyRound size={16} color="#6366F1" />
                  <Text style={styles.pinUnlockText}>Enter PIN</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic.selection();
                    setIsLocked(false);
                  }}
                  style={styles.pinUnlockBtn}
                >
                  <KeyRound size={16} color="#6366F1" />
                  <Text style={styles.pinUnlockText}>Quick Unlock</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={emergencyUnlock}
                style={styles.signOutBtn}
              >
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* PIN Code Verification Modal */}
      {customPin && (
        <PinCodeModal
          visible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          mode="verify"
          currentStoredPin={customPin}
          onSuccess={() => {
            setIsLocked(false);
            setIsPinModalVisible(false);
          }}
          title="Enter 4-Digit Passcode"
        />
      )}
    </BiometricsContext.Provider>
  );
};

export const useBiometrics = () => useContext(BiometricsContext);

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  unlockCard: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: Radius.xxl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  unlockIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  unlockPromptText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  unlockSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  pinUnlockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  pinUnlockText: {
    fontSize: 13,
    color: '#818CF8',
    fontWeight: '700',
  },
  signOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  signOutBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
  },
});
