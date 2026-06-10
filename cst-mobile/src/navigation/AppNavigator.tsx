import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { useColors } from '../constants/colors';

const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export default function AppNavigator() {
  const Colors = useColors();
  const { user, loading, onboarded, completeOnboarding } = useAuth();

  if (loading || (user && onboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (user && onboarded === false) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      {!user ? <AuthStack /> : <MainStack />}
    </NavigationContainer>
  );
}
