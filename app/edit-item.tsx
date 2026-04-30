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
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate, RetirementAccount, StockOption, Bond, Business, Vehicle } from '@/lib/types';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import { CURRENCIES, CURRENCY_PICKER_ITEMS, convertAmount, getCurrencySymbol } from '@/lib/currency';
import type { Currency } from '@/lib/currency';
import { priceService } from '@/lib/price-service';
import TickerInput from '@/components/TickerInput';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { fontFamily } from '@/constants/theme';

import Colors from '@/constants/colors';

const DARK_BG = Colors.background;
const CARD_BG = Colors.surfaceFlat;
const BORDER = Colors.border;
const PURPLE = Colors.primary;
const TEXT_PRIMARY = Colors.text;
const TEXT_SECONDARY = Colors.textSecondary;
const TEXT_MUTED = Colors.textTertiary;

type EditType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other' | 'realEstate' | 'retirement' | 'stockOption' | 'bond' | 'business' | 'vehicle';
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
      case 'retirement': return store.retirementAccounts.find(r => r.id === id);
      case 'stockOption': return store.stockOptions.find(o => o.id === id);
      case 'bond': return store.bonds.find(b => b.id === id);
      case 'business': return store.businesses.find(b => b.id === id);
      case 'vehicle': return store.vehicles.find(v => v.id === id);
      default: return null;
    }
  }, [type, id, store.holdings, store.rsuGrants, store.cashAccounts, store.mortgages, store.otherAssets, store.realEstate, store.retirementAccounts, store.stockOptions, store.bonds, store.businesses, store.vehicles]);

  const isEditing = !!existing;
  const normalizedCategory = Array.isArray(category) ? category[0] : category;
  const isCrypto = existing && 'type' in existing ? (existing as Holding).type === 'crypto' : normalizedCategory === 'crypto';

  const saveAndSnapshot = () => {
    const totals = computeCurrentTotals(
      store.holdings, store.rsuGrants, store.cashAccounts,
      store.mortgages, store.otherAssets, store.realEstate,
      store.retirementAccounts, store.stockOptions, store.bonds,
      store.businesses, store.vehicles
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
      case 'retirement': return 'Add retirement account';
      case 'stockOption': return 'Add stock option';
      case 'bond': return 'Add bond';
      case 'business': return 'Add business';
      case 'vehicle': return 'Add vehicle';
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
      case 'retirement': return 'Enter your retirement account details';
      case 'stockOption': return 'Enter your stock option details';
      case 'bond': return 'Enter your bond details';
      case 'business': return 'Enter your business details';
      case 'vehicle': return 'Enter your vehicle details';
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
        {type === 'retirement' && <RetirementAccountForm existing={existing as RetirementAccount | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'stockOption' && <StockOptionForm existing={existing as StockOption | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'bond' && <BondForm existing={existing as Bond | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'business' && <BusinessForm existing={existing as Business | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}
        {type === 'vehicle' && <VehicleForm existing={existing as Vehicle | null} isEditing={isEditing} store={store} saveAndSnapshot={saveAndSnapshot} onAction={setFormAction} />}

        {isEditing && id && (
          <Pressable
            style={s.deleteEntryBtn}
            onPress={() => {
              Alert.alert(
                'Delete',
                'Are you sure you want to delete this entry? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      switch (type) {
                        case 'holding': store.deleteHolding(id); break;
                        case 'rsu': store.deleteRSUGrant(id); break;
                        case 'cash': store.deleteCashAccount(id); break;
                        case 'mortgage': store.deleteMortgage(id); break;
                        case 'other': store.deleteOtherAsset(id); break;
                        case 'realEstate': store.deleteRealEstate(id); break;
                        case 'retirement': store.deleteRetirementAccount(id); break;
                        case 'stockOption': store.deleteStockOption(id); break;
                        case 'bond': store.deleteBond(id); break;
                        case 'business': store.deleteBusiness(id); break;
                        case 'vehicle': store.deleteVehicle(id); break;
                      }
                      const fresh = useAppStore.getState();
                      const totals = computeCurrentTotals(
                        fresh.holdings, fresh.rsuGrants, fresh.cashAccounts,
                        fresh.mortgages, fresh.otherAssets, fresh.realEstate,
                        fresh.retirementAccounts, fresh.stockOptions, fresh.bonds,
                        fresh.businesses, fresh.vehicles
                      );
                      fresh.addSnapshot(createSnapshot(totals, 'Deleted item'));
                      router.back();
                    },
                  },
                ]
              );
            }}
            testID="delete-entry-btn"
          >
            <Ionicons name="trash-outline" size={18} color={Colors.negative} />
            <Text style={s.deleteEntryBtnText}>Delete this entry</Text>
          </Pressable>
        )}
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

function useCurrencyContext() {
  const { settings, exchangeRates } = useAppStore();
  const displayCurrency = settings.displayCurrency ?? 'USD';
  return { displayCurrency, exchangeRates };
}

function CurrencyConversionBanner({ nativeValue, assetCurrency }: { nativeValue: number; assetCurrency: Currency }) {
  const { displayCurrency, exchangeRates } = useCurrencyContext();
  if (assetCurrency === displayCurrency || !isFinite(nativeValue) || nativeValue === 0) return null;
  const converted = convertAmount(nativeValue, assetCurrency, displayCurrency, exchangeRates);
  const rate = convertAmount(1, assetCurrency, displayCurrency, exchangeRates);
  const nativeSym = getCurrencySymbol(assetCurrency);
  const displaySym = getCurrencySymbol(displayCurrency);
  return (
    <View style={convBannerStyle.container}>
      <Ionicons name="swap-horizontal-outline" size={14} color={TEXT_SECONDARY} />
      <Text style={convBannerStyle.text}>
        {nativeSym}{nativeValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} {assetCurrency}{' '}
        = {displaySym}{converted.toLocaleString('en-US', { maximumFractionDigits: 2 })} {displayCurrency}
        {'\n'}
        <Text style={convBannerStyle.rate}>1 {assetCurrency} = {displaySym}{rate.toFixed(4)} {displayCurrency}</Text>
      </Text>
    </View>
  );
}

const convBannerStyle = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: TEXT_SECONDARY,
    flex: 1,
    lineHeight: 20,
  },
  rate: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: TEXT_MUTED,
  },
});

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
  const { displayCurrency } = useCurrencyContext();
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [shares, setShares] = useState(existing?.shares?.toString() ?? '');
  const [pricePerShare, setPricePerShare] = useState(existing?.manualPrice?.toString() ?? '');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [addingMore, setAddingMore] = useState(!!existing?.recurringShares);
  const [recurringShares, setRecurringShares] = useState(existing?.recurringShares?.toString() ?? '');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.recurringCadence ?? 'monthly');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      currency,
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

      <FieldLabel label={fetchingPrice ? `Price per ${isCrypto ? 'coin' : 'share'} — loading...` : `Price per ${isCrypto ? 'coin' : 'share'}`} />
      <DarkInput value={pricePerShare} onChangeText={setPricePerShare} keyboardType="numeric" placeholder="—" editable={false} />

      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />

      <CurrencyConversionBanner
        nativeValue={parseFloat(pricePerShare) * parseFloat(shares) || 0}
        assetCurrency={currency}
      />

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
  const { displayCurrency } = useCurrencyContext();
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [freq, setFreq] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.vest?.frequency ?? 'quarterly');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      currency,
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
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
    </View>
  );
}

function CashForm({ existing, isEditing, store, saveAndSnapshot, onAction, defaultCashType }: FormProps & { existing: CashAccount | null; defaultCashType?: 'savings' | 'offset' }) {
  const { displayCurrency } = useCurrencyContext();
  const [cashType, setCashType] = useState<'savings' | 'offset'>(existing?.type ?? defaultCashType ?? 'savings');
  const [name, setName] = useState(existing?.name ?? '');
  const [balance, setBalance] = useState(existing?.balance?.toString() ?? '');
  const [monthly, setMonthly] = useState(existing?.monthlyContribution?.toString() ?? '');
  const [rate, setRate] = useState(existing?.annualInterestRate?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      currency,
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
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(balance) || 0} assetCurrency={currency} />
    </View>
  );
}

function MortgageForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: Mortgage | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [principal, setPrincipal] = useState(existing?.principalBalance?.toString() ?? '');
  const [rate, setRate] = useState(existing?.annualInterestRate?.toString() ?? '');
  const [payment, setPayment] = useState(existing?.monthlyPayment?.toString() ?? '');
  const [increase, setIncrease] = useState(existing?.annualPaymentIncreasePct?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      currency,
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
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(principal) || 0} assetCurrency={currency} />
    </View>
  );
}

function OtherForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: OtherAsset | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing?.value?.toString() ?? '');
  const [growth, setGrowth] = useState(existing?.annualGrowthRate?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      currency,
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
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(value) || 0} assetCurrency={currency} />
    </View>
  );
}

function RealEstateForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: RealEstate | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [currentValue, setCurrentValue] = useState(existing?.currentValue?.toString() ?? '');
  const [growth, setGrowth] = useState(existing?.annualGrowthRate?.toString() ?? '');
  const [equity, setEquity] = useState(existing?.equity?.toString() ?? '');
  const [additionalEquity, setAdditionalEquity] = useState(existing?.additionalEquity?.toString() ?? '');
  const [equityCadence, setEquityCadence] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.equityCadence ?? 'monthly');
  const [mortgageId, setMortgageId] = useState(existing?.mortgageId ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
    const parsedEquity = equity ? parseFloat(equity) : undefined;
    if (parsedEquity !== undefined && (!isFinite(parsedEquity) || parsedEquity < 0)) {
      Alert.alert('Invalid', 'Please enter a valid equity amount');
      return;
    }
    const parsedAdditionalEquity = additionalEquity ? parseFloat(additionalEquity) : undefined;
    if (parsedAdditionalEquity !== undefined && (!isFinite(parsedAdditionalEquity) || parsedAdditionalEquity < 0)) {
      Alert.alert('Invalid', 'Please enter a valid additional equity amount');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data: Partial<RealEstate> & { name: string; currentValue: number } = {
      name: name.trim(),
      currentValue: parsedValue,
      annualGrowthRate: growth ? parseFloat(growth) : undefined,
      equity: parsedEquity,
      additionalEquity: parsedAdditionalEquity,
      equityCadence: parsedAdditionalEquity ? equityCadence : undefined,
      mortgageId: mortgageId || undefined,
      currency,
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
      <FieldLabel label="Current total value ($)" />
      <DarkInput value={currentValue} onChangeText={setCurrentValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual growth rate % (optional)" />
      <DarkInput value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. 4" />
      <FieldLabel label="Equity ($)" />
      <DarkInput value={equity} onChangeText={setEquity} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Additional equity added over time ($)" />
      <DarkInput value={additionalEquity} onChangeText={setAdditionalEquity} keyboardType="numeric" placeholder="e.g. 500" />
      <FieldLabel label="Cadence" />
      <NativePicker
        selectedValue={equityCadence}
        onValueChange={(val) => setEquityCadence(val as 'monthly' | 'quarterly' | 'yearly')}
        items={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
          { label: 'Yearly', value: 'yearly' },
        ]}
      />
      <FieldLabel label="Linked Mortgage" />
      <NativePicker
        selectedValue={mortgageId}
        onValueChange={(val) => setMortgageId(val)}
        items={[
          { label: 'None', value: '' },
          ...store.mortgages.map((m) => ({ label: m.name, value: m.id })),
        ]}
      />
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(equity || currentValue) || 0} assetCurrency={currency} />
    </View>
  );
}

function RetirementAccountForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: RetirementAccount | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [accountType, setAccountType] = useState<'401k' | 'ira' | 'roth_ira' | 'pension' | 'other'>(existing?.accountType ?? '401k');
  const [balance, setBalance] = useState(existing?.balance?.toString() ?? '');
  const [monthly, setMonthly] = useState(existing?.monthlyContribution?.toString() ?? '');
  const [matchPct, setMatchPct] = useState(existing?.employerMatchPct?.toString() ?? '');
  const [matchLimit, setMatchLimit] = useState(existing?.employerMatchLimit?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

  const handleSave = () => {
    if (!name.trim() || !balance.trim()) {
      Alert.alert('Required', 'Name and balance are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      accountType,
      balance: parseFloat(balance),
      monthlyContribution: parseFloat(monthly) || 0,
      employerMatchPct: matchPct ? parseFloat(matchPct) : undefined,
      employerMatchLimit: matchLimit ? parseFloat(matchLimit) : undefined,
      currency,
    };
    if (isEditing && existing) {
      store.updateRetirementAccount(existing.id, data);
    } else {
      store.addRetirementAccount({ id: Crypto.randomUUID(), ...data } as RetirementAccount);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add account', !name.trim() || !balance.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Account name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Fidelity 401k" />
      <FieldLabel label="Account type" />
      <NativePicker
        selectedValue={accountType}
        onValueChange={(val) => setAccountType(val as '401k' | 'ira' | 'roth_ira' | 'pension' | 'other')}
        items={[
          { label: '401(k)', value: '401k' },
          { label: 'Traditional IRA', value: 'ira' },
          { label: 'Roth IRA', value: 'roth_ira' },
          { label: 'Pension', value: 'pension' },
          { label: 'Other', value: 'other' },
        ]}
      />
      <FieldLabel label="Current balance ($)" />
      <DarkInput value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Monthly contribution ($)" />
      <DarkInput value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Employer match % (optional)" />
      <DarkInput value={matchPct} onChangeText={setMatchPct} keyboardType="numeric" placeholder="e.g. 50" />
      <FieldLabel label="Employer match annual limit $ (optional)" />
      <DarkInput value={matchLimit} onChangeText={setMatchLimit} keyboardType="numeric" placeholder="e.g. 11250" />
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(balance) || 0} assetCurrency={currency} />
    </View>
  );
}

function StockOptionForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: StockOption | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [optionType, setOptionType] = useState<'iso' | 'nso'>(existing?.optionType ?? 'iso');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);
  const [totalOptions, setTotalOptions] = useState(existing?.totalOptions?.toString() ?? '');
  const [vestedOptions, setVestedOptions] = useState(existing?.vestedOptions?.toString() ?? '');
  const [strikePrice, setStrikePrice] = useState(existing?.strikePrice?.toString() ?? '');
  const [currentPrice, setCurrentPrice] = useState(existing?.currentPrice?.toString() ?? '');
  const [cliffMonths, setCliffMonths] = useState(existing?.vest?.cliffMonths?.toString() ?? '12');
  const [durationMonths, setDurationMonths] = useState(existing?.vest?.durationMonths?.toString() ?? '48');
  const [freq, setFreq] = useState<'monthly' | 'quarterly' | 'yearly'>(existing?.vest?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(() => {
    if (existing?.vest?.startDate) return existing.vest.startDate;
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().split('T')[0];
  });

  const fetchPrice = useCallback(async (ticker: string) => {
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) return;
    try {
      const quote = await priceService.getQuote(trimmed, 'stock');
      setCurrentPrice(quote.price.toString());
    } catch {}
  }, []);

  useEffect(() => {
    if (symbol.trim().length >= 1) {
      fetchPrice(symbol);
    }
  }, [symbol]);

  const handleSave = () => {
    if (!symbol.trim() || !totalOptions.trim() || !strikePrice.trim()) {
      Alert.alert('Required', 'Symbol, total options, and strike price are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data: Partial<StockOption> = {
      symbol: symbol.toUpperCase().trim(),
      optionType,
      totalOptions: parseInt(totalOptions),
      vestedOptions: parseInt(vestedOptions) || 0,
      strikePrice: parseFloat(strikePrice),
      currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
      vest: {
        startDate,
        cliffMonths: parseInt(cliffMonths) || 12,
        durationMonths: parseInt(durationMonths) || 48,
        frequency: freq,
      },
      currency,
    };
    if (isEditing && existing) {
      store.updateStockOption(existing.id, data);
    } else {
      store.addStockOption({ id: Crypto.randomUUID(), ...data } as StockOption);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add stock option', !symbol.trim() || !totalOptions.trim() || !strikePrice.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Ticker symbol" />
      <TickerInput value={symbol} onChangeText={setSymbol} onSelect={setSymbol} type="stock" placeholder="e.g. NVDA" darkMode />
      <FieldLabel label="Option type" />
      <NativePicker
        selectedValue={optionType}
        onValueChange={(val) => setOptionType(val as 'iso' | 'nso')}
        items={[
          { label: 'ISO (Incentive)', value: 'iso' },
          { label: 'NSO (Non-qualified)', value: 'nso' },
        ]}
      />
      <FieldLabel label="Total options granted" />
      <DarkInput value={totalOptions} onChangeText={setTotalOptions} keyboardType="numeric" placeholder="e.g. 5000" />
      <FieldLabel label="Already vested options" />
      <DarkInput value={vestedOptions} onChangeText={setVestedOptions} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Strike price ($)" />
      <DarkInput value={strikePrice} onChangeText={setStrikePrice} keyboardType="numeric" placeholder="e.g. 45" />
      <FieldLabel label="Current price ($)" />
      <DarkInput value={currentPrice} onChangeText={setCurrentPrice} keyboardType="numeric" placeholder="—" editable={false} />
      <FieldLabel label="Vest start date" />
      <DarkInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
      <FieldLabel label="Cliff (months)" />
      <DarkInput value={cliffMonths} onChangeText={setCliffMonths} keyboardType="numeric" placeholder="12" />
      <FieldLabel label="Total vest duration (months)" />
      <DarkInput value={durationMonths} onChangeText={setDurationMonths} keyboardType="numeric" placeholder="48" />
      <FieldLabel label="Vesting frequency" />
      <NativePicker
        selectedValue={freq}
        onValueChange={(val) => setFreq(val as 'monthly' | 'quarterly' | 'yearly')}
        items={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
          { label: 'Yearly', value: 'yearly' },
        ]}
      />
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
    </View>
  );
}

function BondForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: Bond | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [faceValue, setFaceValue] = useState(existing?.faceValue?.toString() ?? '');
  const [couponRate, setCouponRate] = useState(existing?.couponRate?.toString() ?? '');
  const [maturityDate, setMaturityDate] = useState(existing?.maturityDate ?? '');
  const [purchasePrice, setPurchasePrice] = useState(existing?.purchasePrice?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

  const handleSave = () => {
    if (!name.trim() || !faceValue.trim() || !couponRate.trim() || !maturityDate.trim()) {
      Alert.alert('Required', 'Name, face value, coupon rate, and maturity date are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      faceValue: parseFloat(faceValue),
      couponRate: parseFloat(couponRate),
      maturityDate,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      currency,
    };
    if (isEditing && existing) {
      store.updateBond(existing.id, data);
    } else {
      store.addBond({ id: Crypto.randomUUID(), ...data } as Bond);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add bond', !name.trim() || !faceValue.trim() || !couponRate.trim() || !maturityDate.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Bond name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. US Treasury 10Y" />
      <FieldLabel label="Face value ($)" />
      <DarkInput value={faceValue} onChangeText={setFaceValue} keyboardType="numeric" placeholder="e.g. 50000" />
      <FieldLabel label="Coupon rate (%)" />
      <DarkInput value={couponRate} onChangeText={setCouponRate} keyboardType="numeric" placeholder="e.g. 4.25" />
      <FieldLabel label="Maturity date" />
      <DarkInput value={maturityDate} onChangeText={setMaturityDate} placeholder="YYYY-MM-DD" />
      <FieldLabel label="Purchase price $ (optional)" />
      <DarkInput value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" placeholder="e.g. 48500" />
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(purchasePrice || faceValue) || 0} assetCurrency={currency} />
    </View>
  );
}

function BusinessForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: Business | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing?.value?.toString() ?? '');
  const [growth, setGrowth] = useState(existing?.annualGrowthRate?.toString() ?? '');
  const [isIlliquid, setIsIlliquid] = useState(existing?.isIlliquid ?? true);
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

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
      isIlliquid,
      currency,
    };
    if (isEditing && existing) {
      store.updateBusiness(existing.id, data);
    } else {
      store.addBusiness({ id: Crypto.randomUUID(), ...data } as Business);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add business', !name.trim() || !value.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Business name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. Angel Investment" />
      <FieldLabel label="Estimated value ($)" />
      <DarkInput value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual growth rate % (optional)" />
      <DarkInput value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholder="e.g. 12" />
      <View style={s.toggleSection}>
        <View style={s.toggleHeader}>
          <View>
            <Text style={s.toggleTitle}>Illiquid?</Text>
            <Text style={s.toggleSubtitle}>Cannot be easily sold or converted to cash</Text>
          </View>
          <Switch
            value={isIlliquid}
            onValueChange={setIsIlliquid}
            trackColor={{ false: BORDER, true: PURPLE }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(value) || 0} assetCurrency={currency} />
    </View>
  );
}

function VehicleForm({ existing, isEditing, store, saveAndSnapshot, onAction }: FormProps & { existing: Vehicle | null }) {
  const { displayCurrency } = useCurrencyContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [currentValue, setCurrentValue] = useState(existing?.currentValue?.toString() ?? '');
  const [depRate, setDepRate] = useState(existing?.annualDepreciationRate?.toString() ?? '15');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? displayCurrency);

  const handleSave = () => {
    if (!name.trim() || !currentValue.trim()) {
      Alert.alert('Required', 'Name and current value are required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      currentValue: parseFloat(currentValue),
      annualDepreciationRate: depRate ? parseFloat(depRate) : 15,
      currency,
    };
    if (isEditing && existing) {
      store.updateVehicle(existing.id, data);
    } else {
      store.addVehicle({ id: Crypto.randomUUID(), ...data } as Vehicle);
    }
    saveAndSnapshot();
    router.back();
  };

  useFormAction(onAction, isEditing ? 'Save changes' : 'Add vehicle', !name.trim() || !currentValue.trim(), handleSave);

  return (
    <View>
      <FieldLabel label="Vehicle name" />
      <DarkInput value={name} onChangeText={setName} placeholder="e.g. 2022 Tesla Model 3" />
      <FieldLabel label="Current value ($)" />
      <DarkInput value={currentValue} onChangeText={setCurrentValue} keyboardType="numeric" placeholder="0" />
      <FieldLabel label="Annual depreciation rate (%)" />
      <DarkInput value={depRate} onChangeText={setDepRate} keyboardType="numeric" placeholder="15" />
      <FieldLabel label="Currency" />
      <NativePicker selectedValue={currency} onValueChange={(v) => setCurrency(v as Currency)} items={CURRENCY_PICKER_ITEMS} />
      <CurrencyConversionBanner nativeValue={parseFloat(currentValue) || 0} assetCurrency={currency} />
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
      textContentType={keyboardType === 'numeric' ? 'oneTimeCode' : 'none'}
      autoComplete="off"
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
  const [draft, setDraft] = useState(selectedValue);
  const selectedLabel = items.find(i => i.value === selectedValue)?.label ?? selectedValue;

  const handleOpen = () => {
    setDraft(selectedValue);
    setShowPicker(true);
  };

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
      <Pressable style={s.pickerRow} onPress={handleOpen}>
        <Text style={s.pickerRowText}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={s.pickerModalOverlay}>
          <View style={s.pickerModalContent}>
            <View style={s.pickerModalHeader}>
              <Pressable onPress={() => setShowPicker(false)} hitSlop={12}>
                <Text style={s.pickerModalCancel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { onValueChange(draft); setShowPicker(false); }} hitSlop={12}>
                <Text style={s.pickerModalDone}>Select</Text>
              </Pressable>
            </View>
            <Picker
              selectedValue={draft}
              onValueChange={(val) => setDraft(val)}
              style={s.nativePicker}
              itemStyle={s.nativePickerItem}
            >
              {items.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>
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
    backgroundColor: Colors.surfaceFlat,
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  pickerModalCancel: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    color: TEXT_SECONDARY,
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
  deleteEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.negative,
  },
  deleteEntryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: Colors.negative,
  },
});
