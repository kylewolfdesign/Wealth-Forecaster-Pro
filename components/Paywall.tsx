import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ActivityIndicator, Alert, Platform, TextInput,
  KeyboardAvoidingView, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { savePortfolioToServer } from '@/lib/portfolio-sync';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

type PlanType = 'monthly' | 'annual';

interface PaywallProps {
  visible: boolean;
  onDismiss?: () => void;
  allowDismiss?: boolean;
}

export default function Paywall({ visible, onDismiss, allowDismiss = false }: PaywallProps) {
  const { setIsPro } = useAppStore();
  const { isAuthenticated, register, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [sdkAvailable, setSdkAvailable] = useState(true);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [signInMode, setSignInMode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCtaReady, setSuccessCtaReady] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(600);
  const opacity = useSharedValue(0);
  const successCheckScale = useSharedValue(0);
  const successCheckOpacity = useSharedValue(0);
  const successTextOpacity = useSharedValue(0);
  const successButtonOpacity = useSharedValue(0);
  const successConfettiScale = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withDelay(
        100,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      loadOfferings();
      setShowAccountForm(false);
      setShowSuccess(false);
      setSuccessCtaReady(false);
      setSignInMode(false);
      setSelectedPlan('annual');
      successCheckScale.value = 0;
      successCheckOpacity.value = 0;
      successTextOpacity.value = 0;
      successButtonOpacity.value = 0;
      successConfettiScale.value = 0;
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setAuthError('');
    } else {
      translateY.value = 600;
      opacity.value = 0;
    }
  }, [visible]);

  const loadOfferings = async (retryCount = 0) => {
    setOfferingsLoading(true);
    setOfferingsError(null);
    if (retryCount === 0) {
      setMonthlyPkg(null);
      setAnnualPkg(null);
    }
    try {
      const offerings = await Purchases.getOfferings();
      setSdkAvailable(true);
      if (offerings.current?.availablePackages?.length) {
        const packages = offerings.current.availablePackages;
        const monthly = packages.find(p => p.packageType === 'MONTHLY') || null;
        const annual = packages.find(p => p.packageType === 'ANNUAL') || null;
        setMonthlyPkg(monthly);
        setAnnualPkg(annual);
        if (annual) {
          setSelectedPlan('annual');
        } else if (monthly) {
          setSelectedPlan('monthly');
        }
        setOfferingsError(null);
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

  const selectedPackage = selectedPlan === 'annual' ? annualPkg : monthlyPkg;
  const packagesLoaded = monthlyPkg !== null || annualPkg !== null;

  const getMonthlyPrice = (): string => {
    if (!monthlyPkg) return '';
    return monthlyPkg.product.priceString;
  };

  const getAnnualMonthlyPrice = (): string => {
    if (!annualPkg) return '';
    const annualPrice = annualPkg.product.price;
    const monthlyEquivalent = annualPrice / 12;
    const currencyCode = annualPkg.product.currencyCode;
    return formatCurrency(monthlyEquivalent, currencyCode);
  };

  const getAnnualFullPrice = (): string => {
    if (!annualPkg) return '';
    return annualPkg.product.priceString + '/year';
  };

  const getSavingsPercent = (): number => {
    if (!monthlyPkg || !annualPkg) return 0;
    const monthlyTotal = monthlyPkg.product.price * 12;
    const annualTotal = annualPkg.product.price;
    if (monthlyTotal <= 0) return 0;
    return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const animateSuccess = useCallback(() => {
    setShowSuccess(true);
    setSuccessCtaReady(false);
    setShowAccountForm(false);
    successCheckScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 150 }));
    successCheckOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    successConfettiScale.value = withDelay(200, withSequence(
      withSpring(1.2, { damping: 8, stiffness: 120 }),
      withSpring(1, { damping: 10 })
    ));
    successTextOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    successButtonOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    successTimerRef.current = setTimeout(() => setSuccessCtaReady(true), 1400);
  }, []);

  const proceedWithPurchase = async () => {
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
    try {
      await Purchases.purchasePackage(selectedPackage);
      setIsPro(true);
      animateSuccess();
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean };
      if (!err.userCancelled) {
        Alert.alert('Purchase Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (isAuthenticated) {
      proceedWithPurchase();
    } else {
      setShowAccountForm(true);
    }
  };

  const handleRegisterAndPurchase = async () => {
    setAuthError('');
    if (!email || !password || !confirmPassword) {
      setAuthError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters');
      return;
    }

    setRegistering(true);
    try {
      const result = await register(email, password, confirmPassword, false);
      if (result.success) {
        try {
          await savePortfolioToServer();
        } catch (err) {
          console.warn('Failed to sync portfolio after registration:', err);
        }
        setShowAccountForm(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAuthError('');
        await proceedWithPurchase();
      } else {
        setAuthError(result.error || 'Registration failed');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleLoginAndPurchase = async () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Email and password are required');
      return;
    }

    setLoggingIn(true);
    try {
      const result = await login(email, password, false);
      if (result.success) {
        try {
          await savePortfolioToServer();
        } catch (err) {
          console.warn('Failed to sync portfolio after login:', err);
        }
        setShowAccountForm(false);
        setSignInMode(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAuthError('');
        await proceedWithPurchase();
      } else {
        setAuthError(result.error || 'Login failed');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['pro']) {
        setIsPro(true);
        animateSuccess();
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

  const successCheckStyle = useAnimatedStyle(() => ({
    opacity: successCheckOpacity.value,
    transform: [{ scale: successCheckScale.value }],
  }));

  const successConfettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successConfettiScale.value }],
    opacity: successCheckOpacity.value,
  }));

  const successTextStyle = useAnimatedStyle(() => ({
    opacity: successTextOpacity.value,
  }));

  const successButtonStyle = useAnimatedStyle(() => ({
    opacity: successButtonOpacity.value,
  }));

  if (!visible) return null;

  const isActionDisabled = loading || restoring || registering || loggingIn || (!packagesLoaded && sdkAvailable);
  const savings = getSavingsPercent();

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          {allowDismiss && (
            <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
          )}
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.handle} />

              {allowDismiss && (
                <Pressable style={styles.closeButton} onPress={onDismiss} hitSlop={12} testID="paywall-close">
                  <Ionicons name="close" size={24} color={Colors.textTertiary} />
                </Pressable>
              )}

              {showSuccess ? (
                <View style={styles.successContainer}>
                  <Animated.View style={[styles.successConfettiRing, successConfettiStyle]}>
                    <View style={styles.confettiDot1} />
                    <View style={styles.confettiDot2} />
                    <View style={styles.confettiDot3} />
                    <View style={styles.confettiDot4} />
                    <View style={styles.confettiDot5} />
                    <View style={styles.confettiDot6} />
                  </Animated.View>

                  <Animated.View style={[styles.successCheckContainer, successCheckStyle]}>
                    <View style={styles.successCheckCircle}>
                      <Ionicons name="checkmark" size={52} color={Colors.white} />
                    </View>
                  </Animated.View>

                  <Animated.View style={successTextStyle}>
                    <Text style={styles.successTitle}>You're All Set!</Text>
                    <Text style={styles.successSubtitle}>
                      Welcome to Wealth Forecaster Pro.{'\n'}You now have full access to all features.
                    </Text>
                  </Animated.View>

                  <Animated.View style={[styles.successFeatures, successTextStyle]}>
                    <FeatureRow icon="checkmark-circle" text="Unlimited portfolio tracking" />
                    <FeatureRow icon="checkmark-circle" text="Advanced forecasting tools" />
                    <FeatureRow icon="checkmark-circle" text="Full editing capabilities" />
                  </Animated.View>

                  <Animated.View style={successButtonStyle} pointerEvents={successCtaReady ? 'auto' : 'none'}>
                    <Pressable
                      style={styles.successButton}
                      onPress={() => onDismiss?.()}
                      testID="paywall-get-started"
                    >
                      <Text style={styles.successButtonText}>Get Started</Text>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </Pressable>
                  </Animated.View>
                </View>
              ) : !showAccountForm ? (
                <>
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

                  <View style={styles.planSelector}>
                    <Pressable
                      style={[
                        styles.planCard,
                        selectedPlan === 'annual' && styles.planCardSelected,
                      ]}
                      onPress={() => setSelectedPlan('annual')}
                      testID="paywall-plan-annual"
                    >
                      {savings > 0 && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsBadgeText}>SAVE {savings}%</Text>
                        </View>
                      )}
                      <View style={styles.planRadioRow}>
                        <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]}>
                          {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.planInfo}>
                          <Text style={[styles.planLabel, selectedPlan === 'annual' && styles.planLabelSelected]}>Annual</Text>
                          <Text style={styles.planBilledText}>Billed annually</Text>
                        </View>
                        <View style={styles.planPriceCol}>
                          <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceSelected]}>{getAnnualMonthlyPrice() || '—'}</Text>
                          <Text style={styles.planPeriod}>/month</Text>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.planCard,
                        selectedPlan === 'monthly' && styles.planCardSelected,
                      ]}
                      onPress={() => setSelectedPlan('monthly')}
                      testID="paywall-plan-monthly"
                    >
                      <View style={styles.planRadioRow}>
                        <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]}>
                          {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.planInfo}>
                          <Text style={[styles.planLabel, selectedPlan === 'monthly' && styles.planLabelSelected]}>Monthly</Text>
                          <Text style={styles.planBilledText}>Billed monthly</Text>
                        </View>
                        <View style={styles.planPriceCol}>
                          <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>{getMonthlyPrice() || '—'}</Text>
                          <Text style={styles.planPeriod}>/month</Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.ctaButton, loading && styles.ctaDisabled]}
                    onPress={handleSubscribe}
                    disabled={isActionDisabled}
                    testID="paywall-subscribe"
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.ctaText}>Continue</Text>
                    )}
                  </Pressable>

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

                  <Text style={styles.legalText}>
                    Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your device settings.
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <Ionicons name={signInMode ? "log-in" : "person-add"} size={40} color={Colors.primary} />
                  </View>

                  <Text style={styles.title}>{signInMode ? 'Sign In' : 'Create Your Account'}</Text>
                  <Text style={styles.subtitle}>
                    {signInMode
                      ? 'Log in to access your existing account'
                      : 'Sign up to get started with your subscription'}
                  </Text>

                  {!!authError && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={Colors.negative} />
                      <Text style={styles.errorText}>{authError}</Text>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      testID={signInMode ? "paywall-login-email" : "paywall-register-email"}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={signInMode ? "Enter your password" : "At least 8 characters"}
                        placeholderTextColor={Colors.textTertiary}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        testID={signInMode ? "paywall-login-password" : "paywall-register-password"}
                      />
                      <Pressable
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={Colors.textTertiary}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {!signInMode && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm your password"
                        placeholderTextColor={Colors.textTertiary}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        testID="paywall-register-confirm-password"
                      />
                    </View>
                  )}

                  {!signInMode && (
                    <Text style={styles.legalText}>
                      {'By continuing you are agreeing to our\n'}
                      <Text
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://placeholder.example.com/privacy-policy')}
                      >
                        Privacy Policy
                      </Text>
                      {' and '}
                      <Text
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://placeholder.example.com/terms-and-conditions')}
                      >
                        Terms and Conditions
                      </Text>
                    </Text>
                  )}

                  <Pressable
                    style={[styles.ctaButton, (signInMode ? loggingIn : registering) && styles.ctaDisabled]}
                    onPress={signInMode ? handleLoginAndPurchase : handleRegisterAndPurchase}
                    disabled={isActionDisabled}
                    testID={signInMode ? "paywall-login-submit" : "paywall-register-submit"}
                  >
                    {(signInMode ? loggingIn : registering) ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.ctaText}>Continue</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.switchAuthMode}
                    onPress={() => {
                      setSignInMode(!signInMode);
                      setAuthError('');
                      setPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                    }}
                    testID="paywall-toggle-auth-mode"
                  >
                    <Text style={styles.switchAuthModeText}>
                      {signInMode ? "Don't have an account? " : 'Already have an account? '}
                    </Text>
                    <Text style={styles.switchAuthModeLink}>
                      {signInMode ? 'Create Account' : 'Sign In'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.restoreButton}
                    onPress={() => {
                      setShowAccountForm(false);
                      setSignInMode(false);
                      setAuthError('');
                    }}
                    testID="paywall-back-to-paywall"
                  >
                    <Text style={styles.restoreText}>Back</Text>
                  </Pressable>
                </>
              )}
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
  planSelector: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    backgroundColor: Colors.positive,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  savingsBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    marginBottom: 2,
  },
  planLabelSelected: {
    color: Colors.text,
  },
  planBilledText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
  },
  planPriceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.text,
  },
  planPriceSelected: {
    color: Colors.primary,
  },
  planPeriod: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
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
  restoreText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.negativeLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.negative,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  passwordRow: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
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
  switchAuthMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  switchAuthModeText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
  },
  switchAuthModeLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  successCheckContainer: {
    marginBottom: spacing.xxl,
    zIndex: 2,
  },
  successCheckCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successConfettiRing: {
    position: 'absolute',
    top: spacing.xxl - 12,
    width: 120,
    height: 120,
    zIndex: 1,
  },
  confettiDot1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    top: -4,
    left: 56,
  },
  confettiDot2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    top: 16,
    right: -2,
  },
  confettiDot3: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    bottom: 16,
    right: 2,
  },
  confettiDot4: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    bottom: -2,
    left: 48,
  },
  confettiDot5: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    bottom: 20,
    left: -2,
  },
  confettiDot6: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D946EF',
    top: 20,
    left: 2,
  },
  successTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  successFeatures: {
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
    alignSelf: 'stretch',
  },
  successButton: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    width: '100%',
  },
  successButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: Colors.white,
  },
});
