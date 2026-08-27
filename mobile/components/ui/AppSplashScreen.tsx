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
import { ShieldCheck, Lock, Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface AppSplashScreenProps {
  isReady: boolean;
  onAnimationComplete?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  isReady,
  onAnimationComplete,
}) => {
  // Animation shared values
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  const shieldScale = useSharedValue(0.7);
  const shieldOpacity = useSharedValue(0);
  const shieldRotate = useSharedValue(-15);

  const glowScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0.4);

  const scanBeamY = useSharedValue(-40);
  const scanBeamOpacity = useSharedValue(0.2);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Entrance animation sequence
    shieldScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    shieldOpacity.value = withTiming(1, { duration: 600 });
    shieldRotate.value = withSpring(0, { damping: 14, stiffness: 140 });

    // 2. Ambient breathing glow loop
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Biometric scan beam sweep loop
    scanBeamY.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-40, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    scanBeamOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200 }),
        withTiming(0.2, { duration: 1200 })
      ),
      -1,
      true
    );

    // 4. Text and badge entrance
    textOpacity.value = withTiming(1, { duration: 700 });
    textTranslateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    badgeOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  // Exit transition when authentication check finishes
  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        containerScale.value = withTiming(1.05, { duration: 400, easing: Easing.out(Easing.ease) });
        containerOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        });
      }, 700); // Minimum pleasant display time

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const shieldAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shieldOpacity.value,
    transform: [
      { scale: shieldScale.value },
      { rotate: `${shieldRotate.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const scanBeamAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scanBeamOpacity.value,
    transform: [{ translateY: scanBeamY.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#020617', '#0B1120', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Center Shield & Glow Animation */}
      <View style={styles.centerBox}>
        {/* Ambient Radial Glow Ring */}
        <Animated.View style={[styles.glowRing, glowAnimatedStyle]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.45)', 'rgba(168, 85, 247, 0.25)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Shield Emblem Container */}
        <Animated.View style={[styles.shieldBox, shieldAnimatedStyle]}>
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shieldGradient}
          >
            {/* Inner Shield Core */}
            <View style={styles.shieldInner}>
              <ShieldCheck size={52} color="#FFFFFF" strokeWidth={2.2} />

              {/* Shimmering Biometric Scan Beam */}
              <Animated.View style={[styles.scanBeam, scanBeamAnimatedStyle]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Brand Typography */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.appName}>Personal Money Manager</Text>
          <Text style={styles.appTagline}>Smart Financial Management</Text>
        </Animated.View>

        {/* Encrypted Vault Security Badge */}
        <Animated.View style={[styles.securityBadge, badgeAnimatedStyle]}>
          <Lock size={12} color="#10B981" />
          <Text style={styles.securityBadgeText}>Encrypted Vault Security</Text>
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
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
  },
  shieldBox: {
    width: 104,
    height: 104,
    borderRadius: 30,
    padding: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  shieldGradient: {
    flex: 1,
    borderRadius: 27,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanBeam: {
    position: 'absolute',
    width: 90,
    height: 6,
    borderRadius: 3,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  appTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: 32,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
  },
});