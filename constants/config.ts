export const PRIVACY_POLICY_URL = 'https://wealthforecaster.app/privacy';

export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * Backend host (no protocol) compiled into the binary as a last resort.
 *
 * `EXPO_PUBLIC_DOMAIN` is the source of truth and is inlined at build time from
 * the EAS environment. v1.0.5 shipped with that variable unset, which broke
 * login, stock prices and portfolio sync for every customer — this constant
 * exists so a missing build variable can never take the app down again.
 *
 * Keep it pointed at the production API deployment.
 */
export const DEFAULT_API_HOST = 'wealth-forcaster-pro.replit.app';
