import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, ClipPath, Rect, Circle } from 'react-native-svg';
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
  onTouch?: (point: DataPoint) => void;
  onTouchEnd?: () => void;
  touchIndicatorColor?: string;
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
  onTouch,
  onTouchEnd,
  touchIndicatorColor,
}: LineChartProps) {
  const [activePoint, setActivePoint] = React.useState<DataPoint | null>(null);

  const onTouchRef = useRef(onTouch);
  onTouchRef.current = onTouch;
  const onTouchEndRef = useRef(onTouchEnd);
  onTouchEndRef.current = onTouchEnd;
  const dataRef = useRef(data);
  dataRef.current = data;

  const padding = compact
    ? { top: 8, right: 8, bottom: 8, left: 8 }
    : { top: 16, right: 16, bottom: showLabels ? 28 : 16, left: showLabels ? 56 : 16 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const yValues = data.length >= 2 ? data.map((d) => d.y) : [];
  const xValues = data.length >= 2 ? data.map((d) => d.x) : [];
  const yMin = data.length >= 2 ? Math.min(...yValues) : 0;
  const yMax = data.length >= 2 ? Math.max(...yValues) : 1;
  const xMin = data.length >= 2 ? Math.min(...xValues) : 0;
  const xMax = data.length >= 2 ? Math.max(...xValues) : 1;

  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;
  const yPad = yRange * 0.05;

  const toX = (x: number) => padding.left + ((x - xMin) / xRange) * chartW;
  const toY = (y: number) =>
    padding.top + chartH - ((y - (yMin - yPad)) / (yRange + 2 * yPad)) * chartH;

  const chartParamsRef = useRef({ xMin, xRange, paddingLeft: padding.left, chartW });
  chartParamsRef.current = { xMin, xRange, paddingLeft: padding.left, chartW };

  const findNearestPoint = useCallback((pixelX: number): DataPoint | null => {
    const d = dataRef.current;
    if (d.length < 2) return null;
    const { xMin: xM, xRange: xR, paddingLeft: pL, chartW: cW } = chartParamsRef.current;
    const dataX = xM + ((pixelX - pL) / cW) * xR;
    let nearest = d[0];
    let minDist = Math.abs(d[0].x - dataX);
    for (let i = 1; i < d.length; i++) {
      const dist = Math.abs(d[i].x - dataX);
      if (dist < minDist) {
        minDist = dist;
        nearest = d[i];
      }
    }
    return nearest;
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      if (!onTouchRef.current) return false;
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },
    onPanResponderGrant: (evt) => {
      const point = findNearestPoint(evt.nativeEvent.locationX);
      if (point) {
        setActivePoint(point);
        onTouchRef.current?.(point);
      }
    },
    onPanResponderMove: (evt) => {
      const point = findNearestPoint(evt.nativeEvent.locationX);
      if (point) {
        setActivePoint(point);
        onTouchRef.current?.(point);
      }
    },
    onPanResponderRelease: () => {
      setActivePoint(null);
      onTouchEndRef.current?.();
    },
    onPanResponderTerminate: () => {
      setActivePoint(null);
      onTouchEndRef.current?.();
    },
  }), [findNearestPoint]);

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Not enough data</Text>
      </View>
    );
  }

  const jitterStrength = chartH * 0.012;

  const linePath = data
    .map((d, i) => {
      const px = toX(d.x).toFixed(2);
      let py = toY(d.y);
      if (i > 0 && i < data.length - 1) {
        const seed = (i * 7919 + 104729) % 7727;
        py += ((seed / 7727) - 0.5) * 2 * jitterStrength;
      }
      return `${i === 0 ? 'M' : 'L'}${px},${py.toFixed(2)}`;
    })
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

  const indicatorColor = touchIndicatorColor || color;
  const activePixelX = activePoint ? toX(activePoint.x) : 0;
  const activePixelY = activePoint ? toY(activePoint.y) : 0;

  return (
    <View
      style={{ width, height }}
      {...panResponder.panHandlers}
    >
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

        {activePoint && (
          <>
            <Line
              x1={activePixelX}
              y1={padding.top}
              x2={activePixelX}
              y2={padding.top + chartH}
              stroke={indicatorColor}
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.6}
            />
            <Circle
              cx={activePixelX}
              cy={activePixelY}
              r={5}
              fill={indicatorColor}
              stroke={Colors.background}
              strokeWidth={2}
            />
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
