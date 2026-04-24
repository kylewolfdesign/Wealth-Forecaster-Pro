import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';

export async function presentAppleCodeRedemption(): Promise<void> {
  if (Platform.OS !== 'ios') {
    Alert.alert(
      'Not Available',
      'Promo code redemption is only available on iOS via the App Store.'
    );
    return;
  }
  try {
    await Purchases.presentCodeRedemptionSheet();
  } catch (e) {
    Alert.alert(
      'Redeem Code',
      'Could not open the redemption sheet. Please try again.'
    );
  }
}

export const isAppleCodeRedemptionAvailable = (): boolean => Platform.OS === 'ios';
