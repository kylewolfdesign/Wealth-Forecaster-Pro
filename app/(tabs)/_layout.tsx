import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Pressable, Text } from 'react-native';
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { loadPortfolioFromServer, hydrateStoreFromServer } from '@/lib/portfolio-sync';
import LoginModal from '@/components/LoginModal';
import Colors from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/theme';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} />
        <Label>Portfolio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="forecast">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Forecast</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function LoginButton() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginSuccess = async () => {
    setShowLogin(false);
    try {
      const data = await loadPortfolioFromServer();
      if (data) {
        hydrateStoreFromServer(data);
      }
    } catch (err) {
      console.warn('Failed to load portfolio after login:', err);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <>
      <Pressable
        style={loginStyles.button}
        onPress={() => setShowLogin(true)}
        testID="login-button"
      >
        <Ionicons name="log-in-outline" size={16} color={Colors.primary} />
        <Text style={loginStyles.text}>Log In</Text>
      </Pressable>
      <LoginModal
        visible={showLogin}
        onDismiss={() => setShowLogin(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}

const loginStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: Colors.primary,
  },
});

function ClassicTabLayout() {
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} color={focused ? Colors.primary : Colors.textTertiary} />
          ),
        }}
      />
      <Tabs.Screen
        name="breakdown"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: 'Forecast',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={focused ? Colors.primary : Colors.textTertiary} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={focused ? Colors.primary : Colors.textTertiary} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={{ flex: 1 }}>
      <View style={[floatStyles.loginContainer, { top: isWeb ? 20 : 54 }]}>
        <LoginButton />
      </View>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
    </View>
  );
}

const floatStyles = StyleSheet.create({
  loginContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
});
