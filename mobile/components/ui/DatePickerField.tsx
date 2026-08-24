import React, { useState, useMemo } from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date...',
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current value or fallback to today
  const initialDate = useMemo(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [tempSelectedDate, setTempSelectedDate] = useState<string>(
    value || new Date().toISOString().split('T')[0]
  );

  const handleOpen = () => {
    triggerHaptic.selection();
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
        setTempSelectedDate(value);
      }
    }
    setModalVisible(true);
  };

  const handlePrevMonth = () => {
    triggerHaptic.selection();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    triggerHaptic.selection();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    triggerHaptic.selection();
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    setTempSelectedDate(dateStr);
  };

  const handleApplyPreset = (presetType: string) => {
    triggerHaptic.selection();
    const now = new Date();
    let target = new Date();

    if (presetType === 'today') {
      target = now;
    } else if (presetType === 'tomorrow') {
      target.setDate(now.getDate() + 1);
    } else if (presetType === '7days') {
      target.setDate(now.getDate() + 7);
    } else if (presetType === 'end_month') {
      target = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (presetType === 'next_month') {
      target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (presetType === '1year') {
      target.setFullYear(now.getFullYear() + 1);
    }

    const dateStr = target.toISOString().split('T')[0];
    setTempSelectedDate(dateStr);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const handleConfirm = () => {
    triggerHaptic.success();
    onChange(tempSelectedDate);
    setModalVisible(false);
  };

  // Calendar Grid Builder
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Readable Formatted Label
  const formattedDisplay = useMemo(() => {
    if (!value) return placeholder;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [value, placeholder]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      {/* Field Trigger Box */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpen}
        style={[
          styles.triggerBox,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
            <CalendarIcon size={18} color={colors.primary} />
          </View>
          <View>
            <Text
              style={[
                styles.triggerText,
                { color: value ? colors.text : colors.textMuted },
              ]}
            >
              {formattedDisplay}
            </Text>
            {value ? (
              <Text style={[styles.subValueText, { color: colors.textMuted }]}>
                {value}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.changeChip, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.changeChipText, { color: colors.primary }]}>Pick Date</Text>
        </View>
      </TouchableOpacity>

      {/* Calendar Selector Modal */}
      <RNModal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CalendarIcon size={18} color={colors.primary} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Select Date
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setModalVisible(false)}
                    style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Quick Presets Carousel */}
                <View style={styles.presetSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: Spacing.md }}>
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'tomorrow', label: 'Tomorrow' },
                      { id: '7days', label: '+7 Days' },
                      { id: 'end_month', label: 'End of Month' },
                      { id: 'next_month', label: 'Next Month' },
                      { id: '1year', label: '+1 Year' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        activeOpacity={0.7}
                        onPress={() => handleApplyPreset(p.id)}
                        style={[styles.presetChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      >
                        <Text style={[styles.presetChipText, { color: colors.primary }]}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Month & Year Navigator */}
                <View style={styles.monthNavigator}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handlePrevMonth}
                    style={[styles.navArrowBtn, { backgroundColor: colors.surfaceElevated }]}
                  >
                    <ChevronLeft size={20} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={[styles.monthYearTitle, { color: colors.text }]}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleNextMonth}
                    style={[styles.navArrowBtn, { backgroundColor: colors.surfaceElevated }]}
                  >
                    <ChevronRight size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Headers */}
                <View style={styles.weekDaysRow}>
                  {WEEK_DAYS.map((wd) => (
                    <Text key={wd} style={[styles.weekDayText, { color: colors.textMuted }]}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* 6x7 Days Grid */}
                <View style={styles.daysGrid}>
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCell} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNumber = i + 1;
                    const mm = String(viewMonth + 1).padStart(2, '0');
                    const dd = String(dayNumber).padStart(2, '0');
                    const dateStr = `${viewYear}-${mm}-${dd}`;
                    const isSelected = tempSelectedDate === dateStr;

                    return (
                      <TouchableOpacity
                        key={dayNumber}
                        activeOpacity={0.7}
                        onPress={() => handleSelectDay(dayNumber)}
                        style={[
                          styles.dayCell,
                          isSelected && {
                            backgroundColor: colors.primary,
                            borderRadius: Radius.full,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.text,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {dayNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Confirm Button */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleConfirm}
                    style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                  >
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.confirmBtnText}>
                      Set Date: {tempSelectedDate}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subValueText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  changeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  changeChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
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
  presetSection: {
    paddingVertical: Spacing.sm,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayNumberText: {
    fontSize: 13,
  },
  modalFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.lg,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
