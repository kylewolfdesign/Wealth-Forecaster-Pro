import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

const STOCK_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (C)' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'BAC', name: 'Bank of America' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.' },
  { symbol: 'KO', name: 'Coca-Cola Co.' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'TMO', name: 'Thermo Fisher' },
  { symbol: 'MRK', name: 'Merck & Co.' },
  { symbol: 'ACN', name: 'Accenture plc' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corp.' },
  { symbol: 'CSCO', name: 'Cisco Systems' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corp.' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'T', name: 'AT&T Inc.' },
  { symbol: 'VZ', name: 'Verizon Communications' },
  { symbol: 'PYPL', name: 'PayPal Holdings' },
  { symbol: 'SQ', name: 'Block Inc.' },
  { symbol: 'SHOP', name: 'Shopify Inc.' },
  { symbol: 'UBER', name: 'Uber Technologies' },
  { symbol: 'ABNB', name: 'Airbnb Inc.' },
  { symbol: 'SNAP', name: 'Snap Inc.' },
  { symbol: 'COIN', name: 'Coinbase Global' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
  { symbol: 'RBLX', name: 'Roblox Corp.' },
  { symbol: 'SPOT', name: 'Spotify Technology' },
  { symbol: 'ZM', name: 'Zoom Video' },
  { symbol: 'SNOW', name: 'Snowflake Inc.' },
  { symbol: 'NET', name: 'Cloudflare Inc.' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings' },
  { symbol: 'DDOG', name: 'Datadog Inc.' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'VTI', name: 'Total Stock Market ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'VGT', name: 'Vanguard Info Tech ETF' },
  { symbol: 'VUG', name: 'Vanguard Growth ETF' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF' },
  { symbol: 'IVV', name: 'iShares Core S&P 500' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging' },
  { symbol: 'SCHD', name: 'Schwab US Dividend' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway B' },
];

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
  bg: '#1E293B',
  border: '#334155',
  focusBorder: '#6B39F4',
  text: '#F8F9FD',
  muted: '#64748B',
  dropdownBg: '#1E293B',
};

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

  const tickers = useMemo(() => {
    if (type === 'stock') return STOCK_TICKERS;
    if (type === 'crypto') return CRYPTO_TICKERS;
    return [...STOCK_TICKERS, ...CRYPTO_TICKERS];
  }, [type]);

  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 1) return [];
    const query = value.toUpperCase().trim();
    return tickers
      .filter(
        (t) =>
          t.symbol.toUpperCase().startsWith(query) ||
          t.name.toUpperCase().includes(query)
      )
      .slice(0, 6);
  }, [value, tickers]);

  const showSuggestions = isFocused && suggestions.length > 0;

  const handleSelect = (symbol: string) => {
    onChangeText(symbol);
    onSelect?.(symbol);
    setIsFocused(false);
  };

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
        />
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
                <Text style={[styles.suggestionSymbol, darkText]}>{item.symbol}</Text>
                <Text style={[styles.suggestionName, darkMode && { color: DARK.muted }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={darkMode ? DARK.muted : Colors.textTertiary} />
            </Pressable>
          ))}
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
    outlineStyle: 'none' as any,
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
});
