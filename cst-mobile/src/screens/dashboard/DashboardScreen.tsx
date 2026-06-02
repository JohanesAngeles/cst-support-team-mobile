import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { getLiveRevenue } from '../../api/features';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type FeatureScreen = keyof MainStackParamList | null;

const { width: SW } = Dimensions.get('window');
const CARD_W      = (SW - 48) / 3;       // horizontal scroll rows (3 visible)
const GRID_CARD_W = (SW - 42) / 2;       // flat grid (2 columns, fills screen)

// ─── Categories ──────────────────────────────────────────────────────────────
const CATS = [
  { id: 'all',        label: 'All',        color: '#021B3A' },
  { id: 'financial',  label: 'Financial',  color: '#27AE60' },
  { id: 'legal',      label: 'Legal',      color: '#3498DB' },
  { id: 'operations', label: 'Operations', color: '#E67E22' },
  { id: 'community',  label: 'Community',  color: '#9B59B6' },
  { id: 'tools',      label: 'Tools',      color: '#1ABC9C' },
  { id: 'career',     label: 'Career',     color: '#F39C12' },
] as const;

type CatId = typeof CATS[number]['id'];

// ─── Feature list ─────────────────────────────────────────────────────────────
interface Feature {
  icon: string; label: string; color: string;
  desc: string; screen: FeatureScreen; cat: CatId;
}

const FEATURES: Feature[] = [
  // Financial
  { icon: 'bar-chart-outline',      label: 'Profit & Loss',      color: '#9B59B6', desc: 'Revenue & expenses',        screen: 'ProfitLoss',         cat: 'financial'  },
  { icon: 'calculator-outline',     label: 'Tax Calculator',     color: '#27AE60', desc: 'One-button tax prep',        screen: 'TaxCalculator',      cat: 'financial'  },
  { icon: 'receipt-outline',        label: 'Expenses',           color: '#E74C3C', desc: 'Track all your costs',       screen: 'Expenses',           cat: 'financial'  },
  { icon: 'globe-outline',          label: 'IFTA Tracker',       color: '#16A085', desc: 'Quarterly fuel tax',         screen: 'IFTATracker',        cat: 'financial'  },
  { icon: 'water-outline',          label: 'Fuel Log',           color: '#1ABC9C', desc: 'Track fuel spend',           screen: 'FuelLog',            cat: 'financial'  },
  { icon: 'map-outline',            label: 'Trip Log',           color: '#3498DB', desc: 'Log every load & run',       screen: 'TripLog',            cat: 'financial'  },
  { icon: 'wallet-outline',         label: 'Per Diem',           color: '#27AE60', desc: 'IRS tax deduction',          screen: 'PerDiem',            cat: 'financial'  },
  { icon: 'receipt-outline',        label: 'Invoice Generator',  color: '#F39C12', desc: 'Create & export invoices',   screen: 'Invoice',            cat: 'financial'  },
  { icon: 'analytics-outline',      label: 'AI Rate Advisor',    color: '#E67E22', desc: 'Is this rate worth it?',    screen: 'AILoadRate',         cat: 'financial'  },
  { icon: 'pulse-outline',          label: 'Rate Benchmark',     color: '#16A085', desc: 'Market rates by lane',       screen: 'RateBenchmark',      cat: 'financial'  },
  { icon: 'cash-outline',           label: 'Payment Tracker',    color: '#CC0000', desc: 'Track invoice payments',    screen: 'PaymentTracker',     cat: 'financial'  },
  { icon: 'calculator-outline',     label: 'Quarterly Taxes',    color: '#8E44AD', desc: 'Estimated 1040-ES payment', screen: 'QuarterlyTax',       cat: 'financial'  },
  { icon: 'trending-up-outline',    label: 'Rate Tools',         color: '#F39C12', desc: 'Broker & lane rates',        screen: 'RateTools',          cat: 'financial'  },
  { icon: 'git-compare-outline',    label: 'Load Compare',       color: '#3498DB', desc: 'Side-by-side loads',         screen: 'LoadCompare',        cat: 'financial'  },
  { icon: 'cube-outline',           label: 'Load Board',         color: '#F39C12', desc: 'Track your loads',           screen: 'LoadBoard',          cat: 'financial'  },
  { icon: 'stopwatch-outline',      label: 'Detention Tracker',  color: '#C0392B', desc: 'Clock in/out & pay',         screen: 'DetentionTracker',   cat: 'financial'  },

  // Legal
  { icon: 'shield-checkmark-outline', label: 'AI Legal Assistant', color: '#3498DB', desc: 'Ask legal questions',     screen: 'AILegal',            cat: 'legal'      },
  { icon: 'library-outline',          label: 'State Law',          color: '#1ABC9C', desc: 'All 50 states',           screen: 'StateLaw',           cat: 'legal'      },
  { icon: 'hammer-outline',           label: 'Ticket Dispute',     color: '#E67E22', desc: 'Fight your tickets',      screen: 'TicketDispute',      cat: 'legal'      },
  { icon: 'document-text-outline',    label: 'Smart Forms',        color: '#9B59B6', desc: 'Contracts & docs',        screen: 'SmartForms',         cat: 'legal'      },
  { icon: 'people-outline',           label: 'Driver Protection',  color: '#E74C3C', desc: 'Coercion & wellness',     screen: 'DriverProtection',   cat: 'legal'      },
  { icon: 'business-outline',         label: 'Corp Startups',      color: '#2ECC71', desc: 'LLC & EIN filing',        screen: 'CorpStartups',       cat: 'legal'      },
  { icon: 'alert-circle-outline',     label: 'Cargo Claims',       color: '#E67E22', desc: 'Track damage & loss',     screen: 'CargoClaim',         cat: 'legal'      },
  { icon: 'newspaper-outline',        label: 'Bill of Lading',     color: '#9B59B6', desc: 'Generate BOL PDF',        screen: 'BillOfLading',       cat: 'legal'      },
  { icon: 'star-outline',             label: 'Broker Notes',       color: '#F1C40F', desc: 'Rate your brokers',       screen: 'BrokerNotes',        cat: 'legal'      },

  // Operations
  { icon: 'timer-outline',            label: 'HOS Tracker',        color: '#16A085', desc: '70/60-hr cycle log',      screen: 'HOSTracker',         cat: 'operations' },
  { icon: 'hourglass-outline',       label: 'HOS Countdown',      color: '#E74C3C', desc: 'Live drive time left',    screen: 'HOSCountdown',       cat: 'operations' },
  { icon: 'notifications-outline',    label: 'HOS Alerts',         color: '#E74C3C', desc: 'Driving limit alerts',    screen: 'HOSAlerts',          cat: 'operations' },
  { icon: 'clipboard-outline',        label: 'DVIR Inspection',    color: '#2ECC71', desc: 'Pre/post-trip reports',   screen: 'DVIR',               cat: 'operations' },
  { icon: 'radio-button-on-outline',  label: 'ELD Status',         color: '#E74C3C', desc: 'Duty status + HOS sync', screen: 'ELDStatus',          cat: 'operations' },
  { icon: 'construct-outline',        label: 'Maintenance',        color: '#E67E22', desc: 'Track service & repairs', screen: 'Maintenance',        cat: 'operations' },
  { icon: 'flask-outline',            label: 'Drug & Alcohol Log', color: '#9B59B6', desc: 'FMCSA test tracking',     screen: 'DrugTest',           cat: 'operations' },
  { icon: 'id-card-outline',          label: 'CDL Tracker',        color: '#E74C3C', desc: 'License expiration',      screen: 'CDLTracker',         cat: 'operations' },
  { icon: 'bus-outline',              label: 'My Truck',           color: '#8E44AD', desc: 'Rig profile & docs',      screen: 'TruckProfile',       cat: 'operations' },
  { icon: 'calendar-outline',         label: 'Driver Calendar',    color: '#8E44AD', desc: 'Never miss a deadline',   screen: 'Calendar',           cat: 'operations' },
  { icon: 'moon-outline',             label: 'Sleep & Fatigue',    color: '#8E44AD', desc: 'Rest compliance',         screen: 'SleepLog',           cat: 'operations' },

  // Community
  { icon: 'chatbubbles-outline',      label: 'Driver Chat',        color: '#3498DB', desc: 'Community channels',      screen: 'DriverChat',         cat: 'community'  },
  { icon: 'warning-outline',          label: 'Broker Blacklist',   color: '#CC0000', desc: 'Broker warnings',         screen: 'BrokerBlacklist',    cat: 'community'  },
  { icon: 'people-outline',           label: 'O/O Network',        color: '#1ABC9C', desc: 'Owner-operator community',screen: 'OwnerNetwork',       cat: 'community'  },
  { icon: 'earth-outline',            label: 'Trucker Map',        color: '#E74C3C', desc: 'Community intel map',     screen: 'TruckerMap',         cat: 'community'  },
  { icon: 'people-circle-outline',    label: 'Dispatch Contacts',  color: '#3498DB', desc: 'Dispatchers & brokers',   screen: 'DispatchContacts',   cat: 'community'  },
  { icon: 'business-outline',         label: 'Shipper Directory',  color: '#16A085', desc: 'Shipper/receiver book',   screen: 'ShipperDirectory',   cat: 'community'  },
  { icon: 'car-outline',              label: 'Parking Tracker',    color: '#E67E22', desc: 'Manage reservations',     screen: 'ParkingTracker',     cat: 'community'  },
  { icon: 'gift-outline',             label: 'Referral Program',   color: '#F1C40F', desc: 'Earn free months',        screen: 'Referral',           cat: 'community'  },

  // Tools
  { icon: 'scale-outline',            label: 'Axle Weight',        color: '#E67E22', desc: 'Weight limit checker',    screen: 'AxleWeight',         cat: 'tools'      },
  { icon: 'navigate-outline',         label: 'Mileage Calculator', color: '#1ABC9C', desc: 'Distance, fuel & pay',   screen: 'MileageCalculator',  cat: 'tools'      },
  { icon: 'scale-outline',            label: 'Weigh Stations',     color: '#E67E22', desc: 'WS on your route',        screen: 'WeighStation',       cat: 'tools'      },
  { icon: 'flame-outline',            label: 'Fuel Finder',        color: '#E67E22', desc: 'Cheapest fuel near you',  screen: 'FuelFinder',         cat: 'tools'      },
  { icon: 'partly-sunny-outline',     label: 'Route Weather',      color: '#3498DB', desc: 'Road conditions',         screen: 'Weather',            cat: 'tools'      },
  { icon: 'navigate-outline',        label: 'Trip Planner',       color: '#2980B9', desc: 'Plan route + fuel + HOS', screen: 'TripPlanner',        cat: 'tools'      },
  { icon: 'flame-outline',           label: 'Diesel Prices',      color: '#E74C3C', desc: 'EIA prices by region',    screen: 'FuelMap',            cat: 'tools'      },
  { icon: 'location-outline',         label: 'Find Help',          color: '#E74C3C', desc: 'Truck stops & repair',    screen: 'FindHelp',           cat: 'tools'      },
  { icon: 'document-outline',         label: 'Doc Generator',      color: '#9B59B6', desc: 'Rate conf, POD, invoice', screen: 'DocGenerator',       cat: 'tools'      },
  { icon: 'folder-outline',           label: 'Document Vault',     color: '#2C6EBD', desc: 'Store your docs',         screen: 'DocumentVault',      cat: 'tools'      },

  // Career
  { icon: 'stopwatch-outline',        label: 'CDL Challenge',      color: '#3498DB', desc: 'Timed skill challenges',  screen: 'CDLChallenge',       cat: 'career'     },
  { icon: 'star-outline',             label: 'Road Ready',         color: '#2C6EBD', desc: 'Driver score & rank',     screen: 'RoadReady',          cat: 'career'     },
  { icon: 'game-controller-outline',  label: 'Driver Games',       color: '#9B59B6', desc: 'Trivia & crosswords',     screen: 'Games',              cat: 'career'     },
  { icon: 'trophy-outline',           label: 'Driver Scorecard',   color: '#F1C40F', desc: 'Weekly performance',      screen: 'Scorecard',          cat: 'career'     },
  { icon: 'school-outline',           label: 'Student Driver',     color: '#1ABC9C', desc: 'CDL lessons & quizzes',   screen: 'StudentDriver',      cat: 'career'     },
  { icon: 'cube-outline',             label: 'Freight Career',     color: '#F39C12', desc: 'Accept loads, earn',      screen: 'FreightCareer',      cat: 'career'     },
  { icon: 'business-outline',         label: 'O/O Simulator',      color: '#9B59B6', desc: 'Run your own business',   screen: 'OOSim',              cat: 'career'     },
  { icon: 'star-outline',             label: 'CST Pro',            color: '#2C6EBD', desc: 'Upgrade your account',    screen: 'PremiumGate',        cat: 'career'     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function FeatureCard({ item, onPress, width = CARD_W }: { item: Feature; onPress: () => void; width?: number }) {
  const Colors = useColors();
  return (
    <TouchableOpacity
      style={{ width, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 6 }}
      onPress={onPress} activeOpacity={0.75}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', backgroundColor: item.color + '22' }}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>{item.label}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>{item.desc}</Text>
    </TouchableOpacity>
  );
}

function CategorySection({ cat, features, onPress }: { cat: typeof CATS[number]; features: Feature[]; onPress: (s: FeatureScreen) => void }) {
  const Colors = useColors();
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color }} />
        <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '800', flex: 1 }}>{cat.label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: cat.color }}>{features.length}</Text>
      </View>
      <FlatList
        data={features}
        keyExtractor={f => f.label}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => (
          <FeatureCard item={item} onPress={() => onPress(item.screen)} />
        )}
      />
    </View>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
interface DashStats { grossRevenue: string; netProfit: string; costPerMile: string; fuelPct: string; }
const EMPTY: DashStats = { grossRevenue: '—', netProfit: '—', costPerMile: '—', fuelPct: '—' };
const fmtMoney = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },

    // Header
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    },
    greeting: { color: '#757575', fontSize: 16, fontWeight: '500' },
    userName: { color: '#021B3A', fontSize: 28, fontWeight: '900' },
    sosBtn: {
      backgroundColor: Colors.danger, width: 52, height: 52,
      borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    },
    sosTxt: { color: Colors.text, fontWeight: '900', fontSize: 13, letterSpacing: 1 },

    // Sticky search + chips
    stickyBar: { backgroundColor: Colors.background, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#E8F0F8', borderRadius: 12,
      borderWidth: 1, borderColor: '#C8D8EC',
      marginHorizontal: 16, paddingHorizontal: 14, height: 44,
      marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#021B3A' },
    chips: { paddingHorizontal: 16, gap: 8 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
      backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#C8D8EC',
    },
    chipTxt: { fontSize: 13, fontWeight: '600', color: '#021B3A' },

    // Stats
    statsRow: { paddingLeft: 16, paddingVertical: 16 },
    statCard: {
      backgroundColor: '#E8F0F8', borderRadius: 16, padding: 18,
      marginRight: 14, minWidth: 140, borderWidth: 1, borderColor: '#C8D8EC',
      alignItems: 'center', gap: 6,
    },
    statValue: { color: '#021B3A', fontSize: 26, fontWeight: '900' },
    statLabel: { color: '#757575', fontSize: 12, fontWeight: '600', textAlign: 'center' },

    // Emergency
    emergencyBanner: {
      backgroundColor: Colors.danger, marginHorizontal: 16, borderRadius: 14,
      padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    },
    emergencyTitle: { color: Colors.white, fontSize: 14, fontWeight: '800' },
    emergencySub: { color: '#FFB3B3', fontSize: 10, marginTop: 2 },

    // Section headers
    sectionTitle: {
      color: '#021B3A', fontSize: 18, fontWeight: '800',
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    },
    sectionCount: { color: '#757575', fontSize: 14, fontWeight: '600' },

    // Category section
    catSection: { marginBottom: 4 },
    catHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    catTitle: { color: '#021B3A', fontSize: 16, fontWeight: '800', flex: 1 },
    catCount: { fontSize: 12, fontWeight: '700' },
    catRow: { paddingHorizontal: 16, gap: 10 },

    // Feature card
    featureCard: {
      backgroundColor: '#E8F0F8', borderRadius: 14,
      padding: 12, borderWidth: 1, borderColor: '#C8D8EC',
      gap: 6,
    },
    iconCircle: {
      width: 42, height: 42, borderRadius: 21,
      justifyContent: 'center', alignItems: 'center',
    },
    featureLabel: { color: '#021B3A', fontSize: 12, fontWeight: '700', lineHeight: 16 },
    featureDesc:  { color: '#757575', fontSize: 10 },

    // Flat grid (search/filter results)
    grid: {
      flexDirection: 'row', flexWrap: 'wrap',
      paddingHorizontal: 16, gap: 10, paddingBottom: 16,
    },

    // Empty state
    empty: { alignItems: 'center', padding: 40, gap: 10 },
    emptyTxt: { color: '#757575', fontSize: 14 },

    // Sign out
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 24, marginBottom: 8,
    },
    logoutTxt: { color: '#757575', fontSize: 14 },
  }), [Colors]);
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<DashStats>(EMPTY);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<CatId>('all');

  useEffect(() => {
    getLiveRevenue('Month').then((d) => {
      if (!d || d.grossRevenue === 0) return;
      const totalExp = d.grossRevenue - d.netProfit;
      const cpm = d.totalMiles > 0 ? `$${(totalExp / d.totalMiles).toFixed(2)}` : '—';
      const fuelPct = d.grossRevenue > 0 ? `${Math.round((d.fuelCost / d.grossRevenue) * 100)}%` : '—';
      setStats({ grossRevenue: fmtMoney(d.grossRevenue), netProfit: fmtMoney(d.netProfit), costPerMile: cpm, fuelPct });
    }).catch(() => {});
  }, []);

  const goTo = (screen: FeatureScreen) => { if (screen) navigation.navigate(screen as any); };

  // Filtered results (search or category)
  const isFiltered = search.trim().length > 0 || activeCat !== 'all';

  const filteredFeatures = useMemo(() => {
    let list = FEATURES;
    if (activeCat !== 'all') list = list.filter(f => f.cat === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f => f.label.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q));
    }
    return list;
  }, [search, activeCat]);

  // Grouped for "All" view
  const groupedCats = CATS.filter(c => c.id !== 'all').map(cat => ({
    cat,
    features: FEATURES.filter(f => f.cat === cat.id),
  }));

  const statCards = [
    { label: 'Gross Revenue', value: stats.grossRevenue, icon: 'cash-outline'         },
    { label: 'Net Profit',    value: stats.netProfit,    icon: 'trending-up-outline'  },
    { label: 'Cost / Mile',   value: stats.costPerMile,  icon: 'speedometer-outline'  },
    { label: 'Fuel %',        value: stats.fuelPct,      icon: 'water-outline'        },
  ];


  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.userName}>{user?.name ?? 'Driver'}</Text>
          </View>
          <TouchableOpacity style={s.sosBtn} onPress={() => navigation.navigate('EmergencySOS')}>
            <Text style={s.sosTxt}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search + chips (sticky) ─────────────────────────────────── */}
        <View style={s.stickyBar}>
          {/* Search */}
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={18} color="#757575" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search features..."
              placeholderTextColor="#757575"
              value={search}
              onChangeText={t => { setSearch(t); setActiveCat('all'); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#757575" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {CATS.map(c => {
              const active = activeCat === c.id && !search;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => { setActiveCat(c.id); setSearch(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipTxt, active && { color: Colors.text }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Stats strip ─────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsRow}>
          {statCards.map((sc) => (
            <TouchableOpacity key={sc.label} style={s.statCard} onPress={() => navigation.navigate('ProfitLoss')}>
              <Ionicons name={sc.icon as any} size={24} color={Colors.primary} />
              <Text style={s.statValue}>{sc.value}</Text>
              <Text style={s.statLabel}>{sc.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Emergency banner ────────────────────────────────────────── */}
        <TouchableOpacity style={s.emergencyBanner} onPress={() => navigation.navigate('EmergencySOS')}>
          <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.emergencyTitle}>Emergency Response Center</Text>
            <Text style={s.emergencySub}>ONE BUTTON. WE FIND YOU. WE SUPPORT.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ── Features ────────────────────────────────────────────────── */}
        {isFiltered ? (
          // Flat grid when searching or category selected
          <View>
            <Text style={s.sectionTitle}>
              {search ? `Results for "${search}"` : CATS.find(c => c.id === activeCat)?.label}
              <Text style={s.sectionCount}>  {filteredFeatures.length}</Text>
            </Text>
            {filteredFeatures.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="search-outline" size={40} color="#C8D8EC" />
                <Text style={s.emptyTxt}>No features found</Text>
              </View>
            ) : (
              <View style={s.grid}>
                {filteredFeatures.map(f => (
                  <FeatureCard key={f.label} item={f} onPress={() => goTo(f.screen)} width={GRID_CARD_W} />
                ))}
              </View>
            )}
          </View>
        ) : (
          // Category sections with horizontal scroll rows
          groupedCats.map(({ cat, features }) => (
            <CategorySection key={cat.id} cat={cat} features={features} onPress={goTo} />
          ))
        )}

        {/* ── Sign out ────────────────────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#757575" />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
