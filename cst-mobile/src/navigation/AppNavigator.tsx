import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import OfflineBanner from '../components/OfflineBanner';
import { Colors } from '../constants/colors';

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setOnboarded(null); return; }
    AsyncStorage.getItem('@cst_onboarded').then(v => setOnboarded(v === 'true'));
  }, [user]);

  const handleOnboardingComplete = () => setOnboarded(true);

  if (loading || (user && onboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (user && onboarded === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
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
