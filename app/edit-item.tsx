import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Alert, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import TickerInput from '@/components/TickerInput';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

type EditType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other';

export default function EditItemScreen() {
  const { type: rawType, id } = useLocalSearchParams<{ type: string; id?: string }>();
  const type = (rawType || 'holding') as EditType;
  const insets = useSafeAreaInsets();
  const store = useAppStore();

  const existing = useMemo(() => {
    if (!id) return null;
    switch (type) {
      case 'holding': return store.holdings.find(h => h.id === id);
      case 'rsu': return store.rsuGrants.find(r => r.id === id);
      case 'cash': return store.cashAccounts.find(c => c.id === id);
      case 'mortgage': return store.mortgages.find(m => m.id === id);
      case 'other': return store.otherAssets.find(a => a.id === id);
      default: return null;
    }
  }, [type, id]);

  const isEditing = !!existing;
  const title = isEditing ? 'Edit' : 'Add';

  const saveAndSnapshot = () => {
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets
    );
    store.addSnapshot(createSnapshot(totals, 'Manual update'));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title} {getTypeLabel(type)}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {type === 'holding' && <HoldingForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
      {type === 'rsu' && <RSUForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
      {type === 'cash' && <CashForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
      {type === 'mortgage' && <MortgageForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
      {type === 'other' && <OtherForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
    </ScrollView>
  );
}

function getTypeLabel(type: EditType): string {
  switch (type) {
    case 'holding': return 'Investment';
    case 'rsu': return 'RSU Grant';
    case 'cash': return 'Account';
    case 'mortgage': return 'Mortgage';
    case 'other': return 'Asset';
  }
}

function HoldingForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [holdingType, setHoldingType] = useState<'stock' | 'crypto'>(existing?.type ?? 'stock');
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [shares, setShares] = useState(existing?.shares?.toString() ?? '');
  const [manualPrice, setManualPrice] = useState(existing?.manualPrice?.toString() ?? '');
  const [growthOverride, setGrowthOverride] = useState(existing?.growthOverride?.toString() ?? '');

  const handleSave = () => {
    if (!symbol.trim() || !shares.trim()) {
      Alert.alert('Required', 'Symbol and shares are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      type: holdingType,
      symbol: symbol.toUpperCase().trim(),
      shares: parseFloat(shares),
      manualPrice: manualPrice ? parseFloat(manualPrice) : undefined,
      growthOverride: growthOverride ? parseFloat(growthOverride) : undefined,
    };
    if (isEditing) {
      store.updateHolding(existing.id, data);
    } else {
      store.addHolding({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  return (
    <View>
      <View style={styles.toggleRow}>
        {(['stock', 'crypto'] as const).map((t) => (
          <Pressable key={t} style={[styles.toggle, holdingType === t && styles.toggleActive]} onPress={() => setHoldingType(t)}>
            <Text style={[styles.toggleText, holdingType === t && styles.toggleTextActive]}>
              {t === 'stock' ? 'Stock/ETF' : 'Crypto'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel label="Symbol" />
      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type={holdingType}
        placeholder={holdingType === 'stock' ? 'e.g. AAPL' : 'e.g. BTC'}
      />
      <FieldLabel label="Number of Shares" />
      <TextInput style={styles.input} value={shares} onChangeText={setShares} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Manual Price Override (optional)" />
      <TextInput style={styles.input} value={manualPrice} onChangeText={setManualPrice} keyboardType="numeric" placeholder="Leave empty for auto" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Growth Override % (optional)" />
      <TextInput style={styles.input} value={growthOverride} onChangeText={setGrowthOverride} keyboardType="numeric" placeholder="Uses default rate" placeholderTextColor={Colors.textTertiary} />
      <SaveButton onPress={handleSave} isEditing={isEditing} />
    </View>
  );
}

function RSUForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [freq, setFreq] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.vest?.frequency ?? 'quarterly');

  const existingInterval = existing?.vest?.frequency === 'monthly' ? 1 : existing?.vest?.frequency === 'yearly' ? 12 : 3;
  const existingVests = existing ? Math.round((existing.vest?.durationMonths ?? 0) / existingInterval) : 0;
  const existingSpv = existingVests > 0 ? Math.round((existing.totalShares - (existing.alreadyVestedShares ?? 0)) / existingVests) : 0;

  const [sharesPerVest, setSharesPerVest] = useState(existing ? existingSpv.toString() : '');
  const [vestCount, setVestCount] = useState(existing ? existingVests.toString() : '');
  const [nextVestDate, setNextVestDate] = useState(() => {
    if (existing?.vest?.startDate) return existing.vest.startDate;
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const handleSave = () => {
    if (!symbol.trim() || !sharesPerVest.trim() || !vestCount.trim()) {
      Alert.alert('Required', 'Ticker, shares per vest, and vest count are required');
      return;
    }
    const spv = parseFloat(sharesPerVest);
    const vc = parseInt(vestCount);
    if (isNaN(spv) || spv <= 0 || isNaN(vc) || vc <= 0) {
      Alert.alert('Invalid', 'Please enter valid numbers');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const intervalMonths = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12;
    const totalShares = spv * vc + (existing?.alreadyVestedShares ?? 0);
    const durationMonths = intervalMonths * vc;
    const data = {
      symbol: symbol.toUpperCase().trim(),
      totalShares,
      alreadyVestedShares: existing?.alreadyVestedShares ?? 0,
      vest: {
        startDate: nextVestDate,
        cliffMonths: 0,
        durationMonths,
        frequency: freq,
      },
    };
    if (isEditing) {
      store.updateRSUGrant(existing.id, data);
    } else {
      store.addRSUGrant({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  return (
    <View>
      <FieldLabel label="Ticker Symbol" />
      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type="stock"
        placeholder="e.g. GOOGL"
      />
      <FieldLabel label="Shares per vest" />
      <TextInput style={styles.input} value={sharesPerVest} onChangeText={setSharesPerVest} keyboardType="numeric" placeholder="e.g. 250" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Vesting cadence" />
      <View style={styles.toggleRow}>
        {(['monthly', 'quarterly', 'yearly'] as const).map((f) => (
          <Pressable key={f} style={[styles.toggle, freq === f && styles.toggleActive]} onPress={() => setFreq(f)}>
            <Text style={[styles.toggleText, freq === f && styles.toggleTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel label="Remaining vests" />
      <TextInput style={styles.input} value={vestCount} onChangeText={setVestCount} keyboardType="numeric" placeholder="e.g. 16" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Next vest date" />
      <TextInput style={styles.input} value={nextVestDate} onChangeText={setNextVestDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} />
      <SaveButton onPress={handleSave} isEditing={isEditing} />
    </View>
  );
}

function CashForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [cashType, setCashType] = useState<'savings' | 'offset'>(existing?.type ?? 'savings');
  const [name, setName] = useState(existing?.name ?? '');
  const [balance, setBalance] = useState(existing?.balance?.toString() ?? '');
  const [monthly, setMonthly] = useState(existing?.monthlyContribution?.toString() ?? '');
  const [rate, setRate] = useState(existing?.annualInterestRate?.toString() ?? '');

  const handleSave = () => {
    if (!name.trim() || !balance.trim()) {
      Alert.alert('Required', 'Name and balance are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      type: cashType,
      name: name.trim(),
      balance: parseFloat(balance),
      monthlyContribution: parseFloat(monthly) || 0,
      annualInterestRate: rate ? parseFloat(rate) : undefined,
    };
    if (isEditing) {
      store.updateCashAccount(existing.id, data);
    } else {
      store.addCashAccount({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  return (
    <View>
      <View style={styles.toggleRow}>
        {(['savings', 'offset'] as const).map((t) => (
          <Pressable key={t} style={[styles.toggle, cashType === t && styles.toggleActive]} onPress={() => setCashType(t)}>
            <Text style={[styles.toggleText, cashType === t && styles.toggleTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel label="Account Name" />
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Current Balance ($)" />
      <TextInput style={styles.input} value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Monthly Contribution ($)" />
      <TextInput style={styles.input} value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Annual Interest Rate (%)" />
      <TextInput style={styles.input} value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="Optional" placeholderTextColor={Colors.textTertiary} />
      <SaveButton onPress={handleSave} isEditing={isEditing} />
    </View>
  );
}

function MortgageForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [name, setName] = useState(existing?.name ?? '');
  const [principal, setPrincipal] = useState(existing?.principalBalance?.toString() ?? '');
  const [rate, setRate] = useState(existing?.annualInterestRate?.toString() ?? '');
  const [payment, setPayment] = useState(existing?.monthlyPayment?.toString() ?? '');
  const [increase, setIncrease] = useState(existing?.annualPaymentIncreasePct?.toString() ?? '');

  const handleSave = () => {
    if (!name.trim() || !principal.trim() || !rate.trim() || !payment.trim()) {
      Alert.alert('Required', 'All fields are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      principalBalance: parseFloat(principal),
      annualInterestRate: parseFloat(rate),
      monthlyPayment: parseFloat(payment),
      annualPaymentIncreasePct: increase ? parseFloat(increase) : undefined,
    };
    if (isEditing) {
      store.updateMortgage(existing.id, data);
    } else {
      store.addMortgage({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  return (
    <View>
      <FieldLabel label="Loan Name" />
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Home Loan" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Principal Balance ($)" />
      <TextInput style={styles.input} value={principal} onChangeText={setPrincipal} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Annual Interest Rate (%)" />
      <TextInput style={styles.input} value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Monthly Payment ($)" />
      <TextInput style={styles.input} value={payment} onChangeText={setPayment} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Annual Payment Increase % (optional)" />
      <TextInput style={styles.input} value={increase} onChangeText={setIncrease} keyboardType="numeric" placeholder="e.g. 2" placeholderTextColor={Colors.textTertiary} />
      <SaveButton onPress={handleSave} isEditing={isEditing} />
    </View>
  );
}

function OtherForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing?.value?.toString() ?? '');
  const [growth, setGrowth] = useState(existing?.annualGrowthRate?.toString() ?? '');

  const handleSave = () => {
    if (!name.trim() || !value.trim()) {
      Alert.alert('Required', 'Name and value are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      value: parseFloat(value),
      annualGrowthRate: growth ? parseFloat(growth) : undefined,
    };
    if (isEditing) {
      store.updateOtherAsset(existing.id, data);
    } else {
      store.addOtherAsset({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  return (
    <View>
      <FieldLabel label="Asset Name" />
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Car, Property" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Current Value ($)" />
      <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
      <FieldLabel label="Annual Growth Rate % (optional)" />
      <TextInput style={styles.input} value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. -10 for depreciation" placeholderTextColor={Colors.textTertiary} />
      <SaveButton onPress={handleSave} isEditing={isEditing} />
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function SaveButton({ onPress, isEditing }: { onPress: () => void; isEditing: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
    >
      <Ionicons name={isEditing ? 'checkmark' : 'add'} size={20} color={Colors.white} />
      <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Item'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: Colors.text,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: 2,
    marginBottom: spacing.md,
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
    textTransform: 'capitalize',
  },
  toggleTextActive: {
    color: Colors.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.xxl,
  },
  saveBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
});
