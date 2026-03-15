import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  TextInput, useWindowDimensions, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { computeForecast } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import Card from '@/components/Card';
import LineChart from '@/components/LineChart';
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

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    holdings, rsuGrants, cashAccounts, mortgages,
    otherAssets, realEstate, settings, setSettings,
  } = useAppStore();

  const [selectedHorizon, setSelectedHorizon] = useState<string>('10Y');


  const forecast = useMemo(
    () => computeForecast(
      holdings, rsuGrants, cashAccounts, mortgages, otherAssets,
      settings, 50, realEstate,
    ),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, settings]
  );

  const chartData = useMemo(() => {
    return forecast.map((p) => ({
      x: p.monthsFromNow,
      y: p.netWorth,
    }));
  }, [forecast]);

  const selectedYears = useMemo(() => {
    const horizon = TIME_HORIZONS.find((h) => h.key === selectedHorizon);
    return horizon?.years ?? 10;
  }, [selectedHorizon]);

  const selectedMonths = selectedYears * 12;

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
    const val = parseFloat(text);
    if (!isNaN(val)) {
      setSettings({ [key]: val });
    }
  };

  const handleHorizonSelect = (key: string) => {
    const horizon = TIME_HORIZONS.find((h) => h.key === key);
    if (!horizon) return;
    setSelectedHorizon(key);
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const maxDataMonths = forecast.length > 0 ? forecast[forecast.length - 1].monthsFromNow : 0;
  const showHighlight = selectedMonths < maxDataMonths;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headlineContainer}>
        <Text style={styles.headlineLabel}>
          Projected Net Worth · {selectedYears}{selectedYears === 1 ? ' Year' : ' Years'}
        </Text>
        <Text style={styles.headlineValue}>
          {headlineValue != null ? formatCurrency(headlineValue) : '--'}
        </Text>
      </View>

      {chartData.length >= 2 && (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={screenWidth - spacing.xl * 2}
            height={200}
            color={Colors.primary}
            showGrid
            showLabels
            formatY={(v) => formatCurrency(v)}
            highlightEndX={showHighlight ? selectedMonths : undefined}
          />
        </View>
      )}

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
          key={`inflation-${settings.inflationPct}`}
          label="Inflation"
          value={settings.inflationPct}
          onChangeText={(t) => handleSettingChange('inflationPct', t)}
          color={Colors.textSecondary}
        />
      </Card>
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
  chartContainer: { marginBottom: spacing.lg },
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
