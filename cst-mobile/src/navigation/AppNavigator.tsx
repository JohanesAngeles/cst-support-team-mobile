import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import PartnerStack from './PartnerStack';
import AdminStack from './AdminStack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { useColors } from '../constants/colors';

const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export default function AppNavigator() {
  const Colors = useColors();
  const { user, loading, onboarded, completeOnboarding } = useAuth();

  // Show spinner while loading session or waiting for onboarding flag (drivers only)
  if (loading || (user && user.role !== 'partner' && user.role !== 'admin' && onboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  // Partners skip onboarding — go straight to their own stack
  if (user && user.role === 'partner') {
    return (
      <NavigationContainer theme={NAV_THEME}>
        <PartnerStack />
      </NavigationContainer>
    );
  }

  // Admin gets the admin panel
  if (user && user.role === 'admin') {
    return (
      <NavigationContainer theme={NAV_THEME}>
        <AdminStack />
      </NavigationContainer>
    );
  }

  // New driver — show onboarding before entering the app
  if (user && onboarded === false) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      {!user ? <AuthStack /> : <MainStack />}
    </NavigationContainer>
  );
}
