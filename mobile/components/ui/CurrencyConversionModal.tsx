import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ArrowRight,
  Calculator,
  Check,
  Coins,
  DollarSign,
  HelpCircle,
  Sparkles,
  Tag,
  X,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLiveExchangeRates, formatRatePreview } from '../../utils/exchangeRates';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface CurrencyConversionModalProps {
  visible: boolean;
  onClose: () => void;
  currentCurrencyCode: string;
  currentCurrencySymbol: string;
  targetCurrency: { code: string; name: string; symbol: string; flag: string } | null;
  onConfirm: (convertBalances: boolean, rate: number, fromCode: string) => Promise<void>;
  loading?: boolean;
}

const COMMON_BASE_CURRENCIES = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'NGN'];

export const CurrencyConversionModal: React.FC<CurrencyConversionModalProps> = ({
  visible,
  onClose,
  currentCurrencyCode,
  currentCurrencySymbol,
  targetCurrency,
  onConfirm,
  loading = false,
}) => {
  const { colors, isDark } = useTheme();
  const { rates, lastUpdated, isLive, getRate, convert } = useLiveExchangeRates();

  // Allow user to choose what currency their current numbers are actually in (default to current or UGX)
  const [selectedFromCode, setSelectedFromCode] = useState<string>(
    currentCurrencyCode || 'UGX'
  );

  // Sync selectedFromCode when modal opens
  React.useEffect(() => {
    if (visible && currentCurrencyCode) {
      setSelectedFromCode(currentCurrencyCode);
    }
  }, [visible, currentCurrencyCode]);

  const targetCode = targetCurrency?.code || 'USD';
  const targetSymbol = targetCurrency?.symbol || '$';

  const rate = useMemo(() => {
    return getRate(selectedFromCode, targetCode);
  }, [selectedFromCode, targetCode, getRate]);

  const ratePreview = useMemo(() => {
    return formatRatePreview(selectedFromCode, targetCode, rates);
  }, [selectedFromCode, targetCode, rates]);

  // Example preview calculations
  const sample1 = selectedFromCode === 'UGX' ? 1000000 : 1000;
  const sample1Converted = useMemo(() => {
    return convert(sample1, selectedFromCode, targetCode);
  }, [sample1, selectedFromCode, targetCode, convert]);

  const sample2 = selectedFromCode === 'UGX' ? 50000 : 50;
  const sample2Converted = useMemo(() => {
    return convert(sample2, selectedFromCode, targetCode);
  }, [sample2, selectedFromCode, targetCode, convert]);

  if (!visible || !targetCurrency) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Coins size={20} color={colors.primary} />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Smart Currency Converter
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Converting and scaling your financial database records...
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                  {/* Currency Conversion Hero Strip */}
                  <View style={[styles.switchStrip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={styles.currencyPill}>
                      <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Converting From</Text>
                      <Text style={styles.currencyCode}>{selectedFromCode}</Text>
                    </View>

                    <View style={[styles.arrowCircle, { backgroundColor: colors.primary }]}>
                      <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>

                    <View style={styles.currencyPill}>
                      <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Converting To</Text>
                      <Text style={styles.currencyCode}>
                        {targetCurrency.flag} {targetCurrency.code} ({targetCurrency.symbol})
                      </Text>
                    </View>
                  </View>

                  {/* "From Currency" Basis Selector */}
                  <View style={styles.basisContainer}>
                    <Text style={[styles.basisLabel, { color: colors.textSecondary }]}>
                      My numbers are currently in:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {COMMON_BASE_CURRENCIES.map((code) => {
                        const isSelected = selectedFromCode === code;
                        return (
                          <TouchableOpacity
                            key={code}
                            activeOpacity={0.7}
                            onPress={() => {
                              triggerHaptic.selection();
                              setSelectedFromCode(code);
                            }}
                            style={[
                              styles.basisChip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSelected ? '#FFFFFF' : colors.text,
                                fontSize: 11,
                                fontWeight: isSelected ? '800' : '600',
                              }}
                            >
                              {code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Live Rate Badge */}
                  <View style={[styles.rateBanner, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
                    <Calculator size={15} color={colors.primary} />
                    <Text style={[styles.rateBannerText, { color: colors.primary }]}>
                      {ratePreview}
                    </Text>
                    {isLive && (
                      <View style={styles.liveTag}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveTagText}>Live</Text>
                      </View>
                    )}
                  </View>

                  {/* Live Projection Box */}
                  <View style={[styles.projectionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.projectionTitle, { color: colors.textSecondary }]}>
                      Calculation Preview:
                    </Text>

                    <View style={styles.projectionRow}>
                      <Text style={[styles.fromVal, { color: colors.textSecondary }]}>
                        {selectedFromCode} {sample1.toLocaleString()}
                      </Text>
                      <Text style={[styles.toVal, { color: colors.success }]}>
                        ➔ {targetSymbol} {sample1Converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.projectionRow}>
                      <Text style={[styles.fromVal, { color: colors.textSecondary }]}>
                        {selectedFromCode} {sample2.toLocaleString()}
                      </Text>
                      <Text style={[styles.toVal, { color: colors.success }]}>
                        ➔ {targetSymbol} {sample2Converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {/* Action Choices */}
                  <View style={styles.actionsContainer}>
                    {/* Option A: Convert All Balances (Recommended) */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        triggerHaptic.selection();
                        onConfirm(true, rate, selectedFromCode);
                      }}
                      style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Zap size={18} color="#FFFFFF" strokeWidth={2.4} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.primaryActionTitle}>
                          Convert Balances & Records
                        </Text>
                        <Text style={styles.primaryActionSub}>
                          Multiplies accounts, transactions, goals & debts by {rate >= 1 ? rate.toFixed(4) : rate.toFixed(6)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option B: Symbol Only */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => {
                        triggerHaptic.selection();
                        onConfirm(false, 1.0, selectedFromCode);
                      }}
                      style={[styles.secondaryActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    >
                      <Tag size={16} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>
                          Change Symbol Only
                        </Text>
                        <Text style={[styles.secondaryActionSub, { color: colors.textSecondary }]}>
                          Keep raw numerical amounts without exchange calculation
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '90%',
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  switchStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  currencyPill: {
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '800',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  basisContainer: {
    marginVertical: 2,
  },
  basisLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  basisChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  rateBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  projectionBox: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 6,
  },
  projectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fromVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  toVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryActionSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  secondaryActionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
