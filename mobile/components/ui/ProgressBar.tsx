import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Radius } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
}) => {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, progress));

  const getProgressColor = () => {
    if (color) return color;
    if (clamped >= 100) return colors.danger;
    if (clamped >= 80) return colors.warning;
    return colors.primary;
  };

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: colors.surfaceElevated,
          borderRadius: height / 2,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: getProgressColor(),
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
