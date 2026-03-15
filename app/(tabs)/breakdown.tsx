import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals, computeHoldingValue, computeRSUVesting } from '@/lib/calculations';
import { getInstantPrice } from '@/lib/price-service';
import { formatCurrency, formatShares } from '@/lib/format';
import Card from '@/components/Card';
import TickerLogo from '@/components/TickerLogo';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const CATEGORIES = [
  { key: 'stocks', label: 'Stocks/ETFs', color: Colors.categoryStocks, icon: 'trending-up' as const, type: 'holding' },
  { key: 'crypto', label: 'Crypto', color: Colors.categoryCrypto, icon: 'logo-bitcoin' as const, type: 'holding' },
  { key: 'rsus', label: 'RSUs', color: Colors.categoryRSU, icon: 'layers' as const, type: 'rsu' },
  { key: 'savings', label: 'Savings', color: Colors.categorySavings, icon: 'wallet' as const, type: 'cash' },
  { key: 'offset', label: 'Offset Accounts', color: Colors.categoryOffset, icon: 'swap-horizontal' as const, type: 'cash' },
  { key: 'other', label: 'Other Assets', color: Colors.categoryOther, icon: 'diamond' as const, type: 'other' },
  { key: 'mortgage', label: 'Mortgages', color: Colors.categoryMortgage, icon: 'home' as const, type: 'mortgage', isLiability: true },
];

export default function BreakdownScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ focus?: string }>();
  const [expanded, setExpanded] = useState<string | null>(params.focus ?? null);
  const {
    holdings, rsuGrants, cashAccounts, mortgages, otherAssets,
    deleteHolding, deleteRSUGrant, deleteCashAccount, deleteMortgage, deleteOtherAsset,
  } = useAppStore();

  const totals = useMemo(
    () => computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets),
    [holdings, rsuGrants, cashAccounts, mortgages, otherAssets]
  );

  const getCategoryTotal = (key: string): number => {
    switch (key) {
      case 'stocks': return totals.stocks;
      case 'crypto': return totals.crypto;
      case 'rsus': return totals.rsusVested + totals.rsusUnvested;
      case 'savings': return totals.savings;
      case 'offset': return totals.offset;
      case 'other': return totals.otherAssets;
      case 'mortgage': return totals.mortgage;
      default: return 0;
    }
  };

  const getItems = (key: string) => {
    switch (key) {
      case 'stocks': return holdings.filter(h => h.type === 'stock');
      case 'crypto': return holdings.filter(h => h.type === 'crypto');
      case 'rsus': return rsuGrants;
      case 'savings': return cashAccounts.filter(c => c.type === 'savings');
      case 'offset': return cashAccounts.filter(c => c.type === 'offset');
      case 'other': return otherAssets;
      case 'mortgage': return mortgages;
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
          else if (catKey === 'savings' || catKey === 'offset') deleteCashAccount(itemId);
          else if (catKey === 'mortgage') deleteMortgage(itemId);
          else if (catKey === 'other') deleteOtherAsset(itemId);
        },
      },
    ]);
  }, []);

  const handleEdit = useCallback((type: string, id: string, catKey?: string) => {
    let editType = type;
    if (catKey === 'stocks') editType = 'holding';
    else if (catKey === 'crypto') editType = 'holding';
    else if (catKey === 'savings' || catKey === 'offset') editType = 'cash';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/edit-item?type=${editType}&id=${id}`);
  }, []);

  const handleAdd = useCallback((type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let addType = type;
    router.push(`/edit-item?type=${addType}`);
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
    } else if (catKey === 'savings' || catKey === 'offset') {
      name = item.name;
      value = item.balance;
      subtitle = `+${formatCurrency(item.monthlyContribution)}/mo`;
    } else if (catKey === 'mortgage') {
      name = item.name;
      value = item.principalBalance;
      subtitle = `${item.annualInterestRate}% rate`;
    } else if (catKey === 'other') {
      name = item.name;
      value = item.value;
      subtitle = item.annualGrowthRate ? `${item.annualGrowthRate}% growth/yr` : '';
    }

    return (
      <Pressable
        key={item.id}
        style={styles.itemRow}
        onPress={() => handleEdit(CATEGORIES.find(c => c.key === catKey)?.type || 'holding', item.id, catKey)}
      >
        {(catKey === 'stocks' || catKey === 'crypto' || catKey === 'rsus') && (
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
          <Text style={styles.itemValue}>{formatCurrency(value)}</Text>
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
    >
      <Text style={styles.pageTitle}>Breakdown</Text>
      <Text style={styles.netWorthSub}>Net Worth: {formatCurrency(totals.netWorth)}</Text>

      {CATEGORIES.map((cat) => {
        const items = getItems(cat.key);
        const total = getCategoryTotal(cat.key);
        const isOpen = expanded === cat.key;

        return (
          <Card key={cat.key} style={styles.categoryCard} noPadding>
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
                  items.map((item: any) => renderItem(cat.key, item))
                )}
                <Pressable
                  style={styles.addButton}
                  onPress={() => handleAdd(cat.type)}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Add {cat.label}</Text>
                </Pressable>
              </View>
            )}
          </Card>
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
