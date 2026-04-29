import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals, computeHoldingValue, computeRSUVesting } from '@/lib/calculations';
import { getInstantPrice } from '@/lib/price-service';
import { useStockPrices } from '@/hooks/useStockPrices';
import { formatCurrency, formatShares } from '@/lib/format';
import { convertAmount } from '@/lib/currency';
import type { Currency } from '@/lib/currency';
import Card from '@/components/Card';
import TickerLogo from '@/components/TickerLogo';
import AnimatedEntry from '@/components/AnimatedEntry';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const CATEGORIES = [
  { key: 'stocks', label: 'Stocks & ETFs', color: Colors.categoryStocks, icon: 'trending-up' as const, type: 'holding' },
  { key: 'crypto', label: 'Crypto', color: Colors.categoryCrypto, icon: 'logo-bitcoin' as const, type: 'holding' },
  { key: 'rsus', label: 'RSUs', color: Colors.categoryRSU, icon: 'layers' as const, type: 'rsu' },
  { key: 'retirement', label: 'Retirement', color: Colors.categoryRetirement, icon: 'umbrella' as const, type: 'retirement' },
  { key: 'stockOptions', label: 'Stock Options', color: Colors.categoryStockOptions, icon: 'key' as const, type: 'stockOption' },
  { key: 'bonds', label: 'Bonds', color: Colors.categoryBonds, icon: 'ribbon' as const, type: 'bond' },
  { key: 'business', label: 'Business', color: Colors.categoryBusiness, icon: 'briefcase' as const, type: 'business' },
  { key: 'vehicles', label: 'Vehicles', color: Colors.categoryVehicles, icon: 'car' as const, type: 'vehicle' },
  { key: 'other', label: 'Assets', color: Colors.categoryOther, icon: 'diamond' as const, type: 'other' },
  { key: 'realEstate', label: 'Real Estate', color: Colors.categoryRealEstate, icon: 'business' as const, type: 'realEstate' },
  { key: 'cashSavings', label: 'Cash / Savings', color: Colors.categorySavings, icon: 'wallet' as const, type: 'cash' },
];

export default function BreakdownScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ focus?: string }>();
  const [expanded, setExpanded] = useState<string | null>(params.focus ?? null);
  const {
    holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate,
    retirementAccounts, stockOptions, bonds, businesses, vehicles,
    settings, exchangeRates,
    deleteHolding, deleteRSUGrant, deleteCashAccount, deleteMortgage, deleteOtherAsset, deleteRealEstate,
    deleteRetirementAccount, deleteStockOption, deleteBond, deleteBusiness, deleteVehicle,
  } = useAppStore();
  const displayCurrency = settings.displayCurrency ?? 'USD';
  const fmt = (v: number) => formatCurrency(v, displayCurrency);
  const cx = (amount: number, from?: Currency) =>
    convertAmount(amount, from ?? 'USD', displayCurrency, exchangeRates);

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
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles, displayCurrency, exchangeRates),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles, livePrices, displayCurrency, exchangeRates]
  );

  const getCategoryTotal = (key: string): number => {
    switch (key) {
      case 'stocks': return totals.stocks;
      case 'crypto': return totals.crypto;
      case 'rsus': return totals.rsusVested + totals.rsusUnvested;
      case 'retirement': return totals.retirement;
      case 'stockOptions': return totals.stockOptions;
      case 'bonds': return totals.bonds;
      case 'business': return totals.business;
      case 'vehicles': return totals.vehicles;
      case 'other': return totals.otherAssets;
      case 'realEstate': return totals.realEstate;
      case 'cashSavings': return totals.savings + totals.offset;
      default: return 0;
    }
  };

  const sortedCategories = useMemo(() => {
    const sorted = [...CATEGORIES].sort((a, b) => {
      const aVal = Math.abs(getCategoryTotal(a.key));
      const bVal = Math.abs(getCategoryTotal(b.key));
      return bVal - aVal;
    });
    return sorted.map((cat, i) => ({
      ...cat,
      color: Colors.chartPalette[i % Colors.chartPalette.length],
    }));
  }, [totals]);

  const getItems = (key: string) => {
    switch (key) {
      case 'stocks': return holdings.filter(h => h.type === 'stock');
      case 'crypto': return holdings.filter(h => h.type === 'crypto');
      case 'rsus': return rsuGrants;
      case 'retirement': return retirementAccounts;
      case 'stockOptions': return stockOptions;
      case 'bonds': return bonds;
      case 'business': return businesses;
      case 'vehicles': return vehicles;
      case 'other': return otherAssets;
      case 'realEstate': return realEstate;
      case 'cashSavings': return cashAccounts;
      default: return [];
    }
  };

  const handleDelete = useCallback((catKey: string, itemId: string, itemName: string) => {
    Alert.alert('Delete', `Remove ${itemName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (catKey === 'stocks' || catKey === 'crypto') deleteHolding(itemId);
          else if (catKey === 'rsus') deleteRSUGrant(itemId);
          else if (catKey === 'cashSavings') deleteCashAccount(itemId);
          else if (catKey === 'realEstate') deleteRealEstate(itemId);
          else if (catKey === 'other') deleteOtherAsset(itemId);
          else if (catKey === 'retirement') deleteRetirementAccount(itemId);
          else if (catKey === 'stockOptions') deleteStockOption(itemId);
          else if (catKey === 'bonds') deleteBond(itemId);
          else if (catKey === 'business') deleteBusiness(itemId);
          else if (catKey === 'vehicles') deleteVehicle(itemId);
        },
      },
    ]);
  }, []);

  const handleEdit = useCallback((type: string, id: string, catKey?: string) => {
    let editType = type;
    if (catKey === 'stocks') editType = 'holding';
    else if (catKey === 'crypto') editType = 'holding';
    else if (catKey === 'cashSavings') editType = 'cash';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const category = catKey === 'crypto' ? 'crypto' : catKey === 'stocks' ? 'stocks' : '';
    const categoryParam = category ? `&category=${category}` : '';
    router.push(`/edit-item?type=${editType}&id=${id}${categoryParam}`);
  }, []);

  const handleAdd = useCallback((type: string, catKey?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let addType = type;
    const category = catKey === 'crypto' ? 'crypto' : catKey === 'stocks' ? 'stocks' : '';
    const categoryParam = category ? `&category=${category}` : '';
    router.push(`/edit-item?type=${addType}${categoryParam}`);
  }, []);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const renderItem = (catKey: string, item: any) => {
    let name = '';
    let value = 0;
    let subtitle = '';

    if (catKey === 'stocks' || catKey === 'crypto') {
      name = item.symbol;
      value = computeHoldingValue(item);
      subtitle = `${formatShares(item.shares)} shares`;
    } else if (catKey === 'rsus') {
      const { vested, unvested } = computeRSUVesting(item, new Date());
      const price = getInstantPrice(item.symbol, 'stock');
      name = `${item.symbol} RSU`;
      value = vested * price;
      subtitle = `${formatShares(vested)} vested / ${formatShares(unvested)} unvested`;
    } else if (catKey === 'cashSavings') {
      name = item.name;
      value = item.balance;
      subtitle = `+${fmt(cx(item.monthlyContribution, item.currency))}/mo`;
    } else if (catKey === 'realEstate') {
      name = item.name;
      value = item.equity ?? item.currentValue;
      const parts: string[] = [];
      if (item.currentValue) parts.push(`Total: ${fmt(cx(item.currentValue, item.currency))}`);
      if (item.annualGrowthRate) parts.push(`${item.annualGrowthRate}% growth/yr`);
      subtitle = parts.join(' · ');
    } else if (catKey === 'other') {
      name = item.name;
      value = item.value;
      subtitle = item.annualGrowthRate ? `${item.annualGrowthRate}% growth/yr` : '';
    } else if (catKey === 'retirement') {
      name = item.name;
      value = item.balance;
      subtitle = `+${fmt(cx(item.monthlyContribution, item.currency))}/mo`;
    } else if (catKey === 'stockOptions') {
      name = `${item.symbol} ${item.optionType?.toUpperCase() ?? ''}`;
      const price = item.currentPrice ?? getInstantPrice(item.symbol, 'stock');
      value = Math.max(price - item.strikePrice, 0) * (item.vestedOptions ?? 0);
      subtitle = `Strike $${item.strikePrice}`;
    } else if (catKey === 'bonds') {
      name = item.name;
      value = item.purchasePrice ?? item.faceValue;
      subtitle = `${item.couponRate}% coupon`;
    } else if (catKey === 'business') {
      name = item.name;
      value = item.value;
      subtitle = item.annualGrowthRate ? `${item.annualGrowthRate}% growth/yr` : '';
    } else if (catKey === 'vehicles') {
      name = item.name;
      value = item.currentValue;
      subtitle = `${item.annualDepreciationRate ?? 15}% depreciation/yr`;
    }

    return (
      <Pressable
        key={item.id}
        style={styles.itemRow}
        onPress={() => handleEdit(CATEGORIES.find(c => c.key === catKey)?.type || 'holding', item.id, catKey)}
      >
        {(catKey === 'stocks' || catKey === 'crypto' || catKey === 'rsus' || catKey === 'stockOptions') && (
          <TickerLogo
            symbol={item.symbol}
            type={catKey === 'crypto' ? 'crypto' : 'stock'}
            size={30}
          />
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{name}</Text>
          {!!subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemValue}>{fmt(cx(value, item.currency))}</Text>
          <Pressable
            onPress={() => handleDelete(catKey, item.id, name)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
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
      <AnimatedEntry delay={0} duration={350}>
        <Text style={styles.pageTitle}>Breakdown</Text>
        <Text style={styles.netWorthSub}>Net Worth: {fmt(totals.netWorth)}</Text>
      </AnimatedEntry>

      {sortedCategories.map((cat, catIndex) => {
        const items = getItems(cat.key);
        const total = getCategoryTotal(cat.key);
        const isOpen = expanded === cat.key;

        return (
          <AnimatedEntry key={cat.key} delay={100 + catIndex * 40} duration={300}>
            <Card style={styles.categoryCard} noPadding>
              <Pressable
              style={styles.categoryHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpanded(isOpen ? null : cat.key);
              }}
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
                <Text style={styles.categoryTotal}>
                  {fmt(total)}
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
                    items.map((item: any) => renderItem(cat.key, item))
                  )}
                  <Pressable
                    style={styles.addButton}
                    onPress={() => handleAdd(cat.type, cat.key)}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Add {cat.label}</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </AnimatedEntry>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: spacing.xl },
  pageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    marginBottom: spacing.xs,
  },
  netWorthSub: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginBottom: spacing.xl,
  },
  categoryCard: { marginBottom: spacing.md },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  liabilityText: { color: Colors.negative },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: spacing.sm,
  },
  itemInfo: { flex: 1 },
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
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  addButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
