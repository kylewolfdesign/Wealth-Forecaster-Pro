import { init, trackEvent } from '@aptabase/react-native';

// Privacy-first, anonymous analytics (Aptabase). No device IDs, no user
// identifiers, and NEVER any portfolio data: amounts, balances, symbols,
// and currencies are forbidden as event props.
//
// All app code must import `track` from this module (not the vendor SDK)
// so the provider stays swappable.

let initialized = false;

export function initAnalytics(): void {
  const key = process.env.EXPO_PUBLIC_APTABASE_KEY;
  if (!key) return;
  try {
    init(key);
    initialized = true;
  } catch (e) {
    console.warn('Analytics init failed:', e);
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
  if (!initialized) return;
  try {
    trackEvent(event, props);
  } catch {
    // Analytics must never break the app.
  }
}
