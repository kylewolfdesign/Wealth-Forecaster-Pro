import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, useWindowDimensions,
  RefreshControl,
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
import { formatCurrency, formatShares } from '@/lib/format';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate } from '@/lib/types';
import DonutChart from '@/components/DonutChart';
import TickerLogo from '@/components/TickerLogo';
import Card from '@/components/Card';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily } from '@/constants/theme';

type CategoryItem = Holding | RSUGrant | CashAccount | Mortgage | OtherAsset | RealEstate;

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
  { key: 'stocks', label: 'Stocks', color: Colors.categoryStocks, icon: 'trending-up', type: 'holding', subType: 'stock' },
  { key: 'crypto', label: 'Crypto', color: Colors.categoryCrypto, icon: 'logo-bitcoin', type: 'holding', subType: 'crypto' },
  { key: 'rsus', label: 'RSUs', color: Colors.categoryRSU, icon: 'layers', type: 'rsu' },
  { key: 'otherAssets', label: 'Assets', color: Colors.categoryOther, icon: 'diamond', type: 'other' },
  { key: 'realEstate', label: 'Real Estate', color: Colors.categoryRealEstate, icon: 'business', type: 'realEstate' },
  { key: 'cashSavings', label: 'Cash / Savings', color: Colors.categorySavings, icon: 'wallet', type: 'cash' },
];

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const store = useAppStore();
  const {
    onboardingComplete, holdings, rsuGrants, cashAccounts,
    mortgages, otherAssets, realEstate, snapshots, addSnapshot,
  } = store;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { stockSymbols, typedSymbols } = useMemo(() => {
    const syms = new Set<string>();
    const typed: { symbol: string; type: 'stock' | 'crypto' }[] = [];
    holdings.forEach(h => {
      const upper = h.symbol.toUpperCase();
      if (!syms.has(upper)) {
        syms.add(upper);
        typed.push({ symbol: upper, type: h.type === 'crypto' ? 'crypto' : 'stock' });
      }
    });
    rsuGrants.forEach(g => {
      const upper = g.symbol.toUpperCase();
      if (!syms.has(upper)) {
        syms.add(upper);
        typed.push({ symbol: upper, type: 'stock' });
      }
    });
    return { stockSymbols: [...syms], typedSymbols: typed };
  }, [holdings, rsuGrants]);

  const { prices: livePrices, refetch: refetchPrices } = useStockPrices(stockSymbols, typedSymbols);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchPrices();
    } finally {
      setRefreshing(false);
    }
  }, [refetchPrices]);

  const totals = useMemo(
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, livePrices]
  );

  useEffect(() => {
    if (onboardingComplete && shouldTakeSnapshot(snapshots)) {
      addSnapshot(createSnapshot(totals));
    }
  }, [onboardingComplete]);

  const categoryValues: Record<string, number> = useMemo(() => ({
    stocks: totals.stocks,
    crypto: totals.crypto,
    rsus: totals.rsusVested + totals.rsusUnvested,
    otherAssets: totals.otherAssets,
    realEstate: totals.realEstate,
    cashSavings: totals.savings + totals.offset,
  }), [totals]);

  const sortedCategories = useMemo(() => {
    const sorted = [...CATEGORY_CONFIG].sort((a, b) => {
      const aVal = Math.abs(categoryValues[a.key] ?? 0);
      const bVal = Math.abs(categoryValues[b.key] ?? 0);
      return bVal - aVal;
    });
    return sorted.map((cat, i) => ({
      ...cat,
      color: Colors.chartPalette[i % Colors.chartPalette.length],
    }));
  }, [categoryValues]);

  const donutSlices = useMemo(() => {
    return sortedCategories.map((cat) => ({
      value: Math.abs(categoryValues[cat.key] ?? 0),
      color: cat.color,
      label: cat.label,
    }));
  }, [sortedCategories, categoryValues]);

  const getItems = useCallback((key: string): CategoryItem[] => {
    switch (key) {
      case 'stocks': return holdings.filter(h => h.type === 'stock');
      case 'crypto': return holdings.filter(h => h.type === 'crypto');
      case 'rsus': return rsuGrants;
      case 'otherAssets': return otherAssets;
      case 'realEstate': return realEstate;
      case 'cashSavings': return cashAccounts;
      default: return [];
    }
  }, [holdings, rsuGrants, cashAccounts, otherAssets, realEstate]);

  const handleToggle = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(prev => prev === key ? null : key);
  }, []);

  const handleEdit = useCallback((type: string, id: string, catKey?: string) => {
    let editType = type;
    if (catKey === 'stocks' || catKey === 'crypto') editType = 'holding';
    else if (catKey === 'cashSavings') editType = 'cash';
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
  const donutSize = Math.min(screenWidth - spacing.xl * 4, 280);

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
    if (catKey === 'cashSavings' && 'balance' in item) {
      const c = item as CashAccount;
      return { name: c.name, value: c.balance, subtitle: `+${formatCurrency(c.monthlyContribution)}/mo` };
    }
    if (catKey === 'realEstate' && 'currentValue' in item) {
      const r = item as RealEstate;
      const equityVal = r.equity ?? r.currentValue;
      const parts: string[] = [];
      if (r.currentValue) parts.push(`Total: $${r.currentValue.toLocaleString()}`);
      if (r.annualGrowthRate) parts.push(`${r.annualGrowthRate}% growth/yr`);
      return { name: r.name, value: equityVal, subtitle: parts.join(' · ') };
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
        <Text style={styles.itemValue}>
          {formatCurrency(value)}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.sm, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          title="Syncing latest market data..."
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      <View style={styles.donutSection}>
        <DonutChart
          slices={donutSlices}
          size={donutSize}
          strokeWidth={17}
          centerLabel={formatCurrency(totals.netWorth)}
          centerSubLabel="NET WORTH"
        />
        <View style={styles.legend}>
          {(() => {
            const totalPositive = Object.values(categoryValues).reduce((s, v) => s + Math.abs(v), 0);
            return sortedCategories.map((cat) => {
            const val = categoryValues[cat.key] ?? 0;
            if (val === 0) return null;
            const pct = totalPositive > 0 ? Math.round((Math.abs(val) / totalPositive) * 100) : 0;
            return (
              <View key={cat.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={styles.legendLabel}>{cat.label} {pct}%</Text>
              </View>
            );
          });
          })()}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>

      {sortedCategories.map((cat) => {
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
                <View style={styles.categoryIconCircle}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryTotal}>
                  {formatCurrency(total)}
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
  donutSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg + 20,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: Colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceFlat,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
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
