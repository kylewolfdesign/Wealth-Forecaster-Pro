import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const SPLASH_BG = '#0F172A';
const DISPLAY_DURATION = 3000;
const FADE_OUT_DURATION = 400;
const CHART_ANIM_DURATION = 900;
const TEXT_ANIM_DURATION = 600;

const CHART_WIDTH = 140;
const CHART_HEIGHT = 124;

const CHART_LINE_PATH =
  'M115.75 0.75 C114.498 2.573 106.276 14.475 105.892 14.729 C105.403 15.053 101.427 15.583 100.885 15.945 C100.387 16.278 100.011 20.451 99.381 21.01 C98.836 21.493 96.585 21.651 95.943 22.293 C95.302 22.934 94.627 44.51 93.488 44.51 C92.81 44.51 90.706 41.623 90.217 41.623 C88.015 41.623 90.59 62.602 82.136 43.933 C81.845 43.291 78.712 38.736 77.518 38.736 C75.986 38.736 71.774 44.242 70.896 44.51 C70.017 44.779 65.667 44.893 64.511 44.51 C63.795 44.273 57.433 62.136 55.671 62.136 C54.223 62.136 51.56 65.344 50.759 65.344 C49.602 65.344 44.708 50.588 43.392 50.588 C41.772 50.588 36.314 70.897 35.534 71.759 C34.92 72.438 27.696 76.892 27.185 77.533 C26.462 78.441 23.586 86.515 22.196 86.515 C20.351 86.515 12.871 65.344 10.487 65.344 C8.514 65.344 4.79 75.994 0.75 75.994';

const CHART_FILL_PATH =
  'M105.892 14.729 C106.276 14.475 114.498 2.573 115.75 0.75 V102.25 H0.75 V75.994 C4.79 75.994 8.514 65.344 10.487 65.344 C12.871 65.344 20.351 86.515 22.196 86.515 C23.586 86.515 26.462 78.441 27.185 77.533 C27.696 76.892 34.92 72.438 35.534 71.759 C36.314 70.897 41.772 50.588 43.392 50.588 C44.708 50.588 49.602 65.344 50.759 65.344 C51.56 65.344 54.223 62.136 55.671 62.136 C57.433 62.136 63.795 44.273 64.511 44.51 C65.667 44.893 70.017 44.779 70.896 44.51 C71.774 44.242 75.986 38.736 77.518 38.736 C78.712 38.736 81.845 43.291 82.136 43.933 C90.59 62.602 88.015 41.623 90.217 41.623 C90.706 41.623 92.81 44.51 93.488 44.51 C94.627 44.51 95.302 22.934 95.943 22.293 C96.585 21.651 98.836 21.493 99.381 21.01 C100.011 20.451 100.387 16.278 100.885 15.945 C101.427 15.583 105.403 15.053 105.892 14.729 Z';

function SplashChart() {
  return (
    <Svg
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      viewBox="0 0 116.5 102.25"
    >
      <Defs>
        <LinearGradient id="chartGrad" x1="58.25" y1="0.75" x2="58.25" y2="102.25" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#8A38F5" stopOpacity="1" />
          <Stop offset="1" stopColor="#51218F" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={CHART_FILL_PATH} fill="url(#chartGrad)" />
      <Path
        d={CHART_LINE_PATH}
        stroke="#1DCE5C"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

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
          <SplashChart />
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
