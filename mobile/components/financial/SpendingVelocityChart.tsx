import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { TrendingUp, Flame, Calendar, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing } from '../../constants/theme';

interface DailyPoint {
  date: string;
  label: string;
  amount: number;
  income?: number;
}

interface SpendingVelocityChartProps {
  data: DailyPoint[];
  dailyAvg?: number;
  currencySymbol?: string;
}

export const SpendingVelocityChart: React.FC<SpendingVelocityChartProps> = ({
  data = [],
  dailyAvg = 0,
  currencySymbol = 'UGX',
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();
  const { width: windowWidth } = useWindowDimensions();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartWidth = Math.max(300, windowWidth - Spacing.md * 4);
  const chartHeight = 160;
  const paddingBottom = 26;
  const paddingTop = 16;
  const paddingHorizontal = 16;

  const drawableWidth = chartWidth - paddingHorizontal * 2;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  const { points, maxVal, pathD, areaD, avgY } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], maxVal: 1, pathD: '', areaD: '', avgY: 0 };
    }

    const max = Math.max(...data.map((d) => d.amount || 0), dailyAvg * 1.3, 1000);
    const count = data.length;
    const stepX = count > 1 ? drawableWidth / (count - 1) : drawableWidth;

    const computedPoints = data.map((d, idx) => {
      const x = paddingHorizontal + idx * stepX;
      const normalizedY = ((d.amount || 0) / max) * drawableHeight;
      const y = paddingTop + drawableHeight - normalizedY;
      return { ...d, x, y };
    });

    // Create smooth bezier curve
    let linePath = '';
    let areaPath = '';

    if (computedPoints.length > 0) {
      linePath = `M ${computedPoints[0].x} ${computedPoints[0].y}`;

      for (let i = 0; i < computedPoints.length - 1; i++) {
        const p0 = computedPoints[i];
        const p1 = computedPoints[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }

      const firstX = computedPoints[0].x;
      const lastX = computedPoints[computedPoints.length - 1].x;
      const bottomY = paddingTop + drawableHeight;
      areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    const normalizedAvg = (dailyAvg / max) * drawableHeight;
    const computedAvgY = paddingTop + drawableHeight - normalizedAvg;

    return {
      points: computedPoints,
      maxVal: max,
      pathD: linePath,
      areaD: areaPath,
      avgY: computedAvgY,
    };
  }, [data, dailyAvg, drawableWidth, drawableHeight, paddingHorizontal, paddingTop]);

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  const handlePointTap = (index: number) => {
    triggerHaptic.selection();
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
    }
  };

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No spending records available for this period.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Value / Tooltip Readout */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {selectedPoint ? selectedPoint.label : 'Daily Velocity Curve'}
          </Text>
          <Text style={[styles.headerMainAmount, { color: selectedPoint ? '#EF4444' : colors.text }]}>
            {selectedPoint
              ? formatAmount(selectedPoint.amount, currencySymbol)
              : `Avg: ${formatAmount(dailyAvg, currencySymbol)}/day`}
          </Text>
        </View>

        {selectedPoint && (
          <View
            style={[
              styles.deltaBadge,
              {
                backgroundColor:
                  selectedPoint.amount > dailyAvg
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.deltaBadgeText,
                { color: selectedPoint.amount > dailyAvg ? '#EF4444' : '#10B981' },
              ]}
            >
              {selectedPoint.amount > dailyAvg
                ? `+${Math.round(((selectedPoint.amount - dailyAvg) / (dailyAvg || 1)) * 100)}% vs avg`
                : `${Math.round(((selectedPoint.amount - dailyAvg) / (dailyAvg || 1)) * 100)}% vs avg`}
            </Text>
          </View>
        )}
      </View>

      {/* SVG Curve Chart */}
      <View style={styles.svgContainer}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <SvgLinearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#EF4444" stopOpacity={isDark ? "0.45" : "0.35"} />
              <Stop offset="80%" stopColor="#EF4444" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>

          {/* Daily Average Dashed Baseline */}
          {dailyAvg > 0 && avgY > paddingTop && avgY < chartHeight - paddingBottom && (
            <G>
              <Line
                x1={paddingHorizontal}
                y1={avgY}
                x2={chartWidth - paddingHorizontal}
                y2={avgY}
                stroke={isDark ? '#475569' : '#CBD5E1'}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={chartWidth - paddingHorizontal - 4}
                y={avgY - 4}
                fontSize={9}
                fontWeight="700"
                fill={isDark ? '#64748B' : '#94A3B8'}
                textAnchor="end"
              >
                Avg Line
              </SvgText>
            </G>
          )}

          {/* Area Fill */}
          {areaD ? <Path d={areaD} fill="url(#spendingGradient)" /> : null}

          {/* Smooth Stroke Line */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke="#EF4444"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active Highlight Marker Line */}
          {selectedPoint && (
            <Line
              x1={selectedPoint.x}
              y1={paddingTop}
              x2={selectedPoint.x}
              y2={paddingTop + drawableHeight}
              stroke={colors.primary}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((pt, idx) => {
            const isSelected = selectedIndex === idx;
            const isPeak = pt.amount === maxVal && pt.amount > 0;

            // Only show circles for selected, peak, or sparse datasets to prevent clutter
            const showCircle = isSelected || isPeak || points.length <= 14;

            return (
              <G key={pt.date}>
                {showCircle && (
                  <>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : isPeak ? 4.5 : 3.5}
                      fill={isSelected ? colors.primary : isPeak ? '#EF4444' : '#F43F5E'}
                      stroke={colors.surface}
                      strokeWidth={isSelected ? 2 : 1.5}
                    />
                    {isPeak && !isSelected && (
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={7}
                        fill="transparent"
                        stroke="#EF4444"
                        strokeWidth={1}
                        strokeOpacity={0.5}
                      />
                    )}
                  </>
                )}
              </G>
            );
          })}
        </Svg>

        {/* Transparent Clickable Column Hotspots */}
        <View style={[StyleSheet.absoluteFill, styles.hotspotsOverlay]}>
          {points.map((pt, idx) => (
            <TouchableOpacity
              key={`hotspot-${pt.date}`}
              activeOpacity={0.6}
              onPress={() => handlePointTap(idx)}
              style={[
                styles.hotspotColumn,
                {
                  left: pt.x - drawableWidth / (points.length * 2),
                  width: drawableWidth / points.length,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Date Labels Row */}
      <View style={styles.labelsRow}>
        {points
          .filter((_, i) => {
            if (points.length <= 7) return true;
            if (points.length <= 15) return i % 2 === 0;
            if (points.length <= 31) return i % 5 === 0 || i === points.length - 1;
            return i % 30 === 0 || i === points.length - 1;
          })
          .map((pt) => (
            <Text
              key={pt.date}
              style={[
                styles.dateLabelText,
                { color: selectedPoint?.date === pt.date ? colors.primary : colors.textMuted },
              ]}
            >
              {pt.label}
            </Text>
          ))}
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  headerMainAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  deltaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  svgContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotsOverlay: {
    flexDirection: 'row',
  },
  hotspotColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dateLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
});