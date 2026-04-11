import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import Constants from 'expo-constants';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { AuthProvider } from '@/lib/auth-context';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/lib/store';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

function getRevenueCatKey(): string {
  const publicKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (publicKey) return publicKey;

  const envKey = process.env.REVENUECAT_API_KEY;
  if (envKey) return envKey;

  const extra = Constants.expoConfig?.extra;
  if (extra?.revenueCatApiKey) return extra.revenueCatApiKey;

  return '';
}

function useRevenueCat() {
  const setIsPro = useAppStore((s) => s.setIsPro);

  useEffect(() => {
    const apiKey = getRevenueCatKey();
    if (!apiKey) {
      console.warn('RevenueCat API key not found. Ensure EXPO_PUBLIC_REVENUECAT_API_KEY is set in the build environment.');
      return;
    }

    try {
      Purchases.configure({ apiKey });

      const listener = (info: CustomerInfo) => {
        const hasPro = !!info.entitlements.active['pro'];
        setIsPro(hasPro);
      };

      Purchases.addCustomerInfoUpdateListener(listener);

      Purchases.getCustomerInfo().then((info) => {
        const hasPro = !!info.entitlements.active['pro'];
        setIsPro(hasPro);
      }).catch(() => {});

      return () => {
        Purchases.removeCustomerInfoUpdateListener(listener);
      };
    } catch (e) {
      console.log('RevenueCat init error (expected in Expo Go):', e);
    }
  }, []);
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="edit-item"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useRevenueCat();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
            {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
