import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  Platform, ScrollView, Modal,
  Animated, useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { track } from '@/lib/analytics';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import { formatCurrency } from '@/lib/format';
import TickerLogo from '@/components/TickerLogo';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import { CURRENCIES, convertAmount } from '@/lib/currency';
import type { Currency } from '@/lib/currency';

function OnboardingGraphicPrivacy() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.6, duration: 3000, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseAnim.start();
    glowAnim.start();
    return () => { pulseAnim.stop(); glowAnim.stop(); };
  }, []);

  return (
    <View style={graphicStyles.container}>
      <View style={graphicStyles.phoneFrame}>
        <View style={graphicStyles.phoneNotch} />
        <View style={graphicStyles.phoneScreen}>
          <Animated.View style={[graphicStyles.glowRing, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
          <Animated.View style={[graphicStyles.shieldOuter, { transform: [{ scale: pulse }] }]}>
            <View style={graphicStyles.shieldInner}>
              <Ionicons name="shield-checkmark" size={36} color={Colors.primary} />
            </View>
          </Animated.View>
        </View>
        <View style={graphicStyles.phoneHomeBar} />
      </View>
    </View>
  );
}

function OnboardingGraphicGrowth() {
  const lineProgress = useRef(new Animated.Value(0)).current;
  const dotOpacities = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(lineProgress, { toValue: 1, duration: 2000, useNativeDriver: false }),
        ...dotOpacities.map((dot, i) =>
          Animated.timing(dot, { toValue: 1, duration: 200, delay: i * 50, useNativeDriver: false })
        ),
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(lineProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
          ...dotOpacities.map(dot =>
            Animated.timing(dot, { toValue: 0, duration: 0, useNativeDriver: false })
          ),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const chartPoints = [
    { x: 0, y: 80 },
    { x: 40, y: 70 },
    { x: 80, y: 55 },
    { x: 120, y: 40 },
    { x: 160, y: 15 },
  ];

  return (
    <View style={graphicStyles.container}>
      <View style={graphicStyles.chartArea}>
        <View style={graphicStyles.gridLine} />
        <View style={[graphicStyles.gridLine, { top: '33%' }]} />
        <View style={[graphicStyles.gridLine, { top: '66%' }]} />
        <View style={[graphicStyles.gridLine, { top: '100%' }]} />
        {chartPoints.map((point, i) => {
          if (i === 0) return null;
          const prev = chartPoints[i - 1];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <Animated.View
              key={`line-${i}`}
              style={{
                position: 'absolute' as const,
                left: prev.x + 20,
                top: prev.y + 10,
                width: lineProgress.interpolate({
                  inputRange: [(i - 1) / chartPoints.length, i / chartPoints.length],
                  outputRange: [0, length],
                  extrapolate: 'clamp' as const,
                }),
                height: 3,
                backgroundColor: Colors.primary,
                borderRadius: 1.5,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center' as any,
              }}
            />
          );
        })}
        {chartPoints.map((point, i) => (
          <Animated.View
            key={`dot-${i}`}
            style={[
              graphicStyles.chartDot,
              { left: point.x + 16, top: point.y + 6, opacity: dotOpacities[i] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function OnboardingGraphicAssets() {
  const assetIcons: Array<{ name: keyof typeof Ionicons.glyphMap; color: string }> = [
    { name: 'trending-up', color: Colors.categoryStocks },
    { name: 'logo-bitcoin', color: Colors.categoryCrypto },
    { name: 'wallet', color: Colors.categorySavings },
    { name: 'home', color: Colors.categoryRealEstate },
    { name: 'layers', color: Colors.categoryRSU },
    { name: 'diamond', color: Colors.categoryOther },
    { name: 'cash', color: Colors.categorySavings },
  ];

  const fadeAnims = useRef(assetIcons.map(() => new Animated.Value(0))).current;
  const floatAnims = useRef(assetIcons.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const staggerIn = Animated.stagger(
      150,
      fadeAnims.map(anim =>
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
      )
    );

    const floatLoops = floatAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -4, duration: 1500 + i * 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 4, duration: 1500 + i * 200, useNativeDriver: true }),
        ])
      )
    );

    staggerIn.start(() => {
      floatLoops.forEach(l => l.start());
    });

    return () => {
      staggerIn.stop();
      floatLoops.forEach(l => l.stop());
    };
  }, []);

  return (
    <View style={graphicStyles.container}>
      <View style={graphicStyles.assetGrid}>
        {assetIcons.map((icon, i) => (
          <Animated.View
            key={i}
            style={[
              graphicStyles.assetIcon,
              {
                opacity: fadeAnims[i],
                transform: [{ translateY: floatAnims[i] }],
              },
            ]}
          >
            <Ionicons name={icon.name} size={28} color={icon.color} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const VALUE_PROP_PAGES = [
  {
    graphic: OnboardingGraphicPrivacy,
    title: 'Zero logins.\nZero exposure.',
    subtitle: 'Your financial data lives on your device only — no accounts, no cloud, no risk.',
  },
  {
    graphic: OnboardingGraphicGrowth,
    title: 'See your future,\nnot just today.',
    subtitle: 'Model how your portfolio and contributions grow over 1, 5, 10 or 50 years.',
  },
  {
    graphic: OnboardingGraphicAssets,
    title: 'ETFs, crypto, RSUs,\nproperty & more.',
    subtitle: 'Track everything you own across every asset class — all in one clear overview.',
  },
];

const CATEGORY_OPTIONS = [
  { key: 'investments', label: 'Stocks & ETFs' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'rsus', label: 'RSUs' },
  { key: 'retirement', label: 'Retirement' },
  { key: 'stockOptions', label: 'Stock Options' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'business', label: 'Business / PE' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'other', label: 'Assets' },
  { key: 'realEstate', label: 'Real Estate' },
  { key: 'cashSavings', label: 'Cash / Savings' },
] as const;

type CategoryKey = typeof CATEGORY_OPTIONS[number]['key'];


export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [phase, setPhase] = useState<'intro' | 'categories' | 'setup'>('intro');
  const [introPage, setIntroPage] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<CategoryKey>>(new Set());
  const store = useAppStore();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(store.settings.displayCurrency ?? 'USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<Currency>(displayCurrency);
  const scrollRef = useRef<FlatList>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    track('onboarding_started');
  }, []);

  const toggleCardExpand = (key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    store.setSettings({ displayCurrency });
    store.clearAllData();
    setExpandedCards(new Set(selectedCategories));
    setPhase('setup');
  };

  const handleAddItem = (catKey: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let type: string;
    let category: string | undefined;
    switch (catKey) {
      case 'investments': type = 'holding'; break;
      case 'crypto': type = 'holding'; category = 'crypto'; break;
      case 'rsus': type = 'rsu'; break;
      case 'other': type = 'other'; break;
      case 'retirement': type = 'retirement'; break;
      case 'stockOptions': type = 'stockOption'; break;
      case 'bonds': type = 'bond'; break;
      case 'business': type = 'business'; break;
      case 'vehicles': type = 'vehicle'; break;
      case 'realEstate': type = 'realEstate'; break;
      case 'cashSavings': type = 'cash'; break;
      default: type = 'holding';
    }
    const params: Record<string, string> = { type };
    if (category) params.category = category;
    router.push({ pathname: '/edit-item', params });
  };

  const handleFinishSetup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    track('onboarding_completed', { category_count: selectedCategories.size });
    store.completeOnboarding();
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets, store.realEstate,
      store.retirementAccounts, store.stockOptions, store.bonds,
      store.businesses, store.vehicles,
    );
    store.addSnapshot(createSnapshot(totals));
    router.replace('/(tabs)');
  };

  const rates = store.exchangeRates;
  const fmt = (v: number) => formatCurrency(v, displayCurrency);

  type CardItem = { id: string; name: string; value: string; editType: string };
  const getCardInfo = (catKey: CategoryKey): { label: string; icon: keyof typeof Ionicons.glyphMap; items: CardItem[]; value: string } => {
    const cx = (amount: number, from?: Currency) =>
      convertAmount(amount, from ?? 'USD', displayCurrency, rates);
    switch (catKey) {
      case 'investments': {
        const items = store.holdings.filter(h => h.type === 'stock');
        return { label: 'Stocks & ETFs', icon: 'trending-up', items: items.map(h => ({ id: h.id, name: h.symbol.toUpperCase(), value: fmt(cx((h.manualPrice || 0) * h.shares, h.currency)), editType: 'holding' })), value: fmt(items.reduce((s, h) => s + cx((h.manualPrice || 0) * h.shares, h.currency), 0)) };
      }
      case 'crypto': {
        const items = store.holdings.filter(h => h.type === 'crypto');
        return { label: 'Crypto', icon: 'logo-bitcoin', items: items.map(h => ({ id: h.id, name: h.symbol.toUpperCase(), value: fmt(cx((h.manualPrice || 0) * h.shares, h.currency)), editType: 'holding' })), value: fmt(items.reduce((s, h) => s + cx((h.manualPrice || 0) * h.shares, h.currency), 0)) };
      }
      case 'rsus': return { label: 'RSUs', icon: 'layers', items: store.rsuGrants.map(r => ({ id: r.id, name: r.symbol.toUpperCase(), value: fmt(0), editType: 'rsu' })), value: fmt(0) };
      case 'retirement': return { label: 'Retirement', icon: 'umbrella', items: store.retirementAccounts.map(r => ({ id: r.id, name: r.name, value: fmt(cx(r.balance, r.currency)), editType: 'retirement' })), value: fmt(store.retirementAccounts.reduce((s, r) => s + cx(r.balance, r.currency), 0)) };
      case 'stockOptions': return { label: 'Stock Options', icon: 'key', items: store.stockOptions.map(o => ({ id: o.id, name: `${o.symbol} ${o.optionType?.toUpperCase() ?? ''}`, value: fmt(cx(Math.max((o.currentPrice ?? 0) - o.strikePrice, 0) * (o.vestedOptions ?? 0), o.currency)), editType: 'stockOption' })), value: fmt(store.stockOptions.reduce((s, o) => s + cx(Math.max((o.currentPrice ?? 0) - o.strikePrice, 0) * (o.vestedOptions ?? 0), o.currency), 0)) };
      case 'bonds': return { label: 'Bonds', icon: 'ribbon', items: store.bonds.map(b => ({ id: b.id, name: b.name, value: fmt(cx(b.purchasePrice ?? b.faceValue, b.currency)), editType: 'bond' })), value: fmt(store.bonds.reduce((s, b) => s + cx(b.purchasePrice ?? b.faceValue, b.currency), 0)) };
      case 'business': return { label: 'Business / PE', icon: 'briefcase', items: store.businesses.map(b => ({ id: b.id, name: b.name, value: fmt(cx(b.value, b.currency)), editType: 'business' })), value: fmt(store.businesses.reduce((s, b) => s + cx(b.value, b.currency), 0)) };
      case 'vehicles': return { label: 'Vehicles', icon: 'car', items: store.vehicles.map(v => ({ id: v.id, name: v.name, value: fmt(cx(v.currentValue, v.currency)), editType: 'vehicle' })), value: fmt(store.vehicles.reduce((s, v) => s + cx(v.currentValue, v.currency), 0)) };
      case 'other': return { label: 'Assets', icon: 'diamond', items: store.otherAssets.map(a => ({ id: a.id, name: a.name, value: fmt(cx(a.value, a.currency)), editType: 'other' })), value: fmt(store.otherAssets.reduce((s, a) => s + cx(a.value, a.currency), 0)) };
      case 'realEstate': return { label: 'Real Estate', icon: 'business', items: store.realEstate.map(r => ({ id: r.id, name: r.name, value: fmt(cx(r.equity ?? r.currentValue, r.currency)), editType: 'realEstate' })), value: fmt(store.realEstate.reduce((s, r) => s + cx(r.equity ?? r.currentValue, r.currency), 0)) };
      case 'cashSavings': {
        const items = store.cashAccounts;
        return { label: 'Cash / Savings', icon: 'wallet', items: items.map(c => ({ id: c.id, name: c.name, value: fmt(cx(c.balance, c.currency)), editType: 'cash' })), value: fmt(items.reduce((s, c) => s + cx(c.balance, c.currency), 0)) };
      }
      default: return { label: '', icon: 'help', items: [], value: `${displayCurrency}0` };
    }
  };

  if (phase === 'intro') {
    return (
      <View style={[introStyles.darkContainer, { paddingTop: topInset }]}>
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
          renderItem={({ item }) => {
            const GraphicComponent = item.graphic;
            return (
              <View style={[introStyles.page, { width: screenWidth }]}>
                <View style={introStyles.imageSection}>
                  <View style={introStyles.graphicCard}>
                    <GraphicComponent />
                  </View>
                </View>
                <View style={introStyles.textSection}>
                  <Text style={introStyles.titleDark}>{item.title}</Text>
                  <Text style={introStyles.subtitleDark}>{item.subtitle}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[introStyles.footer, { paddingBottom: bottomInset + spacing.lg }]}>
          <View style={introStyles.dots}>
            {VALUE_PROP_PAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  introStyles.dotDark,
                  i === introPage && introStyles.dotDarkActive,
                ]}
              />
            ))}
          </View>

          <Pressable style={introStyles.continueBtnDark} onPress={handleIntroNext}>
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
              Select the categories you&apos;d like to track and forecast as a window into your wealth
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
          </View>

          <View style={catStyles.currencySection}>
            <Text style={catStyles.currencyLabel}>Display currency</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <select
                value={displayCurrency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDisplayCurrency(e.target.value as Currency)}
                style={{
                  backgroundColor: Colors.surface,
                  color: Colors.text,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 15,
                  width: '100%',
                  fontFamily: 'Inter_400Regular, sans-serif',
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                ))}
              </select>
            ) : (
              <>
                <Pressable
                  style={catStyles.currencyDropdown}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPickerDraft(displayCurrency);
                    setShowCurrencyPicker(true);
                  }}
                >
                  <Text style={catStyles.currencyDropdownText}>
                    {(() => { const c = CURRENCIES.find(c => c.code === displayCurrency); return c ? `${c.symbol} ${c.code} — ${c.name}` : displayCurrency; })()}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
                </Pressable>
                <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
                  <View style={catStyles.pickerOverlay}>
                    <View style={catStyles.pickerSheet}>
                      <View style={catStyles.pickerHeader}>
                        <Pressable onPress={() => setShowCurrencyPicker(false)} hitSlop={12}>
                          <Text style={catStyles.pickerCancel}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => { setDisplayCurrency(pickerDraft); setShowCurrencyPicker(false); }} hitSlop={12}>
                          <Text style={catStyles.pickerDone}>Select</Text>
                        </Pressable>
                      </View>
                      <Picker
                        selectedValue={pickerDraft}
                        onValueChange={(val) => setPickerDraft(val as Currency)}
                        style={{ backgroundColor: Colors.surfaceFlat }}
                        itemStyle={{ color: Colors.text, fontSize: 18 }}
                      >
                        {CURRENCIES.map(c => (
                          <Picker.Item key={c.code} label={`${c.symbol} ${c.code} — ${c.name}`} value={c.code} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </Modal>
              </>
            )}
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
            Fill out each category to get your baseline
          </Text>
          <Text style={catStyles.subheading}>
            Fill out each category to capture your data.{'\n'}Can always add and modify later.
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
          const isExpanded = expandedCards.has(cat.key);
          const hasItems = info.items.length > 0;
          return (
            <Pressable
              key={cat.key}
              style={[setupStyles.card, !isExpanded && setupStyles.cardCollapsed]}
              onPress={() => toggleCardExpand(cat.key)}
            >
              <View style={setupStyles.cardHeader}>
                <View style={setupStyles.cardNameRow}>
                  <View style={setupStyles.iconCircle}>
                    <Ionicons name={info.icon} size={20} color={Colors.textSecondary} />
                  </View>
                  <Text style={setupStyles.cardLabel}>{info.label}</Text>
                </View>
                <View style={setupStyles.cardValueRow}>
                  <Text style={setupStyles.cardValue}>{info.value}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={Colors.textSecondary}
                  />
                </View>
              </View>
              {isExpanded && (
                <>
                  <View style={setupStyles.divider} />
                  {hasItems && (
                    <View style={setupStyles.itemsList}>
                      {info.items.map((item) => (
                        <Pressable
                          key={item.id}
                          style={setupStyles.itemRow}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({ pathname: '/edit-item', params: { type: item.editType, id: item.id } });
                          }}
                        >
                          <View style={setupStyles.itemNameRow}>
                            {(cat.key === 'investments' || cat.key === 'crypto' || cat.key === 'rsus') ? (
                              <TickerLogo
                                symbol={item.name.replace(' RSU', '')}
                                type={cat.key === 'crypto' ? 'crypto' : 'stock'}
                                size={28}
                              />
                            ) : (
                              <View style={setupStyles.itemIconCircle}>
                                <Text style={setupStyles.itemIconText}>
                                  {item.name.charAt(0)}
                                </Text>
                              </View>
                            )}
                            <Text style={setupStyles.itemName}>{item.name}</Text>
                          </View>
                          <View style={setupStyles.itemValueRow}>
                            <Text style={setupStyles.itemValue}>{item.value}</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={setupStyles.cardFooter}>
                    <Pressable
                      style={setupStyles.addBtn}
                      onPress={() => handleAddItem(cat.key)}
                    >
                      <Text style={setupStyles.addBtnText}>Add</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[setupStyles.footerBar, { paddingBottom: bottomInset + spacing.lg }]}>
        <Pressable style={setupStyles.backBtn} onPress={() => setPhase('categories')}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable style={setupStyles.createBtn} onPress={handleFinishSetup}>
          <Text style={setupStyles.createBtnText}>Create overview</Text>
        </Pressable>
      </View>
    </View>
  );
}

const graphicStyles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: 120,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.surfaceFlat,
    alignItems: 'center',
    overflow: 'hidden',
    transform: [{ scale: 1.5 }],
  },
  phoneNotch: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
  },
  phoneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  shieldOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneHomeBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  chartArea: {
    width: 200,
    height: 110,
    position: 'relative',
    transform: [{ scale: 1.5 }],
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: 200,
    transform: [{ scale: 1.5 }],
  },
  assetIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceFlat,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});

const introStyles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  graphicCard: {
    backgroundColor: 'rgba(107, 57, 244, 0.08)',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 57, 244, 0.15)',
    alignSelf: 'stretch',
    aspectRatio: 1,
  },
  textSection: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  titleDark: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitleDark: {
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
  dotDark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dotDarkActive: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  continueBtnDark: {
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  textBlock: {
    gap: 8,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 36,
    color: Colors.text,
  },
  subheading: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 23.8,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
    lineHeight: 20.4,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: Colors.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: spacing.md,
  },
  continueBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  continueBtnDisabled: {
    backgroundColor: Colors.border,
  },
  continueBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  continueBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  skipBtnText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
  },
  currencySection: {
    gap: 10,
    marginTop: 4,
  },
  currencyLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  currencyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  currencyDropdownText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    backgroundColor: Colors.surfaceFlat,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerCancel: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  pickerDone: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    color: Colors.primary,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  cardCollapsed: {
    gap: 0,
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
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: Colors.text,
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
    color: Colors.text,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingVertical: 4,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  itemName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  itemValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  addBtn: {
    backgroundColor: Colors.primary,
    height: 32,
    width: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.4,
  },
});

