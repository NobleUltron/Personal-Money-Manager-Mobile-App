import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Wallet } from 'lucide-react-native';

interface AppSplashScreenProps {
  isReady: boolean;
  onAnimationComplete?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  isReady,
  onAnimationComplete,
}) => {
  // Container exit animation
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  // Logo entrance
  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);

  // Staggered 3-dot pulse indicators (Linear style)
  const dot1Opacity = useSharedValue(0.25);
  const dot2Opacity = useSharedValue(0.25);
  const dot3Opacity = useSharedValue(0.25);

  // Text entrance
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(10);

  useEffect(() => {
    // 1. Logo spring entrance (Apple / Linear precision spring)
    logoScale.value = withSpring(1, { damping: 18, stiffness: 180 });
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });

    // 2. Sequential 3-dot wave pulse
    const animateDot = (sv: any, delay: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.25, { duration: 450, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, delay);
    };

    animateDot(dot1Opacity, 0);
    animateDot(dot2Opacity, 180);
    animateDot(dot3Opacity, 360);

    // 3. Text entrance
    textOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withSpring(0, { damping: 20, stiffness: 160 });
  }, []);

  // Snappy exit transition when ready
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        containerScale.value = withTiming(1.03, { duration: 280, easing: Easing.out(Easing.quad) });
        containerOpacity.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        });
      }, 450); // Snappy, ultra-clean loading duration

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.centerWrapper}>
        {/* Minimalist Logo Mark */}
        <Animated.View style={[styles.iconCard, logoAnimatedStyle]}>
          <Wallet size={38} color="#FFFFFF" strokeWidth={2.2} />
        </Animated.View>

        {/* Minimalist Brand Typography */}
        <Animated.View style={[styles.textBlock, textAnimatedStyle]}>
          <Text style={styles.brandTitle}>Personal Money Manager</Text>
        </Animated.View>

        {/* Staggered Minimalist 3-Dot Wave Indicator */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>
      </View>

      {/* Subtle Bottom System Badge */}
      <View style={styles.bottomBadge}>
        <Text style={styles.bottomText}>Encrypted & Local Storage</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712', // Pure Obsidian Black
  },
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCard: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 22,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});