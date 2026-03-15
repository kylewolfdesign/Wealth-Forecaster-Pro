import { useQuery } from '@tanstack/react-query';
import { fetchMultipleStockPrices } from '@/lib/price-service';

export function useStockPrices(symbols: string[]) {
  const sortedKey = [...new Set(symbols.map(s => s.toUpperCase()))].sort().join(',');

  const { data: prices = {}, isLoading } = useQuery<Record<string, number>>({
    queryKey: ['stock-prices', sortedKey],
    queryFn: () => fetchMultipleStockPrices(symbols),
    enabled: symbols.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { prices, isLoading };
}
