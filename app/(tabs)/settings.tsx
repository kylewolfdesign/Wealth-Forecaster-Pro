import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  TextInput, Pressable, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import Card from '@/components/Card';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, setSettings, loadDemoData, clearAllData } = useAppStore();

  const handleLoadDemo = () => {
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

  const handleResetOnboarding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useAppStore.setState({ onboardingComplete: false });
    router.replace('/onboarding');
  };

  const handleClearAll = () => {
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

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Settings</Text>

      <Text style={styles.sectionTitle}>Default Growth Rates</Text>
      <Card style={styles.settingsCard}>
        <SettingRow
          label="Stocks/ETFs"
          value={settings.stockGrowthPct}
          suffix="% / year"
          onSave={(v) => setSettings({ stockGrowthPct: v })}
        />
        <SettingRow
          label="Crypto"
          value={settings.cryptoGrowthPct}
          suffix="% / year"
          onSave={(v) => setSettings({ cryptoGrowthPct: v })}
        />
        <SettingRow
          label="RSUs"
          value={settings.rsuGrowthPct}
          suffix="% / year"
          onSave={(v) => setSettings({ rsuGrowthPct: v })}
        />
        <SettingRow
          label="Cash/Savings"
          value={settings.cashGrowthPct}
          suffix="% / year"
          onSave={(v) => setSettings({ cashGrowthPct: v })}
          isLast
        />
      </Card>

      <Text style={styles.sectionTitle}>Inflation</Text>
      <Card style={styles.settingsCard}>
        <SettingRow
          label="Inflation Rate"
          value={settings.inflationPct}
          suffix="% / year"
          onSave={(v) => setSettings({ inflationPct: v })}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Real Returns</Text>
          <Switch
            value={settings.showRealReturns}
            onValueChange={(v) => setSettings({ showRealReturns: v })}
            trackColor={{ true: Colors.primary, false: Colors.surfaceSecondary }}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Data</Text>
      <Card style={styles.settingsCard}>
        <Pressable style={styles.actionRow} onPress={handleLoadDemo}>
          <Ionicons name="flask" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Load Demo Data</Text>
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable style={styles.actionRow} onPress={handleResetOnboarding}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
          <Text style={styles.actionText}>Replay Onboarding</Text>
        </Pressable>
        <View style={styles.rowDivider} />
        <Pressable style={styles.actionRow} onPress={handleClearAll}>
          <Ionicons name="trash" size={20} color={Colors.negative} />
          <Text style={[styles.actionText, { color: Colors.negative }]}>Clear All Data</Text>
        </Pressable>
      </Card>

      <Text style={styles.versionText}>NetWorth v1.0.0</Text>
    </ScrollView>
  );
}

function SettingRow({
  label, value, suffix, onSave, isLast,
}: {
  label: string; value: number; suffix: string;
  onSave: (v: number) => void; isLast?: boolean;
}) {
  return (
    <View style={[srStyles.row, !isLast && srStyles.border]}>
      <Text style={srStyles.label}>{label}</Text>
      <View style={srStyles.inputWrap}>
        <TextInput
          style={srStyles.input}
          keyboardType="numeric"
          defaultValue={value.toString()}
          onEndEditing={(e) => {
            const v = parseFloat(e.nativeEvent.text);
            if (!isNaN(v)) onSave(v);
          }}
          selectTextOnFocus
        />
        <Text style={srStyles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
    width: 44,
    textAlign: 'right',
  },
  suffix: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginLeft: spacing.xs,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: spacing.xl },
  pageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text,
    marginBottom: spacing.xl,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchLabel: {
    fontFamily: fontFamily.medium,
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
  versionText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
