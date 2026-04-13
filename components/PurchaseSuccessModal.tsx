import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

interface PurchaseSuccessModalProps {
  visible: boolean;
  onDismiss: () => void;
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function PurchaseSuccessModal({ visible, onDismiss }: PurchaseSuccessModalProps) {
  const [ctaReady, setCtaReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const confettiScale = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(600);

  const animateIn = useCallback(() => {
    setCtaReady(false);
    overlayOpacity.value = withTiming(1, { duration: 300 });
    sheetTranslateY.value = withDelay(
      100,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    checkScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 150 }));
    checkOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    confettiScale.value = withDelay(400, withSequence(
      withSpring(1.2, { damping: 8, stiffness: 120 }),
      withSpring(1, { damping: 10 })
    ));
    textOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    buttonOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
    timerRef.current = setTimeout(() => setCtaReady(true), 1600);
  }, []);

  const resetValues = useCallback(() => {
    checkScale.value = 0;
    checkOpacity.value = 0;
    textOpacity.value = 0;
    buttonOpacity.value = 0;
    confettiScale.value = 0;
    overlayOpacity.value = 0;
    sheetTranslateY.value = 600;
    setCtaReady(false);
  }, []);

  useEffect(() => {
    if (visible) {
      resetValues();
      const t = setTimeout(() => animateIn(), 50);
      return () => clearTimeout(t);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      resetValues();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
    opacity: checkOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <View style={styles.successContainer}>
            <Animated.View style={[styles.confettiRing, confettiStyle]}>
              <View style={styles.confettiDot1} />
              <View style={styles.confettiDot2} />
              <View style={styles.confettiDot3} />
              <View style={styles.confettiDot4} />
              <View style={styles.confettiDot5} />
              <View style={styles.confettiDot6} />
            </Animated.View>

            <Animated.View style={[styles.checkContainer, checkStyle]}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={52} color={Colors.white} />
              </View>
            </Animated.View>

            <Animated.View style={textStyle}>
              <Text style={styles.title}>You're All Set!</Text>
              <Text style={styles.subtitle}>
                Welcome to Wealth Forecaster Pro.{'\n'}You now have full access to all features.
              </Text>
            </Animated.View>

            <Animated.View style={[styles.features, textStyle]}>
              <FeatureRow icon="checkmark-circle" text="Unlimited portfolio tracking" />
              <FeatureRow icon="checkmark-circle" text="Advanced forecasting tools" />
              <FeatureRow icon="checkmark-circle" text="Full editing capabilities" />
            </Animated.View>

            <Animated.View style={[buttonStyle, { alignSelf: 'stretch' }]} pointerEvents={ctaReady ? 'auto' : 'none'}>
              <Pressable
                style={styles.button}
                onPress={onDismiss}
                testID="success-get-started"
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.backgroundFlat,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  checkContainer: {
    marginBottom: spacing.xxl,
    zIndex: 2,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiRing: {
    position: 'absolute',
    top: spacing.xxl - 12,
    width: 120,
    height: 120,
    zIndex: 1,
  },
  confettiDot1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    top: -4,
    left: 56,
  },
  confettiDot2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    top: 16,
    right: -2,
  },
  confettiDot3: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    bottom: 16,
    right: 2,
  },
  confettiDot4: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    bottom: -2,
    left: 48,
  },
  confettiDot5: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    bottom: 20,
    left: -2,
  },
  confettiDot6: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D946EF',
    top: 20,
    left: 2,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
    alignSelf: 'stretch',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    width: '100%',
  },
  buttonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.white,
  },
});
