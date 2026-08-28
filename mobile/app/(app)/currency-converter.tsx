import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Star,
  BookmarkCheck,
  RefreshCw,
  Zap,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useLiveExchangeRates } from "../../utils/exchangeRates";
import { triggerHaptic } from "../../utils/haptics";
import { Gradients, Radius, Spacing } from "../../constants/theme";

const ALL_CURRENCIES = [
  { code: "USD", name: "US Dollar",          symbol: "$",   flag: "🇺🇸", region: "Americas" },
  { code: "EUR", name: "Euro",               symbol: "€",   flag: "🇪🇺", region: "Europe" },
  { code: "GBP", name: "British Pound",      symbol: "£",   flag: "🇬🇧", region: "Europe" },
  { code: "UGX", name: "Ugandan Shilling",   symbol: "USh", flag: "🇺🇬", region: "Africa" },
  { code: "KES", name: "Kenyan Shilling",     symbol: "KSh", flag: "🇰🇪", region: "Africa" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿", region: "Africa" },
  { code: "RWF", name: "Rwandan Franc",      symbol: "FRw", flag: "🇷🇼", region: "Africa" },
  { code: "NGN", name: "Nigerian Naira",     symbol: "₦",   flag: "🇳🇬", region: "Africa" },
  { code: "GHS", name: "Ghanaian Cedi",      symbol: "GH₵", flag: "🇬🇭", region: "Africa" },
  { code: "ZAR", name: "South African Rand", symbol: "R",   flag: "🇿🇦", region: "Africa" },
  { code: "CAD", name: "Canadian Dollar",    symbol: "CA$", flag: "🇨🇦", region: "Americas" },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$",  flag: "🇦🇺", region: "Oceania" },
  { code: "JPY", name: "Japanese Yen",       symbol: "¥",   flag: "🇯🇵", region: "Asia" },
  { code: "CNY", name: "Chinese Yuan",       symbol: "¥",   flag: "🇨🇳", region: "Asia" },
  { code: "INR", name: "Indian Rupee",       symbol: "₹",   flag: "🇮🇳", region: "Asia" },
  { code: "AED", name: "UAE Dirham",         symbol: "AED", flag: "🇦🇪", region: "Middle East" },
];

const getCurrencyMeta = (code: string) =>
  ALL_CURRENCIES.find((c) => c.code === code) ?? {
    code,
    name: code,
    symbol: code,
    flag: "🌐",
    region: "Other",
  };

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000, 100000, 1000000];

export default function CurrencyConverterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { rates, lastUpdated, source, isLive, isLoading, refreshRates, getRate, convert } =
    useLiveExchangeRates();

  const userCurrency = user?.currency ?? "UGX";
  const defaultTo = userCurrency === "USD" ? "EUR" : "USD";

  const [fromCode, setFromCode] = useState(userCurrency);
  const [toCode, setToCode] = useState(defaultTo);
  const [inputValue, setInputValue] = useState("1");
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([userCurrency, defaultTo]);

  const spinValue = useRef(new Animated.Value(0)).current;

  // Derived live calculations
  const rate = useMemo(() => getRate(fromCode, toCode), [fromCode, toCode, getRate]);
  const inverse = useMemo(() => getRate(toCode, fromCode), [fromCode, toCode, getRate]);
  const numericInput = parseFloat(inputValue.replace(/,/g, "")) || 0;
  const convertedVal = numericInput * rate;
  const fromMeta = getCurrencyMeta(fromCode);
  const toMeta = getCurrencyMeta(toCode);

  const quickRates = useMemo(
    () =>
      ["USD", "EUR", "GBP", "KES", "TZS", "UGX", "NGN", "ZAR"]
        .filter((c) => c !== fromCode && c !== toCode)
        .slice(0, 6)
        .map((code: string) => ({
          code,
          meta: getCurrencyMeta(code),
          rate: getRate(fromCode, code),
          value: convert(numericInput, fromCode, code),
        })),
    [fromCode, toCode, numericInput, getRate, convert]
  );

  const filteredCurrencies = useMemo(() => {
    if (!search) return ALL_CURRENCIES;
    const q = search.toLowerCase();
    return ALL_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSwap = useCallback(() => {
    triggerHaptic.medium();
    Animated.sequence([
      Animated.timing(spinValue, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(spinValue, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
    setFromCode(toCode);
    setToCode(fromCode);
    setInputValue(convertedVal.toLocaleString(undefined, { maximumFractionDigits: 4 }));
  }, [fromCode, toCode, convertedVal, spinValue]);

  const handleQuickAmount = (amt: number) => {
    triggerHaptic.selection();
    setInputValue(amt.toLocaleString());
  };

  const handleCurrencyPick = (code: string) => {
    triggerHaptic.selection();
    if (pickerTarget === "from") {
      if (code === toCode) setToCode(fromCode);
      setFromCode(code);
    } else {
      if (code === fromCode) setFromCode(toCode);
      setToCode(code);
    }
    setPickerTarget(null);
    setSearch("");
  };

  const toggleFavorite = (code: string) => {
    triggerHaptic.selection();
    setFavorites((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleManualRefresh = async () => {
    triggerHaptic.medium();
    await refreshRates();
    triggerHaptic.success();
  };

  const spinRotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const rateText =
    rate >= 1
      ? `1 ${fromCode} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toCode}`
      : `1 ${fromCode} = ${rate.toFixed(6)} ${toCode}`;
  const inverseText =
    inverse >= 1
      ? inverse.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : inverse.toFixed(6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#4F46E5', '#3730A3', '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Currency Converter</Text>
          <View style={styles.headerStatusRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isLive ? "#10B981" : "#F59E0B" },
              ]}
            />
            <Text style={styles.headerSub}>
              {source || (isLive ? "Live Market Rates" : "Benchmark Rates")} · {lastUpdated}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleManualRefresh}
          activeOpacity={0.7}
          disabled={isLoading}
          style={styles.backBtn}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.4} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Converter Card */}
          <View
            style={[
              styles.converterCard,
              { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0', borderWidth: 1.2 },
            ]}
          >
            {/* FROM BLOCK */}
            <View
              style={[
                styles.currencyBlock, { backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle },
              ]}
            >
              <TouchableOpacity
                style={styles.currencySelector}
                activeOpacity={0.75}
                onPress={() => {
                  setPickerTarget("from");
                  setSearch("");
                }}
              >
                <Text style={{ fontSize: 28 }}>{fromMeta.flag}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.currencyCode, { color: colors.text }]}>
                    {fromMeta.code}
                  </Text>
                  <Text
                    style={[styles.currencyName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {fromMeta.name}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: colors.text, borderTopColor: colors.border },
                ]}
                value={inputValue}
                onChangeText={(t) => setInputValue(t.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
              />
            </View>

            {/* SWAP ROW */}
            <View style={styles.swapRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                onPress={handleSwap}
                activeOpacity={0.8}
                style={[styles.swapBtn, { backgroundColor: colors.primary }]}
              >
                <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                  <ArrowLeftRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Animated.View>
              </TouchableOpacity>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* TO BLOCK */}
            <View
              style={[
                styles.currencyBlock, { backgroundColor: isDark ? '#0B0F19' : colors.surfaceElevated, borderColor: isDark ? '#1E293B' : colors.borderSubtle },
              ]}
            >
              <TouchableOpacity
                style={styles.currencySelector}
                activeOpacity={0.75}
                onPress={() => {
                  setPickerTarget("to");
                  setSearch("");
                }}
              >
                <Text style={{ fontSize: 28 }}>{toMeta.flag}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.currencyCode, { color: colors.text }]}>
                    {toMeta.code}
                  </Text>
                  <Text
                    style={[styles.currencyName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {toMeta.name}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={[styles.resultRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.resultAmount, { color: colors.success }]}>
                  {toMeta.symbol}{" "}
                  {convertedVal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: convertedVal < 0.01 ? 8 : 2,
                  })}
                </Text>
              </View>
            </View>

            {/* LIVE RATE BANNER */}
            <View
              style={[
                styles.rateBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(99,102,241,0.12)"
                    : "rgba(99,102,241,0.08)",
                },
              ]}
            >
              {rate >= 1 ? (
                <TrendingUp size={13} color={colors.primary} />
              ) : (
                <TrendingDown size={13} color={colors.warning} />
              )}
              <Text style={[styles.rateText, { color: colors.primary }]}>
                {rateText}
              </Text>
              <Text style={[styles.rateInverse, { color: colors.textSecondary }]}>
                · 1 {toCode} = {inverseText} {fromCode}
              </Text>
            </View>
          </View>

          {/* Quick Amounts */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Quick Amounts
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {QUICK_AMOUNTS.map((amt: number) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => handleQuickAmount(amt)}
                  activeOpacity={0.75}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor:
                        numericInput === amt ? colors.primary : (isDark ? '#0F172A' : colors.surfaceElevated),
                      borderColor:
                        numericInput === amt ? colors.primary : (isDark ? '#1E293B' : colors.borderSubtle),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: numericInput === amt ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {amt >= 1000000
                      ? `${fromMeta.symbol} 1M`
                      : amt >= 1000
                      ? `${fromMeta.symbol} ${(amt / 1000).toFixed(0)}K`
                      : `${fromMeta.symbol} ${amt}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Also Equals Grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {numericInput.toLocaleString()} {fromMeta.symbol} also equals
            </Text>
            <View
              style={[
                styles.gridContainer,
                { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0', borderWidth: 1.2 },
              ]}
            >
              {quickRates.map((item, idx) => (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.75}
                  onPress={() => {
                    setToCode(item.code);
                    triggerHaptic.selection();
                  }}
                  style={[
                    styles.gridItem,
                    {
                      borderBottomColor: isDark ? '#1E293B' : colors.border,
                      borderRightColor: isDark ? '#1E293B' : colors.border,
                      borderBottomWidth: idx < quickRates.length - 2 ? 1 : 0,
                      borderRightWidth: idx % 2 === 0 ? 1 : 0,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{item.meta.flag}</Text>
                    <Text
                      style={[styles.gridCode, { color: colors.textSecondary }]}
                    >
                      {item.code}
                    </Text>
                  </View>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {item.meta.symbol}{" "}
                    {item.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: item.value < 0.01 ? 6 : 2,
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Favourites */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Favourite Pairs
            </Text>
            {favorites.length === 0 && (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Star currencies in the picker to save them here.
              </Text>
            )}
            {favorites.map((fav: string) => {
              const m = getCurrencyMeta(fav);
              const favRate = getRate(fromCode, fav);
              return (
                <TouchableOpacity
                  key={fav}
                  activeOpacity={0.75}
                  onPress={() => {
                    setToCode(fav);
                    triggerHaptic.selection();
                  }}
                  style={[
                    styles.favRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{m.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.favCode, { color: colors.text }]}>
                      {m.code} · {m.name}
                    </Text>
                    <Text
                      style={[styles.favRate, { color: colors.textSecondary }]}
                    >
                      1 {fromCode} ={" "}
                      {favRate >= 1
                        ? favRate.toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })
                        : favRate.toFixed(6)}{" "}
                      {fav}
                    </Text>
                  </View>
                  <Text style={[styles.favValue, { color: colors.success }]}>
                    {m.symbol}{" "}
                    {(numericInput * favRate).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(fav)}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                  >
                    <BookmarkCheck size={16} color={colors.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Picker Modal */}
      <Modal
        visible={!!pickerTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.pickerOverlay}>
          <View
            style={[
              styles.pickerCard,
              {
                backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.pickerHeader,
                { borderBottomColor: isDark ? '#1E293B' : colors.border },
              ]}
            >
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select {pickerTarget === "from" ? "From" : "To"} Currency
              </Text>
              <TouchableOpacity
                onPress={() => setPickerTarget(null)}
                style={[
                  styles.closeBtn,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={15} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search currency..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isCurrent =
                  pickerTarget === "from"
                    ? item.code === fromCode
                    : item.code === toCode;
                const isFav = favorites.includes(item.code);
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      {
                        backgroundColor: isCurrent
                          ? isDark
                            ? "rgba(99,102,241,0.2)"
                            : "rgba(99,102,241,0.08)"
                          : "transparent",
                        borderBottomColor: isDark ? '#1E293B' : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleCurrencyPick(item.code)}
                  >
                    <Text style={{ fontSize: 26 }}>{item.flag}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.pickerCode, { color: colors.text }]}>
                        {item.code}
                        {isCurrent ? " ✓" : ""}
                      </Text>
                      <Text
                        style={[
                          styles.pickerName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.name} · {item.symbol}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.code);
                      }}
                      style={{ padding: 6 }}
                    >
                      <Star
                        size={16}
                        color={isFav ? "#F59E0B" : colors.textMuted}
                        fill={isFav ? "#F59E0B" : "transparent"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  converterCard: {
    marginHorizontal: Spacing.md,
    marginTop: 16,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    overflow: "hidden",
    padding: Spacing.md,
    gap: 10,
  },
  currencyBlock: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  currencySelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: "800",
  },
  currencyName: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    letterSpacing: -0.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  resultAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  rateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    flexWrap: "wrap",
  },
  rateText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rateInverse: {
    fontSize: 11,
    fontWeight: "500",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  gridContainer: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "50%",
    padding: Spacing.md,
  },
  gridCode: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  gridValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: 8,
  },
  favCode: {
    fontSize: 14,
    fontWeight: "700",
  },
  favRate: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  favValue: {
    fontSize: 15,
    fontWeight: "800",
    marginHorizontal: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
    justifyContent: "flex-end",
  },
  pickerCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    height: "78%",
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
  },
  pickerCode: {
    fontSize: 14,
    fontWeight: "800",
  },
  pickerName: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});

