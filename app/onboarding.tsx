import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  Animated, useWindowDimensions,
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
import TickerLogo from '@/components/TickerLogo';
import TickerInput from '@/components/TickerInput';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import type { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset } from '@/lib/types';

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
              <Ionicons name="shield-checkmark" size={36} color="#6B39F4" />
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
                backgroundColor: '#6B39F4',
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
    { name: 'trending-up', color: '#6172F3' },
    { name: 'logo-bitcoin', color: '#F79009' },
    { name: 'wallet', color: '#12B76A' },
    { name: 'home', color: '#36BFFA' },
    { name: 'layers', color: '#7A5AF8' },
    { name: 'diamond', color: '#EE46BC' },
    { name: 'cash', color: '#12B76A' },
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
  const scrollRef = useRef<FlatList>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

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
    store.completeOnboarding();
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets, store.realEstate,
    );
    store.addSnapshot(createSnapshot(totals));
    router.replace('/(tabs)');
  };

  type CardItem = { id: string; name: string; value: string; editType: string };
  const getCardInfo = (catKey: CategoryKey): { label: string; icon: keyof typeof Ionicons.glyphMap; items: CardItem[]; value: string } => {
    switch (catKey) {
      case 'investments': {
        const items = store.holdings.filter(h => h.type === 'stock');
        return { label: 'Stocks & ETFs', icon: 'trending-up', items: items.map(h => ({ id: h.id, name: h.symbol.toUpperCase(), value: formatCurrency((h.manualPrice || 0) * h.shares), editType: 'holding' })), value: formatCurrency(items.reduce((s, h) => s + (h.manualPrice || 0) * h.shares, 0)) };
      }
      case 'crypto': {
        const items = store.holdings.filter(h => h.type === 'crypto');
        return { label: 'Crypto', icon: 'logo-bitcoin', items: items.map(h => ({ id: h.id, name: h.symbol.toUpperCase(), value: formatCurrency((h.manualPrice || 0) * h.shares), editType: 'holding' })), value: formatCurrency(items.reduce((s, h) => s + (h.manualPrice || 0) * h.shares, 0)) };
      }
      case 'rsus': return { label: 'RSUs', icon: 'layers', items: store.rsuGrants.map(r => ({ id: r.id, name: r.symbol.toUpperCase(), value: formatCurrency(r.totalShares * 0), editType: 'rsu' })), value: formatCurrency(0) };
      case 'other': return { label: 'Assets', icon: 'diamond', items: store.otherAssets.map(a => ({ id: a.id, name: a.name, value: formatCurrency(a.value), editType: 'other' })), value: formatCurrency(store.otherAssets.reduce((s, a) => s + a.value, 0)) };
      case 'realEstate': return { label: 'Real Estate', icon: 'business', items: store.realEstate.map(r => ({ id: r.id, name: r.name, value: formatCurrency(r.currentValue), editType: 'realEstate' })), value: formatCurrency(store.realEstate.reduce((s, r) => s + r.currentValue, 0)) };
      case 'cashSavings': {
        const items = store.cashAccounts;
        return { label: 'Cash / Savings', icon: 'wallet', items: items.map(c => ({ id: c.id, name: c.name, value: formatCurrency(c.balance), editType: 'cash' })), value: formatCurrency(items.reduce((s, c) => s + c.balance, 0)) };
      }
      default: return { label: '', icon: 'help', items: [], value: '$0' };
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
                    <Ionicons name={info.icon} size={20} color="#94A3B8" />
                  </View>
                  <Text style={setupStyles.cardLabel}>{info.label}</Text>
                </View>
                <View style={setupStyles.cardValueRow}>
                  <Text style={setupStyles.cardValue}>{info.value}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#94A3B8"
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
                            <Ionicons name="chevron-forward" size={20} color="#64748B" />
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
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    overflow: 'hidden',
  },
  phoneNotch: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
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
    borderColor: '#6B39F4',
  },
  shieldOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(107, 57, 244, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107, 57, 244, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneHomeBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginBottom: 8,
  },
  chartArea: {
    width: 200,
    height: 110,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B39F4',
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: 200,
  },
  assetIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
});

const introStyles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#6B39F4',
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
    color: '#F8F9FD',
    letterSpacing: -0.5,
  },
  subtitleDark: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 26,
    color: '#94A3B8',
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
    backgroundColor: '#334155',
  },
  dotDarkActive: {
    width: 24,
    backgroundColor: '#6B39F4',
    borderRadius: 4,
  },
  continueBtnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#6B39F4',
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
    backgroundColor: Colors.background,
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
          <TickerLogo
            symbol={h.symbol}
            type={h.type === 'crypto' ? 'crypto' : 'stock'}
            size={32}
          />
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
  const [alreadyVested, setAlreadyVested] = useState('');
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
    const avs = alreadyVested.trim() ? parseInt(alreadyVested) : 0;
    const totalShares = spv * vc + (isNaN(avs) ? 0 : avs);
    const durationMonths = intervalMonths * vc;

    setItems([...items, {
      id: Crypto.randomUUID(),
      symbol: symbol.toUpperCase().trim(),
      totalShares,
      alreadyVestedShares: isNaN(avs) ? 0 : avs,
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
    setAlreadyVested('');
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

      <Text style={formStyles.fieldLabel}>Already vested shares</Text>
      <TextInput
        style={formStyles.input}
        placeholder="0"
        value={alreadyVested}
        onChangeText={setAlreadyVested}
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
        const spv = numVests > 0 ? Math.round((r.totalShares - (r.alreadyVestedShares ?? 0)) / numVests) : r.totalShares;
        return (
          <View key={r.id} style={formStyles.itemRow}>
            <TickerLogo
              symbol={r.symbol}
              type="stock"
              size={32}
            />
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
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
    borderBottomColor: Colors.border,
  },
  itemBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
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
    backgroundColor: Colors.border,
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
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
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
