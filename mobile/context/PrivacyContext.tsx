import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus, Platform, StyleSheet, View, Text } from 'react-native';
import { Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PrivacyContextType {
  hideBalances: boolean;
  toggleHideBalances: () => void;
  formatAmount: (amount?: number | string | null, currencySymbol?: string) => string;
  isPrivacyShieldEnabled: boolean;
  togglePrivacyShield: (enabled: boolean) => Promise<void>;
}

const PrivacyContext = createContext<PrivacyContextType>({
  hideBalances: false,
  toggleHideBalances: () => {},
  formatAmount: () => '',
  isPrivacyShieldEnabled: true,
  togglePrivacyShield: async () => {},
});

const HIDE_BALANCES_KEY = 'pmm_hide_balances';
const PRIVACY_SHIELD_KEY = 'pmm_privacy_shield_enabled';

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hideBalances, setHideBalances] = useState(false);
  const [isPrivacyShieldEnabled, setIsPrivacyShieldEnabled] = useState(true);
  const [isShieldVisible, setIsShieldVisible] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const storedHide = await SecureStore.getItemAsync(HIDE_BALANCES_KEY);
          if (storedHide !== null) {
            setHideBalances(storedHide === 'true');
          }
          const storedShield = await SecureStore.getItemAsync(PRIVACY_SHIELD_KEY);
          if (storedShield !== null) {
            setIsPrivacyShieldEnabled(storedShield === 'true');
          }
        }
      } catch {}
    })();
  }, []);

  // Listen to AppState to activate Privacy Shield when app is transitioning to background/inactive
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (isPrivacyShieldEnabled) {
        if (nextAppState.match(/inactive|background/)) {
          setIsShieldVisible(true);
        } else if (nextAppState === 'active') {
          // Slight delay to prevent flashing before lock screen or app renders
          setTimeout(() => {
            setIsShieldVisible(false);
          }, 150);
        }
      } else {
        setIsShieldVisible(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isPrivacyShieldEnabled]);

  const toggleHideBalances = async () => {
    const nextVal = !hideBalances;
    setHideBalances(nextVal);
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(HIDE_BALANCES_KEY, nextVal ? 'true' : 'false');
      }
    } catch {}
  };

  const togglePrivacyShield = async (enabled: boolean) => {
    setIsPrivacyShieldEnabled(enabled);
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(PRIVACY_SHIELD_KEY, enabled ? 'true' : 'false');
      }
    } catch {}
  };

  const formatAmount = (amount?: number | string | null, currencySymbol: string = 'UGX'): string => {
    if (hideBalances) {
      return `${currencySymbol} ••••••`;
    }
    if (amount === undefined || amount === null) {
      return `${currencySymbol} 0`;
    }
    const parsed = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    const validNum = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    return `${currencySymbol} ${validNum.toLocaleString()}`;
  };

  return (
    <PrivacyContext.Provider
      value={{
        hideBalances,
        toggleHideBalances,
        formatAmount,
        isPrivacyShieldEnabled,
        togglePrivacyShield,
      }}
    >
      {children}

      {/* App Switcher Task Shield Overlay */}
      {isShieldVisible && isPrivacyShieldEnabled && (
        <View style={styles.shieldOverlay} pointerEvents="none">
          <LinearGradient
            colors={['#020617', '#0F172A', '#020617']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.shieldContent}>
            <View style={styles.shieldIconBox}>
              <Shield size={44} color="#6366F1" strokeWidth={2.4} />
            </View>
            <Text style={styles.shieldTitle}>Personal Money Manager</Text>
            <Text style={styles.shieldSubtitle}>Financial Privacy Protected</Text>
          </View>
        </View>
      )}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);

const styles = StyleSheet.create({
  shieldOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999999,
    elevation: 9999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldContent: {
    alignItems: 'center',
    gap: 8,
  },
  shieldIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shieldTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  shieldSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});