import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  enabled: !__DEV__,
});

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { PostHogProvider } from 'posthog-react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import OfflineBanner from './src/components/OfflineBanner';
import BiometricLock from './src/components/BiometricLock';
import { addNotification } from './src/utils/notificationHistory';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

function Root() {
  const { isDark } = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);

  // Save every received push notification to local history
  useEffect(() => {
    notifListener.current = Notifications.addNotificationReceivedListener(notif => {
      const { title, body, data } = notif.request.content;
      addNotification(
        title ?? 'CST Alert',
        body ?? '',
        data as Record<string, unknown> | undefined,
      );
    });
    return () => notifListener.current?.remove();
  }, []);

  return (
    <BiometricLock>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <AppNavigator />
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </BiometricLock>
  );
}

function App() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{ host: 'https://us.i.posthog.com', disabled: !POSTHOG_KEY }}
    >
      <GestureHandlerRootView style={s.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <Root />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}

export default Sentry.wrap(App);

const s = StyleSheet.create({
  root: { flex: 1 },
});
