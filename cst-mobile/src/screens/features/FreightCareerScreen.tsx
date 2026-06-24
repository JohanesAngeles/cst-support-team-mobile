import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { FREIGHT_LOADS, BUSINESS_EXPENSES, VirtualLoad } from '../../data/freightLoads';
import { getRoadReadyProfile, updateFreightCareer } from '../../api/roadReady';
import { getEIADieselPrices } from '../../api/features';

type ScreenView = 'career' | 'accept' | 'result';

interface CareerStats {
  loadsCompleted: number;
  totalMiles: number;
  grossRevenue: number;
  netProfit: number;
  onTimeRate: number;
  avgRatePerMile: number;
}

function pickLoads(): VirtualLoad[] {
  return [...FREIGHT_LOADS].sort(() => Math.random() - 0.5).slice(0, 3);
}

function calcProfit(load: VirtualLoad, fuelPpm = BUSINESS_EXPENSES.fuelCostPerMile) {
  const fuelCost = load.miles * fuelPpm;
  const maintenanceCost = load.miles * BUSINESS_EXPENSES.maintenanceCostPerMile;
  const fixedWeeklyCost = (BUSINESS_EXPENSES.insurancePerMonth + BUSINESS_EXPENSES.truckPaymentPerMonth + BUSINESS_EXPENSES.miscPerMonth) / 4;
  const totalCost = fuelCost + maintenanceCost + fixedWeeklyCost;
  return load.rate - totalCost;
}

const DIFF_COLOR: Record<string, string> = { easy: '#2ECC71', medium: '#F39C12', hard: '#E74C3C' };

export default function FreightCareerScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    statsCard: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: Colors.border, gap: 12,
    },
    statsTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statItem: { flex: 1, minWidth: '30%', alignItems: 'center', gap: 4, padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 10 },
    statValue: { color: Colors.text, fontSize: 16, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 10 },
    loadCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border, gap: 10,
    },
    loadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    loadRoute: { flex: 1 },
    loadCommodity: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    loadRouteText: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    diffBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    diffText: { fontSize: 10, fontWeight: '800' },
    loadMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: Colors.textMuted, fontSize: 12 },
    loadNotes: { color: Colors.secondary, fontSize: 12, fontStyle: 'italic' },
    loadProfit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    loadProfitLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    loadProfitValue: { fontSize: 18, fontWeight: '900' },
    acceptBtn: { backgroundColor: Colors.secondary, borderRadius: 10, padding: 12, alignItems: 'center' },
    acceptBtnText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
    refreshBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 12 },
    refreshText: { color: Colors.secondary, fontWeight: '700', fontSize: 13 },
    confirmCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
    confirmCommodity: { color: Colors.text, fontSize: 20, fontWeight: '900' },
    confirmRoute: { color: Colors.textMuted, fontSize: 13 },
    confirmDetails: { gap: 8 },
    confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    confirmRowLabel: { color: Colors.textMuted, fontSize: 13 },
    confirmRowValue: { color: Colors.text, fontSize: 13, fontWeight: '700' },
    costBreakdown: { gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
    costTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    divider: { height: 1, backgroundColor: Colors.border },
    warningBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.secondary + '11', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.secondary + '44' },
    warningText: { flex: 1, color: Colors.secondary, fontSize: 12 },
    confirmBtn: { backgroundColor: Colors.secondary, borderRadius: 14, padding: 16, alignItems: 'center' },
    confirmBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
    cancelBtn: { alignItems: 'center', padding: 12 },
    cancelText: { color: Colors.textMuted, fontSize: 13 },
    resultWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    resultTitle: { color: Colors.text, fontSize: 22, fontWeight: '900' },
    resultCommodity: { color: Colors.secondary, fontSize: 15, fontWeight: '700' },
    resultRoute: { color: Colors.textMuted, fontSize: 13 },
    resultStats: { flexDirection: 'row', gap: 20, marginTop: 12 },
    resultStat: { alignItems: 'center', gap: 4 },
    resultStatLabel: { color: Colors.textMuted, fontSize: 12 },
    resultStatVal: { fontSize: 20, fontWeight: '900' },
    careerUpdate: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4, width: '100%', marginTop: 8 },
    careerUpdateLabel: { color: Colors.text, fontWeight: '800', fontSize: 13 },
    careerUpdateSub: { color: Colors.textMuted, fontSize: 12 },
  }), [Colors]);
  const [view, setView] = useState<ScreenView>('career');
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableLoads, setAvailableLoads] = useState<VirtualLoad[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<VirtualLoad | null>(null);
  const [tripResult, setTripResult] = useState<{ profit: number; onTime: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  // fuel price per mile derived from live EIA diesel price (assume 6 mpg)
  const [fuelPpm, setFuelPpm] = useState(BUSINESS_EXPENSES.fuelCostPerMile);
  const [dieselPrice, setDieselPrice] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      getRoadReadyProfile(),
      getEIADieselPrices().catch(() => null),
    ]).then(([profile, eia]) => {
      setStats(profile.profile.freightStats as CareerStats);
      setAvailableLoads(pickLoads());
      if (eia?.price) {
        const price = parseFloat(eia.price);
        if (!isNaN(price) && price > 0) {
          setDieselPrice(price);
          setFuelPpm(parseFloat((price / 6).toFixed(4))); // 6 mpg average
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const acceptLoad = (load: VirtualLoad) => {
    setSelectedLoad(load);
    setView('accept');
  };

  const confirmLoad = async () => {
    if (!selectedLoad || !stats) return;
    setSaving(true);
    const profit = calcProfit(selectedLoad, fuelPpm);
    const onTimeChance = selectedLoad.difficulty === 'easy' ? 0.95 : selectedLoad.difficulty === 'medium' ? 0.80 : 0.65;
    const onTime = Math.random() < onTimeChance;
    setTripResult({ profit, onTime });

    const newLoads = stats.loadsCompleted + 1;
    const newMiles = stats.totalMiles + selectedLoad.miles;
    const newRevenue = stats.grossRevenue + selectedLoad.rate;
    const newProfit = stats.netProfit + profit;
    const prevOnTimeTotal = stats.onTimeRate * stats.loadsCompleted;
    const newOnTimeRate = (prevOnTimeTotal + (onTime ? 100 : 0)) / newLoads;
    const newRPM = newRevenue / newMiles;

    try {
      const r = await updateFreightCareer({
        loadsCompleted: newLoads,
        totalMiles: newMiles,
        grossRevenue: newRevenue,
        netProfit: newProfit,
        onTimeRate: newOnTimeRate,
        avgRatePerMile: parseFloat(newRPM.toFixed(2)),
      });
      setStats(r.profile.freightStats as CareerStats);
    } catch (_) {}
    setSaving(false);
    setView('result');
  };

  const backToCareer = () => {
    setSelectedLoad(null);
    setTripResult(null);
    setAvailableLoads(pickLoads());
    setView('career');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;
  }

  // ── Career Dashboard ───────────────────────────────────────────────────────
  if (view === 'career') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Stats card */}
          <View style={styles.statsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.statsTitle}>CAREER STATS</Text>
              {dieselPrice != null && (
                <Text style={{ color: Colors.secondary, fontSize: 11, fontWeight: '700' }}>
                  ⛽ ${dieselPrice.toFixed(3)}/gal (live)
                </Text>
              )}
            </View>
            <View style={styles.statsGrid}>
              <StatItem label="Loads" value={String(stats?.loadsCompleted ?? 0)} icon="cube-outline" />
              <StatItem label="Miles" value={((stats?.totalMiles ?? 0) / 1000).toFixed(1) + 'k'} icon="speedometer-outline" />
              <StatItem label="Revenue" value={'$' + ((stats?.grossRevenue ?? 0) / 1000).toFixed(1) + 'k'} icon="cash-outline" />
              <StatItem label="Net Profit" value={'$' + ((stats?.netProfit ?? 0) / 1000).toFixed(1) + 'k'} icon="trending-up-outline" />
              <StatItem label="On-Time %" value={(stats?.onTimeRate ?? 100).toFixed(0) + '%'} icon="checkmark-circle-outline" />
              <StatItem label="$/Mile" value={'$' + (stats?.avgRatePerMile ?? 0).toFixed(2)} icon="analytics-outline" />
            </View>
          </View>

          {/* Available loads */}
          <Text style={styles.sectionTitle}>Available Loads</Text>
          {availableLoads.map(load => (
            <View key={load.id} style={styles.loadCard}>
              <View style={styles.loadTop}>
                <View style={styles.loadRoute}>
                  <Text style={styles.loadCommodity}>{load.commodity}</Text>
                  <Text style={styles.loadRouteText}>{load.origin} → {load.destination}</Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: DIFF_COLOR[load.difficulty] + '22', borderColor: DIFF_COLOR[load.difficulty] }]}>
                  <Text style={[styles.diffText, { color: DIFF_COLOR[load.difficulty] }]}>{load.difficulty.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.loadMeta}>
                <MetaItem icon="navigate-outline" label={`${load.miles.toLocaleString()} mi`} />
                <MetaItem icon="cash-outline" label={`$${load.rate.toLocaleString()}`} />
                <MetaItem icon="analytics-outline" label={`$${load.ratePerMile}/mi`} color={load.ratePerMile >= 3 ? '#2ECC71' : load.ratePerMile >= 2.5 ? Colors.secondary : '#E74C3C'} />
                <MetaItem icon="scale-outline" label={`${(load.weight / 1000).toFixed(0)}k lbs`} />
              </View>

              <View style={styles.loadMeta}>
                <MetaItem icon="star-outline" label={`${load.brokerRating} ⭐ ${load.broker}`} />
                <MetaItem icon="time-outline" label={load.deliveryWindow} />
              </View>

              {load.notes && (
                <Text style={styles.loadNotes}>⚠ {load.notes}</Text>
              )}

              <View style={styles.loadProfit}>
                <Text style={styles.loadProfitLabel}>Est. Profit</Text>
                <Text style={[styles.loadProfitValue, { color: calcProfit(load, fuelPpm) > 0 ? '#2ECC71' : '#E74C3C' }]}>
                  ${calcProfit(load, fuelPpm).toFixed(0)}
                </Text>
              </View>

              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptLoad(load)} activeOpacity={0.8}>
                <Text style={styles.acceptBtnText}>Accept Load</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.refreshBtn} onPress={() => setAvailableLoads(pickLoads())}>
            <Ionicons name="refresh-outline" size={18} color={Colors.secondary} />
            <Text style={styles.refreshText}>Refresh Load Board</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Accept confirmation ────────────────────────────────────────────────────
  if (view === 'accept' && selectedLoad) {
    const profit = calcProfit(selectedLoad, fuelPpm);
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Confirm Load</Text>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmCommodity}>{selectedLoad.commodity}</Text>
            <Text style={styles.confirmRoute}>{selectedLoad.origin} → {selectedLoad.destination}</Text>
            <View style={styles.confirmDetails}>
              <ConfirmRow label="Distance" value={`${selectedLoad.miles.toLocaleString()} miles`} />
              <ConfirmRow label="Rate" value={`$${selectedLoad.rate.toLocaleString()}`} />
              <ConfirmRow label="Rate/Mile" value={`$${selectedLoad.ratePerMile}`} />
              <ConfirmRow label="Pickup" value={selectedLoad.pickupWindow} />
              <ConfirmRow label="Delivery" value={selectedLoad.deliveryWindow} />
              <ConfirmRow label="Broker" value={`${selectedLoad.broker} (${selectedLoad.brokerRating}★)`} />
            </View>
            <View style={styles.costBreakdown}>
              <Text style={styles.costTitle}>
                Cost Breakdown{dieselPrice != null ? ` — ⛽ $${dieselPrice.toFixed(3)}/gal` : ''}
              </Text>
              <ConfirmRow label="Fuel" value={`-$${(selectedLoad.miles * fuelPpm).toFixed(0)}`} valueColor="#E74C3C" />
              <ConfirmRow label="Maintenance" value={`-$${(selectedLoad.miles * 0.12).toFixed(0)}`} valueColor="#E74C3C" />
              <ConfirmRow label="Fixed (weekly)" value="-$1,100" valueColor="#E74C3C" />
              <View style={styles.divider} />
              <ConfirmRow
                label="Est. Net Profit"
                value={`$${profit.toFixed(0)}`}
                valueColor={profit > 0 ? '#2ECC71' : '#E74C3C'}
                bold
              />
            </View>
            {selectedLoad.notes && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color={Colors.secondary} />
                <Text style={styles.warningText}>{selectedLoad.notes}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmLoad} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>🚛  Hit the Road!</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setView('career')}>
            <Text style={styles.cancelText}>Pass on This Load</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Trip Result ────────────────────────────────────────────────────────────
  if (view === 'result' && selectedLoad && tripResult) {
    const win = tripResult.profit > 0;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.resultWrap}>
          <Ionicons name={win ? 'checkmark-circle' : 'alert-circle'} size={72} color={win ? '#2ECC71' : '#E74C3C'} />
          <Text style={styles.resultTitle}>{tripResult.onTime ? 'Delivered On Time!' : 'Late Delivery'}</Text>
          <Text style={styles.resultCommodity}>{selectedLoad.commodity}</Text>
          <Text style={styles.resultRoute}>{selectedLoad.origin} → {selectedLoad.destination}</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>Revenue</Text>
              <Text style={[styles.resultStatVal, { color: '#2ECC71' }]}>+${selectedLoad.rate.toLocaleString()}</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>Net Profit</Text>
              <Text style={[styles.resultStatVal, { color: win ? '#2ECC71' : '#E74C3C' }]}>
                {tripResult.profit >= 0 ? '+' : ''}${tripResult.profit.toFixed(0)}
              </Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>On-Time</Text>
              <Text style={[styles.resultStatVal, { color: tripResult.onTime ? '#2ECC71' : '#E74C3C' }]}>
                {tripResult.onTime ? '✓ Yes' : '✗ Late'}
              </Text>
            </View>
          </View>
          <View style={styles.careerUpdate}>
            <Text style={styles.careerUpdateLabel}>Career Totals Updated</Text>
            <Text style={styles.careerUpdateSub}>
              {stats?.loadsCompleted} loads • {stats?.totalMiles.toLocaleString()} mi • ${stats?.netProfit.toFixed(0)} net
            </Text>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={backToCareer}>
            <Text style={styles.confirmBtnText}>Back to Load Board</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  const Colors = useColors();
  return (
    <View style={{ flex: 1, minWidth: '30%', alignItems: 'center', gap: 4, padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 10 }}>
      <Ionicons name={icon as any} size={18} color={Colors.secondary} />
      <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function MetaItem({ icon, label, color }: { icon: string; label: string; color?: string }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as any} size={13} color={color ?? Colors.textMuted} />
      <Text style={[{ color: Colors.textMuted, fontSize: 12 }, color ? { color } : {}]}>{label}</Text>
    </View>
  );
}

function ConfirmRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: '700' }, valueColor ? { color: valueColor } : {}, bold ? { fontWeight: '900' } : {}]}>
        {value}
      </Text>
    </View>
  );
}
