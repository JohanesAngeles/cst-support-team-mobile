import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import { getRevenue, getLiveRevenue, updateRevenue } from '../../api/features';

type Period = 'Week' | 'Month' | 'Quarter' | 'Year';

interface ExpenseItem { label: string; amount: number; color: string; }
interface RevenueData {
  period: Period;
  grossRevenue: number;
  netProfit: number;
  totalMiles: number;
  fuelCost: number;
  expenses: ExpenseItem[];
  trend: number[];
}

const fmt = (n: number) => `$${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toLocaleString()}`;
const fmtFull = (n: number) => `$${n.toLocaleString()}`;

const EMPTY: RevenueData = { period: 'Month', grossRevenue: 0, netProfit: 0, totalMiles: 0, fuelCost: 0, expenses: [], trend: [] };

export default function ProfitLossScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { paddingVertical: 60, alignItems: 'center' },
    content: { padding: 16, gap: 14, paddingBottom: 32 },
    toggleRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, gap: 2 },
    toggleBtn: { flex: 1, flexDirection: 'row', paddingVertical: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
    toggleBtnActive: { backgroundColor: Colors.secondary },
    toggleText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    toggleTextActive: { color: Colors.textDark },
    periodRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, gap: 2 },
    periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    periodBtnActive: { backgroundColor: Colors.secondary },
    periodText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    periodTextActive: { color: Colors.textDark },
    empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280 },
    emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
    heroRow: { flexDirection: 'row', gap: 10 },
    heroCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
    heroCardProfit: { borderColor: Colors.success + '44' },
    heroLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 6 },
    heroValue: { color: Colors.text, fontSize: 24, fontWeight: '900' },
    kpiRow: { flexDirection: 'row', gap: 8 },
    kpiCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
    kpiValue: { fontSize: 15, fontWeight: '800' },
    kpiLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 14 },
    totalExpenses: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
    barWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barLabel: { color: Colors.textMuted, fontSize: 8, marginBottom: 2, textAlign: 'center' },
    barTrack: { width: '80%', height: 80, justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: 4 },
    barIndex: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
    stackBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
    stackSegment: { height: 10 },
    expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
    expDot: { width: 10, height: 10, borderRadius: 5 },
    expLabel: { color: Colors.textMuted, fontSize: 13, width: 68 },
    expBarWrap: { flex: 1, height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
    expBar: { height: 6, borderRadius: 3 },
    expPct: { color: Colors.textMuted, fontSize: 12, width: 36, textAlign: 'right' },
    expAmount: { color: Colors.text, fontSize: 12, fontWeight: '700', width: 72, textAlign: 'right' },
    summaryCard: { flexDirection: 'row', alignItems: 'center', borderColor: Colors.secondary + '44' },
    summaryTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    summaryText: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
    updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondary, borderRadius: 12, padding: 14, gap: 8 },
    updateBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    confirmText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [period, setPeriod] = useState<Period>('Month');
  const [data, setData] = useState<RevenueData>(EMPTY);
  const [liveData, setLiveData] = useState<RevenueData | null>(null);
  const [showLive, setShowLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [grossRev, setGrossRev] = useState('');
  const [netPr, setNetPr] = useState('');
  const [totalMi, setTotalMi] = useState('');
  const [fuelC, setFuelC] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      const [manual, live] = await Promise.allSettled([getRevenue(p), getLiveRevenue(p)]);
      if (manual.status === 'fulfilled') setData({ ...EMPTY, ...manual.value, period: p });
      if (live.status === 'fulfilled') setLiveData({ ...EMPTY, ...live.value, period: p });
    } catch {
      Alert.alert('Error', 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const openEdit = () => {
    setGrossRev(data.grossRevenue > 0 ? data.grossRevenue.toString() : '');
    setNetPr(data.netProfit > 0 ? data.netProfit.toString() : '');
    setTotalMi(data.totalMiles > 0 ? data.totalMiles.toString() : '');
    setFuelC(data.fuelCost > 0 ? data.fuelCost.toString() : '');
    setEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const grev = parseFloat(grossRev) || 0;
    const nprof = parseFloat(netPr) || 0;
    const tmiles = parseFloat(totalMi) || 0;
    const fcost = parseFloat(fuelC) || 0;
    const totalExp = grev - nprof;
    const expenses: ExpenseItem[] = fcost > 0 ? [
      { label: 'Fuel', amount: fcost, color: '#3498DB' },
      ...(totalExp - fcost > 0 ? [{ label: 'Other', amount: totalExp - fcost, color: '#95A5A6' }] : []),
    ] : [];
    const trend = data.trend.length > 0 ? [...data.trend.slice(-5), grev] : [grev];
    try {
      const updated = await updateRevenue(period, { grossRevenue: grev, netProfit: nprof, totalMiles: tmiles, fuelCost: fcost, expenses, trend });
      setData({ ...EMPTY, ...updated, period });
      setEditModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const d = (showLive && liveData) ? liveData : data;
  const totalExpenses = d.grossRevenue - d.netProfit;
  const margin = d.grossRevenue > 0 ? ((d.netProfit / d.grossRevenue) * 100).toFixed(1) : '0.0';
  const cpm = d.totalMiles > 0 ? (totalExpenses / d.totalMiles).toFixed(2) : '0.00';
  const fuelPct = d.grossRevenue > 0 ? Math.round((d.fuelCost / d.grossRevenue) * 100) : 0;
  const maxTrend = d.trend.length > 0 ? Math.max(...d.trend) : 1;
  const hasData = d.grossRevenue > 0;
  const hasLive = liveData !== null;


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.periodRow}>
          {(['Week', 'Month', 'Quarter', 'Year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {hasLive && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, showLive && styles.toggleBtnActive]}
              onPress={() => setShowLive(true)}
            >
              <Ionicons name="flash-outline" size={13} color={showLive ? Colors.textDark : Colors.textMuted} />
              <Text style={[styles.toggleText, showLive && styles.toggleTextActive]}>Live</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !showLive && styles.toggleBtnActive]}
              onPress={() => setShowLive(false)}
            >
              <Ionicons name="pencil-outline" size={13} color={!showLive ? Colors.textDark : Colors.textMuted} />
              <Text style={[styles.toggleText, !showLive && styles.toggleTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
        ) : !hasData ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No data for this period</Text>
            <Text style={styles.emptySubText}>
              {showLive
                ? 'Add trips in Trip Log and costs in Expenses to see auto-calculated P&L'
                : 'Tap the button below to enter your revenue and expense numbers'}
            </Text>
            {!showLive && (
              <TouchableOpacity style={styles.emptyBtn} onPress={openEdit}>
                <Text style={styles.emptyBtnText}>Enter {period} Data</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.heroRow}>
              <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Gross Revenue</Text>
                <Text style={styles.heroValue}>{fmtFull(d.grossRevenue)}</Text>
              </View>
              <View style={[styles.heroCard, styles.heroCardProfit]}>
                <Text style={styles.heroLabel}>Net Profit</Text>
                <Text style={[styles.heroValue, { color: Colors.success }]}>{fmtFull(d.netProfit)}</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              {[
                { label: 'Profit Margin', value: `${margin}%`, icon: 'trending-up-outline', color: Colors.success },
                { label: 'Cost/Mile',     value: `$${cpm}`,    icon: 'speedometer-outline', color: '#E67E22' },
                { label: 'Total Miles',   value: d.totalMiles > 0 ? d.totalMiles.toLocaleString() : '—', icon: 'map-outline', color: '#3498DB' },
                { label: 'Fuel %',        value: `${fuelPct}%`, icon: 'water-outline', color: '#9B59B6' },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={styles.kpiCard}>
                  <Ionicons name={icon as any} size={18} color={color} />
                  <Text style={[styles.kpiValue, { color }]}>{value}</Text>
                  <Text style={styles.kpiLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {d.trend.length > 1 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Revenue Trend (Last {d.trend.length} Periods)</Text>
                <View style={styles.chartRow}>
                  {d.trend.map((val, i) => {
                    const barHeight = Math.round((val / maxTrend) * 80);
                    const isLast = i === d.trend.length - 1;
                    return (
                      <View key={i} style={styles.barWrap}>
                        <Text style={styles.barLabel}>{fmt(val)}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.bar, { height: barHeight, backgroundColor: isLast ? Colors.secondary : Colors.primary }]} />
                        </View>
                        <Text style={styles.barIndex}>{i + 1}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {d.expenses.length > 0 && totalExpenses > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Expense Breakdown</Text>
                <Text style={styles.totalExpenses}>Total: {fmtFull(totalExpenses)}</Text>
                <View style={styles.stackBar}>
                  {d.expenses.map((exp) => (
                    <View key={exp.label} style={[styles.stackSegment, { flex: exp.amount / totalExpenses, backgroundColor: exp.color }]} />
                  ))}
                </View>
                {d.expenses.map((exp) => {
                  const pct = ((exp.amount / totalExpenses) * 100).toFixed(1);
                  return (
                    <View key={exp.label} style={styles.expRow}>
                      <View style={[styles.expDot, { backgroundColor: exp.color }]} />
                      <Text style={styles.expLabel}>{exp.label}</Text>
                      <View style={styles.expBarWrap}>
                        <View style={[styles.expBar, { flex: exp.amount / totalExpenses, backgroundColor: exp.color + '66' }]} />
                      </View>
                      <Text style={styles.expPct}>{pct}%</Text>
                      <Text style={styles.expAmount}>{fmtFull(exp.amount)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={[styles.card, styles.summaryCard]}>
              <Ionicons name="trophy-outline" size={24} color={Colors.secondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.summaryTitle}>Performance Summary</Text>
                <Text style={styles.summaryText}>
                  {parseFloat(margin) >= 30
                    ? `Excellent! ${margin}% margin is above target.`
                    : parseFloat(margin) >= 20
                    ? `Good. ${margin}% margin — aim for 30%+.`
                    : `Margin at ${margin}% — review fuel and repair costs.`}
                </Text>
              </View>
            </View>

            {showLive ? (
              <TouchableOpacity style={styles.updateBtn} onPress={() => { setShowLive(false); openEdit(); }}>
                <Ionicons name="pencil-outline" size={18} color={Colors.textDark} />
                <Text style={styles.updateBtnText}>Override with Manual Numbers</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.updateBtn} onPress={openEdit}>
                <Ionicons name="pencil-outline" size={18} color={Colors.textDark} />
                <Text style={styles.updateBtnText}>Update {period} Numbers</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter {period} Revenue</Text>
            {[
              { label: 'Gross Revenue ($)', val: grossRev, set: setGrossRev, ph: '0' },
              { label: 'Net Profit ($)', val: netPr, set: setNetPr, ph: '0' },
              { label: 'Total Miles', val: totalMi, set: setTotalMi, ph: '0' },
              { label: 'Fuel Cost ($)', val: fuelC, set: setFuelC, ph: '0' },
            ].map(({ label, val, set, ph }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput style={styles.modalInput} value={val} onChangeText={set} keyboardType="numeric" placeholder={ph} placeholderTextColor={Colors.textMuted} />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
