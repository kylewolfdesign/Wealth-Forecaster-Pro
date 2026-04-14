import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import TickerLogo from '@/components/TickerLogo';
import { getApiUrl } from '@/lib/query-client';
import { US_TICKERS } from '@/data/tickers';

const CRYPTO_TICKERS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'BNB', name: 'Binance Coin' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'APT', name: 'Aptos' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'SUI', name: 'Sui' },
  { symbol: 'FIL', name: 'Filecoin' },
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'MKR', name: 'Maker' },
  { symbol: 'GRT', name: 'The Graph' },
  { symbol: 'IMX', name: 'Immutable X' },
  { symbol: 'INJ', name: 'Injective' },
  { symbol: 'RENDER', name: 'Render Token' },
  { symbol: 'FET', name: 'Fetch.ai' },
  { symbol: 'PEPE', name: 'Pepe' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'TRX', name: 'TRON' },
];

interface TickerResult {
  symbol: string;
  name: string;
}

interface TickerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (symbol: string) => void;
  type?: 'stock' | 'crypto' | 'all';
  placeholder?: string;
  style?: any;
  darkMode?: boolean;
}

const DARK = {
  bg: Colors.surfaceFlat,
  border: Colors.border,
  focusBorder: Colors.primary,
  text: '#F8F9FD',
  muted: '#64748B',
  dropdownBg: Colors.surfaceFlat,
};

function filterLocalTickers(query: string): TickerResult[] {
  if (!query) return [];
  const upper = query.toUpperCase().trim();
  if (!upper) return [];

  const prefixMatches: TickerResult[] = [];
  const nameMatches: TickerResult[] = [];

  for (const t of US_TICKERS) {
    if (t.symbol.startsWith(upper)) {
      prefixMatches.push(t);
    } else if (t.name.toUpperCase().includes(upper)) {
      nameMatches.push(t);
    }
  }

  return [...prefixMatches, ...nameMatches].slice(0, 8);
}

function useDebouncedStockSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const baseUrl = getApiUrl();
        const url = new URL('/api/search/stocks', baseUrl);
        url.searchParams.set('q', query.trim());

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          setResults([]);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResults(data.results || []);
          setIsLoading(false);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setResults([]);
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, enabled]);

  return { results, isLoading };
}

export default function TickerInput({
  value,
  onChangeText,
  onSelect,
  type = 'all',
  placeholder = 'Symbol (e.g. AAPL)',
  style,
  darkMode = false,
}: TickerInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const needsStockSearch = type === 'stock' || type === 'all';
  const { results: yahooResults, isLoading: yahooLoading } = useDebouncedStockSearch(
    value,
    needsStockSearch && isFocused && value.trim().length >= 2
  );

  const localStockResults = useMemo(() => {
    if (type === 'crypto') return [];
    if (!value.trim() || value.length < 1) return [];
    return filterLocalTickers(value.trim());
  }, [value, type]);

  const cryptoSuggestions = useMemo(() => {
    if (type === 'stock') return [];
    if (!value.trim() || value.length < 1) return [];
    const query = value.toUpperCase().trim();
    return CRYPTO_TICKERS.filter(
      (t) =>
        t.symbol.toUpperCase().startsWith(query) ||
        t.name.toUpperCase().includes(query)
    ).slice(0, 6);
  }, [value, type]);

  const stockSuggestions = useMemo(() => {
    if (type === 'crypto') return [];
    const seenSymbols = new Set<string>();
    const merged: TickerResult[] = [];

    for (const item of localStockResults) {
      if (!seenSymbols.has(item.symbol)) {
        seenSymbols.add(item.symbol);
        merged.push(item);
      }
    }

    for (const item of yahooResults) {
      if (!seenSymbols.has(item.symbol)) {
        seenSymbols.add(item.symbol);
        merged.push(item);
      }
    }

    return merged.slice(0, 8);
  }, [type, localStockResults, yahooResults]);

  const suggestions = useMemo(() => {
    if (type === 'crypto') return cryptoSuggestions;
    if (type === 'stock') return stockSuggestions;
    const combined = [...stockSuggestions];
    for (const c of cryptoSuggestions) {
      if (!combined.some(s => s.symbol === c.symbol)) {
        combined.push(c);
      }
    }
    return combined.slice(0, 8);
  }, [type, stockSuggestions, cryptoSuggestions]);

  const isLoading = needsStockSearch && yahooLoading && value.trim().length >= 2 && localStockResults.length === 0;
  const showSuggestions = isFocused && (suggestions.length > 0 || isLoading);
  const showEmpty = isFocused && !isLoading && value.trim().length >= 1 && suggestions.length === 0;

  const handleSelect = (symbol: string) => {
    onChangeText(symbol);
    onSelect?.(symbol);
    setIsFocused(false);
  };

  const isCrypto = (symbol: string) => CRYPTO_TICKERS.some(c => c.symbol === symbol);

  const darkInput = darkMode ? { backgroundColor: DARK.bg, borderColor: isFocused ? DARK.focusBorder : DARK.border } : {};
  const darkText = darkMode ? { color: DARK.text } : {};
  const darkDropdown = darkMode ? { backgroundColor: DARK.dropdownBg, borderColor: DARK.border } : {};
  const darkSuggBorder = darkMode ? { borderBottomColor: DARK.border } : {};

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.inputContainer, isFocused && !darkMode && styles.inputFocused, darkInput]}>
        <Ionicons name="search" size={16} color={darkMode ? DARK.muted : Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, darkText]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          placeholderTextColor={darkMode ? DARK.muted : Colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />
        {isLoading && (
          <ActivityIndicator size="small" color={darkMode ? DARK.muted : Colors.textTertiary} style={{ marginRight: 6 }} />
        )}
        {!!value && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={darkMode ? DARK.muted : Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {showSuggestions && (
        <View style={[styles.dropdown, darkDropdown]}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.symbol}
              style={[
                styles.suggestion,
                index < suggestions.length - 1 && styles.suggestionBorder,
                index < suggestions.length - 1 && darkSuggBorder,
              ]}
              onPress={() => handleSelect(item.symbol)}
            >
              <View style={styles.suggestionLeft}>
                <TickerLogo
                  symbol={item.symbol}
                  type={isCrypto(item.symbol) ? 'crypto' : 'stock'}
                  size={28}
                />
                <Text style={[styles.suggestionSymbol, darkText]}>{item.symbol}</Text>
                <Text style={[styles.suggestionName, darkMode && { color: DARK.muted }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={darkMode ? DARK.muted : Colors.textTertiary} />
            </Pressable>
          ))}
          {isLoading && suggestions.length === 0 && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={darkMode ? DARK.muted : Colors.textTertiary} />
              <Text style={[styles.emptyText, darkMode && { color: DARK.muted }]}>Searching...</Text>
            </View>
          )}
        </View>
      )}

      {showEmpty && (
        <View style={[styles.dropdown, darkDropdown]}>
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, darkMode && { color: DARK.muted }]}>No results found</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 100,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: Colors.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  suggestionSymbol: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: Colors.text,
    minWidth: 52,
  },
  suggestionName: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
  },
});
