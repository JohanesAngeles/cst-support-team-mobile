import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface Load {
  id: number;
  origin: string;
  destination: string;
  miles: string;
  deadhead: string;
  rate: string;
  fuelMpg: string;
  fuelPrice: string;
}

const EMPTY_LOAD = (id: number): Load => ({
  id, origin: '', destination: '', miles: '', deadhead: '', rate: '', fuelMpg: '6.5', fuelPrice: '3.80',
});

const calc = (load: Load) => {
  const miles    = parseFloat(load.miles)    || 0;
  const dead     = parseFloat(load.deadhead) || 0;
  const rate     = parseFloat(load.rate)     || 0;
  const mpg      = parseFloat(load.fuelMpg)  || 6.5;
  const fuelPPG  = parseFloat(load.fuelPrice)|| 3.80;
  const totalMiles = miles + dead;
  const fuelCost   = totalMiles > 0 ? (totalMiles / mpg) * fuelPPG : 0;
  const rpm        = miles > 0 ? rate / miles : 0;
  const netPay     = rate - fuelCost;
  const netRpm     = miles > 0 ? netPay / miles : 0;
  return { miles, dead, rate, fuelCost, rpm, netPay, netRpm, totalMiles };
};

const fmt = (n: number, prefix = '$') =>
  `${prefix}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LoadCompareScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    subtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    loadCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    loadBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    loadBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    inputRow: { flexDirection: 'row', marginHorizontal: -4 },
    fieldLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5, letterSpacing: 0.4 },
    input: {
      backgroundColor: Colors.surfaceLight ?? '#2A2A2E', borderRadius: 8, borderWidth: 1,
      borderColor: Colors.border, color: Colors.text, paddingHorizontal: 10,
      paddingVertical: 9, fontSize: 14,
    },
    addLoadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14,
      backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.secondary + '44', borderStyle: 'dashed' },
    addLoadText: { color: Colors.secondary, fontWeight: '700', fontSize: 14 },
    resultsCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    resultsTitle: { color: Colors.text, fontWeight: '800', fontSize: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    resultRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingLeft: 14 },
    resultRowLabel: { color: Colors.textMuted, fontSize: 12, width: 100 },
    resultCells: { flex: 1, flexDirection: 'row' },
    resultCell: { flex: 1, padding: 10, alignItems: 'center', gap: 2 },
    resultCellText: { fontSize: 13, fontWeight: '700' },
    winnerBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      margin: 12, borderRadius: 10, borderWidth: 2, padding: 12,
    },
    winnerText: { flex: 1, fontWeight: '700', fontSize: 13 },
  }), [Colors]);
  const [loads, setLoads] = useState<Load[]>([EMPTY_LOAD(1), EMPTY_LOAD(2)]);

  const set = (id: number, key: keyof Load, val: string) =>
    setLoads(ls => ls.map(l => l.id === id ? { ...l, [key]: val } : l));

  const addLoad = () => {
    if (loads.length >= 3) return;
    setLoads(ls => [...ls, EMPTY_LOAD(ls.length + 1)]);
  };

  const removeLoad = (id: number) => {
    if (loads.length <= 2) return;
    setLoads(ls => ls.filter(l => l.id !== id));
  };

  const results = loads.map(l => ({ ...l, ...calc(l) }));
  const bestNetIdx = results.reduce((best, r, i) => r.netPay > results[best].netPay ? i : best, 0);
  const bestRpmIdx = results.reduce((best, r, i) => r.rpm > results[best].rpm ? i : best, 0);

  const COLORS = ['#3498DB', '#9B59B6', '#2ECC71'];

  const inp = (label: string, value: string, onChange: (v: string) => void, placeholder = '', numeric = false) => (
    <View key={label} style={{ flex: 1, marginBottom: 10, marginHorizontal: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={Colors.textMuted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        <Text style={s.subtitle}>Enter up to 3 loads to compare side-by-side</Text>

        {loads.map((load, idx) => (
          <View key={load.id} style={[s.loadCard, { borderLeftColor: COLORS[idx] }]}>
            <View style={s.cardHeader}>
              <View style={[s.loadBadge, { backgroundColor: COLORS[idx] }]}>
                <Text style={s.loadBadgeText}>LOAD {idx + 1}</Text>
              </View>
              {loads.length > 2 && (
                <TouchableOpacity onPress={() => removeLoad(load.id)}>
                  <Ionicons name="close-circle" size={20} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.inputRow}>
              {inp('Origin', load.origin, v => set(load.id, 'origin', v), 'e.g. Dallas, TX')}
              {inp('Destination', load.destination, v => set(load.id, 'destination', v), 'e.g. Houston, TX')}
            </View>
            <View style={s.inputRow}>
              {inp('Loaded Miles', load.miles, v => set(load.id, 'miles', v), '0', true)}
              {inp('Deadhead Miles', load.deadhead, v => set(load.id, 'deadhead', v), '0', true)}
            </View>
            <View style={s.inputRow}>
              {inp('Rate ($)', load.rate, v => set(load.id, 'rate', v), '0.00', true)}
              {inp('Fuel Price ($/gal)', load.fuelPrice, v => set(load.id, 'fuelPrice', v), '3.80', true)}
            </View>
            {inp('Truck MPG', load.fuelMpg, v => set(load.id, 'fuelMpg', v), '6.5', true)}
          </View>
        ))}

        {loads.length < 3 && (
          <TouchableOpacity style={s.addLoadBtn} onPress={addLoad}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
            <Text style={s.addLoadText}>Add 3rd Load</Text>
          </TouchableOpacity>
        )}

        {/* Results comparison */}
        {results.some(r => r.rate > 0) && (
          <View style={s.resultsCard}>
            <Text style={s.resultsTitle}>Comparison</Text>

            {[
              { label: 'Gross Pay',      key: 'rate',     fmt: (v: number) => fmt(v) },
              { label: 'Rate per Mile',  key: 'rpm',      fmt: (v: number) => fmt(v) + '/mi' },
              { label: 'Fuel Cost',      key: 'fuelCost', fmt: (v: number) => '-' + fmt(v), neg: true },
              { label: 'Net Pay',        key: 'netPay',   fmt: (v: number) => fmt(v) },
              { label: 'Net per Mile',   key: 'netRpm',   fmt: (v: number) => fmt(v) + '/mi' },
              { label: 'Total Miles',    key: 'totalMiles',fmt: (v: number) => `${Math.round(v)} mi` },
            ].map(row => (
              <View key={row.label} style={s.resultRow}>
                <Text style={s.resultRowLabel}>{row.label}</Text>
                <View style={s.resultCells}>
                  {results.map((r, i) => {
                    const val = r[row.key as keyof typeof r] as number;
                    const isBest = (row.key === 'netPay' && i === bestNetIdx) || (row.key === 'rpm' && i === bestRpmIdx);
                    return (
                      <View key={i} style={[s.resultCell, isBest && { backgroundColor: COLORS[i] + '22' }]}>
                        <Text style={[s.resultCellText, { color: row.neg ? '#E74C3C' : COLORS[i] }, isBest && { fontWeight: '900' }]}>
                          {row.fmt(val)}
                        </Text>
                        {isBest && <Ionicons name="trophy" size={10} color={COLORS[i]} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Winner banner */}
            <View style={[s.winnerBanner, { borderColor: COLORS[bestNetIdx] }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS[bestNetIdx]} />
              <Text style={[s.winnerText, { color: COLORS[bestNetIdx] }]}>
                Load {bestNetIdx + 1} wins — best net pay at {fmt(results[bestNetIdx].netRpm)}/mi
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

