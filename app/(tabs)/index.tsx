import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, useWindowDimensions,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals, computeHoldingValue, computeRSUVesting } from '@/lib/calculations';
import { getInstantPrice } from '@/lib/price-service';
import { useStockPrices } from '@/hooks/useStockPrices';
import { createSnapshot, shouldTakeSnapshot } from '@/lib/snapshot';
import { formatCurrency, formatPercent, formatShares } from '@/lib/format';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset } from '@/lib/types';
import DonutChart from '@/components/DonutChart';
import TickerLogo from '@/components/TickerLogo';
import Card from '@/components/Card';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

type CategoryItem = Holding | RSUGrant | CashAccount | Mortgage | OtherAsset;

interface CategoryConfig {
  key: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: string;
  subType?: string;
  isLiability?: boolean;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  { key: 'stocks', label: 'Stocks/ETFs', color: Colors.categoryStocks, icon: 'trending-up', type: 'holding', subType: 'stock' },
  { key: 'crypto', label: 'Crypto', color: Colors.categoryCrypto, icon: 'logo-bitcoin', type: 'holding', subType: 'crypto' },
  { key: 'rsus', label: 'RSUs', color: Colors.categoryRSU, icon: 'layers', type: 'rsu' },
  { key: 'savings', label: 'Savings', color: Colors.categorySavings, icon: 'wallet', type: 'cash', subType: 'savings' },
  { key: 'offset', label: 'Offset', color: Colors.categoryOffset, icon: 'swap-horizontal', type: 'cash', subType: 'offset' },
  { key: 'otherAssets', label: 'Other', color: Colors.categoryOther, icon: 'diamond', type: 'other' },
  { key: 'mortgage', label: 'Mortgage', color: Colors.categoryMortgage, icon: 'home', type: 'mortgage', isLiability: true },
];

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const {
    onboardingComplete, holdings, rsuGrants, cashAccounts,
    mortgages, otherAssets, snapshots, addSnapshot,
  } = useAppStore();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const stockSymbols = useMemo(() => {
    const syms = new Set<string>();
    holdings.filter(h => h.type === 'stock').forEach(h => syms.add(h.symbol.toUpperCase()));
    rsuGrants.forEach(g => syms.add(g.symbol.toUpperCase()));
    return [...syms];
  }, [holdings, rsuGrants]);

  const { prices: livePrices } = useStockPrices(stockSymbols);

  const totals = useMemo(
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, livePrices]
  );

  useEffect(() => {
    if (onboardingComplete && shouldTakeSnapshot(snapshots)) {
      addSnapshot(createSnapshot(totals));
    }
  }, [onboardingComplete]);

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

  const donutSlices = useMemo(() => {
    return CATEGORY_CONFIG.map((cat) => ({
      value: Math.abs(categoryValues[cat.key] ?? 0),
      color: cat.color,
      label: cat.label,
    }));
  }, [categoryValues]);

  const getItems = useCallback((key: string): CategoryItem[] => {
    switch (key) {
      case 'stocks': return holdings.filter(h => h.type === 'stock');
      case 'crypto': return holdings.filter(h => h.type === 'crypto');
      case 'rsus': return rsuGrants;
      case 'savings': return cashAccounts.filter(c => c.type === 'savings');
      case 'offset': return cashAccounts.filter(c => c.type === 'offset');
      case 'otherAssets': return otherAssets;
      case 'mortgage': return mortgages;
      default: return [];
    }
  }, [holdings, rsuGrants, cashAccounts, mortgages, otherAssets]);

  const handleToggle = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(prev => prev === key ? null : key);
  }, []);

  const handleEdit = useCallback((type: string, id: string, catKey?: string) => {
    let editType = type;
    if (catKey === 'stocks' || catKey === 'crypto') editType = 'holding';
    else if (catKey === 'savings' || catKey === 'offset') editType = 'cash';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/edit-item?type=${editType}&id=${id}`);
  }, []);

  const handleAdd = useCallback((type: string, category?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const params = category ? `type=${type}&category=${category}` : `type=${type}`;
    router.push(`/edit-item?${params}`);
  }, []);

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const donutSize = Math.min(screenWidth - spacing.xl * 4, 220);

  const getItemDetails = (catKey: string, item: CategoryItem): { name: string; value: number; subtitle: string; symbol?: string } => {
    if ((catKey === 'stocks' || catKey === 'crypto') && 'symbol' in item && 'shares' in item) {
      const h = item as Holding;
      return { name: h.symbol, value: computeHoldingValue(h), subtitle: `${formatShares(h.shares)} shares`, symbol: h.symbol };
    }
    if (catKey === 'rsus' && 'totalShares' in item) {
      const g = item as RSUGrant;
      const { vested, unvested } = computeRSUVesting(g, new Date());
      const price = getInstantPrice(g.symbol, 'stock');
      return { name: `${g.symbol} RSU`, value: vested * price, subtitle: `${formatShares(vested)} vested / ${formatShares(unvested)} unvested`, symbol: g.symbol };
    }
    if ((catKey === 'savings' || catKey === 'offset') && 'balance' in item) {
      const c = item as CashAccount;
      return { name: c.name, value: c.balance, subtitle: `+${formatCurrency(c.monthlyContribution)}/mo` };
    }
    if (catKey === 'mortgage' && 'principalBalance' in item) {
      const m = item as Mortgage;
      return { name: m.name, value: m.principalBalance, subtitle: `${m.annualInterestRate}% rate` };
    }
    if (catKey === 'otherAssets' && 'value' in item) {
      const o = item as OtherAsset;
      return { name: o.name, value: o.value, subtitle: o.annualGrowthRate ? `${o.annualGrowthRate}% growth/yr` : '' };
    }
    return { name: '', value: 0, subtitle: '' };
  };

  const renderItem = (catKey: string, item: CategoryItem) => {
    const { name, value, subtitle, symbol } = getItemDetails(catKey, item);
    const cat = CATEGORY_CONFIG.find(c => c.key === catKey);

    return (
      <Pressable
        key={item.id}
        style={styles.itemRow}
        onPress={() => handleEdit(cat?.type || 'holding', item.id, catKey)}
        testID={`item-${item.id}`}
      >
        {symbol && (catKey === 'stocks' || catKey === 'crypto' || catKey === 'rsus') && (
          <TickerLogo
            symbol={symbol}
            type={catKey === 'crypto' ? 'crypto' : 'stock'}
            size={30}
          />
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{name}</Text>
          {!!subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
        <Text style={[styles.itemValue, catKey === 'mortgage' && styles.liabilityText]}>
          {catKey === 'mortgage' ? '-' : ''}{formatCurrency(value)}
        </Text>
      </Pressable>
    );
  };

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
            <View style={[styles.deltaBadge, { backgroundColor: delta.change >= 0 ? 'rgba(18,183,106,0.15)' : 'rgba(240,68,56,0.15)' }]}>
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

      <View style={styles.donutSection}>
        <DonutChart
          slices={donutSlices}
          size={donutSize}
          strokeWidth={20}
          centerLabel={formatCurrency(totals.netWorth)}
          centerSubLabel="Net Worth"
        />
        <View style={styles.legend}>
          {CATEGORY_CONFIG.map((cat) => {
            const val = categoryValues[cat.key] ?? 0;
            if (val === 0) return null;
            return (
              <View key={cat.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={styles.legendLabel}>{cat.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>

      {CATEGORY_CONFIG.map((cat) => {
        const items = getItems(cat.key);
        const total = categoryValues[cat.key] ?? 0;
        const isOpen = expandedCategory === cat.key;

        return (
          <Card key={cat.key} style={styles.categoryCard} noPadding>
            <Pressable
              style={styles.categoryHeader}
              onPress={() => handleToggle(cat.key)}
              testID={`category-${cat.key}`}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}>
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                </View>
                <View>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categoryCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={[styles.categoryTotal, cat.isLiability && styles.liabilityText]}>
                  {cat.isLiability ? '-' : ''}{formatCurrency(total)}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textTertiary}
                />
              </View>
            </Pressable>

            {isOpen && (
              <View style={styles.categoryBody}>
                {items.length === 0 ? (
                  <Text style={styles.emptyText}>No items yet</Text>
                ) : (
                  items.map((item) => renderItem(cat.key, item))
                )}
                <View style={styles.addButtonContainer}>
                  <Pressable
                    style={styles.addButton}
                    onPress={() => handleAdd(cat.type, cat.subType)}
                    testID={`add-${cat.key}`}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Card>
        );
      })}
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
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  headerLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
  donutSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    marginBottom: spacing.md,
  },
  categoryCard: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  categoryCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryTotal: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  liabilityText: {
    color: Colors.negative,
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  itemSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  addButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: '#FFFFFF',
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
