import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useAppStore } from '@/lib/store';
import { computeCurrentTotals } from '@/lib/calculations';
import { createSnapshot } from '@/lib/snapshot';
import { formatCurrency } from '@/lib/format';
import TickerInput from '@/components/TickerInput';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import type { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset } from '@/lib/types';

const STEPS = [
  { key: 'welcome', title: 'Welcome', icon: 'rocket' as const },
  { key: 'investments', title: 'Investments', icon: 'trending-up' as const },
  { key: 'rsus', title: 'RSUs', icon: 'layers' as const },
  { key: 'savings', title: 'Savings', icon: 'wallet' as const },
  { key: 'offset', title: 'Offset', icon: 'swap-horizontal' as const },
  { key: 'mortgage', title: 'Mortgage', icon: 'home' as const },
  { key: 'other', title: 'Other Assets', icon: 'diamond' as const },
  { key: 'review', title: 'Review', icon: 'checkmark-circle' as const },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const store = useAppStore();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [rsuGrants, setRsuGrants] = useState<RSUGrant[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [otherAssets, setOtherAssets] = useState<OtherAsset[]>([]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    holdings.forEach((h) => store.addHolding(h));
    rsuGrants.forEach((r) => store.addRSUGrant(r));
    cashAccounts.forEach((c) => store.addCashAccount(c));
    mortgages.forEach((m) => store.addMortgage(m));
    otherAssets.forEach((a) => store.addOtherAsset(a));
    store.completeOnboarding();

    const totals = computeCurrentTotals(
      [...store.holdings, ...holdings],
      [...store.rsuGrants, ...rsuGrants],
      [...store.cashAccounts, ...cashAccounts],
      [...store.mortgages, ...mortgages],
      [...store.otherAssets, ...otherAssets],
    );
    store.addSnapshot(createSnapshot(totals));
    router.replace('/(tabs)');
  };

  const handleSkipAll = () => {
    store.completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    switch (STEPS[step].key) {
      case 'welcome': return <WelcomeStep onSkip={handleSkipAll} />;
      case 'investments': return <InvestmentsStep items={holdings} setItems={setHoldings} />;
      case 'rsus': return <RSUStep items={rsuGrants} setItems={setRsuGrants} />;
      case 'savings': return <CashStep type="savings" items={cashAccounts.filter(c => c.type === 'savings')} setItems={(items) => setCashAccounts([...cashAccounts.filter(c => c.type !== 'savings'), ...items])} />;
      case 'offset': return <CashStep type="offset" items={cashAccounts.filter(c => c.type === 'offset')} setItems={(items) => setCashAccounts([...cashAccounts.filter(c => c.type !== 'offset'), ...items])} />;
      case 'mortgage': return <MortgageStep items={mortgages} setItems={setMortgages} />;
      case 'other': return <OtherStep items={otherAssets} setItems={setOtherAssets} />;
      case 'review': return (
        <ReviewStep
          holdings={holdings}
          rsuGrants={rsuGrants}
          cashAccounts={cashAccounts}
          mortgages={mortgages}
          otherAssets={otherAssets}
        />
      );
      default: return null;
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.topBar, { paddingTop: topInset + spacing.md }]}>
        <View style={styles.stepIndicator}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= step && styles.dotActive, i === step && styles.dotCurrent]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + spacing.md }]}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}

        <Pressable
          style={[styles.nextBtn, isLast && styles.finishBtn]}
          onPress={isLast ? handleFinish : handleNext}
        >
          <Text style={[styles.nextBtnText, isLast && styles.finishBtnText]}>
            {isLast ? 'Finish' : step === 0 ? 'Get Started' : 'Next'}
          </Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color={Colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function WelcomeStep({ onSkip }: { onSkip: () => void }) {
  return (
    <View style={wStyles.container}>
      <View style={wStyles.iconWrap}>
        <Ionicons name="bar-chart" size={48} color={Colors.primary} />
      </View>
      <Text style={wStyles.title}>Track Your Wealth</Text>
      <Text style={wStyles.desc}>
        Add your assets and liabilities to see your net worth, track changes over time, and forecast your financial future.
      </Text>
      <View style={wStyles.features}>
        {['Real-time net worth', 'Growth forecasting', 'History tracking'].map((f) => (
          <View key={f} style={wStyles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.positive} />
            <Text style={wStyles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onSkip}>
        <Text style={wStyles.skipText}>Skip setup, I'll add later</Text>
      </Pressable>
    </View>
  );
}

const wStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: spacing.huge },
  iconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: Colors.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.xxl,
  },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.xxxl, color: Colors.text, marginBottom: spacing.md, textAlign: 'center' },
  desc: { fontFamily: fontFamily.regular, fontSize: fontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.xxl, marginBottom: spacing.xxl },
  features: { gap: spacing.md, marginBottom: spacing.xxxl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontFamily: fontFamily.medium, fontSize: fontSize.md, color: Colors.text },
  skipText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: Colors.textTertiary },
});

function InvestmentsStep({ items, setItems }: { items: Holding[]; setItems: (h: Holding[]) => void }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [type, setType] = useState<'stock' | 'crypto'>('stock');

  const handleAdd = () => {
    if (!symbol.trim() || !shares.trim()) return;
    const s = parseFloat(shares);
    if (isNaN(s) || s <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, { id: Crypto.randomUUID(), type, symbol: symbol.toUpperCase().trim(), shares: s }]);
    setSymbol('');
    setShares('');
  };

  const handleRemove = (id: string) => setItems(items.filter(h => h.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add Investments</Text>
      <Text style={formStyles.desc}>Enter your stock and crypto holdings</Text>

      <View style={formStyles.toggleRow}>
        {(['stock', 'crypto'] as const).map((t) => (
          <Pressable key={t} style={[formStyles.toggle, type === t && formStyles.toggleActive]} onPress={() => setType(t)}>
            <Text style={[formStyles.toggleText, type === t && formStyles.toggleTextActive]}>
              {t === 'stock' ? 'Stock/ETF' : 'Crypto'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type={type}
        placeholder={type === 'stock' ? 'Symbol (e.g. AAPL)' : 'Symbol (e.g. BTC)'}
      />
      <TextInput style={formStyles.input} placeholder="Shares" value={shares} onChangeText={setShares} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Investment</Text>
      </Pressable>

      {items.map((h) => (
        <View key={h.id} style={formStyles.itemRow}>
          <View style={formStyles.itemBadge}>
            <Text style={formStyles.itemBadgeText}>{h.type === 'stock' ? 'S' : 'C'}</Text>
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{h.symbol}</Text>
            <Text style={formStyles.itemSub}>{h.shares} shares</Text>
          </View>
          <Pressable onPress={() => handleRemove(h.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function RSUStep({ items, setItems }: { items: RSUGrant[]; setItems: (r: RSUGrant[]) => void }) {
  const [symbol, setSymbol] = useState('');
  const [total, setTotal] = useState('');
  const [vested, setVested] = useState('0');
  const [duration, setDuration] = useState('48');

  const handleAdd = () => {
    if (!symbol.trim() || !total.trim()) return;
    const t = parseFloat(total);
    const v = parseFloat(vested) || 0;
    if (isNaN(t) || t <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    setItems([...items, {
      id: Crypto.randomUUID(), symbol: symbol.toUpperCase().trim(),
      totalShares: t, alreadyVestedShares: v,
      vest: { startDate: now.toISOString().split('T')[0], cliffMonths: 12, durationMonths: parseInt(duration) || 48, frequency: 'quarterly' },
    }]);
    setSymbol(''); setTotal(''); setVested('0');
  };

  const handleRemove = (id: string) => setItems(items.filter(r => r.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add RSUs</Text>
      <Text style={formStyles.desc}>Enter your RSU grants with vesting details</Text>

      <TickerInput
        value={symbol}
        onChangeText={setSymbol}
        onSelect={setSymbol}
        type="stock"
        placeholder="Ticker (e.g. GOOGL)"
      />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Total shares" value={total} onChangeText={setTotal} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Already vested" value={vested} onChangeText={setVested} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <TextInput style={formStyles.input} placeholder="Duration (months)" value={duration} onChangeText={setDuration} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add RSU Grant</Text>
      </Pressable>

      {items.map((r) => (
        <View key={r.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryRSU + '20' }]}>
            <Text style={[formStyles.itemBadgeText, { color: Colors.categoryRSU }]}>R</Text>
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{r.symbol} RSU</Text>
            <Text style={formStyles.itemSub}>{r.totalShares} total, {r.alreadyVestedShares} vested</Text>
          </View>
          <Pressable onPress={() => handleRemove(r.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CashStep({ type, items, setItems }: { type: 'savings' | 'offset'; items: CashAccount[]; setItems: (c: CashAccount[]) => void }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !balance.trim()) return;
    const b = parseFloat(balance);
    if (isNaN(b)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), type, name: name.trim(), balance: b,
      monthlyContribution: parseFloat(monthly) || 0,
      annualInterestRate: parseFloat(rate) || undefined,
    }]);
    setName(''); setBalance(''); setMonthly(''); setRate('');
  };

  const handleRemove = (id: string) => setItems(items.filter(c => c.id !== id));
  const label = type === 'savings' ? 'Savings Account' : 'Offset Account';

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add {label}s</Text>
      <Text style={formStyles.desc}>Track balances and monthly contributions</Text>

      <TextInput style={formStyles.input} placeholder="Account name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Balance ($)" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Monthly +/-" value={monthly} onChangeText={setMonthly} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <TextInput style={formStyles.input} placeholder="Interest rate (%)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Account</Text>
      </Pressable>

      {items.map((c) => (
        <View key={c.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: (type === 'savings' ? Colors.categorySavings : Colors.categoryOffset) + '20' }]}>
            <Text style={[formStyles.itemBadgeText, { color: type === 'savings' ? Colors.categorySavings : Colors.categoryOffset }]}>$</Text>
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{c.name}</Text>
            <Text style={formStyles.itemSub}>${c.balance.toLocaleString()} + ${c.monthlyContribution}/mo</Text>
          </View>
          <Pressable onPress={() => handleRemove(c.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function MortgageStep({ items, setItems }: { items: Mortgage[]; setItems: (m: Mortgage[]) => void }) {
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !principal.trim() || !rate.trim() || !payment.trim()) return;
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const pm = parseFloat(payment);
    if (isNaN(p) || isNaN(r) || isNaN(pm)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), name: name.trim(),
      principalBalance: p, annualInterestRate: r, monthlyPayment: pm,
    }]);
    setName(''); setPrincipal(''); setRate(''); setPayment('');
  };

  const handleRemove = (id: string) => setItems(items.filter(m => m.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Add Mortgage</Text>
      <Text style={formStyles.desc}>Enter your loan details</Text>

      <TextInput style={formStyles.input} placeholder="Loan name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <TextInput style={formStyles.input} placeholder="Principal balance ($)" value={principal} onChangeText={setPrincipal} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Rate (%)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Monthly payment" value={payment} onChangeText={setPayment} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Mortgage</Text>
      </Pressable>

      {items.map((m) => (
        <View key={m.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryMortgage + '20' }]}>
            <Ionicons name="home" size={14} color={Colors.categoryMortgage} />
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{m.name}</Text>
            <Text style={formStyles.itemSub}>${m.principalBalance.toLocaleString()} @ {m.annualInterestRate}%</Text>
          </View>
          <Pressable onPress={() => handleRemove(m.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function OtherStep({ items, setItems }: { items: OtherAsset[]; setItems: (a: OtherAsset[]) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [growth, setGrowth] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !value.trim()) return;
    const v = parseFloat(value);
    if (isNaN(v)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems([...items, {
      id: Crypto.randomUUID(), name: name.trim(), value: v,
      annualGrowthRate: parseFloat(growth) || undefined,
    }]);
    setName(''); setValue(''); setGrowth('');
  };

  const handleRemove = (id: string) => setItems(items.filter(a => a.id !== id));

  return (
    <View style={formStyles.container}>
      <Text style={formStyles.title}>Other Assets</Text>
      <Text style={formStyles.desc}>Cars, property, collectibles, etc.</Text>

      <TextInput style={formStyles.input} placeholder="Asset name" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />
      <View style={formStyles.inputRow}>
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Value ($)" value={value} onChangeText={setValue} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
        <TextInput style={[formStyles.input, { flex: 1 }]} placeholder="Growth %/yr" value={growth} onChangeText={setGrowth} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
      </View>
      <Pressable style={formStyles.addBtn} onPress={handleAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
        <Text style={formStyles.addBtnText}>Add Asset</Text>
      </Pressable>

      {items.map((a) => (
        <View key={a.id} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: Colors.categoryOther + '20' }]}>
            <Ionicons name="diamond" size={14} color={Colors.categoryOther} />
          </View>
          <View style={formStyles.itemInfo}>
            <Text style={formStyles.itemName}>{a.name}</Text>
            <Text style={formStyles.itemSub}>${a.value.toLocaleString()}{a.annualGrowthRate ? ` (${a.annualGrowthRate}%/yr)` : ''}</Text>
          </View>
          <Pressable onPress={() => handleRemove(a.id)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ReviewStep({ holdings, rsuGrants, cashAccounts, mortgages, otherAssets }: {
  holdings: Holding[]; rsuGrants: RSUGrant[]; cashAccounts: CashAccount[];
  mortgages: Mortgage[]; otherAssets: OtherAsset[];
}) {
  const counts = [
    { label: 'Investments', count: holdings.length, color: Colors.categoryStocks },
    { label: 'RSU Grants', count: rsuGrants.length, color: Colors.categoryRSU },
    { label: 'Cash Accounts', count: cashAccounts.length, color: Colors.categorySavings },
    { label: 'Mortgages', count: mortgages.length, color: Colors.categoryMortgage },
    { label: 'Other Assets', count: otherAssets.length, color: Colors.categoryOther },
  ];

  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <View style={formStyles.container}>
      <View style={[wStyles.iconWrap, { marginTop: spacing.xxl }]}>
        <Ionicons name="checkmark-circle" size={48} color={Colors.positive} />
      </View>
      <Text style={[formStyles.title, { textAlign: 'center' }]}>Ready to Go</Text>
      <Text style={[formStyles.desc, { textAlign: 'center' }]}>
        {total === 0 ? "You can add items later from the Breakdown tab." : `You've added ${total} item${total !== 1 ? 's' : ''}.`}
      </Text>

      {counts.filter(c => c.count > 0).map((c) => (
        <View key={c.label} style={formStyles.itemRow}>
          <View style={[formStyles.itemBadge, { backgroundColor: c.color + '20' }]}>
            <Text style={[formStyles.itemBadgeText, { color: c.color }]}>{c.count}</Text>
          </View>
          <Text style={formStyles.itemName}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const formStyles = StyleSheet.create({
  container: { paddingTop: spacing.xl },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    color: Colors.text,
    marginBottom: spacing.xs,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: 2,
    marginBottom: spacing.lg,
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
  },
  toggleTextActive: {
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  addBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: Colors.primary,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.text,
  },
  itemSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotCurrent: {
    width: 24,
  },
  scrollBody: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  nextBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
  finishBtn: {
    backgroundColor: Colors.positive,
  },
  finishBtnText: {
    color: Colors.white,
  },
});
