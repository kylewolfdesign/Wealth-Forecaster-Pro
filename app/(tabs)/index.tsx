import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, useWindowDimensions, RefreshControl,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot, shouldTakeSnapshot } from '@/lib/snapshot';
import { formatCurrency, formatPercent } from '@/lib/format';
import Card from '@/components/Card';
import LineChart from '@/components/LineChart';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const CATEGORY_CONFIG = [
  { key: 'stocks', label: 'Stocks/ETFs', color: Colors.categoryStocks, icon: 'trending-up' as const },
  { key: 'crypto', label: 'Crypto', color: Colors.categoryCrypto, icon: 'logo-bitcoin' as const },
  { key: 'rsus', label: 'RSUs', color: Colors.categoryRSU, icon: 'layers' as const },
  { key: 'savings', label: 'Savings', color: Colors.categorySavings, icon: 'wallet' as const },
  { key: 'offset', label: 'Offset', color: Colors.categoryOffset, icon: 'swap-horizontal' as const },
  { key: 'otherAssets', label: 'Other', color: Colors.categoryOther, icon: 'diamond' as const },
  { key: 'mortgage', label: 'Mortgage', color: Colors.categoryMortgage, icon: 'home' as const, isLiability: true },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    onboardingComplete, holdings, rsuGrants, cashAccounts,
    mortgages, otherAssets, snapshots, addSnapshot,
  } = useAppStore();

  const totals = useMemo(
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets]
  );

  useEffect(() => {
    if (onboardingComplete && shouldTakeSnapshot(snapshots)) {
      addSnapshot(createSnapshot(totals));
    }
  }, [onboardingComplete]);

  const chartData = useMemo(() => {
    return snapshots.map((s, i) => ({ x: i, y: s.totals.netWorth }));
  }, [snapshots]);

  const delta = useMemo(() => {
    if (snapshots.length < 2) return null;
    const prev = snapshots[snapshots.length - 2].totals.netWorth;
    const curr = totals.netWorth;
    const change = curr - prev;
    const pct = prev !== 0 ? (change / prev) * 100 : 0;
    return { change, pct };
  }, [snapshots, totals]);

  const categoryValues: Record<string, number> = useMemo(() => ({
    stocks: totals.stocks,
    crypto: totals.crypto,
    rsus: totals.rsusVested + totals.rsusUnvested,
    savings: totals.savings,
    offset: totals.offset,
    otherAssets: totals.otherAssets,
    mortgage: totals.mortgage,
  }), [totals]);

  const handleAddPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/edit-item?type=holding');
  }, []);

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const tileWidth = (screenWidth - spacing.xl * 2 - spacing.md) / 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Total Net Worth</Text>
        <Text style={styles.netWorthValue}>{formatCurrency(totals.netWorth)}</Text>
        {delta && (
          <View style={styles.deltaRow}>
            <View style={[styles.deltaBadge, { backgroundColor: delta.change >= 0 ? Colors.positiveLight : Colors.negativeLight }]}>
              <Ionicons
                name={delta.change >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={delta.change >= 0 ? Colors.positive : Colors.negative}
              />
              <Text style={[styles.deltaText, { color: delta.change >= 0 ? Colors.positive : Colors.negative }]}>
                {formatCurrency(Math.abs(delta.change))} ({formatPercent(delta.pct)})
              </Text>
            </View>
            <Text style={styles.deltaPeriod}>vs last snapshot</Text>
          </View>
        )}
      </View>

      {chartData.length >= 2 && (
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Net Worth Trend</Text>
          <LineChart
            data={chartData}
            width={screenWidth - spacing.xl * 2 - spacing.lg * 2}
            height={160}
            color={totals.netWorth >= 0 ? Colors.positive : Colors.negative}
            compact
          />
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Pressable onPress={handleAddPress} hitSlop={12}>
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tilesGrid}>
        {CATEGORY_CONFIG.map((cat) => {
          const val = categoryValues[cat.key] ?? 0;
          if (val === 0 && cat.key !== 'mortgage') return null;
          return (
            <Card
              key={cat.key}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => router.push(`/breakdown?focus=${cat.key}`)}
            >
              <View style={[styles.tileIcon, { backgroundColor: cat.color + '18' }]}>
                <Ionicons name={cat.icon} size={18} color={cat.color} />
              </View>
              <Text style={styles.tileLabel}>{cat.label}</Text>
              <Text style={[styles.tileValue, cat.isLiability && styles.liabilityValue]}>
                {cat.isLiability ? '-' : ''}{formatCurrency(val)}
              </Text>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  headerLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netWorthValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.hero,
    color: Colors.text,
    marginBottom: spacing.sm,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  deltaText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
  },
  deltaPeriod: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
  },
  chartCard: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    marginBottom: spacing.sm,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    padding: spacing.lg,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  tileValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.text,
  },
  liabilityValue: {
    color: Colors.negative,
  },
});
