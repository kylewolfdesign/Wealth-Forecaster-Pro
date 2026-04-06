import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DataPoint {
  x: number;
  y: number;
  label?: string;
  isJump?: boolean;
}

interface LineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  formatY?: (val: number) => string;
  formatX?: (val: number) => string;
  compact?: boolean;
  gridColor?: string;
  labelColor?: string;
  onTouch?: (point: DataPoint) => void;
  onTouchEnd?: () => void;
  touchIndicatorColor?: string;
  animationKey?: number;
}

export default function LineChart({
  data,
  width,
  height,
  color = Colors.primary,
  showGrid = false,
  showLabels = false,
  formatY,
  formatX,
  compact = false,
  gridColor,
  labelColor,
  onTouch,
  onTouchEnd,
  touchIndicatorColor,
  animationKey,
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
    onStartShouldSetPanResponder: () => !!onTouchRef.current,
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      if (!onTouchRef.current) return false;
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > 3;
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
    onPanResponderTerminationRequest: (_evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
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

  const lineReveal = useSharedValue(animationKey !== undefined ? 1 : 0);
  const areaOpacity = useSharedValue(animationKey !== undefined ? 0 : 1);

  useEffect(() => {
    if (animationKey !== undefined) {
      lineReveal.value = 1;
      areaOpacity.value = 0;
      lineReveal.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      areaOpacity.value = withDelay(
        300,
        withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [animationKey]);

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Not enough data</Text>
      </View>
    );
  }

  const pixelData = data.map((d) => ({
    px: toX(d.x),
    py: toY(d.y),
    isJump: d.isJump ?? false,
  }));

  const buildPath = (): string => {
    if (pixelData.length === 0) return '';
    const parts: string[] = [`M${pixelData[0].px.toFixed(2)},${pixelData[0].py.toFixed(2)}`];

    for (let i = 1; i < pixelData.length; i++) {
      const curr = pixelData[i];
      const prev = pixelData[i - 1];

      const isJumpEdge = curr.isJump || prev.isJump ||
        (Math.abs(curr.px - prev.px) < 2 && Math.abs(curr.py - prev.py) > 2);

      if (isJumpEdge) {
        parts.push(`L${curr.px.toFixed(2)},${curr.py.toFixed(2)}`);
      } else {
        const tension = 0.3;
        let dx0 = 0, dy0 = 0;
        if (i >= 2 && !pixelData[i - 2].isJump) {
          dx0 = (curr.px - pixelData[i - 2].px) * tension;
          dy0 = (curr.py - pixelData[i - 2].py) * tension;
        }
        let dx1 = 0, dy1 = 0;
        if (i < pixelData.length - 1 && !pixelData[i + 1].isJump) {
          dx1 = (pixelData[i + 1].px - prev.px) * tension;
          dy1 = (pixelData[i + 1].py - prev.py) * tension;
        }

        const cp1x = prev.px + dx0;
        const cp1y = prev.py + dy0;
        const cp2x = curr.px - dx1;
        const cp2y = curr.py - dy1;
        parts.push(`C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${curr.px.toFixed(2)},${curr.py.toFixed(2)}`);
      }
    }
    return parts.join(' ');
  };

  const linePath = buildPath();

  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const areaPath = `${linePath} L${toX(lastPoint.x).toFixed(2)},${(padding.top + chartH).toFixed(2)} L${toX(firstPoint.x).toFixed(2)},${(padding.top + chartH).toFixed(2)} Z`;

  const estimatedPathLength = useMemo(() => {
    let len = 0;
    for (let i = 1; i < pixelData.length; i++) {
      const dx = pixelData[i].px - pixelData[i - 1].px;
      const dy = pixelData[i].py - pixelData[i - 1].py;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len * 1.5;
  }, [pixelData]);

  const lineAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: estimatedPathLength * lineReveal.value,
  }));

  const areaAnimProps = useAnimatedProps(() => ({
    opacity: areaOpacity.value,
  }));

  const gridLines = showGrid ? 4 : 0;
  const gridYValues: number[] = [];
  for (let i = 0; i <= gridLines; i++) {
    gridYValues.push(yMin - yPad + ((yRange + 2 * yPad) * i) / (gridLines || 1));
  }

  const xLabelCount = Math.min(5, Math.max(2, Math.floor(chartW / 60)));
  const xLabelValues: number[] = [];
  if (showLabels && formatX) {
    for (let i = 0; i <= xLabelCount; i++) {
      xLabelValues.push(xMin + (xRange * i) / xLabelCount);
    }
  }

  const indicatorColor = touchIndicatorColor || color;
  const activePixelX = activePoint ? toX(activePoint.x) : 0;
  const activePixelY = activePoint ? toY(activePoint.y) : 0;

  const hasAnimation = animationKey !== undefined;

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

        {hasAnimation ? (
          <AnimatedPath d={areaPath} fill="url(#areaGradient)" animatedProps={areaAnimProps} />
        ) : (
          <Path d={areaPath} fill="url(#areaGradient)" />
        )}

        {hasAnimation ? (
          <AnimatedPath
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${estimatedPathLength} ${estimatedPathLength}`}
            animatedProps={lineAnimProps}
          />
        ) : (
          <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {xLabelValues.map((xVal, i) => (
          <SvgText
            key={`x-${i}`}
            x={toX(xVal)}
            y={padding.top + chartH + 16}
            textAnchor="middle"
            fill={labelColor || Colors.textTertiary}
            fontSize={10}
            fontFamily={fontFamily.regular}
          >
            {formatX?.(xVal) ?? ''}
          </SvgText>
        ))}

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
