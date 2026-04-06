import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAppStore } from '@/lib/store';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

interface PaywallProps {
  visible: boolean;
  onDismiss?: () => void;
  allowDismiss?: boolean;
}

export default function Paywall({ visible, onDismiss, allowDismiss = false }: PaywallProps) {
  const { setIsPro } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [sdkAvailable, setSdkAvailable] = useState(true);
  const [priceString, setPriceString] = useState('$4.99/month');
  const translateY = useSharedValue(600);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withDelay(
        100,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      loadOfferings();
    } else {
      translateY.value = 600;
      opacity.value = 0;
    }
  }, [visible]);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages?.length) {
        const p = offerings.current.availablePackages[0];
        setPkg(p);
        setPriceString(p.product.priceString + '/' + (p.packageType === 'MONTHLY' ? 'month' : 'period'));
      }
      setSdkAvailable(true);
    } catch (e) {
      console.log('RevenueCat offerings error (expected in Expo Go):', e);
      setSdkAvailable(false);
    }
  };

  const handlePurchase = async () => {
    if (!pkg) {
      if (!sdkAvailable) {
        Alert.alert('Not Available', 'In-app purchases are not available in this environment. Please use a device with the App Store or Google Play.');
        return;
      }
      Alert.alert('Unavailable', 'Subscription packages are loading. Please try again in a moment.');
      return;
    }
    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['pro']) {
        setIsPro(true);
        onDismiss?.();
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean };
      if (!err.userCancelled) {
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
      if (customerInfo.entitlements.active['pro']) {
        setIsPro(true);
        onDismiss?.();
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
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

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        {allowDismiss && (
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        )}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />

          {allowDismiss && (
            <Pressable style={styles.closeButton} onPress={onDismiss} hitSlop={12} testID="paywall-close">
              <Ionicons name="close" size={24} color={Colors.textTertiary} />
            </Pressable>
          )}

          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Unlock Wealth Forecaster</Text>
          <Text style={styles.subtitle}>
            Get full access to all features with a free 3-day trial
          </Text>

          <View style={styles.features}>
            <FeatureRow icon="pie-chart" text="Full portfolio tracking & analytics" />
            <FeatureRow icon="trending-up" text="Advanced wealth forecasting" />
            <FeatureRow icon="create" text="Unlimited editing & additions" />
            <FeatureRow icon="shield-checkmark" text="Cancel anytime during trial" />
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.trialText}>3-DAY FREE TRIAL</Text>
            <Text style={styles.priceText}>then {priceString}</Text>
          </View>

          <Pressable
            style={[styles.ctaButton, loading && styles.ctaDisabled]}
            onPress={handlePurchase}
            disabled={loading || restoring}
            testID="paywall-subscribe"
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.ctaText}>Start Free Trial</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={loading || restoring}
            testID="paywall-restore"
          >
            {restoring ? (
              <ActivityIndicator color={Colors.textTertiary} size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>

          <Text style={styles.legalText}>
            Payment will be charged to your account after the free trial ends. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </Animated.View>
      </Animated.View>
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
  priceBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  trialText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  priceText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
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
  legalText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
