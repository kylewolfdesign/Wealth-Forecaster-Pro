import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, Alert, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import Card from '@/components/Card';
import WealthChart from '@/components/WealthChart';
import AnimatedEntry from '@/components/AnimatedEntry';
import Paywall from '@/components/Paywall';
import PurchaseSuccessModal from '@/components/PurchaseSuccessModal';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import { presentAppleCodeRedemption, isAppleCodeRedemptionAvailable } from '@/lib/iap';

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Both fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setError(result.error || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.changePasswordForm}>
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={14} color={Colors.negative} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!!success && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      <TextInput
        style={styles.formInput}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Current password"
        placeholderTextColor={Colors.textTertiary}
        secureTextEntry
        autoCapitalize="none"
        testID="current-password"
      />
      <TextInput
        style={styles.formInput}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="New password"
        placeholderTextColor={Colors.textTertiary}
        secureTextEntry
        autoCapitalize="none"
        testID="new-password"
      />
      <Pressable
        style={[styles.changeButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        testID="change-password-submit"
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.changeButtonText}>Update Password</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { loadDemoData, clearAllData, isPro } = useAppStore();
  const { user, isAuthenticated, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);

  const handleLoadDemo = () => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    Alert.alert(
      'Load Demo Data',
      'This will replace your current data with sample data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadDemoData();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearAllData();
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'You will continue to have access to your local data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logout();
          },
        },
      ]
    );
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedEntry delay={0} duration={350}>
        <View style={styles.brandingSection}>
          <WealthChart width={80} height={70} />
          <Text style={styles.brandName}>Wealth Forecaster</Text>
          <Text style={styles.versionBadge}>v{appVersion}</Text>
        </View>
      </AnimatedEntry>

      {isAuthenticated && user && (
        <>
          <AnimatedEntry delay={100} duration={300}>
            <Text style={styles.sectionTitle}>Account</Text>
          </AnimatedEntry>
          <AnimatedEntry delay={150} duration={300}>
            <Card style={styles.settingsCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
            </View>
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.actionRow}
              onPress={() => setShowChangePassword(!showChangePassword)}
              testID="toggle-change-password"
            >
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Change Password</Text>
              <View style={{ flex: 1 }} />
              <Ionicons
                name={showChangePassword ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textTertiary}
              />
            </Pressable>
            {showChangePassword && <ChangePasswordForm />}
            <View style={styles.rowDivider} />
            <Pressable style={styles.actionRow} onPress={handleLogout} testID="logout-button">
              <Ionicons name="log-out" size={20} color={Colors.negative} />
              <Text style={[styles.actionText, { color: Colors.negative }]}>Log Out</Text>
            </Pressable>
            </Card>
          </AnimatedEntry>
        </>
      )}

      {isAppleCodeRedemptionAvailable() && (
        <>
          <AnimatedEntry delay={225} duration={300}>
            <Text style={styles.sectionTitle}>Subscription</Text>
          </AnimatedEntry>
          <AnimatedEntry delay={225} duration={300}>
            <Card style={styles.settingsCard}>
              <Pressable
                style={styles.actionRow}
                onPress={presentAppleCodeRedemption}
                testID="settings-redeem-code"
              >
                <Ionicons name="pricetag" size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Redeem Code</Text>
              </Pressable>
            </Card>
          </AnimatedEntry>
        </>
      )}

      <AnimatedEntry delay={250} duration={300}>
        <Text style={styles.sectionTitle}>Data</Text>
      </AnimatedEntry>
      <AnimatedEntry delay={250} duration={300}>
        <Card style={styles.settingsCard}>
        <Pressable style={styles.actionRow} onPress={handleLoadDemo}>
          <Ionicons name="flask" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Load Demo Data</Text>
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable style={styles.actionRow} onPress={handleClearAll}>
          <Ionicons name="trash" size={20} color={Colors.negative} />
          <Text style={[styles.actionText, { color: Colors.negative }]}>Clear All Data</Text>
        </Pressable>
        </Card>
      </AnimatedEntry>

      <AnimatedEntry delay={300} duration={300}>
        <Text style={styles.sectionTitle}>Legal</Text>
      </AnimatedEntry>
      <AnimatedEntry delay={300} duration={300}>
        <Card style={styles.settingsCard}>
          <Pressable
            style={styles.actionRow}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            testID="privacy-policy-link"
          >
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.actionText}>Privacy Policy</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.actionRow}
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            testID="terms-of-use-link"
          >
            <Ionicons name="document-text" size={20} color={Colors.primary} />
            <Text style={styles.actionText}>Terms of Use</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
          </Pressable>
        </Card>
      </AnimatedEntry>

      <Paywall
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        allowDismiss
        onPurchaseSuccess={() => {
          setShowPaywall(false);
          setShowPurchaseSuccess(true);
        }}
      />
      <PurchaseSuccessModal
        visible={showPurchaseSuccess}
        onDismiss={() => setShowPurchaseSuccess(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: spacing.xl },
  brandingSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
  },
  brandName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: Colors.text,
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },
  versionBadge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  settingsCard: { marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  actionText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
  changePasswordForm: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  formInput: {
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
  changeButton: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: Colors.white,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.negativeLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.negative,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.positiveLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  successText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.positive,
    flex: 1,
  },
  proBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  proBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
