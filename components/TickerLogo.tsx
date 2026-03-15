import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants/theme';

const CRYPTO_LOGO_MAP: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  APT: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  SUI: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  FIL: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  MKR: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  GRT: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
  IMX: 'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
  INJ: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  RENDER: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  FET: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
};

const FALLBACK_COLORS = [
  '#6172F3', '#F79009', '#7A5AF8', '#12B76A', '#36BFFA',
  '#EE46BC', '#F04438', '#4A5AD8', '#FDE272', '#667085',
];

function getColorForSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

interface TickerLogoProps {
  symbol: string;
  type: 'stock' | 'crypto';
  size?: number;
}

export default function TickerLogo({ symbol, type, size = 28 }: TickerLogoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [symbol, type]);

  const logoUrl = type === 'crypto'
    ? CRYPTO_LOGO_MAP[symbol.toUpperCase()]
    : `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`;

  if (hasError || (type === 'crypto' && !CRYPTO_LOGO_MAP[symbol.toUpperCase()])) {
    const color = getColorForSymbol(symbol);
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '20' }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.45, color }]}>
          {symbol.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: logoUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setHasError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: fontFamily.bold,
  },
});
