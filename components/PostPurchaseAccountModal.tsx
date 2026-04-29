import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/auth-context';
import { savePortfolioToServer } from '@/lib/portfolio-sync';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

interface PostPurchaseAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
}

function BenefitRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function PostPurchaseAccountModal({ visible, onDismiss }: PostPurchaseAccountModalProps) {
  const { register, login } = useAuth();
  const [signInMode, setSignInMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(600);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withDelay(
        100,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      setSignInMode(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setAuthError('');
      setSubmitting(false);
    } else {
      opacity.value = 0;
      translateY.value = 600;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const syncPortfolio = async () => {
    try {
      await savePortfolioToServer();
    } catch (err) {
      console.warn('Failed to sync portfolio after auth:', err);
    }
  };

  const handleCreateAccount = async () => {
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
    setSubmitting(true);
    try {
      const result = await register(email, password, confirmPassword, true);
      if (result.success) {
        await syncPortfolio();
        onDismiss();
      } else {
        setAuthError(result.error || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Email and password are required');
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email, password, true);
      if (result.success) {
        await syncPortfolio();
        onDismiss();
      } else {
        setAuthError(result.error || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setSignInMode(!signInMode);
    setAuthError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.handle} />

              <View style={styles.iconContainer}>
                <Ionicons
                  name={signInMode ? 'log-in' : 'cloud-upload'}
                  size={40}
                  color={Colors.primary}
                />
              </View>

              <Text style={styles.title}>
                {signInMode ? 'Sign in to your account' : 'Save your data'}
              </Text>
              <Text style={styles.subtitle}>
                {signInMode
                  ? 'Log in to link this device to your existing account.'
                  : 'Create an account so your data and Pro subscription stay with you.'}
              </Text>

              {!signInMode && (
                <View style={styles.benefits}>
                  <BenefitRow
                    icon="cloud-done"
                    text="Save your portfolio and access it from any device"
                  />
                  <BenefitRow
                    icon="phone-portrait"
                    text="Never lose your data if you change phones"
                  />
                </View>
              )}

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
                  testID={signInMode ? 'post-purchase-login-email' : 'post-purchase-register-email'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={signInMode ? 'Enter your password' : 'At least 8 characters'}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    testID={signInMode ? 'post-purchase-login-password' : 'post-purchase-register-password'}
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
                    textContentType="oneTimeCode"
                    autoComplete="off"
                    testID="post-purchase-register-confirm-password"
                  />
                </View>
              )}

              <Pressable
                style={[styles.ctaButton, submitting && styles.ctaDisabled]}
                onPress={signInMode ? handleSignIn : handleCreateAccount}
                disabled={submitting}
                testID={signInMode ? 'post-purchase-login-submit' : 'post-purchase-register-submit'}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.ctaText}>
                    {signInMode ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.toggleRow}
                onPress={toggleMode}
                disabled={submitting}
                testID="post-purchase-toggle-auth-mode"
              >
                <Text style={styles.toggleText}>
                  {signInMode ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <Text style={styles.toggleLink}>
                  {signInMode ? 'Create account' : 'Sign in'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.skipButton}
                onPress={onDismiss}
                disabled={submitting}
                testID="post-purchase-skip"
              >
                <Text style={styles.skipText}>Continue without an account</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xl,
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
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  benefits: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
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
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  toggleText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
  },
  toggleLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
