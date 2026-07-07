import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColors } from '../constants/colors';
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
import DVIRScreen from '../screens/features/DVIRScreen';
import InvoiceScreen from '../screens/features/InvoiceScreen';
import DrugTestScreen from '../screens/features/DrugTestScreen';
import DriverChatScreen from '../screens/features/DriverChatScreen';
import BrokerBlacklistScreen from '../screens/features/BrokerBlacklistScreen';
import OwnerNetworkScreen from '../screens/features/OwnerNetworkScreen';
import ParkingTrackerScreen from '../screens/features/ParkingTrackerScreen';
import SleepLogScreen from '../screens/features/SleepLogScreen';
import ShipperDirectoryScreen from '../screens/features/ShipperDirectoryScreen';
import ReferralScreen from '../screens/features/ReferralScreen';
import HOSAlertsScreen from '../screens/features/HOSAlertsScreen';
import PremiumGateScreen from '../screens/features/PremiumGateScreen';
import RoadReadyScreen from '../screens/features/RoadReadyScreen';
import StudentDriverScreen from '../screens/features/StudentDriverScreen';
import CDLChallengeScreen from '../screens/features/CDLChallengeScreen';
import FreightCareerScreen from '../screens/features/FreightCareerScreen';
import OOSimScreen from '../screens/features/OOSimScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import DeveloperScreen from '../screens/legal/DeveloperScreen';
import CDLTrackerScreen from '../screens/features/CDLTrackerScreen';
import LoadCompareScreen from '../screens/features/LoadCompareScreen';
import PerDiemScreen from '../screens/features/PerDiemScreen';
import CargoClaimScreen from '../screens/features/CargoClaimScreen';
import BillOfLadingScreen from '../screens/features/BillOfLadingScreen';
import NotificationsScreen from '../screens/features/NotificationsScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import TranslatorScreen from '../screens/features/TranslatorScreen';
import AILoadRateScreen from '../screens/features/AILoadRateScreen';
import RateBenchmarkScreen from '../screens/features/RateBenchmarkScreen';
import HOSCountdownScreen from '../screens/features/HOSCountdownScreen';
import PaymentTrackerScreen from '../screens/features/PaymentTrackerScreen';
import QuarterlyTaxScreen from '../screens/features/QuarterlyTaxScreen';
import FuelMapScreen from '../screens/features/FuelMapScreen';
import TripPlannerScreen from '../screens/features/TripPlannerScreen';
import SponsorsScreen from '../screens/features/SponsorsScreen';
import TripProfitScreen from '../screens/features/TripProfitScreen';
import FleetOwnerScreen from '../screens/features/FleetOwnerScreen';
import TRACCommunityScreen from '../screens/features/TRACCommunityScreen';
import AmericasTopTruckerScreen from '../screens/features/AmericasTopTruckerScreen';

export type MainStackParamList = {
  Home: undefined;
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
  Developer: undefined;
  DVIR: undefined;
  Invoice: undefined;
  DrugTest: undefined;
  DriverChat: undefined;
  BrokerBlacklist: undefined;
  OwnerNetwork: undefined;
  ParkingTracker: undefined;
  SleepLog: undefined;
  ShipperDirectory: undefined;
  Referral: undefined;
  HOSAlerts: undefined;
  PremiumGate: undefined;
  RoadReady: undefined;
  StudentDriver: undefined;
  CDLChallenge: undefined;
  FreightCareer: undefined;
  OOSim: undefined;
  CDLTracker: undefined;
  LoadCompare: undefined;
  PerDiem: undefined;
  CargoClaim: undefined;
  BillOfLading: undefined;
  Notifications: undefined;
  VerifyEmail: undefined;
  LanguageSelection: undefined;
  Translator: undefined;
  AILoadRate: undefined;
  RateBenchmark: undefined;
  HOSCountdown: undefined;
  PaymentTracker: undefined;
  QuarterlyTax: undefined;
  FuelMap: undefined;
  TripPlanner: undefined;
  Sponsors: undefined;
  TripProfit: undefined;
  FleetOwner: undefined;
  TRACCommunity: undefined;
  AmericasTopTrucker: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  const Colors = useColors();
  const headerBg = Colors.dark
    ? 'rgba(8,12,24,0.88)'
    : 'rgba(245,247,255,0.88)';
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: headerBg },
        headerShadowVisible: false,
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: Colors.text },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TaxCalculator" component={TaxCalculatorScreen} options={{ title: 'Tax Calculator' }} />
      <Stack.Screen name="AILegal" component={AILegalScreen} options={{ title: 'AI Legal Assistant' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Driver Calendar' }} />
      <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} options={{ title: 'Emergency Response', headerStyle: { backgroundColor: Colors.danger }, contentStyle: { backgroundColor: Colors.danger } }} />
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
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} options={{ title: 'Emergency Contacts', headerStyle: { backgroundColor: Colors.danger }, contentStyle: { backgroundColor: Colors.danger } }} />
      <Stack.Screen name="FindHelp" component={FindHelpScreen} options={{ title: 'Find Help Near Me' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Road Ready Subscription' }} />
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
      <Stack.Screen name="Developer" component={DeveloperScreen} options={{ title: 'Meet the Developer' }} />
      <Stack.Screen name="DVIR" component={DVIRScreen} options={{ title: 'DVIR Inspection' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice Generator' }} />
      <Stack.Screen name="DrugTest" component={DrugTestScreen} options={{ title: 'Drug & Alcohol Log' }} />
      <Stack.Screen name="DriverChat" component={DriverChatScreen} options={{ title: 'Driver Chat' }} />
      <Stack.Screen name="BrokerBlacklist" component={BrokerBlacklistScreen} options={{ title: 'Broker Blacklist' }} />
      <Stack.Screen name="OwnerNetwork" component={OwnerNetworkScreen} options={{ title: 'O/O Network' }} />
      <Stack.Screen name="ParkingTracker" component={ParkingTrackerScreen} options={{ title: 'Parking Tracker' }} />
      <Stack.Screen name="SleepLog" component={SleepLogScreen} options={{ title: 'Sleep & Fatigue Log' }} />
      <Stack.Screen name="ShipperDirectory" component={ShipperDirectoryScreen} options={{ title: 'Shipper Directory' }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Referral Program' }} />
      <Stack.Screen name="HOSAlerts" component={HOSAlertsScreen} options={{ title: 'HOS Alerts' }} />
      <Stack.Screen name="PremiumGate" component={PremiumGateScreen} options={{ title: 'Road Ready Pro' }} />
      <Stack.Screen name="RoadReady" component={RoadReadyScreen} options={{ title: "Road Ready Score" }} />
      <Stack.Screen name="StudentDriver" component={StudentDriverScreen} options={{ title: 'Student Driver' }} />
      <Stack.Screen name="CDLChallenge" component={CDLChallengeScreen} options={{ title: 'CDL Skill Challenge' }} />
      <Stack.Screen name="FreightCareer" component={FreightCareerScreen} options={{ title: 'Freight Career' }} />
      <Stack.Screen name="OOSim" component={OOSimScreen} options={{ title: 'Owner-Operator Sim' }} />
      <Stack.Screen name="CDLTracker" component={CDLTrackerScreen} options={{ title: 'CDL & License Tracker' }} />
      <Stack.Screen name="LoadCompare" component={LoadCompareScreen} options={{ title: 'Load Quick Compare' }} />
      <Stack.Screen name="PerDiem" component={PerDiemScreen} options={{ title: 'Per Diem Calculator' }} />
      <Stack.Screen name="CargoClaim" component={CargoClaimScreen} options={{ title: 'Cargo Claim Tracker' }} />
      <Stack.Screen name="BillOfLading" component={BillOfLadingScreen} options={{ title: 'Bill of Lading' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify Email' }} />
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Translator" component={TranslatorScreen} options={{ title: 'Translator' }} />
      <Stack.Screen name="AILoadRate" component={AILoadRateScreen} options={{ title: 'AI Rate Advisor' }} />
      <Stack.Screen name="RateBenchmark" component={RateBenchmarkScreen} options={{ title: 'Rate Benchmark' }} />
      <Stack.Screen name="HOSCountdown" component={HOSCountdownScreen} options={{ title: 'HOS Countdown' }} />
      <Stack.Screen name="PaymentTracker" component={PaymentTrackerScreen} options={{ title: 'Payment Tracker' }} />
      <Stack.Screen name="QuarterlyTax" component={QuarterlyTaxScreen} options={{ title: 'Quarterly Tax Estimator' }} />
      <Stack.Screen name="FuelMap" component={FuelMapScreen} options={{ title: 'Diesel Prices' }} />
      <Stack.Screen name="TripPlanner" component={TripPlannerScreen} options={{ title: 'Trip Planner' }} />
      <Stack.Screen name="Sponsors" component={SponsorsScreen} options={{ title: 'Partners & Sponsors' }} />
      <Stack.Screen name="TripProfit" component={TripProfitScreen} options={{ title: 'Trip Profit Calculator' }} />
      <Stack.Screen name="FleetOwner" component={FleetOwnerScreen} options={{ title: 'Fleet Owner Mode' }} />
      <Stack.Screen name="TRACCommunity" component={TRACCommunityScreen} options={{ title: 'TRAC Community' }} />
      <Stack.Screen name="AmericasTopTrucker" component={AmericasTopTruckerScreen} options={{ title: "America's Top Trucker" }} />
    </Stack.Navigator>
  );
}
