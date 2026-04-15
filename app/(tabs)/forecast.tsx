import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  TextInput, useWindowDimensions, TouchableOpacity, Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { computeForecast } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import Card from '@/components/Card';
import LineChart from '@/components/LineChart';
import AnimatedEntry from '@/components/AnimatedEntry';
import Paywall from '@/components/Paywall';
import PurchaseSuccessModal from '@/components/PurchaseSuccessModal';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const TIME_HORIZONS = [
  { key: '1Y', years: 1, label: '1Y' },
  { key: '5Y', years: 5, label: '5Y' },
  { key: '10Y', years: 10, label: '10Y' },
  { key: '20Y', years: 20, label: '20Y' },
  { key: '50Y', years: 50, label: '50Y' },
] as const;

const MILESTONE_YEARS = [1, 5, 10, 20, 50];

const ANIM_DURATION = 350;

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    holdings, rsuGrants, cashAccounts, mortgages,
    otherAssets, realEstate, settings, setSettings,
    retirementAccounts, stockOptions, bonds, businesses, vehicles,
    isPro,
  } = useAppStore();

  const [showPaywall, setShowPaywall] = useState(!isPro);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  useFocusEffect(useCallback(() => {
    if (isPro) {
      setShowPaywall(false);
    } else {
      setShowPaywall(true);
    }
  }, [isPro]));

  const [selectedHorizon, setSelectedHorizon] = useState<string>('10Y');
  const [touchValue, setTouchValue] = useState<number | null>(null);
  const [displayMonths, setDisplayMonths] = useState(10 * 12);

  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

  const animatedMonths = useSharedValue(10 * 12);
  const chartOpacity = useSharedValue(1);
  const chartScaleX = useSharedValue(1);

  const forecast = useMemo(
    () => computeForecast(
      holdings, rsuGrants, cashAccounts, mortgages, otherAssets,
      settings, 50, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles,
    ),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles, settings]
  );

  const allChartData = useMemo(() => {
    return forecast.map((p) => ({
      x: p.monthsFromNow,
      y: p.netWorth,
      isJump: p.isJump ?? false,
    }));
  }, [forecast]);

  const selectedYears = useMemo(() => {
    const horizon = TIME_HORIZONS.find((h) => h.key === selectedHorizon);
    return horizon?.years ?? 10;
  }, [selectedHorizon]);

  const selectedMonths = selectedYears * 12;

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    animatedMonths.value = withTiming(selectedMonths, { duration: ANIM_DURATION, easing });

    chartOpacity.value = withSequence(
      withTiming(0.4, { duration: ANIM_DURATION * 0.3, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: ANIM_DURATION * 0.7, easing: Easing.in(Easing.quad) }),
    );

    const isZoomingIn = selectedMonths < displayMonths;
    chartScaleX.value = withSequence(
      withTiming(isZoomingIn ? 1.03 : 0.97, { duration: ANIM_DURATION * 0.3, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: ANIM_DURATION * 0.7, easing }),
    );
  }, [selectedMonths]);

  useAnimatedReaction(
    () => Math.round(animatedMonths.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayMonths)(current);
      }
    },
  );

  const chartData = useMemo(() => {
    return allChartData.filter((d) => d.x <= displayMonths);
  }, [allChartData, displayMonths]);

  const headlineValue = useMemo(() => {
    const point = forecast.find((p) => p.monthsFromNow >= selectedMonths);
    return point?.netWorth ?? null;
  }, [forecast, selectedMonths]);

  const milestoneValues = useMemo(() => {
    return MILESTONE_YEARS.map((yr) => {
      const months = yr * 12;
      const point = forecast.find((p) => p.monthsFromNow >= months);
      return {
        year: yr,
        value: point?.netWorth ?? null,
      };
    });
  }, [forecast]);

  const handleSettingChange = (key: string, text: string) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    const val = parseFloat(text);
    if (!isNaN(val)) {
      setSettings({ [key]: val });
    }
  };

  const handleHorizonSelect = (key: string) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    const horizon = TIME_HORIZONS.find((h) => h.key === key);
    if (!horizon) return;
    setSelectedHorizon(key);
  };

  const formatXLabel = (months: number) => {
    if (months <= 0) return 'Now';
    if (selectedYears <= 2) {
      const mo = Math.round(months);
      if (mo < 12) return `${mo}mo`;
      const yrs = Math.floor(mo / 12);
      const rem = mo % 12;
      if (rem === 0) return `${yrs}Y`;
      return `${yrs}Y${rem}m`;
    }
    const years = Math.round(months / 12);
    return `${years}Y`;
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const chartAnimStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
    transform: [{ scaleX: chartScaleX.value }],
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedEntry delay={0} duration={350}>
        <View style={styles.headlineContainer}>
          <Text style={styles.headlineLabel}>
            Projected Net Worth · {selectedYears}{selectedYears === 1 ? ' Year' : ' Years'}
          </Text>
          <Text style={styles.headlineValue}>
            {headlineValue != null ? formatCurrency(headlineValue) : '--'}
          </Text>
        </View>
      </AnimatedEntry>

      {chartData.length >= 2 && (
        <AnimatedEntry delay={100} duration={300}>
          <View style={styles.chartContainer}>
            {touchValue != null && (
              <View style={styles.touchLabelContainer}>
                <Text style={styles.touchLabel}>{formatCurrency(touchValue)}</Text>
              </View>
            )}
            <Animated.View style={chartAnimStyle}>
              <LineChart
                data={chartData}
                width={screenWidth - spacing.xl * 2}
                height={300}
                color={Colors.primary}
                showGrid
                showLabels
                formatY={(v) => formatCurrency(v)}
                formatX={formatXLabel}
                onTouch={(point) => setTouchValue(point.y)}
                onTouchEnd={() => setTouchValue(null)}
                animationKey={focusKey}
              />
            </Animated.View>
          </View>
        </AnimatedEntry>
      )}

      <AnimatedEntry delay={200} duration={300}>
        <View style={styles.tabBar}>
        {TIME_HORIZONS.map((h) => {
          const isSelected = selectedHorizon === h.key;
          return (
            <TouchableOpacity
              key={h.key}
              testID={`horizon-tab-${h.key}`}
              style={[
                styles.tab,
                isSelected && styles.tabActive,
              ]}
              onPress={() => handleHorizonSelect(h.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${h.label} forecast`}
            >
              <Text style={[
                styles.tabText,
                isSelected && styles.tabTextActive,
              ]}>
                {h.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={250} duration={300}>
        <View style={styles.returnToggleBar}>
        <TouchableOpacity
          style={[
            styles.returnToggle,
            !settings.showRealReturns && styles.returnToggleActive,
          ]}
          onPress={() => setSettings({ showRealReturns: false })}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.returnToggleText,
            !settings.showRealReturns && styles.returnToggleTextActive,
          ]}>
            Nominal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.returnToggle,
            settings.showRealReturns && styles.returnToggleActive,
          ]}
          onPress={() => setSettings({ showRealReturns: true })}
          activeOpacity={0.7}
        >
          <View style={styles.returnToggleInner}>
            <Text style={[
              styles.returnToggleText,
              settings.showRealReturns && styles.returnToggleTextActive,
            ]}>
              Real (inflation-adj.)
            </Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Real Returns',
                  `Real returns adjust projected values for inflation, showing your future wealth in today's purchasing power. The current assumed inflation rate is ${settings.inflationPct}% per year. You can change this rate in Settings.`,
                )
              }
              hitSlop={8}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={settings.showRealReturns ? Colors.white : Colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={300} duration={300}>
        <Card style={styles.milestoneCard}>
        <Text style={styles.cardTitle}>Projected Net Worth</Text>
        {milestoneValues.map((m) => (
          <View key={m.year} style={styles.milestoneRow}>
            <Text style={styles.milestoneLabel}>
              {m.year} {m.year === 1 ? 'Year' : 'Years'}
            </Text>
            <Text style={styles.milestoneValue}>
              {m.value != null ? formatCurrency(m.value) : '--'}
            </Text>
          </View>
        ))}
        </Card>
      </AnimatedEntry>

      <AnimatedEntry delay={350} duration={300}>
        <Card style={styles.assumptionsCard}>
        <Text style={styles.cardTitle}>Growth Assumptions</Text>

        <AssumptionRow
          key={`stock-${settings.stockGrowthPct}`}
          label="Stocks & ETFs"
          value={settings.stockGrowthPct}
          onChangeText={(t) => handleSettingChange('stockGrowthPct', t)}
          color={Colors.categoryStocks}
        />
        <AssumptionRow
          key={`crypto-${settings.cryptoGrowthPct}`}
          label="Crypto"
          value={settings.cryptoGrowthPct}
          onChangeText={(t) => handleSettingChange('cryptoGrowthPct', t)}
          color={Colors.categoryCrypto}
        />
        <AssumptionRow
          key={`rsu-${settings.rsuGrowthPct}`}
          label="RSUs"
          value={settings.rsuGrowthPct}
          onChangeText={(t) => handleSettingChange('rsuGrowthPct', t)}
          color={Colors.categoryRSU}
        />
        <AssumptionRow
          key={`cash-${settings.cashGrowthPct}`}
          label="Cash / Savings"
          value={settings.cashGrowthPct}
          onChangeText={(t) => handleSettingChange('cashGrowthPct', t)}
          color={Colors.categorySavings}
        />
        <AssumptionRow
          key={`retirement-${settings.retirementGrowthPct}`}
          label="Retirement"
          value={settings.retirementGrowthPct}
          onChangeText={(t) => handleSettingChange('retirementGrowthPct', t)}
          color={Colors.categoryRetirement}
        />
        <AssumptionRow
          key={`inflation-${settings.inflationPct}`}
          label="Inflation"
          value={settings.inflationPct}
          onChangeText={(t) => handleSettingChange('inflationPct', t)}
          color={Colors.textSecondary}
        />
        </Card>
      </AnimatedEntry>

      <Paywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        allowDismiss={false}
        onPurchaseSuccess={() => {
          setShowPaywall(false);
          setShowPurchaseSuccess(true);
        }}
      />
      <PurchaseSuccessModal
        visible={showPurchaseSuccess}
        onDismiss={() => setShowPurchaseSuccess(false)}
      />
    </ScrollView>
  );
}

function AssumptionRow({
  label, value, onChangeText, color,
}: {
  label: string; value: number; onChangeText: (t: string) => void; color: string;
}) {
  return (
    <View style={aStyles.row}>
      <View style={aStyles.rowLeft}>
        <View style={[aStyles.dot, { backgroundColor: color }]} />
        <Text style={aStyles.label}>{label}</Text>
      </View>
      <View style={aStyles.inputWrap}>
        <TextInput
          style={aStyles.input}
          keyboardType="numeric"
          defaultValue={value.toString()}
          onEndEditing={(e) => onChangeText(e.nativeEvent.text)}
          selectTextOnFocus
        />
        <Text style={aStyles.pctSign}>%</Text>
      </View>
    </View>
  );
}

const aStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    width: 50,
    textAlign: 'right',
  },
  pctSign: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: spacing.xl },
  headlineContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headlineLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
  },
  headlineValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.hero,
    color: Colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.white,
  },
  chartContainer: { marginBottom: spacing.lg, position: 'relative' as const },
  touchLabelContainer: {
    position: 'absolute' as const,
    top: -18,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  touchLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.primary,
    backgroundColor: Colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden' as const,
  },
  returnToggleBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  returnToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  returnToggleActive: {
    backgroundColor: Colors.primary,
  },
  returnToggleText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  returnToggleTextActive: {
    color: Colors.white,
  },
  returnToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  milestoneCard: { marginBottom: spacing.xl },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    color: Colors.text,
    marginBottom: spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  milestoneLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
  milestoneValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.text,
  },
  assumptionsCard: { marginBottom: spacing.xl },
});
