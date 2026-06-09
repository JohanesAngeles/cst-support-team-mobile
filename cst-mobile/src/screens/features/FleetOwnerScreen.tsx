import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface Driver {
  id: string;
  name: string;
  status: 'idle' | 'on-load' | 'breakdown';
  weeklyMiles: number;
  rating: number;
}

interface FleetState {
  week: number;
  cash: number;
  trucks: number;
  drivers: Driver[];
  totalRevenue: number;
  totalProfit: number;
}

const DRIVER_NAMES = ['Marcus T.', 'DeShawn R.', 'Carlos V.', 'Tony B.', 'Russ K.', 'James P.'];

const HIRE_COST = 2500;
const TRUCK_COST = 45000;
const WEEKLY_FIXED_PER_TRUCK = 1_100;
const DRIVER_PAY_PCT = 0.28;

const RANDOM_EVENTS = [
  { msg: 'Broker paid fast — +$800 bonus', delta: 800 },
  { msg: 'Driver Marcus called in sick — missed a load', delta: -1200 },
  { msg: 'Fuel rebate credited — +$400', delta: 400 },
  { msg: 'Truck #2 broke down — $2,800 repair', delta: -2800 },
  { msg: 'High-demand lane — earned +$1,500 extra', delta: 1500 },
];

function makeDriver(id: string): Driver {
  const name = DRIVER_NAMES[parseInt(id) % DRIVER_NAMES.length];
  return { id, name, status: 'idle', weeklyMiles: 0, rating: 4.5 };
}

const INITIAL: FleetState = {
  week: 1,
  cash: 25_000,
  trucks: 2,
  drivers: [makeDriver('0'), makeDriver('1')],
  totalRevenue: 0,
  totalProfit: 0,
};

function runWeek(state: FleetState): { next: FleetState; report: string[] } {
  const report: string[] = [];
  let delta = 0;
  const fixed = state.trucks * WEEKLY_FIXED_PER_TRUCK;
  delta -= fixed;
  report.push(`Fixed costs (${state.trucks} trucks): -$${fixed.toLocaleString()}`);

  let revenue = 0;
  for (const d of state.drivers) {
    if (d.status === 'breakdown') {
      report.push(`${d.name}: breakdown recovery — no load this week`);
      continue;
    }
    const miles = 1800 + Math.floor(Math.random() * 1400);
    const rpm = 2.4 + Math.random() * 1.4;
    const gross = Math.round(miles * rpm);
    const driverPay = Math.round(gross * DRIVER_PAY_PCT);
    const net = gross - driverPay;
    revenue += gross;
    delta += net;
    report.push(`${d.name}: ${miles.toLocaleString()} mi · $${gross.toLocaleString()} gross · net $${net.toLocaleString()}`);
  }

  if (Math.random() < 0.30) {
    const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    delta += evt.delta;
    report.push(`Event: ${evt.msg}`);
  }

  const newCash = Math.max(0, state.cash + delta);
  return {
    next: {
      ...state,
      week: state.week + 1,
      cash: newCash,
      totalRevenue: state.totalRevenue + revenue,
      totalProfit: state.totalProfit + delta,
      drivers: state.drivers.map(d => ({
        ...d,
        status: Math.random() < 0.06 ? 'breakdown' : 'idle' as Driver['status'],
        weeklyMiles: d.status === 'breakdown' ? 0 : 1800 + Math.floor(Math.random() * 1400),
      })),
    },
    report,
  };
}

export default function FleetOwnerScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    headerCard: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 2, borderColor: Colors.secondary + '44', gap: 10,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    weekLabel: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    cashLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    cashValue: { fontSize: 36, fontWeight: '900' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, gap: 4 },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 11 },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    driverCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border,
    },
    driverIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    driverName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    driverStatus: { fontSize: 12, fontWeight: '600' },
    driverMiles: { color: Colors.textMuted, fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
    actionBtnText: { fontWeight: '800', fontSize: 13 },
    actionBtnSub: { fontSize: 11, fontWeight: '600' },
    runBtn: {
      backgroundColor: Colors.secondary, borderRadius: 14, padding: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    runBtnText: { color: Colors.textDark, fontWeight: '900', fontSize: 15 },
    reportCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border, gap: 8,
    },
    reportLine: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
  }), [Colors]);

  const [fleet, setFleet] = useState<FleetState>(INITIAL);
  const [report, setReport] = useState<string[]>([]);
  const isProfitable = fleet.totalProfit >= 0;

  const hireDriver = () => {
    if (fleet.drivers.length >= fleet.trucks) {
      Alert.alert('Buy a truck first', 'You need one truck per driver. Buy another truck to hire more drivers.');
      return;
    }
    if (fleet.cash < HIRE_COST) {
      Alert.alert('Not enough cash', `Hiring a driver costs $${HIRE_COST.toLocaleString()}.`);
      return;
    }
    setFleet(f => ({
      ...f,
      cash: f.cash - HIRE_COST,
      drivers: [...f.drivers, makeDriver(String(f.drivers.length))],
    }));
  };

  const buyTruck = () => {
    if (fleet.cash < TRUCK_COST) {
      Alert.alert('Not enough cash', `A truck costs $${TRUCK_COST.toLocaleString()}.`);
      return;
    }
    setFleet(f => ({ ...f, cash: f.cash - TRUCK_COST, trucks: f.trucks + 1 }));
  };

  const doRunWeek = () => {
    const { next, report: r } = runWeek(fleet);
    setFleet(next);
    setReport(r);
  };

  const statusColor = (s: Driver['status']) =>
    s === 'on-load' ? '#2ECC71' : s === 'breakdown' ? Colors.danger : Colors.textMuted;

  const statusLabel = (s: Driver['status']) =>
    s === 'on-load' ? 'On Load' : s === 'breakdown' ? 'Breakdown' : 'Available';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="business-outline" size={28} color={Colors.secondary} />
              <View>
                <Text style={styles.title}>Fleet Owner</Text>
                <Text style={styles.weekLabel}>Week {fleet.week}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cashLabel}>CASH BALANCE</Text>
              <Text style={[styles.cashValue, { color: fleet.cash > 10000 ? '#2ECC71' : Colors.danger }]}>
                ${fleet.cash.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.secondary }]}>{fleet.trucks}</Text>
              <Text style={styles.statLabel}>Trucks</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.text }]}>{fleet.drivers.length}</Text>
              <Text style={styles.statLabel}>Drivers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: isProfitable ? '#2ECC71' : Colors.danger }]}>
                {fleet.totalProfit >= 0 ? '+' : ''}${Math.abs(fleet.totalProfit).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Profit</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Drivers</Text>
        {fleet.drivers.map(d => (
          <View key={d.id} style={styles.driverCard}>
            <View style={[styles.driverIcon, { backgroundColor: statusColor(d.status) + '22' }]}>
              <Ionicons name="person-outline" size={22} color={statusColor(d.status)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{d.name}</Text>
              <Text style={[styles.driverStatus, { color: statusColor(d.status) }]}>{statusLabel(d.status)}</Text>
            </View>
            <Text style={styles.driverMiles}>{d.weeklyMiles > 0 ? `${d.weeklyMiles.toLocaleString()} mi` : '—'}</Text>
          </View>
        ))}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3498DB22', borderWidth: 1, borderColor: '#3498DB44' }]}
            onPress={hireDriver}
          >
            <Ionicons name="person-add-outline" size={20} color="#3498DB" />
            <Text style={[styles.actionBtnText, { color: '#3498DB' }]}>Hire Driver</Text>
            <Text style={[styles.actionBtnSub, { color: Colors.textMuted }]}>${HIRE_COST.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#9B59B622', borderWidth: 1, borderColor: '#9B59B644' }]}
            onPress={buyTruck}
          >
            <Ionicons name="car-outline" size={20} color="#9B59B6" />
            <Text style={[styles.actionBtnText, { color: '#9B59B6' }]}>Buy Truck</Text>
            <Text style={[styles.actionBtnSub, { color: Colors.textMuted }]}>${TRUCK_COST.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.runBtn} onPress={doRunWeek} activeOpacity={0.85}>
          <Ionicons name="play-circle" size={22} color={Colors.textDark} />
          <Text style={styles.runBtnText}>Run Week {fleet.week}</Text>
        </TouchableOpacity>

        {report.length > 0 && (
          <View style={styles.reportCard}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Week {fleet.week - 1} Summary</Text>
            {report.map((line, i) => (
              <Text key={i} style={styles.reportLine}>· {line}</Text>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
