import React, { useCallback } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

interface AnimatedEntryProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function AnimatedEntry({
  children,
  delay = 0,
  duration = 350,
  translateY = 14,
  style,
}: AnimatedEntryProps) {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(translateY);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      translate.value = translateY;
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
      );
      translate.value = withDelay(
        delay,
        withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
      );
    }, [delay, duration, translateY])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
