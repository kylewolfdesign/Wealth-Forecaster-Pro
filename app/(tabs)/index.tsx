import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, useWindowDimensions,
  RefreshControl,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals, computeHoldingValue, computeRSUVesting, computeStockOptionVesting } from '@/lib/calculations';
import { getInstantPrice } from '@/lib/price-service';
import { useStockPrices } from '@/hooks/useStockPrices';
import { createSnapshot, shouldTakeSnapshot } from '@/lib/snapshot';
import { formatCurrency, formatShares } from '@/lib/format';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate, RetirementAccount, StockOption, Bond, Business, Vehicle } from '@/lib/types';
import DonutChart from '@/components/DonutChart';
import TickerLogo from '@/components/TickerLogo';
import Card from '@/components/Card';
import AnimatedEntry from '@/components/AnimatedEntry';
import Paywall from '@/components/Paywall';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily } from '@/constants/theme';

type CategoryItem = Holding | RSUGrant | CashAccount | Mortgage | OtherAsset | RealEstate | RetirementAccount | StockOption | Bond | Business | Vehicle;

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
  { key: 'retirement', label: 'Retirement', color: Colors.categoryRetirement, icon: 'umbrella', type: 'retirement' },
  { key: 'stockOptions', label: 'Stock Options', color: Colors.categoryStockOptions, icon: 'key', type: 'stockOption' },
  { key: 'bonds', label: 'Bonds', color: Colors.categoryBonds, icon: 'ribbon', type: 'bond' },
  { key: 'business', label: 'Business', color: Colors.categoryBusiness, icon: 'briefcase', type: 'business' },
  { key: 'vehicles', label: 'Vehicles', color: Colors.categoryVehicles, icon: 'car', type: 'vehicle' },
  { key: 'otherAssets', label: 'Assets', color: Colors.categoryOther, icon: 'diamond', type: 'other' },
  { key: 'realEstate', label: 'Real Estate', color: Colors.categoryRealEstate, icon: 'business', type: 'realEstate' },
  { key: 'cashSavings', label: 'Cash / Savings', color: Colors.categorySavings, icon: 'wallet', type: 'cash' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function LegendChip({ color, label, isSelected, hasSelection, onPress }: {
  color: string;
  label: string;
  isSelected: boolean;
  hasSelection: boolean;
  onPress: () => void;
}) {
  const timingConfig = { duration: 300, easing: Easing.out(Easing.cubic) };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isSelected ? 1.08 : 1, timingConfig);
    const opacity = withTiming(hasSelection && !isSelected ? 0.4 : 1, timingConfig);
    return { transform: [{ scale }], opacity };
  }, [isSelected, hasSelection]);

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.legendItem,
        isSelected && { borderColor: color, borderWidth: 1.5 },
        animatedStyle,
      ]}
    >
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const store = useAppStore();
  const {
    onboardingComplete, holdings, rsuGrants, cashAccounts,
    mortgages, otherAssets, realEstate, snapshots, addSnapshot,
    retirementAccounts, stockOptions, bonds, businesses, vehicles,
    isPro,
  } = store;

  const [showPaywall, setShowPaywall] = useState(false);
  const [countUpDone, setCountUpDone] = useState(false);
  const paywallShownRef = useRef(false);

  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPro) {
      setShowPaywall(false);
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current);
        paywallTimerRef.current = null;
      }
    }
  }, [isPro]);

  const handleCountUpComplete = useCallback(() => {
    setCountUpDone(true);
    if (!isPro && !paywallShownRef.current) {
      paywallShownRef.current = true;
      paywallTimerRef.current = setTimeout(() => setShowPaywall(true), 3000);
    }
  }, [isPro]);


  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

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
    stockOptions.forEach(o => {
      const upper = o.symbol.toUpperCase();
      if (!syms.has(upper)) {
        syms.add(upper);
        typed.push({ symbol: upper, type: 'stock' });
      }
    });
    return { stockSymbols: [...syms], typedSymbols: typed };
  }, [holdings, rsuGrants, stockOptions]);

  const { prices: livePrices, refetch: refetchPrices } = useStockPrices(stockSymbols, typedSymbols);
  const [refreshing, setRefreshing] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchPrices();
      setLastPriceUpdate(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [refetchPrices]);

  useEffect(() => {
    if (lastPriceUpdate === null && Object.keys(livePrices).length > 0) {
      setLastPriceUpdate(new Date());
    }
  }, [livePrices]);

  const totals = useMemo(
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles, livePrices]
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
    retirement: totals.retirement,
    stockOptions: totals.stockOptions,
    bonds: totals.bonds,
    business: totals.business,
    vehicles: totals.vehicles,
    otherAssets: totals.otherAssets,
    realEstate: totals.realEstate,
    cashSavings: totals.savings + totals.offset,
  }), [totals]);

  useEffect(() => {
    if (selectedCategory && (categoryValues[selectedCategory] ?? 0) === 0) {
      setSelectedCategory(null);
    }
  }, [categoryValues, selectedCategory]);

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
      case 'retirement': return retirementAccounts;
      case 'stockOptions': return stockOptions;
      case 'bonds': return bonds;
      case 'business': return businesses;
      case 'vehicles': return vehicles;
      case 'otherAssets': return otherAssets;
      case 'realEstate': return realEstate;
      case 'cashSavings': return cashAccounts;
      default: return [];
    }
  }, [holdings, rsuGrants, cashAccounts, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles]);

  const handleToggle = useCallback((key: string) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(prev => prev === key ? null : key);
  }, [isPro]);

  const handleEdit = useCallback((type: string, id: string, catKey?: string) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    let editType = type;
    if (catKey === 'stocks' || catKey === 'crypto') editType = 'holding';
    else if (catKey === 'cashSavings') editType = 'cash';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/edit-item?type=${editType}&id=${id}`);
  }, [isPro]);

  const handleAdd = useCallback((type: string, category?: string) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const params = category ? `type=${type}&category=${category}` : `type=${type}`;
    router.push(`/edit-item?${params}`);
  }, [isPro]);

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const donutSize = Math.min(screenWidth - spacing.xl * 4, 280);

  const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    '401k': '401(k)',
    'ira': 'IRA',
    'roth_ira': 'Roth IRA',
    'pension': 'Pension',
    'other': 'Other',
  };

  const getItemDetails = (catKey: string, item: CategoryItem): { name: string; value: number; subtitle: string; symbol?: string; badge?: string; badgeColor?: string } => {
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
    if (catKey === 'realEstate' && 'currentValue' in item && 'equity' in item) {
      const r = item as RealEstate;
      const equityVal = r.equity ?? r.currentValue;
      const parts: string[] = [];
      if (r.currentValue) parts.push(`Total: $${r.currentValue.toLocaleString()}`);
      if (r.annualGrowthRate) parts.push(`${r.annualGrowthRate}% growth/yr`);
      return { name: r.name, value: equityVal, subtitle: parts.join(' · ') };
    }
    if (catKey === 'otherAssets' && 'value' in item && 'annualGrowthRate' in item) {
      const o = item as OtherAsset;
      return { name: o.name, value: o.value, subtitle: o.annualGrowthRate ? `${o.annualGrowthRate}% growth/yr` : '' };
    }
    if (catKey === 'retirement' && 'accountType' in item) {
      const r = item as RetirementAccount;
      const label = ACCOUNT_TYPE_LABELS[r.accountType] || r.accountType;
      return { name: r.name, value: r.balance, subtitle: `+${formatCurrency(r.monthlyContribution)}/mo`, badge: label, badgeColor: Colors.categoryRetirement };
    }
    if (catKey === 'stockOptions' && 'strikePrice' in item) {
      const o = item as StockOption;
      const { vested } = computeStockOptionVesting(o, new Date());
      const price = o.currentPrice ?? getInstantPrice(o.symbol, 'stock');
      const intrinsic = Math.max(price - o.strikePrice, 0) * vested;
      const isUnderwater = price < o.strikePrice;
      return {
        name: `${o.symbol} ${o.optionType.toUpperCase()}`,
        value: intrinsic,
        subtitle: `${vested}/${o.totalOptions} vested · Strike $${o.strikePrice}`,
        symbol: o.symbol,
        badge: isUnderwater ? 'Underwater' : undefined,
        badgeColor: isUnderwater ? Colors.negative : undefined,
      };
    }
    if (catKey === 'bonds' && 'couponRate' in item) {
      const b = item as Bond;
      return { name: b.name, value: b.purchasePrice ?? b.faceValue, subtitle: `${b.couponRate}% coupon · Matures ${b.maturityDate}` };
    }
    if (catKey === 'business' && 'isIlliquid' in item) {
      const biz = item as Business;
      const parts: string[] = [];
      if (biz.annualGrowthRate) parts.push(`${biz.annualGrowthRate}% growth/yr`);
      return {
        name: biz.name,
        value: biz.value,
        subtitle: parts.join(' · '),
        badge: biz.isIlliquid ? 'Illiquid' : undefined,
        badgeColor: Colors.textTertiary,
      };
    }
    if (catKey === 'vehicles' && 'annualDepreciationRate' in item) {
      const v = item as Vehicle;
      return { name: v.name, value: v.currentValue, subtitle: `${v.annualDepreciationRate ?? 15}% depreciation/yr` };
    }
    return { name: '', value: 0, subtitle: '' };
  };

  const renderItem = (catKey: string, item: CategoryItem) => {
    const { name, value, subtitle, symbol, badge, badgeColor } = getItemDetails(catKey, item);
    const cat = CATEGORY_CONFIG.find(c => c.key === catKey);

    const linkedMortgage = catKey === 'realEstate' && 'mortgageId' in item && (item as RealEstate).mortgageId
      ? mortgages.find(m => m.id === (item as RealEstate).mortgageId)
      : null;

    return (
      <View key={item.id}>
        <Pressable
          style={styles.itemRow}
          onPress={() => handleEdit(cat?.type || 'holding', item.id, catKey)}
          testID={`item-${item.id}`}
        >
          {symbol && (catKey === 'stocks' || catKey === 'crypto' || catKey === 'rsus' || catKey === 'stockOptions') && (
            <TickerLogo
              symbol={symbol}
              type={catKey === 'crypto' ? 'crypto' : 'stock'}
              size={30}
            />
          )}
          <View style={styles.itemInfo}>
            <View style={styles.itemNameRow}>
              <Text style={styles.itemName}>{name}</Text>
              {badge && (
                <View style={[styles.badge, { backgroundColor: (badgeColor || Colors.textTertiary) + '22' }]}>
                  <Text style={[styles.badgeText, { color: badgeColor || Colors.textTertiary }]}>{badge}</Text>
                </View>
              )}
            </View>
            {!!subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
          </View>
          <Text style={styles.itemValue}>
            {formatCurrency(value)}
          </Text>
        </Pressable>
        {linkedMortgage && (
          <View style={styles.mortgageSubRows}>
            <View style={styles.mortgageSubRow}>
              <Text style={styles.mortgageSubLabel}>Mortgage: {linkedMortgage.name}</Text>
              <Text style={styles.mortgageSubValue}>{formatCurrency(linkedMortgage.principalBalance)}</Text>
            </View>
            <View style={styles.mortgageSubRow}>
              <Text style={styles.equitySubLabel}>Equity</Text>
              <Text style={styles.equitySubValue}>
                {formatCurrency(((item as RealEstate).equity ?? (item as RealEstate).currentValue) - linkedMortgage.principalBalance)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.xs, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      }}
      onResponderRelease={(e) => {
        const start = touchStartRef.current;
        if (start) {
          const dx = Math.abs(e.nativeEvent.pageX - start.x);
          const dy = Math.abs(e.nativeEvent.pageY - start.y);
          if (dx < 10 && dy < 10) {
            setSelectedCategory(null);
          }
        }
        touchStartRef.current = null;
      }}
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
        <View style={styles.donutSection}>
          <Text style={styles.priceTimestamp}>
            {lastPriceUpdate
              ? `Prices as of ${lastPriceUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Pull down to refresh prices'}
          </Text>
          <DonutChart
            slices={donutSlices}
            size={donutSize}
            strokeWidth={17}
            centerLabel={formatCurrency(totals.netWorth)}
            centerSubLabel="NET WORTH"
            selectedLabel={selectedCategory ? (sortedCategories.find(c => c.key === selectedCategory)?.label ?? null) : null}
            animationKey={focusKey}
            animateValue={!countUpDone}
            targetValue={totals.netWorth}
            onCountUpComplete={handleCountUpComplete}
          />
        </View>
      </AnimatedEntry>
      <AnimatedEntry delay={150} duration={300}>
        <View style={styles.legend}>
          {(() => {
            const totalPositive = Object.values(categoryValues).reduce((s, v) => s + Math.abs(v), 0);
            return sortedCategories.map((cat) => {
            const val = categoryValues[cat.key] ?? 0;
            if (val === 0) return null;
            const pct = totalPositive > 0 ? Math.round((Math.abs(val) / totalPositive) * 100) : 0;
            const isSelected = selectedCategory === cat.key;
            const hasSelection = selectedCategory != null;
            return (
              <LegendChip
                key={cat.key}
                color={cat.color}
                label={`${cat.label} ${pct}%`}
                isSelected={isSelected}
                hasSelection={hasSelection}
                onPress={() => setSelectedCategory(prev => prev === cat.key ? null : cat.key)}
              />
            );
          });
          })()}
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={250} duration={300}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </AnimatedEntry>

      {sortedCategories.map((cat, catIndex) => {
        const items = getItems(cat.key);
        const total = categoryValues[cat.key] ?? 0;
        const isOpen = expandedCategory === cat.key;

        return (
          <AnimatedEntry key={cat.key} delay={300 + catIndex * 40} duration={300}>
            <Card style={styles.categoryCard} noPadding>
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
          </AnimatedEntry>
        );
      })}

      <Paywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        allowDismiss={false}
      />
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
    marginBottom: 12,
    paddingHorizontal: spacing.md,
  },
  priceTimestamp: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 36,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    backgroundColor: Colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
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
  mortgageSubRows: {
    paddingLeft: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  mortgageSubRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 2,
  },
  mortgageSubLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
  },
  mortgageSubValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
  },
  equitySubLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.positive,
  },
  equitySubValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.positive,
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
