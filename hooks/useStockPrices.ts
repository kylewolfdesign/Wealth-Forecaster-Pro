import { useQuery } from '@tanstack/react-query';
import { fetchMultipleStockPrices, fetchMultiplePrices } from '@/lib/price-service';

export function useStockPrices(symbols: string[], typedSymbols?: { symbol: string; type: 'stock' | 'crypto' }[]) {
  const sortedKey = [...new Set(symbols.map(s => s.toUpperCase()))].sort().join(',');
  const typedKey = typedSymbols
    ? [...typedSymbols].map(s => `${s.symbol.toUpperCase()}:${s.type}`).sort().join(',')
    : '';
  const queryKey = typedKey ? ['market-prices', typedKey] : ['stock-prices', sortedKey];

  const { data: prices = {}, isLoading, refetch } = useQuery<Record<string, number>>({
    queryKey,
    queryFn: () => typedSymbols ? fetchMultiplePrices(typedSymbols) : fetchMultipleStockPrices(symbols),
    enabled: symbols.length > 0 || (typedSymbols?.length ?? 0) > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { prices, isLoading, refetch };
}
