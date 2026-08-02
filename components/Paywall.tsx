import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  Easing,
} from 'react-native-reanimated';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import * as Localization from 'expo-localization';
import { useAppStore } from '@/lib/store';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/config';
import { presentAppleCodeRedemption, isAppleCodeRedemptionAvailable, PRO_ENTITLEMENT } from '@/lib/iap';
import { track } from '@/lib/analytics';

interface PaywallProps {
  visible: boolean;
  onDismiss?: () => void;
  allowDismiss?: boolean;
  onPurchaseSuccess?: () => void;
  /** Where this paywall was triggered from, for analytics (e.g. 'forecast', 'settings'). */
  source?: string;
}

type PlanKey = 'annual' | 'monthly';

interface TrialPeriod {
  count: number;
  unit: 'day' | 'week' | 'month' | 'year';
}

function parseTrialPeriod(intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null | undefined): TrialPeriod | null {
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit?.toLowerCase();
  if (unit !== 'day' && unit !== 'week' && unit !== 'month' && unit !== 'year') return null;
  const count = intro.periodNumberOfUnits;
  if (!count || count < 1) return null;
  return { count, unit };
}

// Only promise a free trial when the store product actually has a zero-price
// intro offer AND this user is eligible for it. On non-iOS platforms we make
// no trial promise (revisit with Google Play freePhase data at Android launch).
async function resolveTrials(pkgs: PurchasesPackage[]): Promise<Record<string, TrialPeriod>> {
  const withIntro = pkgs.filter(p => parseTrialPeriod(p.product.introPrice));
  if (withIntro.length === 0 || Platform.OS !== 'ios') return {};
  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(
      withIntro.map(p => p.product.identifier)
    );
    const trials: Record<string, TrialPeriod> = {};
    for (const pkg of withIntro) {
      const status = eligibility[pkg.product.identifier]?.status;
      if (status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
        const trial = parseTrialPeriod(pkg.product.introPrice);
        if (trial) trials[pkg.product.identifier] = trial;
      }
    }
    return trials;
  } catch {
    return {};
  }
}

export default function Paywall({ visible, onDismiss, allowDismiss = true, onPurchaseSuccess, source = 'unknown' }: PaywallProps) {
  const { setIsPro } = useAppStore();
  const isPro = useAppStore((s) => s.isPro);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [trials, setTrials] = useState<Record<string, TrialPeriod>>({});
  const [sdkAvailable, setSdkAvailable] = useState(true);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const translateY = useSharedValue(600);
  const opacity = useSharedValue(0);

  const completeUnlock = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    } else {
      onDismiss?.();
    }
  };

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      completedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && isPro) {
      completeUnlock();
    }
  }, [visible, isPro]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withDelay(
        100,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      if (!isPro) {
        track('paywall_shown', { source });
      }
      loadOfferings();
    } else {
      translateY.value = 600;
      opacity.value = 0;
    }
  }, [visible]);

  const handleUserDismiss = () => {
    track('paywall_dismissed', { source });
    onDismiss?.();
  };

  const loadOfferings = async (retryCount = 0) => {
    setOfferingsLoading(true);
    setOfferingsError(null);
    if (retryCount === 0) {
      setAnnualPkg(null);
      setMonthlyPkg(null);
      setTrials({});
    }
    try {
      const offerings = await Purchases.getOfferings();
      setSdkAvailable(true);
      if (offerings.current?.availablePackages?.length) {
        const packages = offerings.current.availablePackages;
        const annual = packages.find(p => p.packageType === 'ANNUAL') || null;
        const monthly = packages.find(p => p.packageType === 'MONTHLY') || null;
        setAnnualPkg(annual);
        setMonthlyPkg(monthly);
        if (!annual) setSelectedPlan(monthly ? 'monthly' : 'annual');
        if (annual || monthly) {
          setOfferingsError(null);
          const available = [annual, monthly].filter((p): p is PurchasesPackage => p !== null);
          setTrials(await resolveTrials(available));
        } else {
          setOfferingsError('No subscription plans are currently available. Please try again later.');
        }
      } else {
        setOfferingsError('No subscription plans are currently available. Please try again later.');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn('RevenueCat offerings error:', errorMessage);

      const isStoreUnavailable =
        errorMessage.includes('purchases are not available') ||
        errorMessage.includes('store is not available') ||
        errorMessage.includes('PurchasesAreCompletedBy') ||
        errorMessage.includes('Platform not supported') ||
        (Platform.OS === 'web');

      if (isStoreUnavailable) {
        setSdkAvailable(false);
      } else if (retryCount < 2) {
        const delay = (retryCount + 1) * 1500;
        retryTimerRef.current = setTimeout(() => loadOfferings(retryCount + 1), delay);
        return;
      } else {
        setSdkAvailable(true);
        setOfferingsError('Unable to load subscription options. Please check your connection and try again.');
      }
    } finally {
      setOfferingsLoading(false);
    }
  };

  const selectedPackage = selectedPlan === 'monthly' ? (monthlyPkg ?? annualPkg) : (annualPkg ?? monthlyPkg);
  const packagesLoaded = annualPkg !== null || monthlyPkg !== null;
  const selectedTrial: TrialPeriod | null = selectedPackage
    ? trials[selectedPackage.product.identifier] ?? null
    : null;

  const getDeviceLocale = (): string | undefined => {
    try {
      return Localization.getLocales()?.[0]?.languageTag ?? undefined;
    } catch {
      return undefined;
    }
  };

  type LocalizedProduct = PurchasesPackage['product'] & {
    pricePerMonthString?: string;
    defaultOption?: {
      pricePerMonthString?: string;
      pricePerMonth?: { formatted?: string };
    };
  };

  const getAnnualMonthlyPrice = (): string => {
    if (!annualPkg) return '';
    const product = annualPkg.product as LocalizedProduct;
    const sdkMonthlyString =
      product.pricePerMonthString ??
      product.defaultOption?.pricePerMonthString ??
      product.defaultOption?.pricePerMonth?.formatted;
    if (typeof sdkMonthlyString === 'string' && sdkMonthlyString.length > 0) {
      return sdkMonthlyString;
    }
    const monthlyEquivalent = product.price / 12;
    return formatCurrency(monthlyEquivalent, product.currencyCode);
  };

  const getAnnualFullPrice = (): string => {
    if (!annualPkg) return '';
    return annualPkg.product.priceString;
  };

  const getMonthlyPrice = (): string => {
    if (!monthlyPkg) return '';
    return monthlyPkg.product.priceString;
  };

  const getSavingsPct = (): number | null => {
    if (!annualPkg || !monthlyPkg) return null;
    const annualPrice = annualPkg.product.price;
    const monthlyPrice = monthlyPkg.product.price;
    if (!annualPrice || !monthlyPrice) return null;
    const pct = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
    return pct >= 5 ? pct : null;
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const formatTrialBadge = (t: TrialPeriod) => `${t.count}-${t.unit.toUpperCase()} FREE TRIAL`;
  const formatTrialCta = (t: TrialPeriod) => `Start ${t.count}-${capitalize(t.unit)} Free Trial`;
  const formatTrialDuration = (t: TrialPeriod) => `${t.count} ${t.unit}${t.count === 1 ? '' : 's'}`;

  const formatCurrency = (amount: number, currencyCode: string): string => {
    try {
      return new Intl.NumberFormat(getDeviceLocale(), {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch {
      try {
        return amount.toLocaleString(undefined, {
          style: 'currency',
          currency: currencyCode,
        });
      } catch {
        return `${currencyCode} ${amount.toFixed(2)}`;
      }
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      if (!sdkAvailable) {
        Alert.alert('Not Available', 'In-app purchases are not available in this environment. Please use a device with the App Store or Google Play.');
        return;
      }
      if (offeringsLoading) {
        Alert.alert('Loading', 'Subscription options are still loading. Please wait a moment and try again.');
        return;
      }
      if (offeringsError) {
        loadOfferings(0);
        return;
      }
      Alert.alert('Unavailable', 'Subscription packages could not be loaded. Please try again.');
      return;
    }
    setLoading(true);
    track('purchase_started', { package: selectedPlan, source });
    try {
      await Purchases.purchasePackage(selectedPackage);
      setIsPro(true);
      track('purchase_completed', { package: selectedPlan, source });
      completeUnlock();
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; code?: string | number };
      if (!err.userCancelled) {
        track('purchase_failed', { code: String(err.code ?? 'unknown') });
        Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT]) {
        setIsPro(true);
        track('restore_completed');
        completeUnlock();
      } else {
        Alert.alert(
          'No Subscription Found',
          'We couldn\'t find an active subscription for this account. If you recently purchased, it may take a moment to activate. Please try again shortly.'
        );
      }
    } catch (e) {
      Alert.alert('Restore Error', 'Something went wrong. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const isActionDisabled = loading || restoring || !packagesLoaded;
  const annualMonthlyPrice = getAnnualMonthlyPrice();
  const annualFullPrice = getAnnualFullPrice();
  const monthlyPrice = getMonthlyPrice();
  const savingsPct = getSavingsPct();
  const bothPlans = annualPkg !== null && monthlyPkg !== null;
  const selectedPriceLine = selectedPlan === 'monthly' && monthlyPkg
    ? `${monthlyPrice}/month, billed monthly`
    : `${annualMonthlyPrice}/month (${annualFullPrice}/year, billed annually)`;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          {allowDismiss && (
            <Pressable style={StyleSheet.absoluteFill} onPress={handleUserDismiss} />
          )}
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.handle} />

              {allowDismiss && (
                <Pressable style={styles.closeButton} onPress={handleUserDismiss} hitSlop={12} testID="paywall-close">
                  <Ionicons name="close" size={24} color={Colors.textTertiary} />
                </Pressable>
              )}

              <View style={styles.iconContainer}>
                <Ionicons name="diamond" size={48} color={Colors.primary} />
              </View>

              <Text style={styles.title}>Unlock Wealth Forecaster</Text>
              <Text style={styles.subtitle}>
                Get full access to all premium features
              </Text>

              <View style={styles.features}>
                <FeatureRow icon="pie-chart" text="Full portfolio tracking & analytics" />
                <FeatureRow icon="trending-up" text="Advanced wealth forecasting" />
                <FeatureRow icon="create" text="Unlimited editing & additions" />
                <FeatureRow icon="shield-checkmark" text="Cancel anytime" />
              </View>

              {!sdkAvailable && (
                <View style={styles.loadingPackages}>
                  <Ionicons name="information-circle" size={20} color={Colors.textTertiary} />
                  <Text style={styles.loadingText}>In-app purchases are not available in this environment. Please use a device with the App Store or Google Play.</Text>
                </View>
              )}

              {sdkAvailable && offeringsError && (
                <View style={styles.loadingPackages}>
                  <Ionicons name="warning" size={20} color={'#F59E0B'} />
                  <Text style={styles.loadingText}>{offeringsError}</Text>
                  <Pressable onPress={() => loadOfferings(0)} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {sdkAvailable && offeringsLoading && !packagesLoaded && (
                <View style={styles.loadingPackages}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading subscription options...</Text>
                </View>
              )}

              {packagesLoaded && selectedTrial && (
                <View style={styles.trialBadgeRow}>
                  <View style={styles.trialBadge}>
                    <Text style={styles.trialBadgeText}>{formatTrialBadge(selectedTrial)}</Text>
                  </View>
                </View>
              )}

              {packagesLoaded && (
                <View style={bothPlans ? styles.planRow : undefined}>
                  {annualPkg && (
                    <Pressable
                      style={[
                        bothPlans ? styles.planCard : styles.planSummary,
                        selectedPlan === 'annual' && styles.planCardSelected,
                      ]}
                      onPress={() => setSelectedPlan('annual')}
                      disabled={!bothPlans}
                      testID="paywall-plan-annual"
                    >
                      {savingsPct != null && (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>SAVE {savingsPct}%</Text>
                        </View>
                      )}
                      <Text style={styles.planSummaryTitle}>Annual</Text>
                      <View style={styles.planSummaryPriceRow}>
                        <Text style={styles.planSummaryMonthly}>{annualMonthlyPrice}</Text>
                        <Text style={styles.planSummaryPerMonth}>/month</Text>
                      </View>
                      <Text style={styles.planSummaryAnnual}>
                        {annualFullPrice} billed annually
                      </Text>
                    </Pressable>
                  )}
                  {monthlyPkg && (
                    <Pressable
                      style={[
                        bothPlans ? styles.planCard : styles.planSummary,
                        selectedPlan === 'monthly' && bothPlans && styles.planCardSelected,
                        !annualPkg && styles.planCardSelected,
                      ]}
                      onPress={() => setSelectedPlan('monthly')}
                      disabled={!bothPlans}
                      testID="paywall-plan-monthly"
                    >
                      <Text style={styles.planSummaryTitle}>Monthly</Text>
                      <View style={styles.planSummaryPriceRow}>
                        <Text style={styles.planSummaryMonthly}>{monthlyPrice}</Text>
                        <Text style={styles.planSummaryPerMonth}>/month</Text>
                      </View>
                      <Text style={styles.planSummaryAnnual}>
                        billed monthly
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable
                style={[styles.ctaButton, loading && styles.ctaDisabled]}
                onPress={handleSubscribe}
                disabled={isActionDisabled}
                testID="paywall-subscribe"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.ctaText}>
                    {selectedTrial ? formatTrialCta(selectedTrial) : 'Unlock Pro'}
                  </Text>
                )}
              </Pressable>

              {packagesLoaded && (
                <Text style={styles.trialDisclosure} testID="paywall-trial-disclosure">
                  {selectedTrial
                    ? `${formatTrialDuration(selectedTrial)} free, then ${selectedPriceLine}.`
                    : `${selectedPriceLine}. Cancel anytime.`}
                </Text>
              )}

              <Pressable
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isActionDisabled}
                testID="paywall-restore"
              >
                {restoring ? (
                  <ActivityIndicator color={Colors.textTertiary} size="small" />
                ) : (
                  <Text style={styles.restoreText}>Restore Purchases</Text>
                )}
              </Pressable>

              {isAppleCodeRedemptionAvailable() && (
                <Pressable
                  style={styles.redeemButton}
                  onPress={presentAppleCodeRedemption}
                  disabled={loading || restoring}
                  testID="paywall-redeem-code"
                >
                  <Text style={styles.redeemText}>Redeem Code</Text>
                </Pressable>
              )}

              <Text style={styles.legalText}>
                Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your device settings.
              </Text>

              <Text style={styles.legalText}>
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                >
                  Privacy Policy
                </Text>
                {'  •  '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
                >
                  Terms of Use (EULA)
                </Text>
              </Text>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.backgroundFlat,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xxl,
    paddingBottom: Platform.OS === 'web' ? 34 : 40,
    paddingTop: spacing.md,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  planSummary: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    position: 'relative' as const,
    overflow: 'visible' as const,
    alignItems: 'center' as const,
  },
  planRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative' as const,
    overflow: 'visible' as const,
    alignItems: 'center' as const,
  },
  planCardSelected: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderColor: Colors.primary,
  },
  saveBadge: {
    position: 'absolute' as const,
    top: -10,
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  saveBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  trialBadgeRow: {
    alignItems: 'center' as const,
    marginBottom: spacing.md,
  },
  trialBadge: {
    backgroundColor: Colors.positive,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  trialBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  planSummaryTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  planSummaryPriceRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  planSummaryMonthly: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.hero,
    color: Colors.primary,
  },
  planSummaryPerMonth: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  planSummaryAnnual: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginTop: spacing.xs,
  },
  trialDisclosure: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center' as const,
    marginBottom: spacing.md,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.white,
  },
  legalText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  redeemButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  redeemText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  restoreText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  loadingPackages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    flexShrink: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: '#FFFFFF',
  },
});
