import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { fontFamily, fontSize } from '@/constants/theme';
import Colors from '@/constants/colors';

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

export default function DonutChart({ slices, size, strokeWidth, centerLabel, centerSubLabel }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const total = slices.reduce((sum, s) => sum + Math.abs(s.value), 0);
  const GAP_DEGREES = slices.filter(s => Math.abs(s.value) > 0).length > 1 ? 2 : 0;
  const activeSlices = slices.filter(s => Math.abs(s.value) > 0);
  const totalGap = GAP_DEGREES * activeSlices.length;
  const availableDegrees = 360 - totalGap;

  let currentAngle = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {total === 0 ? (
            <Path
              d={describeArc(cx, cy, radius, 0, 359.99)}
              stroke={Colors.border}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            activeSlices.map((slice, i) => {
              const proportion = Math.abs(slice.value) / total;
              const sweepAngle = proportion * availableDegrees;
              const startAngle = currentAngle;
              const endAngle = currentAngle + sweepAngle;
              currentAngle = endAngle + GAP_DEGREES;

              return (
                <Path
                  key={`${slice.label}-${i}`}
                  d={describeArc(cx, cy, radius, startAngle, endAngle)}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })
          )}
        </G>
      </Svg>
      <View style={styles.centerContent}>
        {centerSubLabel && (
          <Text style={styles.centerSubLabel}>{centerSubLabel}</Text>
        )}
        <Text style={styles.centerLabel} numberOfLines={1} adjustsFontSizeToFit>
          {centerLabel}
        </Text>
      </View>
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
