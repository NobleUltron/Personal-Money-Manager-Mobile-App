import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

export interface MonthlyCashflowItem {
  month: string;
  year: number;
  income: number;
  expense: number;
  net: number;
}

interface IncomeExpenseBarChartProps {
  data: MonthlyCashflowItem[];
  currencySymbol?: string;
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({
  data = [],
  currencySymbol = 'UGX',
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const [selectedMonth, setSelectedMonth] = useState<MonthlyCashflowItem | null>(null);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No historical cashflow records available.
        </Text>
      </View>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income || 0, d.expense || 0)),
    1000
  );

  const chartHeight = 150;

  const handleBarTap = (item: MonthlyCashflowItem) => {
    triggerHaptic.selection();
    if (selectedMonth?.month === item.month && selectedMonth?.year === item.year) {
      setSelectedMonth(null);
    } else {
      setSelectedMonth(item);
    }
  };

  return (
    <View style={styles.container}>
      {/* Legend & Header */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expenses</Text>
        </View>
      </View>

      {/* Bars Container */}
      <View style={[styles.barsContainer, { height: chartHeight }]}>
        {data.map((item, idx) => {
          const isSelected = selectedMonth?.month === item.month && selectedMonth?.year === item.year;
          const incomeHeight = Math.max(6, Math.round(((item.income || 0) / maxVal) * (chartHeight - 34)));
          const expenseHeight = Math.max(6, Math.round(((item.expense || 0) / maxVal) * (chartHeight - 34)));

          const savingsRate =
            item.income > 0 ? Math.round(((item.income - item.expense) / item.income) * 100) : 0;

          return (
            <TouchableOpacity
              key={`${item.month}-${item.year}-${idx}`}
              activeOpacity={0.7}
              onPress={() => handleBarTap(item)}
              style={[
                styles.barGroup,
                isSelected && {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                  borderRadius: Radius.md,
                },
              ]}
            >
              {/* Savings Rate Micro-Badge */}
              {item.income > 0 && (
                <View
                  style={[
                    styles.rateBadge,
                    {
                      backgroundColor:
                        savingsRate >= 20
                          ? 'rgba(16, 185, 129, 0.18)'
                          : savingsRate > 0
                          ? 'rgba(245, 158, 11, 0.18)'
                          : 'rgba(239, 68, 68, 0.18)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rateBadgeText,
                      {
                        color:
                          savingsRate >= 20 ? '#10B981' : savingsRate > 0 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  >
                    {savingsRate > 0 ? `+${savingsRate}%` : `${savingsRate}%`}
                  </Text>
                </View>
              )}

              {/* Dual Bars */}
              <View style={styles.barsPair}>
                {/* Income Bar */}
                <View
                  style={[
                    styles.singleBar,
                    {
                      height: incomeHeight,
                      backgroundColor: '#10B981',
                      opacity: isSelected ? 1 : 0.85,
                    },
                  ]}
                />
                {/* Expense Bar */}
                <View
                  style={[
                    styles.singleBar,
                    {
                      height: expenseHeight,
                      backgroundColor: '#EF4444',
                      opacity: isSelected ? 1 : 0.85,
                    },
                  ]}
                />
              </View>

              {/* Month Label */}
              <Text
                style={[
                  styles.monthLabel,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {item.month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Month Tooltip Detail Box */}
      {selectedMonth && (
        <View
          style={[
            styles.tooltipBox,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipMonthTitle, { color: colors.text }]}>
              {selectedMonth.month} {selectedMonth.year} Performance
            </Text>
            <View
              style={[
                styles.savingsTag,
                {
                  backgroundColor:
                    selectedMonth.net >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.savingsTagText,
                  { color: selectedMonth.net >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {selectedMonth.net >= 0
                  ? `+${Math.round(((selectedMonth.net || 0) / (selectedMonth.income || 1)) * 100)}% Retained`
                  : 'Deficit'}
              </Text>
            </View>
          </View>

          <View style={styles.tooltipMetricsRow}>
            <View style={styles.tooltipMetric}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <ArrowDownLeft size={13} color="#10B981" />
                <Text style={[styles.tooltipMetricLabel, { color: colors.textSecondary }]}>Inflow</Text>
              </View>
              <Text style={[styles.tooltipMetricVal, { color: '#10B981' }]}>
                {formatAmount(selectedMonth.income || 0, currencySymbol)}
              </Text>
            </View>

            <View style={styles.tooltipDivider} />

            <View style={styles.tooltipMetric}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <ArrowUpRight size={13} color="#EF4444" />
                <Text style={[styles.tooltipMetricLabel, { color: colors.textSecondary }]}>Outflow</Text>
              </View>
              <Text style={[styles.tooltipMetricVal, { color: '#EF4444' }]}>
                {formatAmount(selectedMonth.expense || 0, currencySymbol)}
              </Text>
            </View>

            <View style={styles.tooltipDivider} />

            <View style={styles.tooltipMetric}>
              <Text style={[styles.tooltipMetricLabel, { color: colors.textSecondary }]}>Net Savings</Text>
              <Text
                style={[
                  styles.tooltipMetricVal,
                  { color: selectedMonth.net >= 0 ? colors.text : '#EF4444' },
                ]}
              >
                {selectedMonth.net >= 0 ? '+' : ''}{formatAmount(selectedMonth.net || 0, currencySymbol)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  rateBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  rateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  barsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 6,
  },
  singleBar: {
    width: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  monthLabel: {
    fontSize: 11,
  },
  tooltipBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltipMonthTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  savingsTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  savingsTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tooltipMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltipMetric: {
    flex: 1,
    alignItems: 'center',
  },
  tooltipMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipMetricVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  tooltipDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
});