import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { FREIGHT_LOADS, BUSINESS_EXPENSES, VirtualLoad } from '../../data/freightLoads';
import { getRoadReadyProfile, updateOOStats } from '../../api/roadReady';

interface OOStats {
  weekNumber: number;
  cashBalance: number;
  truckValue: number;
  totalProfitAllTime: number;
  breakdownsTotal: number;
  loansOutstanding: number;
}

type ScreenView = 'dashboard' | 'pick-load' | 'week-result';

interface WeekResult {
  load: VirtualLoad;
  revenue: number;
  fuelCost: number;
  fixedCost: number;
  maintenanceCost: number;
  netChange: number;
  event: { type: string; amount: number; desc: string } | null;
}

const WEEKLY_FIXED =
  (BUSINESS_EXPENSES.insurancePerMonth + BUSINESS_EXPENSES.truckPaymentPerMonth + BUSINESS_EXPENSES.miscPerMonth) / 4;

const RANDOM_EVENTS = [
  { type: 'breakdown', amount: -3500, desc: '🔧 Breakdown — roadside repair needed' },
  { type: 'fine', amount: -500, desc: '⚖ Overweight fine at weigh station' },
  { type: 'bonus', amount: 1000, desc: '💰 Broker paid a bonus for early delivery' },
  { type: 'fuel', amount: 200, desc: '⛽ Found cheap diesel — saved on fuel' },
];

function pickWeekLoads(): [VirtualLoad, VirtualLoad] {
  const shuffled = [...FREIGHT_LOADS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function maybeEvent(): WeekResult['event'] {
  const roll = Math.random();
  if (roll < 0.10) return RANDOM_EVENTS[0]; // 10% breakdown
  if (roll < 0.14) return RANDOM_EVENTS[1]; // 4% fine
  if (roll < 0.24) return RANDOM_EVENTS[2]; // 10% bonus
  if (roll < 0.32) return RANDOM_EVENTS[3]; // 8% cheap fuel
  return null;
}

export default function OOSimScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    headerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
    businessTitle: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    weekLabel: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    cashCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 2, borderColor: '#2ECC71' + '44', alignItems: 'center', gap: 4,
    },
    cashLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    cashValue: { fontSize: 40, fontWeight: '900' },
    debtWarning: { color: '#E74C3C', fontSize: 12, fontWeight: '700' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ooStatItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 4 },
    ooStatValue: { fontSize: 18, fontWeight: '900' },
    ooStatLabel: { color: Colors.textMuted, fontSize: 11 },
    expensesCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
    expensesTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    expRow: { flexDirection: 'row', justifyContent: 'space-between' },
    expLabel: { color: Colors.textMuted, fontSize: 13 },
    expValue: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    divider: { height: 1, backgroundColor: Colors.border },
    milestonesCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
    milestoneItem: { gap: 6 },
    milestoneTop: { flexDirection: 'row', justifyContent: 'space-between' },
    milestoneLabel: { color: Colors.textMuted, fontSize: 13 },
    milestonePct: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
    milestoneBar: { height: 4, backgroundColor: Colors.surfaceLight, borderRadius: 2 },
    milestoneFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 2 },
    runWeekBtn: { backgroundColor: Colors.secondary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    runWeekText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
    pickTitle: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    pickSub: { color: Colors.textMuted, fontSize: 13 },
    pickLoadCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 2, gap: 12 },
    pickLoadTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pickLoadNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    pickLoadNumText: { color: Colors.text, fontWeight: '900', fontSize: 16 },
    pickLoadInfo: { flex: 1 },
    pickCommodity: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    pickRoute: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    pickMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    pickMetaItem: { alignItems: 'center', gap: 2 },
    pickMetaLabel: { color: Colors.textMuted, fontSize: 11 },
    pickMetaValue: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    estProfitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, padding: 10 },
    estProfitLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    estProfitValue: { fontSize: 18, fontWeight: '900' },
    cancelBtn: { alignItems: 'center', padding: 12 },
    cancelText: { color: Colors.textMuted, fontSize: 13 },
    resultHeader: { alignItems: 'center', gap: 8 },
    resultTitle: { color: Colors.text, fontSize: 20, fontWeight: '900' },
    resultCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
    resultLoad: { color: Colors.text, fontSize: 17, fontWeight: '800' },
    resultRoute: { color: Colors.textMuted, fontSize: 13 },
    resultRows: { gap: 8, marginTop: 4 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultRowLabel: { color: Colors.textMuted, fontSize: 13, flex: 1, paddingRight: 8 },
    resultRowValue: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    eventBanner: { borderRadius: 12, padding: 12, borderWidth: 2, alignItems: 'center' },
    eventBannerText: { color: Colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  }), [Colors]);
  const [view, setView] = useState<ScreenView>('dashboard');
  const [oo, setOo] = useState<OOStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekLoads, setWeekLoads] = useState<[VirtualLoad, VirtualLoad] | null>(null);
  const [weekResult, setWeekResult] = useState<WeekResult | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    getRoadReadyProfile()
      .then(d => setOo(d.profile.ooStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const openLoadPicker = () => {
    setWeekLoads(pickWeekLoads());
    setView('pick-load');
  };

  const runWeek = async (load: VirtualLoad) => {
    if (!oo) return;
    setSaving(true);
    const revenue = load.rate;
    const fuelCost = load.miles * BUSINESS_EXPENSES.fuelCostPerMile;
    const maintenanceCost = load.miles * BUSINESS_EXPENSES.maintenanceCostPerMile;
    const event = maybeEvent();
    const eventAmount = event?.amount ?? 0;
    const netChange = revenue - fuelCost - maintenanceCost - WEEKLY_FIXED + eventAmount;

    const result: WeekResult = { load, revenue, fuelCost, maintenanceCost, fixedCost: WEEKLY_FIXED, netChange, event };
    setWeekResult(result);

    const newCash = oo.cashBalance + netChange;
    const newProfit = oo.totalProfitAllTime + netChange;
    const newBreakdowns = oo.breakdownsTotal + (event?.type === 'breakdown' ? 1 : 0);
    const newWeek = oo.weekNumber + 1;
    const newStats: OOStats = {
      weekNumber: newWeek,
      cashBalance: Math.max(0, newCash),
      truckValue: oo.truckValue,
      totalProfitAllTime: newProfit,
      breakdownsTotal: newBreakdowns,
      loansOutstanding: oo.loansOutstanding,
    };

    try {
      const r = await updateOOStats(newStats);
      setOo(r.profile.ooStats);
    } catch (_) {
      setOo(newStats);
    }
    setSaving(false);
    setView('week-result');
  };

  const continueFromResult = () => {
    setWeekResult(null);
    setView('dashboard');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (view === 'dashboard' && oo) {
    const isInDebt = oo.cashBalance <= 0;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <Ionicons name="business-outline" size={32} color={Colors.secondary} />
            <View>
              <Text style={styles.businessTitle}>Owner-Operator</Text>
              <Text style={styles.weekLabel}>Week {oo.weekNumber}</Text>
            </View>
          </View>

          {/* Cash Balance */}
          <View style={[styles.cashCard, isInDebt && { borderColor: '#E74C3C' }]}>
            <Text style={styles.cashLabel}>CASH BALANCE</Text>
            <Text style={[styles.cashValue, { color: isInDebt ? '#E74C3C' : '#2ECC71' }]}>
              ${oo.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
            {isInDebt && <Text style={styles.debtWarning}>⚠ Cash depleted — take any load to recover</Text>}
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <OOStatItem
              label="All-Time Profit"
              value={`$${oo.totalProfitAllTime >= 0 ? '' : '-'}${Math.abs(oo.totalProfitAllTime).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              color={oo.totalProfitAllTime >= 0 ? '#2ECC71' : '#E74C3C'}
            />
            <OOStatItem label="Breakdowns" value={String(oo.breakdownsTotal)} color="#E74C3C" />
            <OOStatItem label="Weeks Running" value={String(oo.weekNumber - 1)} color={Colors.secondary} />
            <OOStatItem label="Loans Outstanding" value={`$${oo.loansOutstanding.toLocaleString()}`} color={oo.loansOutstanding > 0 ? '#E74C3C' : Colors.textMuted} />
          </View>

          {/* Weekly expenses info */}
          <View style={styles.expensesCard}>
            <Text style={styles.expensesTitle}>Weekly Fixed Expenses</Text>
            <ExpRow label="Insurance" value={`$${(BUSINESS_EXPENSES.insurancePerMonth / 4).toFixed(0)}/wk`} />
            <ExpRow label="Truck Payment" value={`$${(BUSINESS_EXPENSES.truckPaymentPerMonth / 4).toFixed(0)}/wk`} />
            <ExpRow label="Misc (permits, phone)" value={`$${(BUSINESS_EXPENSES.miscPerMonth / 4).toFixed(0)}/wk`} />
            <View style={styles.divider} />
            <ExpRow label="Total Fixed" value={`$${WEEKLY_FIXED.toFixed(0)}/wk`} bold />
            <ExpRow label="Fuel & Maintenance" value={`$${(BUSINESS_EXPENSES.fuelCostPerMile + BUSINESS_EXPENSES.maintenanceCostPerMile).toFixed(2)}/mi`} />
          </View>

          {/* Progress milestones */}
          {oo.weekNumber > 1 && (
            <View style={styles.milestonesCard}>
              <Text style={styles.expensesTitle}>Milestones</Text>
              <MilestoneItem label="Survive 10 Weeks" done={oo.weekNumber > 10} current={oo.weekNumber - 1} target={10} />
              <MilestoneItem label="$50,000 All-Time Profit" done={oo.totalProfitAllTime >= 50000} current={oo.totalProfitAllTime} target={50000} money />
              <MilestoneItem label="Survive 5 Breakdowns" done={oo.breakdownsTotal >= 5} current={oo.breakdownsTotal} target={5} />
            </View>
          )}

          <TouchableOpacity style={styles.runWeekBtn} onPress={openLoadPicker} activeOpacity={0.85}>
            <Ionicons name="play-circle" size={22} color={Colors.white} />
            <Text style={styles.runWeekText}>Run Week {oo.weekNumber}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pick Load ──────────────────────────────────────────────────────────────
  if (view === 'pick-load' && weekLoads && oo) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pickTitle}>Week {oo.weekNumber} — Pick Your Load</Text>
          <Text style={styles.pickSub}>Choose wisely — your cash depends on it</Text>
          {weekLoads.map((load, i) => {
            const fuel = load.miles * BUSINESS_EXPENSES.fuelCostPerMile;
            const maint = load.miles * BUSINESS_EXPENSES.maintenanceCostPerMile;
            const estNet = load.rate - fuel - maint - WEEKLY_FIXED;
            const color = i === 0 ? '#3498DB' : '#9B59B6';
            return (
              <TouchableOpacity key={load.id} style={[styles.pickLoadCard, { borderColor: color }]} onPress={() => runWeek(load)} disabled={saving} activeOpacity={0.85}>
                <View style={styles.pickLoadTop}>
                  <View style={[styles.pickLoadNum, { backgroundColor: color }]}>
                    <Text style={styles.pickLoadNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.pickLoadInfo}>
                    <Text style={styles.pickCommodity}>{load.commodity}</Text>
                    <Text style={styles.pickRoute}>{load.origin} → {load.destination}</Text>
                  </View>
                </View>
                <View style={styles.pickMeta}>
                  <PickMetaItem label="Miles" value={load.miles.toLocaleString()} />
                  <PickMetaItem label="Gross Pay" value={`$${load.rate.toLocaleString()}`} />
                  <PickMetaItem label="$/Mile" value={`$${load.ratePerMile}`} color={load.ratePerMile >= 3 ? '#2ECC71' : Colors.secondary} />
                </View>
                <View style={[styles.estProfitRow, { backgroundColor: color + '11' }]}>
                  <Text style={styles.estProfitLabel}>Est. Net This Week</Text>
                  <Text style={[styles.estProfitValue, { color: estNet > 0 ? '#2ECC71' : '#E74C3C' }]}>
                    {estNet >= 0 ? '+' : ''}${estNet.toFixed(0)}
                  </Text>
                </View>
                {saving && <ActivityIndicator color={color} style={{ marginTop: 8 }} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setView('dashboard')}>
            <Text style={styles.cancelText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Week Result ────────────────────────────────────────────────────────────
  if (view === 'week-result' && weekResult && oo) {
    const win = weekResult.netChange >= 0;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.resultHeader}>
            <Ionicons name={win ? 'trending-up' : 'trending-down'} size={52} color={win ? '#2ECC71' : '#E74C3C'} />
            <Text style={styles.resultTitle}>Week {oo.weekNumber - 1} Complete</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLoad}>{weekResult.load.commodity}</Text>
            <Text style={styles.resultRoute}>{weekResult.load.origin} → {weekResult.load.destination}</Text>
            <View style={styles.resultRows}>
              <ResultRow label="Gross Revenue" value={`+$${weekResult.revenue.toLocaleString()}`} color="#2ECC71" />
              <ResultRow label="Fuel" value={`-$${weekResult.fuelCost.toFixed(0)}`} color="#E74C3C" />
              <ResultRow label="Maintenance" value={`-$${weekResult.maintenanceCost.toFixed(0)}`} color="#E74C3C" />
              <ResultRow label="Fixed Expenses" value={`-$${weekResult.fixedCost.toFixed(0)}`} color="#E74C3C" />
              {weekResult.event && (
                <ResultRow
                  label={weekResult.event.desc}
                  value={`${weekResult.event.amount >= 0 ? '+' : ''}$${weekResult.event.amount}`}
                  color={weekResult.event.amount >= 0 ? '#2ECC71' : '#E74C3C'}
                />
              )}
              <View style={styles.divider} />
              <ResultRow
                label="Net This Week"
                value={`${weekResult.netChange >= 0 ? '+' : ''}$${weekResult.netChange.toFixed(0)}`}
                color={win ? '#2ECC71' : '#E74C3C'}
                bold
              />
            </View>
          </View>

          {/* Updated cash balance */}
          <View style={[styles.cashCard, { marginTop: 0 }]}>
            <Text style={styles.cashLabel}>NEW CASH BALANCE</Text>
            <Text style={[styles.cashValue, { color: oo.cashBalance > 0 ? '#2ECC71' : '#E74C3C' }]}>
              ${oo.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>

          {weekResult.event && (
            <View style={[styles.eventBanner, { borderColor: weekResult.event.amount >= 0 ? '#2ECC71' : '#E74C3C' }]}>
              <Text style={styles.eventBannerText}>Random Event: {weekResult.event.desc}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.runWeekBtn} onPress={continueFromResult}>
            <Text style={styles.runWeekText}>Continue to Week {oo.weekNumber}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;
}

function OOStatItem({ label, value, color }: { label: string; value: string; color: string }) {
  const Colors = useColors();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function ExpRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={[{ color: Colors.textMuted, fontSize: 13, fontWeight: '700' }, bold ? { color: Colors.text, fontWeight: '900' } : {}]}>{value}</Text>
    </View>
  );
}

function MilestoneItem({ label, done, current, target, money }: { label: string; done: boolean; current: number; target: number; money?: boolean }) {
  const Colors = useColors();
  const pct = Math.min(1, Math.max(0, current / target));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[{ color: Colors.textMuted, fontSize: 13 }, done ? { color: '#2ECC71' } : {}]}>{done ? '✓ ' : ''}{label}</Text>
        <Text style={{ color: Colors.secondary, fontSize: 12, fontWeight: '700' }}>{done ? 'DONE' : money ? `$${Math.floor(current / 1000)}k / $${target / 1000}k` : `${current}/${target}`}</Text>
      </View>
      {!done && (
        <View style={{ height: 4, backgroundColor: Colors.surfaceLight, borderRadius: 2 }}>
          <View style={{ height: '100%', backgroundColor: Colors.secondary, borderRadius: 2, width: `${pct * 100}%` as any }} />
        </View>
      )}
    </View>
  );
}

function PickMetaItem({ label, value, color }: { label: string; value: string; color?: string }) {
  const Colors = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={[{ color: Colors.text, fontWeight: '800', fontSize: 15 }, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function ResultRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[{ color: Colors.textMuted, fontSize: 13, flex: 1, paddingRight: 8 }, bold ? { color: Colors.text, fontWeight: '800' } : {}]}>{label}</Text>
      <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: '700' }, color ? { color } : {}, bold ? { fontWeight: '900', fontSize: 16 } : {}]}>{value}</Text>
    </View>
  );
}
