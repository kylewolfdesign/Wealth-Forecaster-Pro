import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Alert, Platform, Switch, Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Picker } from '@react-native-picker/picker';
import { useAppStore, AppState } from '@/lib/store';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate } from '@/lib/types';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import { priceService } from '@/lib/price-service';
import TickerInput from '@/components/TickerInput';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { fontFamily } from '@/constants/theme';

import Colors from '@/constants/colors';

const DARK_BG = Colors.background;
const CARD_BG = Colors.surface;
const BORDER = Colors.border;
const PURPLE = Colors.primary;
const TEXT_PRIMARY = Colors.text;
const TEXT_SECONDARY = Colors.textSecondary;
const TEXT_MUTED = Colors.textTertiary;

type EditType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other' | 'realEstate';
type AppStore = AppState;

interface FormAction {
  label: string;
  onPress: () => void;
  disabled: boolean;
}

interface FormProps {
  isEditing: boolean;
  store: AppStore;
  saveAndSnapshot: () => void;
  onAction: (action: FormAction) => void;
}

export default function EditItemScreen() {
  const { type: rawType, id, category } = useLocalSearchParams<{ type: string; id?: string; category?: string }>();
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
      case 'realEstate': return store.realEstate.find(r => r.id === id);
      default: return null;
    }
  }, [type, id, store.holdings, store.rsuGrants, store.cashAccounts, store.mortgages, store.otherAssets, store.realEstate]);

  const isEditing = !!existing;
  const normalizedCategory = Array.isArray(category) ? category[0] : category;
  const isCrypto = existing && 'type' in existing ? (existing as Holding).type === 'crypto' : normalizedCategory === 'crypto';

  const saveAndSnapshot = () => {
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets, store.realEstate
    );
    store.addSnapshot(createSnapshot(totals, 'Manual update'));
  };

  const getTitle = () => {
    if (isEditing) return 'Edit';
    switch (type) {
      case 'holding': return isCrypto ? 'Add crypto currencies' : 'Add stock';
      case 'rsu': return 'Add RSU grant';
      case 'cash': return 'Add account';
      case 'mortgage': return 'Add mortgage';
      case 'other': return 'Add asset';
      case 'realEstate': return 'Add real estate';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'holding': return 'How much do you currently have?';
      case 'rsu': return 'Enter your vesting details';
      case 'cash': return 'Enter your account details';
      case 'mortgage': return 'Enter your loan details';
      case 'other': return 'Enter your asset details';
      case 'realEstate': return 'Enter your property details';
    }
  };

  const [formAction, setFormAction] = useState<FormAction>({
    label: '',
    onPress: () => {},
    disabled: true,
  });

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.appBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={s.scrollArea}
        contentContainerStyle={[s.scrollContent, { paddingBottom: bottomInset + 16 + 56 + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={40}
      >
        <Text style={s.heading}>{getTitle()}</Text>
        <Text style={s.subtitle}>{getSubtitle()}</Text>

        {type === 'holding' && <HoldingForm existing={existing as Holding | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} isCrypto={isCrypto} />}
        {type === 'rsu' && <RSUForm existing={existing as RSUGrant | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'cash' && <CashForm existing={existing as CashAccount | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} defaultCashType={normalizedCategory as 'savings' | 'offset' | undefined} />}
        {type === 'mortgage' && <MortgageForm existing={existing as Mortgage | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'other' && <OtherForm existing={existing as OtherAsset | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'realEstate' && <RealEstateForm existing={existing as RealEstate | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
      </KeyboardAwareScrollViewCompat>

      <View style={[s.footer, { paddingBottom: bottomInset + 16 }]}>
        <ActionButton
          label={formAction.label}
          onPress={formAction.onPress}
          disabled={formAction.disabled}
        />
      </View>
    </View>
  );
}

function useFormAction(
  onAction: (action: FormAction) => void,
  label: string,
  disabled: boolean,
  handler: () => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    onAction({ label, onPress: () => handlerRef.current(), disabled });
  }, [label, disabled, onAction]);
}

function HoldingForm({ existing, isEditing, store, saveAndSnapshot, onAction, isCrypto }: FormProps & { existing: Holding | null; isCrypto: boolean }) {
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [shares, setShares] = useState(existing?.shares?.toString() ?? '');
  const [pricePerShare, setPricePerShare] = useState(existing?.manualPrice?.toString() ?? '');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [addingMore, setAddingMore] = useState(!!existing?.recurringShares);
  const [recurringShares, setRecurringShares] = useState(existing?.recurringShares?.toString() ?? '');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.recurringCadence ?? 'monthly');

  const fetchPrice = useCallback(async (ticker: string) => {
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) {
      setPricePerShare('');
      return;
    }
    setFetchingPrice(true);
    try {
      const quote = await priceService.getQuote(trimmed, isCrypto ? 'crypto' : 'stock');
      setPricePerShare(quote.price.toString());
    } catch {
      setPricePerShare('');
    } finally {
      setFetchingPrice(false);
    }
  }, [isCrypto]);

  useEffect(() => {
    if (symbol.trim().length >= 1) {
      fetchPrice(symbol);
    } else {
      setPricePerShare('');
    }
  }, [symbol]);

  const handleSave = () => {
    if (!symbol.trim() || !shares.trim() || !pricePerShare.trim()) {
      Alert.alert('Required', 'Symbol and shares are required');
      return;
    }
    const parsedShares = parseFloat(shares);
    const parsedPrice = parseFloat(pricePerShare);
    if (!isFinite(parsedShares) || parsedShares <= 0 || !isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid', 'Please enter a valid number of shares');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data: Partial<Holding> = {
      type: isCrypto ? 'crypto' as const : 'stock' as const,
      symbol: symbol.toUpperCase().trim(),
      shares: parsedShares,
      manualPrice: parsedPrice,
    };
    if (addingMore && recurringShares) {
      data.recurringShares = parseFloat(recurringShares);
      data.recurringCadence = cadence;
    }
    if (isEditing && existing) {
      store.updateHolding(existing.id, data);
    } else {
      store.addHolding({ id: Crypto.randomUUID(), ...data } as Holding);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : (isCrypto ? 'Add crypto' : 'Add stock'), !symbol.trim() || !shares.trim() || !pricePerShare.trim() || fetchingPrice, handleSave);

  return (
    <View>
      <FieldLabel label={isCrypto ? "Coin ticker" : "Stock ticker"} />
      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type={isCrypto ? "crypto" : "stock"}
        placeholder={isCrypto ? "BTC" : "AAPL"}
        darkMode
      />

      <FieldLabel label={isCrypto ? "Number of coins" : "Number of shares"} />
      <DarkInput value={shares} onChangeText={setShares} keyboardType="numeric" placeholder={isCrypto ? "2.5" : "350"} />

      <FieldLabel label={fetchingPrice ? (isCrypto ? "Price per coin ($) — loading..." : "Price per share ($) — loading...") : (isCrypto ? "Price per coin ($)" : "Price per share ($)")} />
      <DarkInput value={pricePerShare} onChangeText={setPricePerShare} keyboardType="numeric" placeholder="—" editable={false} />

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
          <FieldLabel label={isCrypto ? "Number of coins" : "Number of shares"} />
          <DarkInput value={recurringShares} onChangeText={setRecurringShares} keyboardType="numeric" placeholder="100" />

          <FieldLabel label="Cadence" />
          <NativePicker
            selectedValue={cadence}
            onValueChange={(val) => setCadence(val as 'monthly' | 'quarterly' | 'yearly')}
            items={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
              { label: 'Yearly', value: 'yearly' },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function RSUForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: RSUGrant | null }) {
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [freq, setFreq] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.vest?.frequency ?? 'quarterly');

  const existingInterval = existing?.vest?.frequency === 'monthly' ? 1 : existing?.vest?.frequency === 'yearly' ? 12 : 3;
  const existingVests = existing ? Math.round((existing.vest?.durationMonths ?? 0) / existingInterval) : 0;
  const existingSpv = existingVests > 0 && existing ? Math.round((existing.totalShares - (existing.alreadyVestedShares ?? 0)) / existingVests) : 0;

  const [sharesPerVest, setSharesPerVest] = useState(existing ? existingSpv.toString() : '');
  const [vestCount, setVestCount] = useState(existing ? existingVests.toString() : '');
  const [alreadyVested, setAlreadyVested] = useState(existing ? (existing.alreadyVestedShares ?? 0).toString() : '');
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
    const avs = alreadyVested.trim() ? parseInt(alreadyVested) : 0;
    const totalShares = spv * vc + (isNaN(avs) ? 0 : avs);
    const durationMonths = intervalMonths * vc;
    const data = {
      symbol: symbol.toUpperCase().trim(),
      totalShares,
      alreadyVestedShares: isNaN(avs) ? 0 : avs,
      vest: {
        startDate: nextVestDate,
        cliffMonths: 0,
        durationMonths,
        frequency: freq,
      },
    };
    if (isEditing && existing) {
      store.updateRSUGrant(existing.id, data);
    } else {
      store.addRSUGrant({ id: Crypto.randomUUID(), ...data });
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add RSU grant', !symbol.trim() || !sharesPerVest.trim() || !vestCount.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Ticker symbol" />
      <TickerInput value={symbol} onChangeText={setSymbol} onSelect={setSymbol} type="stock" placeholder="e.g. GOOGL" darkMode />
      <FieldLabel label="Shares per vest" />
      <DarkInput value={sharesPerVest} onChangeText={setSharesPerVest} keyboardType="numeric" placeholder="e.g. 250" />
      <FieldLabel label="Vesting cadence" />
      <NativePicker
        selectedValue={freq}
        onValueChange={(val) => setFreq(val as 'monthly' | 'quarterly' | 'yearly')}
        items={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
          { label: 'Yearly', value: 'yearly' },
        ]}
      />
      <FieldLabel label="Remaining vests" />
      <DarkInput value={vestCount} onChangeText={setVestCount} keyboardType="numeric" placeholder="e.g. 16" />
      <FieldLabel label="Already vested shares" />
      <DarkInput value={alreadyVested} onChangeText={setAlreadyVested} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Next vest date" />
      <DarkInput value={nextVestDate} onChangeText={setNextVestDate} placeholder="YYYY-MM-DD" />
    </View>
  );
}

function CashForm({ existing, isEditing, store, saveAndSnapshot, onAction, defaultCashType }: FormProps & { existing: CashAccount | null; defaultCashType?: 'savings' | 'offset' }) {
  const [cashType, setCashType] = useState<'savings' | 'offset'>(existing?.type ?? defaultCashType ?? 'savings');
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
    if (isEditing && existing) {
      store.updateCashAccount(existing.id, data);
    } else {
      store.addCashAccount({ id: Crypto.randomUUID(), ...data } as CashAccount);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add account', !name.trim() || !balance.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Account type" />
      <NativePicker
        selectedValue={cashType}
        onValueChange={(val) => setCashType(val as 'savings' | 'offset')}
        items={[
          { label: 'Savings', value: 'savings' },
          { label: 'Offset', value: 'offset' },
        ]}
      />
      <FieldLabel label="Account name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
      <FieldLabel label="Current balance ($)" />
      <DarkInput value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Monthly contribution ($)" />
      <DarkInput value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual interest rate (%)" />
      <DarkInput value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="Optional" />
    </View>
  );
}

function MortgageForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: Mortgage | null }) {
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
    if (isEditing && existing) {
      store.updateMortgage(existing.id, data);
    } else {
      store.addMortgage({ id: Crypto.randomUUID(), ...data } as Mortgage);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add mortgage', !name.trim() || !principal.trim() || !rate.trim() || !payment.trim(), handleSave);

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
    </View>
  );
}

function OtherForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: OtherAsset | null }) {
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
    if (isEditing && existing) {
      store.updateOtherAsset(existing.id, data);
    } else {
      store.addOtherAsset({ id: Crypto.randomUUID(), ...data } as OtherAsset);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add asset', !name.trim() || !value.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Asset name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Car, Property" />
      <FieldLabel label="Current value ($)" />
      <DarkInput value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual growth rate % (optional)" />
      <DarkInput value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. -10 for depreciation" />
    </View>
  );
}

function RealEstateForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: RealEstate | null }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [currentValue, setCurrentValue] = useState(existing?.currentValue?.toString() ?? '');
  const [growth, setGrowth] = useState(existing?.annualGrowthRate?.toString() ?? '');

  const handleSave = () => {
    if (!name.trim() || !currentValue.trim()) {
      Alert.alert('Required', 'Name and current value are required');
      return;
    }
    const parsedValue = parseFloat(currentValue);
    if (!isFinite(parsedValue) || parsedValue <= 0) {
      Alert.alert('Invalid', 'Please enter a valid current value');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      currentValue: parsedValue,
      annualGrowthRate: growth ? parseFloat(growth) : undefined,
    };
    if (isEditing && existing) {
      store.updateRealEstate(existing.id, data);
    } else {
      store.addRealEstate({ id: Crypto.randomUUID(), ...data } as RealEstate);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add property', !name.trim() || !currentValue.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Property name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Primary Residence" />
      <FieldLabel label="Current value ($)" />
      <DarkInput value={currentValue} onChangeText={setCurrentValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual growth rate % (optional)" />
      <DarkInput value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. 4" />
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

function DarkInput({ value, onChangeText, placeholder, keyboardType, editable = true }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, focused && s.inputFocused, !editable && s.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={TEXT_MUTED}
      keyboardType={keyboardType || 'default'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      editable={editable}
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

function NativePicker({ selectedValue, onValueChange, items }: {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedLabel = items.find(i => i.value === selectedValue)?.label ?? selectedValue;

  if (Platform.OS === 'web') {
    return (
      <View style={s.webPickerWrapper}>
        {/* @ts-ignore - HTML select element for web platform */}
        <select
          value={selectedValue}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
          style={{
            backgroundColor: CARD_BG,
            color: TEXT_PRIMARY,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 16,
            fontFamily: 'Inter_400Regular, sans-serif',
            width: '100%',
            appearance: 'none' as const,
            WebkitAppearance: 'none' as const,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <View style={s.webPickerChevron}>
          <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable style={s.pickerRow} onPress={() => setShowPicker(true)}>
        <Text style={s.pickerRowText}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={s.pickerModalOverlay} onPress={() => setShowPicker(false)}>
          <View style={s.pickerModalContent}>
            <View style={s.pickerModalHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={s.pickerModalDone}>Done</Text>
              </Pressable>
            </View>
            <Picker
              selectedValue={selectedValue}
              onValueChange={(val) => {
                onValueChange(val);
              }}
              style={s.nativePicker}
              itemStyle={s.nativePickerItem}
            >
              {items.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </Pressable>
      </Modal>
    </View>
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
  inputDisabled: {
    opacity: 0.6,
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
  pickerRow: {
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
  pickerRowText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  pickerModalDone: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    color: PURPLE,
  },
  nativePicker: {
    backgroundColor: CARD_BG,
  },
  nativePickerItem: {
    color: TEXT_PRIMARY,
    fontSize: 20,
  },
  webPickerWrapper: {
    position: 'relative' as const,
  },
  webPickerChevron: {
    position: 'absolute' as const,
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    pointerEvents: 'none' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: DARK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  actionBtn: {
    backgroundColor: PURPLE,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: CARD_BG,
  },
  actionBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  actionBtnTextDisabled: {
    color: TEXT_MUTED,
  },
});
