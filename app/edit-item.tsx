import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Alert, Platform, Switch,
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
import { fontFamily } from '@/constants/theme';

const DARK_BG = '#0F172A';
const CARD_BG = '#1E293B';
const BORDER = '#334155';
const PURPLE = '#6B39F4';
const PURPLE_LIGHT = '#D3C4FC';
const TEXT_PRIMARY = '#F8F9FD';
const TEXT_SECONDARY = '#94A3B8';
const TEXT_MUTED = '#64748B';

type EditType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other';

export default function EditItemScreen() {
  const { type: rawType, id } = useLocalSearchParams<{ type: string; id?: string }>();
  const type = (rawType || 'holding') as EditType;
  const insets = useSafeAreaInsets();
  const store = useAppStore();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

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

  const saveAndSnapshot = () => {
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets
    );
    store.addSnapshot(createSnapshot(totals, 'Manual update'));
  };

  const getTitle = () => {
    if (isEditing) return 'Edit';
    switch (type) {
      case 'holding': return 'Add stock';
      case 'rsu': return 'Add RSU grant';
      case 'cash': return 'Add account';
      case 'mortgage': return 'Add mortgage';
      case 'other': return 'Add asset';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'holding': return 'How much do you currently have?';
      case 'rsu': return 'Enter your vesting details';
      case 'cash': return 'Enter your account details';
      case 'mortgage': return 'Enter your loan details';
      case 'other': return 'Enter your asset details';
    }
  };

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.appBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={[s.scrollContent, { paddingBottom: bottomInset + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.heading}>{getTitle()}</Text>
        <Text style={s.subtitle}>{getSubtitle()}</Text>

        {type === 'holding' && <HoldingForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
        {type === 'rsu' && <RSUForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
        {type === 'cash' && <CashForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
        {type === 'mortgage' && <MortgageForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
        {type === 'other' && <OtherForm existing={existing as any} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} />}
      </ScrollView>
    </View>
  );
}

function HoldingForm({ existing, isEditing, store, saveAndSnapshot }: any) {
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [shares, setShares] = useState(existing?.shares?.toString() ?? '');
  const [addingMore, setAddingMore] = useState(!!existing?.recurringShares);
  const [recurringShares, setRecurringShares] = useState(existing?.recurringShares?.toString() ?? '');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.recurringCadence ?? 'monthly');
  const [showCadencePicker, setShowCadencePicker] = useState(false);

  const handleSave = () => {
    if (!symbol.trim() || !shares.trim()) {
      Alert.alert('Required', 'Symbol and shares are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data: any = {
      type: 'stock' as const,
      symbol: symbol.toUpperCase().trim(),
      shares: parseFloat(shares),
    };
    if (addingMore && recurringShares) {
      data.recurringShares = parseFloat(recurringShares);
      data.recurringCadence = cadence;
    }
    if (isEditing) {
      store.updateHolding(existing.id, data);
    } else {
      store.addHolding({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  const cadenceLabel = cadence === 'monthly' ? 'Monthly' : cadence === 'quarterly' ? 'Quarterly' : 'Yearly';

  return (
    <View>
      <FieldLabel label="Stock ticker" />
      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type="stock"
        placeholder="AAPL"
        darkMode
      />

      <FieldLabel label="Number of shares" />
      <DarkInput value={shares} onChangeText={setShares} keyboardType="numeric" placeholder="350" />

      <View style={s.toggleSection}>
        <View style={s.toggleHeader}>
          <View>
            <Text style={s.toggleTitle}>Adding more?</Text>
            <Text style={s.toggleSubtitle}>Will you get more regularly ongoing?</Text>
          </View>
          <Switch
            value={addingMore}
            onValueChange={setAddingMore}
            trackColor={{ false: BORDER, true: PURPLE }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {addingMore && (
        <View>
          <FieldLabel label="Number of shares" />
          <DarkInput value={recurringShares} onChangeText={setRecurringShares} keyboardType="numeric" placeholder="100" />

          <FieldLabel label="Cadence" />
          <Pressable style={s.dropdown} onPress={() => setShowCadencePicker(!showCadencePicker)}>
            <Text style={s.dropdownText}>{cadenceLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
          </Pressable>
          {showCadencePicker && (
            <View style={s.pickerOptions}>
              {(['monthly', 'quarterly', 'yearly'] as const).map((c) => (
                <Pressable
                  key={c}
                  style={[s.pickerOption, cadence === c && s.pickerOptionActive]}
                  onPress={() => { setCadence(c); setShowCadencePicker(false); }}
                >
                  <Text style={[s.pickerOptionText, cadence === c && s.pickerOptionTextActive]}>
                    {c === 'monthly' ? 'Monthly' : c === 'quarterly' ? 'Quarterly' : 'Yearly'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <ActionButton label={isEditing ? 'Save changes' : 'Add stock'} onPress={handleSave} disabled={!symbol.trim() || !shares.trim()} />
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
      <FieldLabel label="Ticker symbol" />
      <TickerInput value={symbol} onChangeText={setSymbol} onSelect={setSymbol} type="stock" placeholder="e.g. GOOGL" darkMode />
      <FieldLabel label="Shares per vest" />
      <DarkInput value={sharesPerVest} onChangeText={setSharesPerVest} keyboardType="numeric" placeholder="e.g. 250" />
      <FieldLabel label="Vesting cadence" />
      <View style={s.cadenceRow}>
        {(['monthly', 'quarterly', 'yearly'] as const).map((f) => (
          <Pressable key={f} style={[s.cadenceBtn, freq === f && s.cadenceBtnActive]} onPress={() => setFreq(f)}>
            <Text style={[s.cadenceBtnText, freq === f && s.cadenceBtnTextActive]}>
              {f === 'monthly' ? 'Monthly' : f === 'quarterly' ? 'Quarterly' : 'Yearly'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel label="Remaining vests" />
      <DarkInput value={vestCount} onChangeText={setVestCount} keyboardType="numeric" placeholder="e.g. 16" />
      <FieldLabel label="Next vest date" />
      <DarkInput value={nextVestDate} onChangeText={setNextVestDate} placeholder="YYYY-MM-DD" />
      <ActionButton label={isEditing ? 'Save changes' : 'Add RSU grant'} onPress={handleSave} disabled={!symbol.trim() || !sharesPerVest.trim() || !vestCount.trim()} />
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
      <View style={s.cadenceRow}>
        {(['savings', 'offset'] as const).map((t) => (
          <Pressable key={t} style={[s.cadenceBtn, cashType === t && s.cadenceBtnActive]} onPress={() => setCashType(t)}>
            <Text style={[s.cadenceBtnText, cashType === t && s.cadenceBtnTextActive]}>
              {t === 'savings' ? 'Savings' : 'Offset'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel label="Account name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
      <FieldLabel label="Current balance ($)" />
      <DarkInput value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Monthly contribution ($)" />
      <DarkInput value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual interest rate (%)" />
      <DarkInput value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="Optional" />
      <ActionButton label={isEditing ? 'Save changes' : 'Add account'} onPress={handleSave} disabled={!name.trim() || !balance.trim()} />
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
      <FieldLabel label="Loan name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Home Loan" />
      <FieldLabel label="Principal balance ($)" />
      <DarkInput value={principal} onChangeText={setPrincipal} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual interest rate (%)" />
      <DarkInput value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Monthly payment ($)" />
      <DarkInput value={payment} onChangeText={setPayment} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual payment increase % (optional)" />
      <DarkInput value={increase} onChangeText={setIncrease} keyboardType="numeric" placeholder="e.g. 2" />
      <ActionButton label={isEditing ? 'Save changes' : 'Add mortgage'} onPress={handleSave} disabled={!name.trim() || !principal.trim() || !rate.trim() || !payment.trim()} />
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
      <FieldLabel label="Asset name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Car, Property" />
      <FieldLabel label="Current value ($)" />
      <DarkInput value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual growth rate % (optional)" />
      <DarkInput value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. -10 for depreciation" />
      <ActionButton label={isEditing ? 'Save changes' : 'Add asset'} onPress={handleSave} disabled={!name.trim() || !value.trim()} />
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

function DarkInput({ value, onChangeText, placeholder, keyboardType }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, focused && s.inputFocused]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={TEXT_MUTED}
      keyboardType={keyboardType || 'default'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [s.actionBtn, disabled && s.actionBtnDisabled, pressed && !disabled && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.actionBtnText, disabled && s.actionBtnTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  appBar: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 24,
    height: 24,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  inputFocused: {
    borderColor: PURPLE,
  },
  toggleSection: {
    marginTop: 28,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  dropdown: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  pickerOptions: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerOptionActive: {
    backgroundColor: PURPLE + '22',
  },
  pickerOptionText: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: TEXT_SECONDARY,
  },
  pickerOptionTextActive: {
    color: PURPLE,
    fontFamily: fontFamily.semibold,
  },
  cadenceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cadenceBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cadenceBtnActive: {
    backgroundColor: PURPLE + '22',
    borderColor: PURPLE,
  },
  cadenceBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  cadenceBtnTextActive: {
    color: PURPLE,
  },
  actionBtn: {
    backgroundColor: PURPLE,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  actionBtnDisabled: {
    backgroundColor: '#1E293B',
  },
  actionBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  actionBtnTextDisabled: {
    color: '#475569',
  },
});
