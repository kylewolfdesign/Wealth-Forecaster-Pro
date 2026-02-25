import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  Image, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import { formatCurrency } from '@/lib/format';
import TickerInput from '@/components/TickerInput';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import type { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset } from '@/lib/types';

const VALUE_PROP_PAGES = [
  {
    image: require('@/assets/images/onboarding-networth.png'),
    title: 'Know Your\nNet Worth',
    subtitle: 'See all your assets and liabilities in one place — stocks, crypto, RSUs, savings, property and more.',
  },
  {
    image: require('@/assets/images/onboarding-forecast.png'),
    title: 'Watch It\nGrow Over Time',
    subtitle: 'Project how your portfolio will compound over 1, 5, 10 or even 50 years with personalised growth assumptions.',
  },
  {
    image: require('@/assets/images/onboarding-private.png'),
    title: '100% Private\n& On-Device',
    subtitle: 'Your financial data never leaves your phone. No accounts, no cloud — just you and your numbers.',
  },
];

const CATEGORY_OPTIONS = [
  { key: 'investments', label: 'Stocks & ETFs' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'rsus', label: 'RSUs' },
  { key: 'savings', label: 'Savings' },
  { key: 'offset', label: 'Offset Account' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'other', label: 'Other Assets' },
] as const;

type CategoryKey = typeof CATEGORY_OPTIONS[number]['key'];


export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [phase, setPhase] = useState<'intro' | 'categories' | 'setup'>('intro');
  const [introPage, setIntroPage] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(new Set());
  const store = useAppStore();
  const scrollRef = useRef<FlatList>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const toggleCategory = (key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleIntroNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (introPage < VALUE_PROP_PAGES.length - 1) {
      const next = introPage + 1;
      setIntroPage(next);
      scrollRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      setPhase('categories');
    }
  };

  const handleIntroSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('categories');
  };

  const handleCategoriesContinue = () => {
    if (selectedCategories.size === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('setup');
  };

  const handleAddItem = (catKey: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let type: string;
    switch (catKey) {
      case 'investments': type = 'holding'; break;
      case 'crypto': type = 'holding'; break;
      case 'rsus': type = 'rsu'; break;
      case 'savings': type = 'cash'; break;
      case 'offset': type = 'cash'; break;
      case 'mortgage': type = 'mortgage'; break;
      case 'other': type = 'other'; break;
      default: type = 'holding';
    }
    router.push({ pathname: '/edit-item', params: { type } });
  };

  const handleFinishSetup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.completeOnboarding();
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets,
    );
    store.addSnapshot(createSnapshot(totals));
    router.replace('/(tabs)');
  };

  const getCardInfo = (catKey: CategoryKey): { label: string; icon: keyof typeof Ionicons.glyphMap; itemCount: number; value: string } => {
    switch (catKey) {
      case 'investments': return { label: 'Stocks & ETFs', icon: 'trending-up', itemCount: store.holdings.filter(h => h.type === 'stock').length, value: formatCurrency(store.holdings.filter(h => h.type === 'stock').reduce((s, h) => s + (h.manualPrice || 0) * h.shares, 0)) };
      case 'crypto': return { label: 'Crypto', icon: 'logo-bitcoin', itemCount: store.holdings.filter(h => h.type === 'crypto').length, value: formatCurrency(store.holdings.filter(h => h.type === 'crypto').reduce((s, h) => s + (h.manualPrice || 0) * h.shares, 0)) };
      case 'rsus': return { label: 'RSUs', icon: 'layers', itemCount: store.rsuGrants.length, value: formatCurrency(0) };
      case 'savings': return { label: 'Cash / Savings', icon: 'wallet', itemCount: store.cashAccounts.filter(c => c.type === 'savings').length, value: formatCurrency(store.cashAccounts.filter(c => c.type === 'savings').reduce((s, c) => s + c.balance, 0)) };
      case 'offset': return { label: 'Offset Account', icon: 'swap-horizontal', itemCount: store.cashAccounts.filter(c => c.type === 'offset').length, value: formatCurrency(store.cashAccounts.filter(c => c.type === 'offset').reduce((s, c) => s + c.balance, 0)) };
      case 'mortgage': return { label: 'Mortgage', icon: 'home', itemCount: store.mortgages.length, value: formatCurrency(store.mortgages.reduce((s, m) => s + m.remainingPrincipal, 0)) };
      case 'other': return { label: 'Other Assets', icon: 'diamond', itemCount: store.otherAssets.length, value: formatCurrency(store.otherAssets.reduce((s, a) => s + a.value, 0)) };
      default: return { label: '', icon: 'help', itemCount: 0, value: '$0' };
    }
  };

  if (phase === 'intro') {
    const imageSize = screenWidth * 0.55;
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={introStyles.skipRow}>
          <Pressable onPress={handleIntroSkip} hitSlop={16}>
            <Text style={introStyles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={scrollRef}
          data={VALUE_PROP_PAGES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setIntroPage(idx);
          }}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={[introStyles.page, { width: screenWidth }]}>
              <View style={introStyles.imageSection}>
                <View style={introStyles.imageCard}>
                  <Image
                    source={item.image}
                    style={{ width: imageSize, height: imageSize }}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={introStyles.textSection}>
                <Text style={introStyles.title}>{item.title}</Text>
                <Text style={introStyles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          )}
        />

        <View style={[introStyles.footer, { paddingBottom: bottomInset + spacing.lg }]}>
          <View style={introStyles.dots}>
            {VALUE_PROP_PAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  introStyles.dot,
                  i === introPage && introStyles.dotActive,
                ]}
              />
            ))}
          </View>

          <Pressable style={introStyles.continueBtn} onPress={handleIntroNext}>
            <Text style={introStyles.continueBtnText}>
              {introPage === VALUE_PROP_PAGES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'categories') {
    const hasSelection = selectedCategories.size > 0;
    return (
      <View style={[catStyles.container, { paddingTop: topInset }]}>
        <View style={catStyles.content}>
          <View style={catStyles.dots}>
            <View style={[catStyles.dot, catStyles.dotActive]} />
            <View style={catStyles.dot} />
          </View>

          <View style={catStyles.textBlock}>
            <Text style={catStyles.heading}>
              What all do you want to track and forecast?
            </Text>
            <Text style={catStyles.subheading}>
              Select the categories you'd like to track and forecast as a window into your wealth
            </Text>
          </View>

          <View style={catStyles.chipsContainer}>
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = selectedCategories.has(cat.key);
              return (
                <Pressable
                  key={cat.key}
                  style={[catStyles.chip, selected && catStyles.chipSelected]}
                  onPress={() => toggleCategory(cat.key)}
                >
                  <Text style={[catStyles.chipText, selected && catStyles.chipTextSelected]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
            <View style={catStyles.chipPlaceholder}>
              <Text style={catStyles.moreText}>more to come...</Text>
            </View>
          </View>
        </View>

        <View style={[catStyles.footer, { paddingBottom: bottomInset + spacing.lg }]}>
          <Pressable
            style={[catStyles.continueBtn, !hasSelection && catStyles.continueBtnDisabled]}
            onPress={handleCategoriesContinue}
            disabled={!hasSelection}
          >
            <Text style={[catStyles.continueBtnText, !hasSelection && catStyles.continueBtnTextDisabled]}>
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const selectedCatArray = CATEGORY_OPTIONS.filter((c) => selectedCategories.has(c.key));

  return (
    <View style={[catStyles.container, { paddingTop: topInset }]}>
      <View style={setupStyles.header}>
        <View style={catStyles.dots}>
          <View style={catStyles.dot} />
          <View style={[catStyles.dot, catStyles.dotActive]} />
        </View>

        <View style={catStyles.textBlock}>
          <Text style={catStyles.heading}>
            Add your details
          </Text>
          <Text style={catStyles.subheading}>
            Tap "Add" on any card below to enter your financial details
          </Text>
        </View>
      </View>

      <ScrollView
        style={setupStyles.scrollArea}
        contentContainerStyle={setupStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedCatArray.map((cat) => {
          const info = getCardInfo(cat.key);
          return (
            <View key={cat.key} style={setupStyles.card}>
              <View style={setupStyles.cardHeader}>
                <View style={setupStyles.cardNameRow}>
                  <View style={setupStyles.iconCircle}>
                    <Ionicons name={info.icon} size={20} color="#94A3B8" />
                  </View>
                  <Text style={setupStyles.cardLabel}>{info.label}</Text>
                </View>
                <View style={setupStyles.cardValueRow}>
                  <Text style={setupStyles.cardValue}>{info.value}</Text>
                  {info.itemCount > 0 && (
                    <View style={setupStyles.countBadge}>
                      <Text style={setupStyles.countText}>{info.itemCount}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={setupStyles.divider} />
              <View style={setupStyles.cardFooter}>
                <Pressable
                  style={setupStyles.addBtn}
                  onPress={() => handleAddItem(cat.key)}
                >
                  <Text style={setupStyles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[catStyles.footer, { paddingBottom: bottomInset + spacing.lg }]}>
        <Pressable style={catStyles.continueBtn} onPress={handleFinishSetup}>
          <Text style={catStyles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const introStyles = StyleSheet.create({
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  skipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  imageCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 26,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  continueBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    color: Colors.white,
  },
});

const catStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 42,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    backgroundColor: '#6B39F4',
  },
  textBlock: {
    gap: 8,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 36,
    color: '#F8F9FD',
  },
  subheading: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 23.8,
    color: '#94A3B8',
    letterSpacing: 0.3,
    maxWidth: 301,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: '#6B39F4',
  },
  chipText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.2,
    lineHeight: 20.4,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipPlaceholder: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 0.3,
    lineHeight: 23.8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: spacing.md,
  },
  continueBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#6B39F4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  continueBtnDisabled: {
    backgroundColor: '#334155',
  },
  continueBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  continueBtnTextDisabled: {
    color: '#64748B',
  },
});

const setupStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 24,
  },
  scrollArea: {
    flex: 1,
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#F8F9FD',
    letterSpacing: 0.3,
  },
  cardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#F8F9FD',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#6B39F4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  addBtn: {
    backgroundColor: '#6B39F4',
    height: 32,
    width: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

function InvestmentsStep({ items, setItems }: { items: Holding[]; setItems: (h: Holding[]) => void }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [type, setType] = useState<'stock' | 'crypto'>('stock');

  const handleAdd = () => {
    if (!symbol.trim() || !shares.trim()) return;
    const s = parseFloat(shares);
    if (isNaN(s) || s <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, { id: Crypto.randomUUID(), type, symbol: symbol.toUpperCase().trim(), shares: s }]);
    setSymbol('');
    setShares('');
  };

  const handleRemove = (id: string) => setItems(items.filter(h => h.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add Investments</Text>
      <Text style={formStyles.desc}>Enter your stock and crypto holdings</Text>

      <View style={formStyles.toggleRow}>
        {(['stock', 'crypto'] as const).map((t) => (
          <Pressable key={t} style={[formStyles.toggle, type === t && formStyles.toggleActive]} onPress={() => setType(t)}>
            <Text style={[formStyles.toggleText, type === t && formStyles.toggleTextActive]}>
              {t === 'stock' ? 'Stock/ETF' : 'Crypto'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type={type}
        placeholder={type === 'stock' ? 'Symbol (e.g. AAPL)' : 'Symbol (e.g. BTC)'}
      />
      <TextInput style={formStyles.input} placeholder="Shares" value={shares} onChangeText={setShares} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Investment</Text>
      </Pressable>

      {items.map((h) => (
        <View key={h.id} style={formStyles.itemRow}>
          <View style={formStyles.itemBadge}>
            <Text style={formStyles.itemBadgeText}>{h.type === 'stock' ? 'S' : 'C'}</Text>
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{h.symbol}</Text>
            <Text style={formStyles.itemSub}>{h.shares} shares</Text>
          </View>
          <Pressable onPress={() => handleRemove(h.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const CADENCE_OPTIONS: { label: string; value: 'monthly' | 'quarterly' | 'yearly' }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

function cadenceLabel(f: string) {
  return f === 'monthly' ? 'mo' : f === 'quarterly' ? 'qtr' : 'yr';
}

function RSUStep({ items, setItems }: { items: RSUGrant[]; setItems: (r: RSUGrant[]) => void }) {
  const [symbol, setSymbol] = useState('');
  const [sharesPerVest, setSharesPerVest] = useState('');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  const [vestCount, setVestCount] = useState('');
  const [nextVestDate, setNextVestDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const handleAdd = () => {
    if (!symbol.trim() || !sharesPerVest.trim() || !vestCount.trim()) return;
    const spv = parseFloat(sharesPerVest);
    const vc = parseInt(vestCount);
    if (isNaN(spv) || spv <= 0 || isNaN(vc) || vc <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const intervalMonths = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : 12;
    const totalShares = spv * vc;
    const durationMonths = intervalMonths * vc;

    setItems([...items, {
      id: Crypto.randomUUID(),
      symbol: symbol.toUpperCase().trim(),
      totalShares,
      alreadyVestedShares: 0,
      vest: {
        startDate: nextVestDate,
        cliffMonths: 0,
        durationMonths,
        frequency: cadence,
      },
    }]);
    setSymbol('');
    setSharesPerVest('');
    setVestCount('');
  };

  const handleRemove = (id: string) => setItems(items.filter(r => r.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add RSUs</Text>
      <Text style={formStyles.desc}>Enter your RSU grants with vesting details</Text>

      <Text style={formStyles.fieldLabel}>Ticker</Text>
      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type="stock"
        placeholder="Search company (e.g. GOOGL)"
      />

      <Text style={formStyles.fieldLabel}>Shares per vest</Text>
      <TextInput
        style={formStyles.input}
        placeholder="e.g. 250"
        value={sharesPerVest}
        onChangeText={setSharesPerVest}
        keyboardType="numeric"
        placeholderTextColor={Colors.textTertiary}
      />

      <Text style={formStyles.fieldLabel}>Vesting cadence</Text>
      <View style={formStyles.toggleRow}>
        {CADENCE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[formStyles.toggleBtn, cadence === opt.value && formStyles.toggleBtnActive]}
            onPress={() => setCadence(opt.value)}
          >
            <Text style={[formStyles.toggleBtnText, cadence === opt.value && formStyles.toggleBtnTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={formStyles.fieldLabel}>How many vests remaining?</Text>
      <TextInput
        style={formStyles.input}
        placeholder="e.g. 16"
        value={vestCount}
        onChangeText={setVestCount}
        keyboardType="numeric"
        placeholderTextColor={Colors.textTertiary}
      />

      <Text style={formStyles.fieldLabel}>Next vest date</Text>
      <TextInput
        style={formStyles.input}
        placeholder="YYYY-MM-DD"
        value={nextVestDate}
        onChangeText={setNextVestDate}
        placeholderTextColor={Colors.textTertiary}
      />

      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add RSU Grant</Text>
      </Pressable>

      {items.map((r) => {
        const intervalMonths = r.vest.frequency === 'monthly' ? 1 : r.vest.frequency === 'quarterly' ? 3 : 12;
        const numVests = Math.round(r.vest.durationMonths / intervalMonths);
        const spv = numVests > 0 ? Math.round(r.totalShares / numVests) : r.totalShares;
        return (
          <View key={r.id} style={formStyles.itemRow}>
            <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryRSU + '20' }]}>
              <Text style={[formStyles.itemBadgeText, { color: Colors.categoryRSU }]}>R</Text>
            </View>
            <View style={formStyles.itemInfo}>
              <Text style={formStyles.itemName}>{r.symbol} RSU</Text>
              <Text style={formStyles.itemSub}>{spv} shares/{cadenceLabel(r.vest.frequency)} \u00d7 {numVests} vests</Text>
            </View>
            <Pressable onPress={() => handleRemove(r.id)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function CashStep({ type, items, setItems }: { type: 'savings' | 'offset'; items: CashAccount[]; setItems: (c: CashAccount[]) => void }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !balance.trim()) return;
    const b = parseFloat(balance);
    if (isNaN(b)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), type, name: name.trim(), balance: b,
      monthlyContribution: parseFloat(monthly) || 0,
      annualInterestRate: parseFloat(rate) || undefined,
    }]);
    setName(''); setBalance(''); setMonthly(''); setRate('');
  };

  const handleRemove = (id: string) => setItems(items.filter(c => c.id !== id));
  const label = type === 'savings' ? 'Savings Account' : 'Offset Account';

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add {label}s</Text>
      <Text style={formStyles.desc}>Track balances and monthly contributions</Text>

      <TextInput style={formStyles.input} placeholder="Account name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Balance ($)" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Monthly +/-" value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <TextInput style={formStyles.input} placeholder="Interest rate (%)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Account</Text>
      </Pressable>

      {items.map((c) => (
        <View key={c.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: (type === 'savings' ? Colors.categorySavings : Colors.categoryOffset) + '20' }]}>
            <Text style={[formStyles.itemBadgeText, { color: type === 'savings' ? Colors.categorySavings : Colors.categoryOffset }]}>$</Text>
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{c.name}</Text>
            <Text style={formStyles.itemSub}>${c.balance.toLocaleString()} + ${c.monthlyContribution}/mo</Text>
          </View>
          <Pressable onPress={() => handleRemove(c.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function MortgageStep({ items, setItems }: { items: Mortgage[]; setItems: (m: Mortgage[]) => void }) {
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !principal.trim() || !rate.trim() || !payment.trim()) return;
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const pm = parseFloat(payment);
    if (isNaN(p) || isNaN(r) || isNaN(pm)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), name: name.trim(),
      principalBalance: p, annualInterestRate: r, monthlyPayment: pm,
    }]);
    setName(''); setPrincipal(''); setRate(''); setPayment('');
  };

  const handleRemove = (id: string) => setItems(items.filter(m => m.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add Mortgage</Text>
      <Text style={formStyles.desc}>Enter your loan details</Text>

      <TextInput style={formStyles.input} placeholder="Loan name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <TextInput style={formStyles.input} placeholder="Principal balance ($)" value={principal} onChangeText={setPrincipal} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Rate (%)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Monthly payment" value={payment} onChangeText={setPayment} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Mortgage</Text>
      </Pressable>

      {items.map((m) => (
        <View key={m.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryMortgage + '20' }]}>
            <Ionicons name="home" size={14} color={Colors.categoryMortgage} />
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{m.name}</Text>
            <Text style={formStyles.itemSub}>${m.principalBalance.toLocaleString()} @ {m.annualInterestRate}%</Text>
          </View>
          <Pressable onPress={() => handleRemove(m.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function OtherStep({ items, setItems }: { items: OtherAsset[]; setItems: (a: OtherAsset[]) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [growth, setGrowth] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !value.trim()) return;
    const v = parseFloat(value);
    if (isNaN(v)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), name: name.trim(), value: v,
      annualGrowthRate: parseFloat(growth) || undefined,
    }]);
    setName(''); setValue(''); setGrowth('');
  };

  const handleRemove = (id: string) => setItems(items.filter(a => a.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Other Assets</Text>
      <Text style={formStyles.desc}>Cars, property, collectibles, etc.</Text>

      <TextInput style={formStyles.input} placeholder="Asset name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Value ($)" value={value} onChangeText={setValue} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Growth %/yr" value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Asset</Text>
      </Pressable>

      {items.map((a) => (
        <View key={a.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryOther + '20' }]}>
            <Ionicons name="diamond" size={14} color={Colors.categoryOther} />
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{a.name}</Text>
            <Text style={formStyles.itemSub}>${a.value.toLocaleString()}{a.annualGrowthRate ? ` (${a.annualGrowthRate}%/yr)` : ''}</Text>
          </View>
          <Pressable onPress={() => handleRemove(a.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ReviewStep({ holdings, rsuGrants, cashAccounts, mortgages, otherAssets }: {
  holdings: Holding[]; rsuGrants: RSUGrant[]; cashAccounts: CashAccount[];
  mortgages: Mortgage[]; otherAssets: OtherAsset[];
}) {
  const counts = [
    { label: 'Investments', count: holdings.length, color: Colors.categoryStocks },
    { label: 'RSU Grants', count: rsuGrants.length, color: Colors.categoryRSU },
    { label: 'Cash Accounts', count: cashAccounts.length, color: Colors.categorySavings },
    { label: 'Mortgages', count: mortgages.length, color: Colors.categoryMortgage },
    { label: 'Other Assets', count: otherAssets.length, color: Colors.categoryOther },
  ];

  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <View style={formStyles.container}>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.xxl }}>
        <Ionicons name="checkmark-circle" size={48} color={Colors.positive} />
      </View>
      <Text style={[formStyles.title, { textAlign: 'center' }]}>Ready to Go</Text>
      <Text style={[formStyles.desc, { textAlign: 'center' }]}>
        {total === 0 ? "You can add items later from the Breakdown tab." : `You've added ${total} item${total !== 1 ? 's' : ''}.`}
      </Text>

      {counts.filter(c => c.count > 0).map((c) => (
        <View key={c.label} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: c.color + '20' }]}>
            <Text style={[formStyles.itemBadgeText, { color: c.color }]}>{c.count}</Text>
          </View>
          <Text style={formStyles.itemName}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const formStyles = StyleSheet.create({
  container: { paddingTop: spacing.xl },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: Colors.text,
    marginBottom: spacing.xs,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: 2,
    marginBottom: spacing.lg,
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  toggleActive: {
    backgroundColor: Colors.surface,
  },
  toggleText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
  },
  toggleTextActive: {
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.text,
    marginBottom: spacing.md,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  addBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: Colors.primary,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  itemSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center' as const,
    borderRadius: borderRadius.sm - 2,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
  },
  toggleBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
  },
  toggleBtnTextActive: {
    color: Colors.primary,
    fontFamily: fontFamily.semibold,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotCurrent: {
    width: 24,
  },
  scrollBody: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  nextBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
  finishBtn: {
    backgroundColor: Colors.positive,
  },
  finishBtnText: {
    color: Colors.white,
  },
});
