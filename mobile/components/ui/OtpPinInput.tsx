import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Clipboard as ClipboardIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing } from '../../constants/theme';

interface OtpPinInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  showPasteButton?: boolean;
}

export const OtpPinInput: React.FC<OtpPinInputProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled = false,
  showPasteButton = true,
}) => {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const digits = value.split('');
  const isFilled = value.length === length;

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    triggerHaptic.selection();
    onChange(cleaned);
    if (cleaned.length === length) {
      triggerHaptic.medium();
      onComplete?.(cleaned);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const content = await Clipboard.getStringAsync();
      const cleaned = content.replace(/[^0-9]/g, '').slice(0, length);
      if (cleaned.length === length) {
        triggerHaptic.success();
        onChange(cleaned);
        onComplete?.(cleaned);
      } else {
        triggerHaptic.error();
      }
    } catch {
      triggerHaptic.error();
    }
  };

  const handleBoxPress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Hidden Master TextInput for Native Keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        editable={!disabled}
        style={styles.hiddenInput}
        caretHidden
      />

      {/* 6 Discrete Pin Boxes */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleBoxPress}
        style={styles.boxesContainer}
      >
        {Array.from({ length }).map((_, index) => {
          const char = digits[index] || '';
          const isFocused = value.length === index && !disabled;
          const isCurrentFilled = !!char;

          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: colors.surface,
                  borderColor: isFocused
                    ? colors.primary
                    : isCurrentFilled
                    ? colors.border
                    : isDark
                    ? '#1E293B'
                    : '#E2E8F0',
                },
                isFocused && {
                  borderWidth: 2,
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: 3,
                },
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  styles.boxText,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {char}
              </Text>
              {isFocused && <View style={[styles.cursor, { backgroundColor: colors.primary }]} />}
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Quick Auto-Paste Option */}
      {showPasteButton && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePasteFromClipboard}
          disabled={disabled}
          style={[
            styles.pasteBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <ClipboardIcon size={13} color={colors.primary} />
          <Text style={[styles.pasteBtnText, { color: colors.primary }]}>
            Paste from Clipboard
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxText: {
    fontSize: 22,
    fontWeight: '800',
  },
  cursor: {
    position: 'absolute',
    bottom: 10,
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  pasteBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});