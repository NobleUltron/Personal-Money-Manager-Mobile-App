import React, { useState, useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Delete, KeyRound, Lock, ShieldCheck, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing } from '../../constants/theme';

interface PinCodeModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'setup' | 'verify' | 'change';
  currentStoredPin?: string;
  onSuccess: (newPin?: string) => void;
  title?: string;
}

export const PinCodeModal: React.FC<PinCodeModalProps> = ({
  visible,
  onClose,
  mode,
  currentStoredPin = '',
  onSuccess,
  title,
}) => {
  const { colors, isDark } = useTheme();

  // Sub-steps for setup/change
  // setup: 'enter_new' -> 'confirm_new'
  // change: 'enter_current' -> 'enter_new' -> 'confirm_new'
  // verify: 'enter_pin'
  const [step, setStep] = useState<string>('enter_new');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [tempNewPin, setTempNewPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setEnteredPin('');
      setErrorMsg('');
      setTempNewPin('');
      if (mode === 'verify') setStep('enter_pin');
      else if (mode === 'setup') setStep('enter_new');
      else if (mode === 'change') setStep('enter_current');
    }
  }, [visible, mode]);

  const triggerShake = () => {
    triggerHaptic.error();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (digit: string) => {
    triggerHaptic.light();
    setErrorMsg('');

    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);

      // Auto-submit when 4 digits reached
      if (nextPin.length === 4) {
        processPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic.medium();
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const processPin = (pin: string) => {
    if (mode === 'verify') {
      if (pin === currentStoredPin) {
        triggerHaptic.success();
        onSuccess();
        onClose();
      } else {
        triggerShake();
        setErrorMsg('Incorrect Passcode');
        setEnteredPin('');
      }
    } else if (mode === 'setup') {
      if (step === 'enter_new') {
        triggerHaptic.medium();
        setTempNewPin(pin);
        setStep('confirm_new');
        setEnteredPin('');
      } else if (step === 'confirm_new') {
        if (pin === tempNewPin) {
          triggerHaptic.success();
          onSuccess(pin);
          onClose();
        } else {
          triggerShake();
          setErrorMsg('Passcodes do not match. Try again.');
          setStep('enter_new');
          setTempNewPin('');
          setEnteredPin('');
        }
      }
    } else if (mode === 'change') {
      if (step === 'enter_current') {
        if (pin === currentStoredPin) {
          triggerHaptic.medium();
          setStep('enter_new');
          setEnteredPin('');
        } else {
          triggerShake();
          setErrorMsg('Current Passcode is incorrect');
          setEnteredPin('');
        }
      } else if (step === 'enter_new') {
        triggerHaptic.medium();
        setTempNewPin(pin);
        setStep('confirm_new');
        setEnteredPin('');
      } else if (step === 'confirm_new') {
        if (pin === tempNewPin) {
          triggerHaptic.success();
          onSuccess(pin);
          onClose();
        } else {
          triggerShake();
          setErrorMsg('Passcodes do not match. Try again.');
          setStep('enter_new');
          setTempNewPin('');
          setEnteredPin('');
        }
      }
    }
  };

  const getStepTitle = () => {
    if (title) return title;
    if (step === 'enter_current') return 'Enter Current Passcode';
    if (step === 'enter_new') return 'Set 4-Digit Passcode';
    if (step === 'confirm_new') return 'Confirm Your Passcode';
    return 'Enter App Passcode';
  };

  const getStepSubtitle = () => {
    if (step === 'enter_current') return 'Verify your identity before changing passcode';
    if (step === 'enter_new') return 'Choose a 4-digit code to protect your financial data';
    if (step === 'confirm_new') return 'Re-enter the 4 digits to verify';
    return 'Enter your passcode to unlock';
  };

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <View style={styles.iconCircle}>
              <KeyRound size={22} color="#6366F1" strokeWidth={2.4} />
            </View>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic.selection();
                onClose();
              }}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.text }]}>{getStepTitle()}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getStepSubtitle()}</Text>

          {/* 4 Digit Dots */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = enteredPin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isFilled ? colors.primary : colors.surfaceElevated,
                      borderColor: isFilled ? colors.primary : colors.border,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Error Message */}
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : <View style={{ height: 20 }} />}

          {/* Keypad Grid */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'backspace'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((key, kIdx) => {
                  if (key === '') {
                    return <View key={kIdx} style={styles.keypadBtnPlaceholder} />;
                  }
                  if (key === 'backspace') {
                    return (
                      <TouchableOpacity
                        key={kIdx}
                        activeOpacity={0.6}
                        onPress={handleDelete}
                        style={[styles.keypadBtn, { backgroundColor: colors.surfaceElevated }]}
                      >
                        <Delete size={20} color={colors.text} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={kIdx}
                      activeOpacity={0.6}
                      onPress={() => handleKeyPress(key)}
                      style={[styles.keypadBtn, { backgroundColor: colors.surfaceElevated }]}
                    >
                      <Text style={[styles.keypadBtnText, { color: colors.text }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    height: 20,
    marginTop: 4,
  },
  keypad: {
    width: '100%',
    gap: 10,
    marginTop: Spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  keypadBtn: {
    width: 64,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnPlaceholder: {
    width: 64,
    height: 52,
  },
  keypadBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
});
