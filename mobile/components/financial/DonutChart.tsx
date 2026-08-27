import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

export interface SliceData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data: { category: string; amount: number; percentage: number; color?: string }[];
  currencySymbol?: string;
  totalAmount: number;
  onCategoryPress?: (slice: SliceData) => void;
}

const PALETTE = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#F97316', // Orange
];

export const DonutChart: React.FC<DonutChartProps> = ({
  data = [],
  currencySymbol = 'UGX',
  totalAmount,
  onCategoryPress,
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const [selectedSlice, setSelectedSlice] = useState<SliceData | null>(null);

  const radius = 70;
  const strokeWidth = 22;
  const center = radius + strokeWidth;
  const size = center * 2;
  const circumference = 2 * Math.PI * radius;

  // Prepare slices with colors
  const slices: SliceData[] = data.map((item, idx) => ({
    ...item,
    color: item.color || PALETTE[idx % PALETTE.length],
  }));

  let accumulatedAngle = 0;

  const handleSelectSlice = (slice: SliceData) => {
    triggerHaptic.selection();
    if (selectedSlice?.category === slice.category) {
      setSelectedSlice(null);
    } else {
      setSelectedSlice(slice);
    }
    if (onCategoryPress) {
      onCategoryPress(slice);
    }
  };

  if (data.length === 0 || totalAmount <= 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No category spending recorded for this period.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* SVG Donut Circle */}
      <View style={styles.svgWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background Track Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={isDark ? '#1E293B' : '#F1F5F9'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Colored Segment Arcs */}
            {slices.map((slice, idx) => {
              const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += (slice.percentage / 100) * circumference;

              const isSelected = selectedSlice?.category === slice.category;

              return (
                <Circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  opacity={selectedSlice && !isSelected ? 0.4 : 1}
                />
              );
            })}
          </G>
        </Svg>

        {/* Center Readout Text */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => selectedSlice && onCategoryPress && onCategoryPress(selectedSlice)}
          style={[styles.centerTextContainer, { width: (radius - strokeWidth / 2) * 2 }]}
        >
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>
            {selectedSlice ? selectedSlice.category : 'Total Spent'}
          </Text>
          <Text
            style={[
              styles.centerAmount,
              { color: selectedSlice ? selectedSlice.color : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {formatAmount(selectedSlice ? selectedSlice.amount : totalAmount, currencySymbol)}
          </Text>
          {selectedSlice && (
            <Text style={[styles.centerPct, { color: selectedSlice.color }]}>
              {selectedSlice.percentage}% (Tap for details)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Legend Chips Grid */}
      <View style={styles.legendContainer}>
        {slices.map((slice, idx) => {
          const isSelected = selectedSlice?.category === slice.category;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => handleSelectSlice(slice)}
              style={[
                styles.legendChip,
                {
                  backgroundColor: isSelected
                    ? `${slice.color}20`
                    : colors.surfaceElevated,
                  borderColor: isSelected ? slice.color : colors.border,
                },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text
                style={[
                  styles.legendCategoryName,
                  { color: isSelected ? slice.color : colors.text },
                ]}
                numberOfLines={1}
              >
                {slice.category}
              </Text>
              <Text style={[styles.legendPct, { color: colors.textSecondary }]}>
                {slice.percentage}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  centerAmount: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  centerPct: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendCategoryName: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 90,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '600',
  },
});