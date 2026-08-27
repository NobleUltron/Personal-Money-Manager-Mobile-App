import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Account, Transaction } from '../../types';
import { StatementPdfGenerator, StatementData } from '../../services/export/pdfGenerator';
import { StatementExcelGenerator } from '../../services/export/excelGenerator';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from './Button';
import { Radius, Spacing } from '../../constants/theme';

type ExportFormat = 'pdf' | 'excel';
type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'all_time';
type TypeFilter = 'all' | 'income' | 'expense';

interface StatementExportModalProps {
  visible: boolean;
  onClose: () => void;
  transactions?: Transaction[];
  accounts?: Account[];
}

export const isIncomeType = (type?: string) => {
  const t = String(type || '').toLowerCase();
  return t === 'income' || t === 'deposit';
};

export const isExpenseType = (type?: string) => {
  const t = String(type || '').toLowerCase();
  return t === 'expense' || t === 'withdrawal';
};

export const StatementExportModal: React.FC<StatementExportModalProps> = ({
  visible,
  onClose,
  transactions = [],
  accounts = [],
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
  const [selectedAccountId, setSelectedAccountId] = useState<string | number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);

      if (dateRange === 'this_month') {
        if (txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) return false;
      } else if (dateRange === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        if (txDate.getFullYear() !== lastMonthYear || txDate.getMonth() !== lastMonth) return false;
      } else if (dateRange === 'last_30_days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (txDate < thirtyDaysAgo) return false;
      } else if (dateRange === 'last_90_days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        if (txDate < ninetyDaysAgo) return false;
      } else if (dateRange === 'this_year') {
        if (txDate.getFullYear() !== currentYear) return false;
      }

      if (selectedAccountId !== 'all') {
        const accId = tx.accountId || (tx as any).account_id;
        if (String(accId) !== String(selectedAccountId)) return false;
      }

      if (typeFilter === 'income') {
        if (!isIncomeType(tx.type)) return false;
      } else if (typeFilter === 'expense') {
        if (!isExpenseType(tx.type)) return false;
      }

      return true;
    });
  }, [transactions, dateRange, selectedAccountId, typeFilter]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (isIncomeType(tx.type)) totalIncome += amt;
      else if (isExpenseType(tx.type)) totalExpense += amt;
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      totalBalance,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions, accounts]);

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'last_30_days': return 'Last 30 Days';
      case 'last_90_days': return 'Last 90 Days';
      case 'this_year': return 'Year to Date';
      case 'all_time': return 'All Time';
    }
  };

  const prepareStatementData = (): StatementData => {
    const accMap = new Map(accounts.map((a) => [String(a.id), a.name]));
    return {
      userName: user?.username || 'Valued Client',
      userEmail: user?.email || undefined,
      currency: user?.currency || 'UGX',
      currencySymbol: user?.currency_symbol || user?.currency || 'UGX',
      periodLabel: getDateRangeLabel(),
      generatedAt: new Date(),
      summary,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance) || 0,
      })),
      transactions: filteredTransactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        type: tx.type,
        category: tx.category,
        amount: Number(tx.amount) || 0,
        accountName:
          tx.account?.name ||
          accMap.get(String(tx.accountId || (tx as any).account_id)) ||
          'General',
        description: tx.reason || (tx as any).description,
      })),
    };
  };

  const handleExport = async () => {
    triggerHaptic.medium();
    setIsExporting(true);
    try {
      const data = prepareStatementData();
      if (format === 'pdf') {
        await StatementPdfGenerator.generateAndShare(data);
      } else {
        await StatementExcelGenerator.generateAndShare(data);
      }
      triggerHaptic.success();
      onClose();
    } catch (err: any) {
      triggerHaptic.error();
      console.warn('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPreview = async () => {
    triggerHaptic.selection();
    try {
      const data = prepareStatementData();
      await StatementPdfGenerator.printDirectly(data);
    } catch (err) {
      console.warn('Print preview error:', err);
    }
  };

  const isExcel = format === 'excel';
  const cs = user?.currency_symbol || 'UGX';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Full-screen dimmed backdrop */}
      <View style={styles.backdrop}>
        {/* Modal sheet — fixed height column: header + scroll + footer */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* ── HEADER (never scrolls) ── */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isExcel
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(99,102,241,0.15)',
                  },
                ]}
              >
                {isExcel ? (
                  <FileSpreadsheet size={20} color="#10B981" />
                ) : (
                  <FileText size={20} color="#6366F1" />
                )}
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Export Statement
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {isExcel ? 'Spreadsheet (.CSV) dataset' : 'Formatted A4 executive report'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── SCROLLABLE OPTIONS BODY ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* FORMAT SELECTION */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Statement Format
            </Text>

            {/* PDF card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { triggerHaptic.selection(); setFormat('pdf'); }}
              style={[
                styles.formatCard,
                {
                  backgroundColor:
                    format === 'pdf'
                      ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)')
                      : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: format === 'pdf' ? '#6366F1' : (isDark ? '#334155' : '#E2E8F0'),
                },
              ]}
            >
              <View style={[styles.formatIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <FileText size={22} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatTitle, { color: format === 'pdf' ? '#6366F1' : colors.text }]}>
                  PDF Document
                </Text>
                <Text style={[styles.formatSub, { color: colors.textSecondary }]}>
                  Formatted A4 statement with executive summary & tables
                </Text>
              </View>
              {format === 'pdf' && (
                <View style={[styles.checkDot, { backgroundColor: '#6366F1' }]}>
                  <Check size={11} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>

            {/* Excel card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { triggerHaptic.selection(); setFormat('excel'); }}
              style={[
                styles.formatCard,
                {
                  backgroundColor:
                    format === 'excel'
                      ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.1)')
                      : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: format === 'excel' ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'),
                },
              ]}
            >
              <View style={[styles.formatIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <FileSpreadsheet size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatTitle, { color: format === 'excel' ? '#10B981' : colors.text }]}>
                  Excel Spreadsheet
                </Text>
                <Text style={[styles.formatSub, { color: colors.textSecondary }]}>
                  Compatible .CSV for Excel, Google Sheets, & Numbers
                </Text>
              </View>
              {format === 'excel' && (
                <View style={[styles.checkDot, { backgroundColor: '#10B981' }]}>
                  <Check size={11} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>

            {/* PERIOD */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Period / Date Range
            </Text>
            <View style={styles.chipsRow}>
              {(
                [
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'last_30_days', label: 'Last 30 Days' },
                  { id: 'last_90_days', label: 'Last 90 Days' },
                  { id: 'this_year', label: 'This Year' },
                  { id: 'all_time', label: 'All Time' },
                ] as { id: DateRangePreset; label: string }[]
              ).map((item) => {
                const sel = dateRange === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => { triggerHaptic.selection(); setDateRange(item.id); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: sel ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: sel ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sel ? '#FFF' : colors.text }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TYPE */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Transaction Type
            </Text>
            <View style={styles.chipsRow}>
              {(
                [
                  { id: 'all', label: 'All Transactions' },
                  { id: 'income', label: 'Income Only (+)' },
                  { id: 'expense', label: 'Expenses Only (-)' },
                ] as { id: TypeFilter; label: string }[]
              ).map((item) => {
                const sel = typeFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => { triggerHaptic.selection(); setTypeFilter(item.id); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: sel ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: sel ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sel ? '#FFF' : colors.text }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ACCOUNT FILTER */}
            {accounts.length > 1 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  Account Filter
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { triggerHaptic.selection(); setSelectedAccountId('all'); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedAccountId === 'all' ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor:
                          selectedAccountId === 'all' ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selectedAccountId === 'all' ? '#FFF' : colors.text },
                      ]}
                    >
                      All Accounts ({accounts.length})
                    </Text>
                  </TouchableOpacity>
                  {accounts.map((acc) => {
                    const sel = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        activeOpacity={0.7}
                        onPress={() => { triggerHaptic.selection(); setSelectedAccountId(acc.id); }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: sel ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                            borderColor: sel ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: sel ? '#FFF' : colors.text }]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* PREVIEW CARD */}
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: isDark ? '#111C30' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.previewHeaderRow}>
                <Text style={[styles.previewHeading, { color: colors.textSecondary }]}>
                  Report Contents Preview
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)' },
                  ]}
                >
                  <Text style={[styles.countText, { color: colors.primary }]}>
                    {summary.transactionCount} Transactions
                  </Text>
                </View>
              </View>

              <View style={styles.previewGrid}>
                {/* Inflows */}
                <View
                  style={[
                    styles.miniCard,
                    {
                      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
                    },
                  ]}
                >
                  <View style={styles.miniLabelRow}>
                    <TrendingUp size={12} color="#10B981" />
                    <Text style={[styles.miniLabel, { color: '#10B981' }]}>Total Inflows</Text>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.miniVal, { color: '#10B981' }]}>
                    +{cs} {summary.totalIncome.toLocaleString()}
                  </Text>
                </View>

                {/* Outflows */}
                <View
                  style={[
                    styles.miniCard,
                    {
                      backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239,68,68,0.25)' : '#FECACA',
                    },
                  ]}
                >
                  <View style={styles.miniLabelRow}>
                    <TrendingDown size={12} color="#EF4444" />
                    <Text style={[styles.miniLabel, { color: '#EF4444' }]}>Total Outflows</Text>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.miniVal, { color: '#EF4444' }]}>
                    -{cs} {summary.totalExpense.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.netRow,
                  { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0' },
                ]}
              >
                <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Cash Flow:</Text>
                <Text
                  style={[
                    styles.netVal,
                    { color: summary.netSavings >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {summary.netSavings >= 0 ? '↗ +' : '↘ -'}{cs}{' '}
                  {Math.abs(summary.netSavings).toLocaleString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* ── FOOTER (never scrolls, always pinned at bottom) ── */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              },
            ]}
          >
            {format === 'pdf' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePrintPreview}
                style={[
                  styles.printBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Printer size={18} color={colors.text} />
              </TouchableOpacity>
            )}

            <Button
              title={
                isExporting
                  ? 'Generating...'
                  : isExcel
                  ? 'Export Excel (.CSV) Statement'
                  : 'Export PDF Statement'
              }
              variant={isExcel ? 'success' : 'primary'}
              size="lg"
              loading={isExporting}
              onPress={handleExport}
              style={{ flex: 1 }}
              icon={
                isExcel ? (
                  <FileSpreadsheet size={18} color="#FFFFFF" />
                ) : (
                  <Share2 size={18} color="#FFFFFF" />
                )
              }
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  // Dimmed backdrop fills entire screen
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  // Sheet is a FIXED-HEIGHT flex column — height is capped, never grows past screen
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    // flexDirection column with explicit flex children ensures footer stays put
    flexDirection: 'column',
  },
  // HEADER — fixed, not in scroll
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // SCROLL — flex: 1 so it takes remaining space between header and footer
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 8,
  },
  formatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  formatSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  miniCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  netVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  // FOOTER — fixed at bottom, never scrolls
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  printBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});