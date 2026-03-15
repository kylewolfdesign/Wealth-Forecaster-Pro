import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, ClipPath, Rect } from 'react-native-svg';
import Colors from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/theme';

interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  formatY?: (val: number) => string;
  compact?: boolean;
  gridColor?: string;
  labelColor?: string;
  highlightEndX?: number;
  dimmedColor?: string;
}

export default function LineChart({
  data,
  width,
  height,
  color = Colors.primary,
  showGrid = false,
  showLabels = false,
  formatY,
  compact = false,
  gridColor,
  labelColor,
  highlightEndX,
  dimmedColor,
}: LineChartProps) {
  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Not enough data</Text>
      </View>
    );
  }

  const padding = compact
    ? { top: 8, right: 8, bottom: 8, left: 8 }
    : { top: 16, right: 16, bottom: showLabels ? 28 : 16, left: showLabels ? 56 : 16 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const yValues = data.map((d) => d.y);
  const xValues = data.map((d) => d.x);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);

  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;
  const yPad = yRange * 0.05;

  const toX = (x: number) => padding.left + ((x - xMin) / xRange) * chartW;
  const toY = (y: number) =>
    padding.top + chartH - ((y - (yMin - yPad)) / (yRange + 2 * yPad)) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(d.x).toFixed(2)},${toY(d.y).toFixed(2)}`)
    .join(' ');

  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const areaPath = `${linePath} L${toX(lastPoint.x).toFixed(2)},${(padding.top + chartH).toFixed(2)} L${toX(firstPoint.x).toFixed(2)},${(padding.top + chartH).toFixed(2)} Z`;

  const gridLines = showGrid ? 4 : 0;
  const gridYValues: number[] = [];
  for (let i = 0; i <= gridLines; i++) {
    gridYValues.push(yMin - yPad + ((yRange + 2 * yPad) * i) / (gridLines || 1));
  }

  const hasHighlight = highlightEndX != null && highlightEndX < xMax;
  const splitX = hasHighlight ? toX(highlightEndX) : 0;
  const resolvedDimmedColor = dimmedColor || Colors.textTertiary;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0.01" />
          </LinearGradient>
          <LinearGradient id="areaGradientDimmed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={resolvedDimmedColor} stopOpacity="0.08" />
            <Stop offset="1" stopColor={resolvedDimmedColor} stopOpacity="0.01" />
          </LinearGradient>
          {hasHighlight && (
            <>
              <ClipPath id="clipHighlight">
                <Rect x={0} y={0} width={splitX} height={height} />
              </ClipPath>
              <ClipPath id="clipDimmed">
                <Rect x={splitX} y={0} width={width - splitX} height={height} />
              </ClipPath>
            </>
          )}
        </Defs>

        {showGrid &&
          gridYValues.map((yVal, i) => (
            <React.Fragment key={i}>
              <Line
                x1={padding.left}
                y1={toY(yVal)}
                x2={width - padding.right}
                y2={toY(yVal)}
                stroke={gridColor || Colors.borderLight}
                strokeWidth={1}
              />
              {showLabels && formatY && (
                <SvgText
                  x={padding.left - 8}
                  y={toY(yVal) + 4}
                  textAnchor="end"
                  fill={labelColor || Colors.textTertiary}
                  fontSize={10}
                  fontFamily={fontFamily.regular}
                >
                  {formatY(yVal)}
                </SvgText>
              )}
            </React.Fragment>
          ))}

        {hasHighlight ? (
          <>
            <Path d={areaPath} fill="url(#areaGradient)" clipPath="url(#clipHighlight)" />
            <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#clipHighlight)" />
            <Path d={areaPath} fill="url(#areaGradientDimmed)" clipPath="url(#clipDimmed)" />
            <Path d={linePath} fill="none" stroke={resolvedDimmedColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} clipPath="url(#clipDimmed)" />
          </>
        ) : (
          <>
            <Path d={areaPath} fill="url(#areaGradient)" />
            <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
  },
});
