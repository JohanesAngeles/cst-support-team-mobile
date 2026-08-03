import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

interface BenchmarkResult {
  rpmMin: number | null;
  rpmMax: number | null;
  rpmAvg: number | null;
  marketCondition: 'TIGHT' | 'BALANCED' | 'SOFT' | null;
  insight: string | null;
  upgrade?: boolean;
  upgradeMsg?: string;
}

const TRUCK_TYPES = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Tanker', 'LTL'];

const COMMODITIES: { label: string; liability: string }[] = [
  // Low liability
  { label: 'General Freight',      liability: 'Low'    },
  { label: 'Dry Goods',            liability: 'Low'    },
  { label: 'Lumber / Building',    liability: 'Low'    },
  { label: 'Paper / Cardboard',    liability: 'Low'    },
  { label: 'Textiles / Clothing',  liability: 'Low'    },
  { label: 'Plastic Materials',    liability: 'Low'    },
  { label: 'Furniture',            liability: 'Low'    },
  { label: 'Agricultural / Grain', liability: 'Low'    },
  { label: 'Sand / Gravel',        liability: 'Low'    },
  { label: 'Waste / Recycling',    liability: 'Low'    },
  // Medium liability
  { label: 'Refrigerated Produce', liability: 'Medium' },
  { label: 'Fresh Produce',        liability: 'Medium' },
  { label: 'Frozen Foods',         liability: 'Medium' },
  { label: 'Food & Beverage',      liability: 'Medium' },
  { label: 'Automotive Parts',     liability: 'Medium' },
  { label: 'Steel / Metal',        liability: 'Medium' },
  { label: 'Machinery / Heavy',    liability: 'Medium' },
  { label: 'Construction Matl.',   liability: 'Medium' },
  { label: 'Household Goods',      liability: 'Medium' },
  { label: 'Petroleum Products',   liability: 'Medium' },
  { label: 'Military / Gov\'t',    liability: 'Medium' },
  { label: 'Oversized / OW Load',  liability: 'Medium' },
  // High liability
  { label: 'Electronics / Tech',   liability: 'High'   },
  { label: 'Pharmaceuticals',      liability: 'High'   },
  { label: 'Medical Equipment',    liability: 'High'   },
  { label: 'Hazmat',               liability: 'High'   },
  { label: 'Chemicals',            liability: 'High'   },
  { label: 'Livestock',            liability: 'High'   },
  { label: 'New Vehicles',         liability: 'High'   },
  { label: 'Jewelry / Valuables',  liability: 'High'   },
];

const LIABILITY_COLOR: Record<string, string> = {
  Low:    '#2ECC71',
  Medium: '#F39C12',
  High:   '#E74C3C',
};

const CONDITION_CONFIG = {
  TIGHT:    { color: '#2ECC71', bg: '#2ECC7122', label: 'Tight Market',    desc: 'High demand — rates favor drivers' },
  BALANCED: { color: '#F39C12', bg: '#F39C1222', label: 'Balanced Market', desc: 'Rates are near the average'         },
  SOFT:     { color: '#E74C3C', bg: '#E74C3C22', label: 'Soft Market',     desc: 'Carrier supply exceeds demand'      },
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function RateBenchmarkScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 16, paddingBottom: 40 },
    subheading: { color: Colors.textMuted, fontSize: 13, marginBottom: 16 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1,
      borderColor: Colors.border, padding: 16, marginBottom: 14, gap: 12,
    },
    cardTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'flex-end' },
    label: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5, letterSpacing: 0.3 },
    input: {
      backgroundColor: Colors.surfaceLight ?? '#2A2A2E', borderRadius: 8, borderWidth: 1,
      borderColor: Colors.border, color: Colors.text, paddingHorizontal: 12,
      paddingVertical: 10, fontSize: 14,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: Colors.surfaceLight ?? '#2A2A2E', borderWidth: 1, borderColor: Colors.border,
    },
    typeChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    typeChipTxt: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
    typeChipTxtActive: { color: Colors.textDark },
    searchBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: 8, marginBottom: 20,
    },
    searchTxt: { color: Colors.textDark, fontWeight: '900', fontSize: 15 },
    conditionCard: {
      borderRadius: 14, borderWidth: 2, padding: 16, marginBottom: 14,
    },
    conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    conditionDot: { width: 14, height: 14, borderRadius: 7 },
    conditionLabel: { fontSize: 16, fontWeight: '900' },
    conditionDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    laneLabel: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: -4 },
    rateRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    rateBox: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceLight ?? '#2A2A2E', borderRadius: 10, padding: 12 },
    rateBoxCenter: { borderWidth: 1, borderColor: Colors.secondary + '55' },
    rateBoxLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    rateBoxValue: { fontSize: 22, fontWeight: '900' },
    rateBoxUnit: { fontSize: 12, fontWeight: '600' },
    insightCard: {
      backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1,
      borderColor: Colors.secondary + '44', borderLeftWidth: 4, borderLeftColor: Colors.secondary,
      padding: 16, marginBottom: 14,
    },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    insightTitle: { color: Colors.secondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    insightText: { color: Colors.textMuted, fontSize: 13, lineHeight: 21 },
    disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
    placeholder: { alignItems: 'center', paddingTop: 40, gap: 12 },
    placeholderEmoji: { fontSize: 56 },
    placeholderText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  }), [Colors]);
  const [origin, setOrigin]       = useState('');
  const [dest, setDest]           = useState('');
  const [truckType, setTruckType] = useState('Dry Van');
  const [commodity, setCommodity] = useState('General Freight');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<BenchmarkResult | null>(null);

  const search = async () => {
    if (!origin.trim() || !dest.trim()) {
      Alert.alert('Missing info', 'Enter both origin and destination.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post('/ai/rate-benchmark', {
        origin: origin.trim(),
        destination: dest.trim(),
        truckType,
        commodity,
      }, { timeout: 30000 });
      setResult(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not load benchmarks. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const cond = result?.marketCondition;
  const cc = cond === 'TIGHT' || cond === 'BALANCED' || cond === 'SOFT'
    ? CONDITION_CONFIG[cond]
    : null;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={s.subheading}>See what the market is paying for your lane before you negotiate.</Text>

          {/* Lane inputs */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Lane</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Origin</Text>
                <TextInput style={s.input} value={origin} onChangeText={setOrigin}
                  placeholder="e.g. Dallas, TX" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.textMuted} style={{ marginTop: 28, marginHorizontal: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Destination</Text>
                <TextInput style={s.input} value={dest} onChangeText={setDest}
                  placeholder="e.g. Atlanta, GA" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
              </View>
            </View>
          </View>

          {/* Truck type */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Truck Type</Text>
            <View style={s.typeGrid}>
              {TRUCK_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, truckType === t && s.typeChipActive]}
                  onPress={() => setTruckType(t)}
                >
                  <Text style={[s.typeChipTxt, truckType === t && s.typeChipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Commodity type */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Commodity Type</Text>
            <Text style={[s.label, { marginBottom: 8 }]}>Affects freight liability and negotiation leverage</Text>
            <View style={s.typeGrid}>
              {COMMODITIES.map(c => {
                const active = commodity === c.label;
                return (
                  <TouchableOpacity
                    key={c.label}
                    style={[s.typeChip, active && s.typeChipActive]}
                    onPress={() => setCommodity(c.label)}
                  >
                    <Text style={[s.typeChipTxt, active && s.typeChipTxtActive]}>{c.label}</Text>
                    {active && (
                      <Text style={{ fontSize: 9, fontWeight: '800', color: LIABILITY_COLOR[c.liability], marginTop: 2 }}>
                        {c.liability.toUpperCase()} LIABILITY
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              const sel = COMMODITIES.find(c => c.label === commodity);
              if (!sel) return null;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 10, backgroundColor: LIABILITY_COLOR[sel.liability] + '14', borderRadius: 10, borderWidth: 1, borderColor: LIABILITY_COLOR[sel.liability] + '40' }}>
                  <Ionicons name="warning-outline" size={14} color={LIABILITY_COLOR[sel.liability]} />
                  <Text style={{ flex: 1, fontSize: 12, color: LIABILITY_COLOR[sel.liability], fontWeight: '600' }}>
                    {sel.liability} liability freight — know the replacement value before negotiating your rate.
                  </Text>
                </View>
              );
            })()}
          </View>

          <TouchableOpacity style={[s.searchBtn, loading && { opacity: 0.6 }]} onPress={search} disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color={Colors.textDark} />
                <Text style={s.searchTxt}>Scanning Market Rates...</Text>
              </>
            ) : (
              <>
                <Ionicons name="pulse-outline" size={18} color={Colors.textDark} />
                <Text style={s.searchTxt}>Get Rate Benchmarks</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Free-tier upgrade prompt */}
          {result?.upgrade && (
            <View style={[s.conditionCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
              <View style={s.conditionRow}>
                <Ionicons name="lock-closed-outline" size={22} color={Colors.textMuted} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.conditionLabel, { color: Colors.text }]}>Rate Benchmarks — Premium</Text>
                  <Text style={s.conditionDesc}>{result.upgradeMsg}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Premium results */}
          {result && cc && (
            <>
              <View style={[s.conditionCard, { borderColor: cc.color, backgroundColor: cc.bg }]}>
                <View style={s.conditionRow}>
                  <View style={[s.conditionDot, { backgroundColor: cc.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.conditionLabel, { color: cc.color }]}>{cc.label}</Text>
                    <Text style={s.conditionDesc}>{cc.desc}</Text>
                  </View>
                </View>
              </View>

              {result.rpmMin && result.rpmMax ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Market Rate Range — {truckType}</Text>
                  <Text style={s.laneLabel}>{origin} → {dest} · {commodity}</Text>
                  <View style={s.rateRow}>
                    <View style={s.rateBox}>
                      <Text style={s.rateBoxLabel}>Low</Text>
                      <Text style={[s.rateBoxValue, { color: '#E74C3C' }]}>{fmt(result.rpmMin)}<Text style={s.rateBoxUnit}>/mi</Text></Text>
                    </View>
                    {result.rpmAvg ? (
                      <View style={[s.rateBox, s.rateBoxCenter]}>
                        <Text style={s.rateBoxLabel}>Average</Text>
                        <Text style={[s.rateBoxValue, { color: Colors.secondary }]}>{fmt(result.rpmAvg)}<Text style={s.rateBoxUnit}>/mi</Text></Text>
                      </View>
                    ) : null}
                    <View style={s.rateBox}>
                      <Text style={s.rateBoxLabel}>High</Text>
                      <Text style={[s.rateBoxValue, { color: '#2ECC71' }]}>{fmt(result.rpmMax)}<Text style={s.rateBoxUnit}>/mi</Text></Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {result.insight ? (
                <View style={s.insightCard}>
                  <View style={s.insightHeader}>
                    <Ionicons name="bulb-outline" size={16} color={Colors.secondary} />
                    <Text style={s.insightTitle}>Market Insight</Text>
                  </View>
                  <Text style={s.insightText}>{result.insight}</Text>
                </View>
              ) : null}

              <Text style={s.disclaimer}>Rates are AI-estimated from market knowledge. Actual rates vary by date, broker, and conditions.</Text>
            </>
          )}

          {!result && !loading && (
            <View style={s.placeholder}>
              <Text style={s.placeholderEmoji}>📊</Text>
              <Text style={s.placeholderText}>Enter your lane above to see what the market is paying</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
