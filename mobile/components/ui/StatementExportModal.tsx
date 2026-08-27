import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Download,
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
type DateRangePreset = 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'all_time';
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

  // Filter transactions based on selected criteria
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);

      // 1. Date Range Filter
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

      // 2. Account Filter
      if (selectedAccountId !== 'all') {
        const accId = tx.accountId || (tx as any).account_id;
        if (String(accId) !== String(selectedAccountId)) return false;
      }

      // 3. Type Filter
      if (typeFilter === 'income') {
        if (!isIncomeType(tx.type)) return false;
      } else if (typeFilter === 'expense') {
        if (!isExpenseType(tx.type)) return false;
      }

      return true;
    });
  }, [transactions, dateRange, selectedAccountId, typeFilter]);

  // Compute summary for the filtered data
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
      case 'this_month':
        return 'This Month';
      case 'last_month':
        return 'Last Month';
      case 'last_30_days':
        return 'Last 30 Days';
      case 'last_90_days':
        return 'Last 90 Days';
      case 'this_year':
        return 'Year to Date';
      case 'all_time':
        return 'All Time';
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
        accountName: tx.account?.name || accMap.get(String(tx.accountId || (tx as any).account_id)) || 'General',
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

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Download size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Export Statement</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Generate financial PDF or Excel reports
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Format Selection */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Statement Format</Text>
            <View style={styles.formatRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  setFormat('pdf');
                }}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: format === 'pdf' ? (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)') : colors.surfaceElevated,
                    borderColor: format === 'pdf' ? colors.primary : colors.border,
                  },
                ]}
              >
                <FileText size={24} color={format === 'pdf' ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formatTitle, { color: format === 'pdf' ? colors.primary : colors.text }]}>
                    PDF Document
                  </Text>
                  <Text style={[styles.formatSub, { color: colors.textSecondary }]}>
                    Formatted A4 statement with executive summary & tables
                  </Text>
                </View>
                {format === 'pdf' && (
                  <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  setFormat('excel');
                }}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: format === 'excel' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)') : colors.surfaceElevated,
                    borderColor: format === 'excel' ? '#10B981' : colors.border,
                  },
                ]}
              >
                <FileSpreadsheet size={24} color={format === 'excel' ? '#10B981' : colors.textSecondary} />
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
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Date Range Presets */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
              Period / Date Range
            </Text>
            <View style={styles.chipsWrap}>
              {[
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'last_90_days', label: 'Last 90 Days' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all_time', label: 'All Time' },
              ].map((item) => {
                const isSelected = dateRange === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.selection();
                      setDateRange(item.id as DateRangePreset);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Transaction Type Scope */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
              Transaction Type
            </Text>
            <View style={styles.chipsWrap}>
              {[
                { id: 'all', label: 'All Transactions' },
                { id: 'income', label: 'Income Only (+)' },
                { id: 'expense', label: 'Expenses Only (-)' },
              ].map((item) => {
                const isSelected = typeFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.selection();
                      setTypeFilter(item.id as TypeFilter);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Account Scope Filter */}
            {accounts.length > 1 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
                  Account Filter
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: Spacing.lg }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.selection();
                      setSelectedAccountId('all');
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedAccountId === 'all' ? colors.primary : colors.surfaceElevated,
                        borderColor: selectedAccountId === 'all' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selectedAccountId === 'all' ? '#FFFFFF' : colors.text }]}>
                      All Accounts ({accounts.length})
                    </Text>
                  </TouchableOpacity>

                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          triggerHaptic.selection();
                          setSelectedAccountId(acc.id);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* 5. Redesigned Live Summary Preview Card */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.previewHeaderRow}>
                <Text style={[styles.previewHeading, { color: colors.textSecondary }]}>
                  Report Contents Preview
                </Text>
                <View style={[styles.previewCountBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }]}>
                  <Text style={[styles.previewCountText, { color: colors.primary }]}>
                    {summary.transactionCount} Transactions
                  </Text>
                </View>
              </View>

              <View style={styles.previewCardsGrid}>
                {/* Total Inflow Card */}
                <View
                  style={[
                    styles.previewMiniCard,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                    },
                  ]}
                >
                  <View style={styles.miniLabelRow}>
                    <TrendingUp size={13} color="#10B981" />
                    <Text style={[styles.previewMiniLabel, { color: '#10B981' }]}>Total Inflows</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.previewMiniVal, { color: '#10B981' }]}
                  >
                    +{user?.currency_symbol || 'UGX'} {summary.totalIncome.toLocaleString()}
                  </Text>
                </View>

                {/* Total Outflow Card */}
                <View
                  style={[
                    styles.previewMiniCard,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                    },
                  ]}
                >
                  <View style={styles.miniLabelRow}>
                    <TrendingDown size={13} color="#EF4444" />
                    <Text style={[styles.previewMiniLabel, { color: '#EF4444' }]}>Total Outflows</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.previewMiniVal, { color: '#EF4444' }]}
                  >
                    -{user?.currency_symbol || 'UGX'} {summary.totalExpense.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Net Cash Flow Row */}
              <View style={[styles.previewNetRow, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.previewNetLabel, { color: colors.textSecondary }]}>Net Cash Flow:</Text>
                <Text
                  style={[
                    styles.previewNetVal,
                    { color: summary.netSavings >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {summary.netSavings >= 0 ? '↗ +' : '↘ -'}{user?.currency_symbol || 'UGX'} {Math.abs(summary.netSavings).toLocaleString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Action Footer (Always Visible) */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, Spacing.md),
              },
            ]}
          >
            {format === 'pdf' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePrintPreview}
                style={[
                  styles.previewBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Printer size={18} color={colors.text} />
              </TouchableOpacity>
            )}

            <Button
              title={
                isExporting
                  ? 'Generating...'
                  : format === 'excel'
                  ? 'Export Excel (.CSV) Statement'
                  : 'Export PDF Statement'
              }
              size="lg"
              loading={isExporting}
              onPress={handleExport}
              style={{
                flex: 1,
                backgroundColor: format === 'excel' ? '#10B981' : undefined,
              }}
              icon={
                format === 'excel' ? (
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    height: '88%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  formatRow: {
    gap: Spacing.sm,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  formatSub: {
    fontSize: 12,
    marginTop: 2,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  previewCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewCardsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  previewMiniCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  miniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  previewMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewMiniVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  previewNetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  previewNetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewNetVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  previewBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});