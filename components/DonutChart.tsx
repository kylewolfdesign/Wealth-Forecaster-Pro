import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { fontFamily, fontSize } from '@/constants/theme';
import Colors from '@/constants/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size: number;
  strokeWidth: number;
  centerLabel: string;
  centerSubLabel?: string;
  selectedLabel?: string | null;
  animationKey?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const spread = endAngle - startAngle;
  if (spread >= 359.99) {
    const mid = startAngle + spread / 2;
    const s1 = polarToCartesian(cx, cy, r, startAngle);
    const m1 = polarToCartesian(cx, cy, r, mid);
    const e1 = polarToCartesian(cx, cy, r, endAngle - 0.01);
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${r} ${r} 0 1 1 ${m1.x} ${m1.y}`,
      `A ${r} ${r} 0 1 1 ${e1.x} ${e1.y}`,
    ].join(' ');
  }

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = spread > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

interface SliceLayerProps {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  baseStrokeWidth: number;
  isSelected: boolean;
  hasSelection: boolean;
  svgSize: number;
  entranceDelay: number;
  animationKey?: number;
}

function SliceLayer({
  cx, cy, radius, startAngle, endAngle, color, baseStrokeWidth,
  isSelected, hasSelection, svgSize, entranceDelay, animationKey,
}: SliceLayerProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const dashProgress = useSharedValue(animationKey !== undefined ? 1 : 0);

  const spread = endAngle - startAngle;
  const arcLength = (spread / 360) * 2 * Math.PI * radius;

  const timingConfig = { duration: 300, easing: Easing.out(Easing.cubic) };

  useEffect(() => {
    if (hasSelection) {
      opacity.value = withTiming(isSelected ? 1 : 0.35, timingConfig);
      scale.value = withTiming(isSelected ? 1.08 : 1, timingConfig);
    } else {
      opacity.value = withTiming(1, timingConfig);
      scale.value = withTiming(1, timingConfig);
    }
  }, [isSelected, hasSelection]);

  useEffect(() => {
    if (animationKey !== undefined) {
      dashProgress.value = 1;
      dashProgress.value = withDelay(
        entranceDelay,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [animationKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * dashProgress.value,
  }));

  return (
    <Animated.View style={[{ width: svgSize, height: svgSize, position: 'absolute' }, animatedStyle]}>
      <Svg width={svgSize} height={svgSize}>
        <AnimatedPath
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          stroke={color}
          strokeWidth={baseStrokeWidth}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={`${arcLength} ${arcLength}`}
          animatedProps={animatedPathProps}
        />
      </Svg>
    </Animated.View>
  );
}

export default function DonutChart({ slices, size, strokeWidth, centerLabel, centerSubLabel, selectedLabel, animationKey }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const centerOpacity = useSharedValue(animationKey !== undefined ? 0 : 1);

  useEffect(() => {
    if (animationKey !== undefined) {
      centerOpacity.value = 0;
      centerOpacity.value = withDelay(
        200,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [animationKey]);

  const centerAnimStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
  }));

  const total = slices.reduce((sum, s) => sum + Math.abs(s.value), 0);
  const activeSlices = slices
    .filter(s => Math.abs(s.value) > 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const GAP_DEGREES = activeSlices.length > 1 ? 2.5 : 0;
  const totalGap = GAP_DEGREES * activeSlices.length;
  const availableDegrees = 360 - totalGap;

  const hasSelection = selectedLabel != null;

  const sliceData: { slice: DonutSlice; startAngle: number; endAngle: number; index: number }[] = [];
  let currentAngle = 0;
  activeSlices.forEach((slice, i) => {
    const proportion = Math.abs(slice.value) / total;
    const sweepAngle = proportion * availableDegrees;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    sliceData.push({ slice, startAngle, endAngle, index: i });
    currentAngle = endAngle + GAP_DEGREES;
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Path
          d={describeArc(cx, cy, radius, 0, 359.99)}
          stroke={Colors.background}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
      {total > 0 &&
        sliceData.map(({ slice, startAngle, endAngle, index }) => (
          <SliceLayer
            key={`${slice.label}-${index}`}
            cx={cx}
            cy={cy}
            radius={radius}
            startAngle={startAngle}
            endAngle={endAngle}
            color={slice.color}
            baseStrokeWidth={strokeWidth}
            isSelected={selectedLabel === slice.label}
            hasSelection={hasSelection}
            svgSize={size}
            entranceDelay={index * 40}
            animationKey={animationKey}
          />
        ))}
      <Animated.View style={[styles.centerContent, centerAnimStyle]}>
        {centerSubLabel && (
          <Text style={styles.centerSubLabel}>{centerSubLabel}</Text>
        )}
        <Text style={styles.centerLabel} numberOfLines={1} adjustsFontSizeToFit>
          {centerLabel}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSubLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  centerLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl * 1.5,
    color: Colors.text,
  },
});
