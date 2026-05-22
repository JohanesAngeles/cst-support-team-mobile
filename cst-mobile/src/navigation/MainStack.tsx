import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import MainTabs from './MainTabs';
import TaxCalculatorScreen from '../screens/features/TaxCalculatorScreen';
import AILegalScreen from '../screens/features/AILegalScreen';
import CalendarScreen from '../screens/features/CalendarScreen';
import EmergencySOSScreen from '../screens/features/EmergencySOSScreen';
import MaintenanceScreen from '../screens/features/MaintenanceScreen';
import ProfitLossScreen from '../screens/features/ProfitLossScreen';
import StateLawScreen from '../screens/features/StateLawScreen';
import StateLawDetailScreen from '../screens/features/StateLawDetailScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  TaxCalculator: undefined;
  AILegal: undefined;
  Calendar: undefined;
  EmergencySOS: undefined;
  Maintenance: undefined;
  ProfitLoss: undefined;
  StateLaw: undefined;
  StateLawDetail: { abbr: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TaxCalculator" component={TaxCalculatorScreen} options={{ title: 'Tax Calculator' }} />
      <Stack.Screen name="AILegal" component={AILegalScreen} options={{ title: 'AI Legal Assistant' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Driver Calendar' }} />
      <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} options={{ title: 'Emergency Response', headerStyle: { backgroundColor: Colors.danger } }} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Maintenance Tracker' }} />
      <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} options={{ title: 'Profit & Loss' }} />
      <Stack.Screen name="StateLaw" component={StateLawScreen} options={{ title: 'State Law Reference' }} />
      <Stack.Screen name="StateLawDetail" component={StateLawDetailScreen} options={({ route }) => ({ title: route.params.abbr })} />
    </Stack.Navigator>
  );
}
