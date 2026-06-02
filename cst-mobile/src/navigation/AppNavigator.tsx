import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import OfflineBanner from '../components/OfflineBanner';
import { useColors } from '../constants/colors';

export default function AppNavigator() {
  const Colors = useColors();
  const { user, loading, onboarded, completeOnboarding } = useAuth();

  if (loading || (user && onboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (user && onboarded === false) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <NavigationContainer>
        {!user ? <AuthStack /> : <MainTabs />}
      </NavigationContainer>
    </View>
  );
}
