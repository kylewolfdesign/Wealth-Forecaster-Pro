import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  TextInput, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { computeForecast } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import Card from '@/components/Card';
import LineChart from '@/components/LineChart';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const MILESTONE_YEARS = [1, 5, 10, 20, 50];

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    holdings, rsuGrants, cashAccounts, mortgages,
    otherAssets, settings, setSettings, isPro,
  } = useAppStore();

  const [localSettings, setLocalSettings] = useState({ ...settings });

  const forecast = useMemo(
    () => computeForecast(
      holdings, rsuGrants, cashAccounts, mortgages, otherAssets,
      localSettings, isPro ? 50 : 10,
    ),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, localSettings, isPro]
  );

  const chartData = useMemo(() => {
    return forecast.map((p) => ({
      x: p.monthsFromNow,
      y: p.netWorth,
    }));
  }, [forecast]);

  const milestoneValues = useMemo(() => {
    return MILESTONE_YEARS.map((yr) => {
      const months = yr * 12;
      const point = forecast.find((p) => p.monthsFromNow >= months);
      return {
        year: yr,
        value: point?.netWorth ?? null,
        locked: !isPro && yr > 10,
      };
    });
  }, [forecast, isPro]);

  const handleSettingChange = (key: string, text: string) => {
    const val = parseFloat(text);
    if (!isNaN(val)) {
      const updated = { ...localSettings, [key]: val };
      setLocalSettings(updated);
      setSettings({ [key]: val });
    }
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Forecast</Text>
      <Text style={styles.subtitle}>
        {localSettings.showRealReturns ? 'Real (inflation-adjusted)' : 'Nominal'} projections
      </Text>

      {chartData.length >= 2 && (
        <Card style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={screenWidth - spacing.xl * 2 - spacing.lg * 2}
            height={200}
            color={Colors.primary}
            showGrid
            showLabels
            formatY={(v) => formatCurrency(v)}
          />
        </Card>
      )}

      <Card style={styles.milestoneCard}>
        <Text style={styles.cardTitle}>Projected Net Worth</Text>
        {milestoneValues.map((m) => (
          <View key={m.year} style={styles.milestoneRow}>
            <Text style={styles.milestoneLabel}>
              {m.year} {m.year === 1 ? 'Year' : 'Years'}
            </Text>
            {m.locked ? (
              <Text style={styles.lockedText}>Pro</Text>
            ) : (
              <Text style={styles.milestoneValue}>
                {m.value != null ? formatCurrency(m.value) : '--'}
              </Text>
            )}
          </View>
        ))}
      </Card>

      <Card style={styles.assumptionsCard}>
        <Text style={styles.cardTitle}>Growth Assumptions</Text>

        <AssumptionRow
          label="Stocks/ETFs"
          value={localSettings.stockGrowthPct}
          onChangeText={(t) => handleSettingChange('stockGrowthPct', t)}
          color={Colors.categoryStocks}
        />
        <AssumptionRow
          label="Crypto"
          value={localSettings.cryptoGrowthPct}
          onChangeText={(t) => handleSettingChange('cryptoGrowthPct', t)}
          color={Colors.categoryCrypto}
        />
        <AssumptionRow
          label="RSUs"
          value={localSettings.rsuGrowthPct}
          onChangeText={(t) => handleSettingChange('rsuGrowthPct', t)}
          color={Colors.categoryRSU}
        />
        <AssumptionRow
          label="Cash/Savings"
          value={localSettings.cashGrowthPct}
          onChangeText={(t) => handleSettingChange('cashGrowthPct', t)}
          color={Colors.categorySavings}
        />
        <AssumptionRow
          label="Inflation"
          value={localSettings.inflationPct}
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
  pageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xl,
  },
  chartCard: { marginBottom: spacing.xl },
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
  lockedText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  assumptionsCard: { marginBottom: spacing.xl },
});
