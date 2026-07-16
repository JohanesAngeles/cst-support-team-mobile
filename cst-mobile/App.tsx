import 'react-native-gesture-handler';
import { initI18n } from './src/i18n';
initI18n(); // synchronous — i18next ready before first render, language updated from AsyncStorage in background
import { configureGoogleSignIn } from './src/utils/googleSignIn';
configureGoogleSignIn();
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  enabled: !__DEV__,
});

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { PostHogProvider } from 'posthog-react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useAppConfig } from './src/hooks/useAppConfig';
import { isVersionAtLeast } from './src/utils/version';
import { useColors } from './src/constants/colors';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import OfflineBanner from './src/components/OfflineBanner';
import BiometricLock from './src/components/BiometricLock';
import AnimatedGradientBackground from './src/components/AnimatedGradientBackground';
import ErrorBoundary from './src/components/ErrorBoundary';
import { addNotification } from './src/utils/notificationHistory';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

// Wrapper that skips PostHog entirely when no key is configured,
// preventing "must pass api key" errors and navigation-hook crashes.
function Analytics({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) return <>{children}</>;
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{ host: 'https://us.i.posthog.com' }}
    >
      {children}
    </PostHogProvider>
  );
}

function Root() {
  const { isDark } = useTheme();
  const Colors = useColors();
  const { user } = useAuth();
  const { config, loading: configLoading } = useAppConfig();
  const [splashDone, setSplashDone] = useState(false);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);

  // Save every received push notification to local history
  useEffect(() => {
    notifListener.current = Notifications.addNotificationReceivedListener(notif => {
      const { title, body, data } = notif.request.content;
      addNotification(
        title ?? 'Road Ready Network',
        body ?? '',
        data as Record<string, unknown> | undefined,
      );
    });
    return () => notifListener.current?.remove();
  }, []);

  // Maintenance mode / force-update are checked above BiometricLock so a
  // gated or banned user never has to clear a biometric prompt to see them.
  if (configLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (config) {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    const minVersion = Platform.OS === 'ios' ? config.minVersion.ios : config.minVersion.android;
    if (!isVersionAtLeast(currentVersion, minVersion)) {
      const storeUrl = Platform.OS === 'ios' ? config.storeUrls.ios : config.storeUrls.android;
      return <ForceUpdateScreen storeUrl={storeUrl} />;
    }
    if (config.maintenanceMode && user?.role !== 'admin') {
      return <MaintenanceScreen message={config.maintenanceMessage} />;
    }
  }

  return (
    <AnimatedGradientBackground>
      <BiometricLock>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <OfflineBanner />
        <AppNavigator />
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      </BiometricLock>
    </AnimatedGradientBackground>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Analytics>
        <GestureHandlerRootView style={s.root}>
          <SafeAreaProvider>
            <ThemeProvider>
              <AuthProvider>
                <Root />
              </AuthProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </Analytics>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);

const s = StyleSheet.create({
  root: { flex: 1 },
});
