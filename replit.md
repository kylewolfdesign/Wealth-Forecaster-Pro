# NetWorth - Net Worth & Forecast App

## Overview
A local-first net worth and wealth forecasting app built with React Native (Expo). Users enter assets, liabilities, and investment holdings. The app shows current net worth dashboard, history over time, and forecast projections.

## Tech Stack
- React Native + Expo + TypeScript
- expo-router for file-based navigation
- Zustand + AsyncStorage for state management and persistence
- react-native-svg for charts
- Zod for validation
- Inter font via @expo-google-fonts/inter

## Project Architecture

### Frontend (Expo App - Port 8081)
```
app/
  _layout.tsx            - Root layout with providers, font loading
  (tabs)/
    _layout.tsx          - Tab bar (Home, Breakdown, History, Settings)
    index.tsx            - Home dashboard with net worth, category tiles, forecast chart with time-range tabs (Today, 1Y, 5Y, 10Y, 20Y, 50Y)
    breakdown.tsx        - Category breakdown with drill-down, edit/delete
    forecast.tsx         - (Hidden tab, functionality merged into Home)
    history.tsx          - Net worth history chart and snapshot list
    settings.tsx         - Growth rates, inflation, demo data, pro upgrade CTA
  onboarding.tsx         - Multi-step wizard (investments, RSUs, savings, offset, mortgage, other)
  edit-item.tsx          - FormSheet modal for adding/editing any item type

lib/
  types.ts               - All data model interfaces
  store.ts               - Zustand store with AsyncStorage persistence
  calculations.ts        - computeCurrentTotals, computeForecast, RSU vesting, mortgage amortization
  price-service.ts       - PriceService interface, CoinGecko crypto, mock stocks
  snapshot.ts            - Snapshot creation and daily tracking
  demo-data.ts           - Demo/seed data generator
  format.ts              - Currency, percentage, date formatting
  query-client.ts        - React Query client (for potential future API use)

components/
  AnimatedSplash.tsx      - Animated splash screen (dark bg, SVG chart, text fade-in, 3s display)
  LineChart.tsx           - SVG-based line/area chart
  Card.tsx                - Reusable card component
  ErrorBoundary.tsx       - Error boundary wrapper
  ErrorFallback.tsx       - Error fallback UI

constants/
  colors.ts              - App color palette
  theme.ts               - Spacing, typography, border radius, shadows
```

### Backend (Express - Port 5000)
- Minimal Express server serving landing page and static assets
- No API routes needed for v1 (all data is local)

## Key Data Models
- Holding: stocks/crypto with symbol, shares, optional manual price
- RSUGrant: vesting schedule with cliff, duration, frequency
- CashAccount: savings/offset with balance, monthly contributions, interest rate
- Mortgage: principal, rate, payment, optional annual payment increase (liability, not shown in category grid)
- OtherAsset: name, value, optional growth rate (displayed as "Assets")
- RealEstate: name, currentValue, optional annualGrowthRate
- Settings: growth rate assumptions, inflation, real/nominal toggle
- Snapshot: daily net worth and category totals (includes realEstate field)

## Asset Categories (6 visible)
1. Stocks & ETFs - stock holdings
2. Crypto - crypto holdings
3. RSUs - RSU grants
4. Assets - other assets (cars, art, etc.)
5. Real Estate - property entries
6. Cash / Savings - all cash accounts (savings + offset types merged)

## Extension Points
- **Real stock prices**: Replace mock provider in `lib/price-service.ts` with a real API (Alpha Vantage, Finnhub, etc.)
- **Cloud sync**: Add backend API routes and sync logic
- **IAP/Pro features**: Add RevenueCat, gate features behind `isPro` flag
- **CSV export**: Pro feature, export snapshots/holdings

## Recent Changes
- 2026-03-15: Restructured asset categories from 7 to 6: added Real Estate, merged Offset into Cash / Savings, removed Mortgage from grid, renamed "Stocks/ETFs" to "Stocks & ETFs", renamed "Other" to "Assets"
- 2026-02-25: Animated splash screen from Figma design — dark navy bg (#0F172A), SVG chart with purple gradient animates upward, "Wealth Forecaster" text fades in, displays for 3000ms then fades out
- 2026-02-20: Merged Forecast tab into Home screen with time-range chart tabs (Today, 1Y, 5Y, 10Y, 20Y, 50Y). Removed Forecast from bottom tab bar.
- 2026-02-20: Paychain design system overhaul (indigo primary, bordered cards, Inter font)
- 2026-02-20: Initial v1 build with all core features
