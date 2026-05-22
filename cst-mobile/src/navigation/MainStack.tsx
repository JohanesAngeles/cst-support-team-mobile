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
import DocumentVaultScreen from '../screens/features/DocumentVaultScreen';
import DriverProtectionScreen from '../screens/features/DriverProtectionScreen';
import CorpStartupsScreen from '../screens/features/CorpStartupsScreen';
import RateToolsScreen from '../screens/features/RateToolsScreen';
import TicketDisputeScreen from '../screens/features/TicketDisputeScreen';
import SmartFormsScreen from '../screens/features/SmartFormsScreen';
import HOSTrackerScreen from '../screens/features/HOSTrackerScreen';
import DetentionTrackerScreen from '../screens/features/DetentionTrackerScreen';

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
  DocumentVault: undefined;
  DriverProtection: undefined;
  CorpStartups: undefined;
  RateTools: undefined;
  TicketDispute: undefined;
  SmartForms: undefined;
  HOSTracker: undefined;
  DetentionTracker: undefined;
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
      <Stack.Screen name="DocumentVault" component={DocumentVaultScreen} options={{ title: 'Document Vault' }} />
      <Stack.Screen name="DriverProtection" component={DriverProtectionScreen} options={{ title: 'Driver Protection' }} />
      <Stack.Screen name="CorpStartups" component={CorpStartupsScreen} options={{ title: 'Corp Startups' }} />
      <Stack.Screen name="RateTools" component={RateToolsScreen} options={{ title: 'Rate Tools' }} />
      <Stack.Screen name="TicketDispute" component={TicketDisputeScreen} options={{ title: 'Ticket Dispute' }} />
      <Stack.Screen name="SmartForms" component={SmartFormsScreen} options={{ title: 'Smart Forms' }} />
      <Stack.Screen name="HOSTracker" component={HOSTrackerScreen} options={{ title: 'HOS Tracker' }} />
      <Stack.Screen name="DetentionTracker" component={DetentionTrackerScreen} options={{ title: 'Detention Tracker' }} />
    </Stack.Navigator>
  );
}
