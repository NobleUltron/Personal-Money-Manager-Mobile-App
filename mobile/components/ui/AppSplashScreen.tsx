import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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

  // Logo entrance and breathing heartbeat
  const logoScale = useSharedValue(0.75);
  const logoOpacity = useSharedValue(0);

  // Dual pulse ripple rings
  const pulse1Scale = useSharedValue(0.8);
  const pulse1Opacity = useSharedValue(0.6);

  const pulse2Scale = useSharedValue(0.6);
  const pulse2Opacity = useSharedValue(0.4);

  // Shimmering progress light bar
  const shimmerTranslateX = useSharedValue(-120);

  // Text entrance
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(16);

  useEffect(() => {
    // 1. Logo entrance with spring bounce
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 500 });

    // 2. Primary pulse ring loop
    pulse1Scale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 0 })
      ),
      -1,
      false
    );
    pulse1Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0.65, { duration: 0 })
      ),
      -1,
      false
    );

    // 3. Secondary pulse ring (staggered delay)
    setTimeout(() => {
      pulse2Scale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0.85, { duration: 0 })
        ),
        -1,
        false
      );
      pulse2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0.45, { duration: 0 })
        ),
        -1,
        false
      );
    }, 400);

    // 4. Shimmer bar light sweep loop
    shimmerTranslateX.value = withRepeat(
      withTiming(120, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );

    // 5. Typography entrance
    textOpacity.value = withTiming(1, { duration: 600 });
    textTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  // Exit transition when ready
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        containerScale.value = withTiming(1.05, { duration: 380, easing: Easing.out(Easing.ease) });
        containerOpacity.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        });
      }, 700);

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

  const pulse1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulse1Opacity.value,
    transform: [{ scale: pulse1Scale.value }],
  }));

  const pulse2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulse2Opacity.value,
    transform: [{ scale: pulse2Scale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#020617', '#0A0F1D', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.centerWrapper}>
        {/* Pulse Ripple Rings */}
        <Animated.View style={[styles.pulseRing, pulse2AnimatedStyle]}>
          <LinearGradient
            colors={['rgba(236, 72, 153, 0.35)', 'rgba(99, 102, 241, 0.15)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.pulseRing, pulse1AnimatedStyle]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.45)', 'rgba(168, 85, 247, 0.25)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Central Fintech Emblem */}
        <Animated.View style={[styles.emblemContainer, logoAnimatedStyle]}>
          <LinearGradient
            colors={['#6366F1', '#A855F7', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emblemGradient}
          >
            <View style={styles.emblemInner}>
              <Wallet size={44} color="#FFFFFF" strokeWidth={2.2} />
              <View style={styles.sparkleIcon}>
                <Sparkles size={14} color="#FBBF24" />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Brand Typography */}
        <Animated.View style={[styles.textBlock, textAnimatedStyle]}>
          <Text style={styles.brandTitle}>Personal Money Manager</Text>
          <Text style={styles.brandSubtitle}>Securing your financial vault...</Text>

          {/* Shimmering Micro Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarShimmer, shimmerAnimatedStyle]}>
              <LinearGradient
                colors={['transparent', '#6366F1', '#EC4899', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>
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
    backgroundColor: '#020617',
  },
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
  },
  emblemContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    padding: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  emblemGradient: {
    flex: 1,
    borderRadius: 25,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemInner: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkleIcon: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 28,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 5,
    letterSpacing: 0.2,
  },
  progressBarTrack: {
    width: 130,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarShimmer: {
    width: 70,
    height: '100%',
    borderRadius: 2,
  },
});