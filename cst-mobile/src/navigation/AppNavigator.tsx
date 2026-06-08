import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
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
    <NavigationContainer>
      {!user ? <AuthStack /> : <MainStack />}
    </NavigationContainer>
  );
}
