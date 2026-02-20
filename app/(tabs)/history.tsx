import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Platform,
  Pressable, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import Card from '@/components/Card';
import LineChart from '@/components/LineChart';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import type { Snapshot } from '@/lib/types';

type TimeRange = '30d' | '90d' | '365d' | 'all';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { snapshots } = useAppStore();
  const [range, setRange] = useState<TimeRange>('30d');

  const filteredSnapshots = useMemo(() => {
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
    );
    if (range === 'all') return sorted;

    const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return sorted.filter((s) => new Date(s.dateISO) >= cutoff);
  }, [snapshots, range]);

  const chartData = useMemo(() => {
    return filteredSnapshots.map((s, i) => ({ x: i, y: s.totals.netWorth }));
  }, [filteredSnapshots]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const renderSnapshot = ({ item, index }: { item: Snapshot; index: number }) => {
    const prev = index > 0 ? filteredSnapshots[index - 1] : null;
    const change = prev ? item.totals.netWorth - prev.totals.netWorth : 0;
    const pct = prev && prev.totals.netWorth !== 0
      ? (change / prev.totals.netWorth) * 100
      : 0;

    return (
      <View style={styles.snapshotRow}>
        <View style={styles.snapshotLeft}>
          <Text style={styles.snapshotDate}>{formatDate(item.dateISO)}</Text>
          {prev && (
            <View style={styles.changeBadge}>
              <Ionicons
                name={change >= 0 ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={change >= 0 ? Colors.positive : Colors.negative}
              />
              <Text style={[styles.changeText, { color: change >= 0 ? Colors.positive : Colors.negative }]}>
                {formatPercent(pct)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.snapshotValue}>{formatCurrency(item.totals.netWorth)}</Text>
      </View>
    );
  };

  const ranges: TimeRange[] = ['30d', '90d', '365d', 'all'];

  return (
    <View style={[styles.container, { paddingTop: topInset + spacing.lg }]}>
      <View style={styles.headerWrap}>
        <Text style={styles.pageTitle}>History</Text>

        <View style={styles.rangePicker}>
          {ranges.map((r) => (
            <Pressable
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
                {r === 'all' ? 'All' : r.replace('d', 'D')}
              </Text>
            </Pressable>
          ))}
        </View>

        {chartData.length >= 2 && (
          <Card style={styles.chartCard}>
            <LineChart
              data={chartData}
              width={screenWidth - spacing.xl * 2 - spacing.lg * 2}
              height={180}
              color={Colors.primary}
              showGrid
              formatY={(v) => formatCurrency(v)}
            />
          </Card>
        )}
      </View>

      {filteredSnapshots.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyText}>Snapshots are recorded daily when you open the app</Text>
        </View>
      ) : (
        <FlatList
          data={[...filteredSnapshots].reverse()}
          renderItem={renderSnapshot}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
          scrollEnabled={!!filteredSnapshots.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerWrap: { paddingHorizontal: spacing.xl },
  pageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    marginBottom: spacing.md,
  },
  rangePicker: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: 2,
    marginBottom: spacing.lg,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  rangeBtnActive: {
    backgroundColor: Colors.surface,
  },
  rangeBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
  },
  rangeBtnTextActive: {
    color: Colors.text,
  },
  chartCard: { marginBottom: spacing.lg },
  listContent: { paddingHorizontal: spacing.xl },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  snapshotLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  snapshotDate: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
  },
  snapshotValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    color: Colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});
