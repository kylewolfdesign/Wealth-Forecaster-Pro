import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Pressable, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useAppStore } from '@/lib/store';
import Card from '@/components/Card';
import WealthChart from '@/components/WealthChart';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily } from '@/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { loadDemoData, clearAllData } = useAppStore();

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
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.lg, paddingBottom: Platform.OS === 'web' ? 84 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandingSection}>
        <WealthChart width={80} height={70} />
        <Text style={styles.brandName}>Wealth Forecaster</Text>
        <Text style={styles.versionBadge}>v{appVersion}</Text>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
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
});
