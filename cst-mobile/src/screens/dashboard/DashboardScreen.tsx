import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { getRevenue } from '../../api/features';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type FeatureScreen = keyof MainStackParamList | null;

const features: { icon: string; label: string; color: string; desc: string; screen: FeatureScreen }[] = [
  { icon: 'shield-checkmark-outline', label: 'AI Legal Assistant', color: '#3498DB', desc: 'Ask legal questions',  screen: 'AILegal' },
  { icon: 'document-text-outline',    label: 'Smart Forms',        color: '#9B59B6', desc: 'Contracts & docs',     screen: 'SmartForms' },
  { icon: 'library-outline',          label: 'State Law',          color: '#1ABC9C', desc: 'All 50 states',        screen: 'StateLaw' },
  { icon: 'hammer-outline',           label: 'Ticket Dispute',     color: '#E67E22', desc: 'Fight your tickets',   screen: 'TicketDispute' },
  { icon: 'business-outline',         label: 'Corp Startups',      color: '#2ECC71', desc: 'LLC & EIN filing',     screen: 'CorpStartups' },
  { icon: 'trending-up-outline',      label: 'Rate Tools',         color: '#F39C12', desc: 'Broker & lane rates',  screen: 'RateTools' },
  { icon: 'people-outline',           label: 'Driver Protection',  color: '#E74C3C', desc: 'Coercion & wellness',  screen: 'DriverProtection' },
  { icon: 'calendar-outline',         label: 'Driver Calendar',    color: '#8E44AD', desc: 'Never miss a deadline',screen: 'Calendar' },
  { icon: 'timer-outline',            label: 'HOS Tracker',        color: '#16A085', desc: '70/60-hr cycle log',    screen: 'HOSTracker' },
  { icon: 'stopwatch-outline',        label: 'Detention Tracker',  color: '#C0392B', desc: 'Clock in/out & pay',    screen: 'DetentionTracker' },
  { icon: 'construct-outline',        label: 'Maintenance',        color: '#E67E22', desc: 'Track service & repairs', screen: 'Maintenance' },
  { icon: 'folder-outline',           label: 'Document Vault',     color: '#F5A623', desc: 'Store your docs',      screen: 'DocumentVault' },
  { icon: 'calculator-outline',       label: 'Tax Calculator',     color: '#27AE60', desc: 'One-button tax prep',  screen: 'TaxCalculator' },
  { icon: 'bar-chart-outline',        label: 'Profit & Loss',      color: '#9B59B6', desc: 'Revenue & expenses',   screen: 'ProfitLoss' },
  { icon: 'map-outline',              label: 'Trip Log',           color: '#3498DB', desc: 'Log every load & run', screen: 'TripLog' },
  { icon: 'water-outline',            label: 'Fuel Log',           color: '#1ABC9C', desc: 'Track fuel spend',     screen: 'FuelLog' },
  { icon: 'scale-outline',            label: 'Axle Weight',        color: '#E67E22', desc: 'Weight limit checker', screen: 'AxleWeight' },
  { icon: 'star-outline',             label: 'Broker Notes',       color: '#F1C40F', desc: 'Rate your brokers',    screen: 'BrokerNotes' },
  { icon: 'receipt-outline',          label: 'Expenses',           color: '#E74C3C', desc: 'Track all your costs',  screen: 'Expenses' },
  { icon: 'globe-outline',            label: 'IFTA Tracker',       color: '#16A085', desc: 'Quarterly fuel tax',    screen: 'IFTATracker' },
  { icon: 'bus-outline',              label: 'My Truck',           color: '#8E44AD', desc: 'Rig profile & docs',    screen: 'TruckProfile' },
];

interface DashStats {
  grossRevenue: string;
  netProfit: string;
  costPerMile: string;
  fuelPct: string;
}

const EMPTY_STATS: DashStats = { grossRevenue: '—', netProfit: '—', costPerMile: '—', fuelPct: '—' };

const fmtMoney = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<DashStats>(EMPTY_STATS);

  useEffect(() => {
    getRevenue('Month').then((d) => {
      if (!d || d.grossRevenue === 0) return;
      const totalExp = d.grossRevenue - d.netProfit;
      const cpm = d.totalMiles > 0 ? `$${(totalExp / d.totalMiles).toFixed(2)}` : '—';
      const fuelPct = d.grossRevenue > 0 ? `${Math.round((d.fuelCost / d.grossRevenue) * 100)}%` : '—';
      setStats({
        grossRevenue: fmtMoney(d.grossRevenue),
        netProfit: fmtMoney(d.netProfit),
        costPerMile: cpm,
        fuelPct,
      });
    }).catch(() => {/* silent — stats stay as — */});
  }, []);

  const statCards = [
    { label: 'Gross Revenue', value: stats.grossRevenue, icon: 'cash-outline' },
    { label: 'Net Profit',    value: stats.netProfit,    icon: 'trending-up-outline' },
    { label: 'Cost/Mile',     value: stats.costPerMile,  icon: 'speedometer-outline' },
    { label: 'Fuel %',        value: stats.fuelPct,      icon: 'water-outline' },
  ];

  const handleFeature = (screen: FeatureScreen) => {
    if (screen) navigation.navigate(screen as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name ?? 'Driver'}</Text>
          </View>
          <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('EmergencySOS')}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          {statCards.map((s) => (
            <TouchableOpacity key={s.label} style={styles.statCard} onPress={() => navigation.navigate('ProfitLoss')}>
              <Ionicons name={s.icon as any} size={20} color={Colors.secondary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Everything You Need</Text>
        <View style={styles.grid}>
          {features.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[styles.featureCard, !f.screen && styles.featureCardDimmed]}
              onPress={() => handleFeature(f.screen)}
              activeOpacity={f.screen ? 0.7 : 0.9}
            >
              <View style={[styles.iconCircle, { backgroundColor: f.color + '22' }]}>
                <Ionicons name={f.icon as any} size={26} color={f.color} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
              {f.screen && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>LIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.emergencyBanner} onPress={() => navigation.navigate('EmergencySOS')}>
          <Ionicons name="alert-circle" size={32} color={Colors.white} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.emergencyTitle}>Emergency Response Center</Text>
            <Text style={styles.emergencySubtitle}>ONE BUTTON. WE FIND YOU. WE SUPPORT.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickRow}>
          {[
            { label: 'Tax Calc',    icon: 'calculator-outline', screen: 'TaxCalculator' as const, color: '#27AE60' },
            { label: 'Calendar',    icon: 'calendar-outline',   screen: 'Calendar' as const,      color: '#8E44AD' },
            { label: 'P&L',         icon: 'bar-chart-outline',  screen: 'ProfitLoss' as const,    color: '#9B59B6' },
            { label: 'Maintenance', icon: 'construct-outline',  screen: 'Maintenance' as const,   color: '#E67E22' },
          ].map(({ label, icon, screen, color }) => (
            <TouchableOpacity key={label} style={styles.quickCard} onPress={() => navigation.navigate(screen)}>
              <Ionicons name={icon as any} size={24} color={color} />
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { color: Colors.textMuted, fontSize: 13 },
  userName: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  sosButton: {
    backgroundColor: Colors.danger, width: 52, height: 52,
    borderRadius: 26, justifyContent: 'center', alignItems: 'center',
  },
  sosText: { color: Colors.white, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  statsRow: { paddingLeft: 20, marginBottom: 24 },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    marginRight: 12, minWidth: 110, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 4,
  },
  statValue: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
  sectionTitle: {
    color: Colors.white, fontSize: 18, fontWeight: '800',
    paddingHorizontal: 20, marginBottom: 14,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 24,
  },
  featureCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 14, width: '46%', marginHorizontal: '1%',
    borderWidth: 1, borderColor: Colors.border,
  },
  featureCardDimmed: { opacity: 0.65 },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  featureLabel: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  featureDesc: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  activeBadge: {
    marginTop: 6, backgroundColor: Colors.secondary + '22',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.secondary,
  },
  activeBadgeText: { color: Colors.secondary, fontSize: 9, fontWeight: '900' },
  emergencyBanner: {
    backgroundColor: Colors.danger, marginHorizontal: 20, borderRadius: 14,
    padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 24,
  },
  emergencyTitle: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  emergencySubtitle: { color: '#FFB3B3', fontSize: 11, marginTop: 2 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  quickCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickLabel: { color: Colors.white, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20, marginBottom: 10,
  },
  logoutText: { color: Colors.textMuted, fontSize: 14 },
});
