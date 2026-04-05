import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import WealthChart from '@/components/WealthChart';

const SPLASH_BG = '#121422';
const DISPLAY_DURATION = 3000;
const FADE_OUT_DURATION = 400;
const CHART_ANIM_DURATION = 900;
const TEXT_ANIM_DURATION = 600;

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const [fontReady, setFontReady] = useState(Platform.OS !== 'web');
  const chartTranslateY = useSharedValue(80);
  const chartOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === 'web') {
      (document as any).fonts?.ready?.then(() => setFontReady(true)) ??
        setTimeout(() => setFontReady(true), 100);
    }
  }, []);

  useEffect(() => {
    if (!fontReady) return;

    chartTranslateY.value = withTiming(0, {
      duration: CHART_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    chartOpacity.value = withTiming(1, {
      duration: CHART_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: TEXT_ANIM_DURATION, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: TEXT_ANIM_DURATION, easing: Easing.out(Easing.cubic) })
    );

    containerOpacity.value = withDelay(
      DISPLAY_DURATION,
      withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.cubic) })
    );

    const timeout = setTimeout(() => {
      onFinish();
    }, DISPLAY_DURATION + FADE_OUT_DURATION);

    return () => clearTimeout(timeout);
  }, [fontReady]);

  const chartStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chartTranslateY.value }],
    opacity: chartOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.chartWrap, chartStyle]}>
          <WealthChart width={140} height={124} />
        </Animated.View>
        <Animated.View style={[styles.textWrap, textStyle]}>
          {fontReady && (
            <>
              <Text style={styles.title}>{'Wealth'}</Text>
              <Text style={styles.title}>{'Forecaster'}</Text>
            </>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrap: {
    marginBottom: 12,
  },
  textWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 29,
    letterSpacing: 0.2,
  },
});
