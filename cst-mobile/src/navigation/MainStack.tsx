import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
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
import TripLogScreen from '../screens/features/TripLogScreen';
import FuelLogScreen from '../screens/features/FuelLogScreen';
import AxleWeightScreen from '../screens/features/AxleWeightScreen';
import BrokerNotesScreen from '../screens/features/BrokerNotesScreen';
import ExpensesScreen from '../screens/features/ExpensesScreen';
import IFTATrackerScreen from '../screens/features/IFTATrackerScreen';
import TruckProfileScreen from '../screens/features/TruckProfileScreen';
import EmergencyContactsScreen from '../screens/features/EmergencyContactsScreen';
import FindHelpScreen from '../screens/features/FindHelpScreen';
import SubscriptionScreen from '../screens/features/SubscriptionScreen';
import TruckerMapScreen from '../screens/features/TruckerMapScreen';
import LoadBoardScreen from '../screens/features/LoadBoardScreen';
import DispatchContactsScreen from '../screens/features/DispatchContactsScreen';
import FuelFinderScreen from '../screens/features/FuelFinderScreen';
import DocGeneratorScreen from '../screens/features/DocGeneratorScreen';
import WeatherScreen from '../screens/features/WeatherScreen';
import MileageCalculatorScreen from '../screens/features/MileageCalculatorScreen';
import WeighStationScreen from '../screens/features/WeighStationScreen';
import ELDStatusScreen from '../screens/features/ELDStatusScreen';
import ScorecardScreen from '../screens/features/ScorecardScreen';
import GamesScreen from '../screens/features/GamesScreen';
import TruckerCrosswordScreen from '../screens/features/TruckerCrosswordScreen';
import TruckingTriviaScreen from '../screens/features/TruckingTriviaScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';

export type MainStackParamList = {
  Dashboard: undefined;
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
  TripLog: undefined;
  FuelLog: undefined;
  AxleWeight: undefined;
  BrokerNotes: undefined;
  Expenses: undefined;
  IFTATracker: undefined;
  TruckProfile: undefined;
  EmergencyContacts: undefined;
  FindHelp: undefined;
  Subscription: undefined;
  TruckerMap: undefined;
  LoadBoard: undefined;
  DispatchContacts: undefined;
  FuelFinder: undefined;
  DocGenerator: undefined;
  Weather: undefined;
  MileageCalculator: undefined;
  WeighStation: undefined;
  ELDStatus: undefined;
  Scorecard: undefined;
  Games: undefined;
  TruckerCrossword: undefined;
  TruckingTrivia: undefined;
  Terms: undefined;
  Privacy: undefined;
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
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="TripLog" component={TripLogScreen} options={{ title: 'Trip Log' }} />
      <Stack.Screen name="FuelLog" component={FuelLogScreen} options={{ title: 'Fuel Log' }} />
      <Stack.Screen name="AxleWeight" component={AxleWeightScreen} options={{ title: 'Axle Weight Calculator' }} />
      <Stack.Screen name="BrokerNotes" component={BrokerNotesScreen} options={{ title: 'Broker Notes' }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses Tracker' }} />
      <Stack.Screen name="IFTATracker" component={IFTATrackerScreen} options={{ title: 'IFTA Tracker' }} />
      <Stack.Screen name="TruckProfile" component={TruckProfileScreen} options={{ title: 'My Truck' }} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} options={{ title: 'Emergency Contacts', headerStyle: { backgroundColor: Colors.danger } }} />
      <Stack.Screen name="FindHelp" component={FindHelpScreen} options={{ title: 'Find Help Near Me' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'CST Subscription' }} />
      <Stack.Screen name="TruckerMap" component={TruckerMapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LoadBoard" component={LoadBoardScreen} options={{ title: 'Load Board' }} />
      <Stack.Screen name="DispatchContacts" component={DispatchContactsScreen} options={{ title: 'Dispatch Contacts' }} />
      <Stack.Screen name="FuelFinder" component={FuelFinderScreen} options={{ title: 'Fuel Finder' }} />
      <Stack.Screen name="DocGenerator" component={DocGeneratorScreen} options={{ title: 'Doc Generator' }} />
      <Stack.Screen name="Weather" component={WeatherScreen} options={{ title: 'Route Weather' }} />
      <Stack.Screen name="MileageCalculator" component={MileageCalculatorScreen} options={{ title: 'Mileage Calculator' }} />
      <Stack.Screen name="WeighStation" component={WeighStationScreen} options={{ title: 'Weigh Stations' }} />
      <Stack.Screen name="ELDStatus" component={ELDStatusScreen} options={{ title: 'ELD Status' }} />
      <Stack.Screen name="Scorecard" component={ScorecardScreen} options={{ title: 'Driver Scorecard' }} />
      <Stack.Screen name="Games" component={GamesScreen} options={{ title: 'Driver Games' }} />
      <Stack.Screen name="TruckerCrossword" component={TruckerCrosswordScreen} options={{ title: 'Trucker Crossword' }} />
      <Stack.Screen name="TruckingTrivia" component={TruckingTriviaScreen} options={{ title: 'Trucking Trivia' }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
    </Stack.Navigator>
  );
}
