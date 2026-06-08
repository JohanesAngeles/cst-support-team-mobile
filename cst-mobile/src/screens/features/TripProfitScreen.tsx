import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Verdict = 'GO' | 'CAUTION' | 'PASS';

interface Results {
  gross: number;
  fuelCost: number;
  tollsCost: number;
  perDiemCost: number;
  driverShareAmt: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  ratePerMile: number;
  costPerMile: number;
  fuelPct: number;
  breakEvenRate: number;
  verdict: Verdict;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const n = (s: string) => parseFloat(s) || 0;
const fmt = (v: number) =>
  `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${v < 0 ? ' loss' : ''}`;
const fmtCPM = (v: number) => `$${v.toFixed(3)}`;

function compute(miles: string, rate: string, fuel: string, tolls: string, perDiem: string, driverShare: string): Results | null {
  const gross = n(rate);
  if (gross === 0) return null;
  const mi = n(miles);
  const fuelCost = n(fuel);
  const tollsCost = n(tolls);
  const perDiemCost = n(perDiem);
  const sharePct = n(driverShare);
  const driverShareAmt = gross * (sharePct / 100);
  const totalCosts = fuelCost + tollsCost + perDiemCost + driverShareAmt;
  const netProfit = gross - totalCosts;
  const margin = (netProfit / gross) * 100;
  const ratePerMile = mi > 0 ? gross / mi : 0;
  const costPerMile = mi > 0 ? totalCosts / mi : 0;
  const fuelPct = fuelCost > 0 ? (fuelCost / gross) * 100 : 0;
  const breakEvenRate = mi > 0 ? totalCosts / mi : 0;
  const verdict: Verdict = margin >= 15 ? 'GO' : margin >= 0 ? 'CAUTION' : 'PASS';
  return { gross, fuelCost, tollsCost, perDiemCost, driverShareAmt, totalCosts, netProfit, margin, ratePerMile, costPerMile, fuelPct, breakEvenRate, verdict };
}

// ─── Input field ───────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; prefix?: string; suffix?: string;
}) {
  const Colors = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceLight, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, height: 46,
      }}>
        {prefix ? <Text style={{ color: Colors.textMuted, fontSize: 15, marginRight: 2 }}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          style={{ flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' }}
        />
        {suffix ? <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function TripProfitScreen() {
  const Colors = useColors();

  const [miles,       setMiles]       = useState('');
  const [rate,        setRate]        = useState('');
  const [fuel,        setFuel]        = useState('');
  const [tolls,       setTolls]       = useState('');
  const [perDiem,     setPerDiem]     = useState('');
  const [driverShare, setDriverShare] = useState('');
  const [results,     setResults]     = useState<Results | null>(null);

  function onCalculate() {
    setResults(compute(miles, rate, fuel, tolls, perDiem, driverShare));
  }

  const verdictColor =
    results?.verdict === 'GO'      ? '#27AE60' :
    results?.verdict === 'CAUTION' ? '#F39C12' :
    results?.verdict === 'PASS'    ? '#E74C3C' :
    Colors.textMuted;

  const verdictIcon =
    results?.verdict === 'GO'      ? 'checkmark-circle' :
    results?.verdict === 'CAUTION' ? 'warning' :
    'close-circle';

  const verdictMsg =
    results?.verdict === 'GO'      ? "This load is profitable — take it!" :
    results?.verdict === 'CAUTION' ? "Marginal profit — negotiate or cut costs" :
    "You'd lose money — pass on this load";

  const NAVY = '#021B3A';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Load Details ── */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 }}>
            <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>LOAD DETAILS</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="MILES" value={miles} onChange={setMiles} placeholder="e.g. 800" />
              <Field label="OFFERED RATE ($)" value={rate} onChange={setRate} prefix="$" placeholder="e.g. 2400" />
            </View>
          </View>

          {/* ── Costs ── */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 }}>
            <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>YOUR COSTS</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="FUEL COST ($)" value={fuel} onChange={setFuel} prefix="$" placeholder="e.g. 600" />
              <Field label="TOLLS ($)" value={tolls} onChange={setTolls} prefix="$" placeholder="0" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="PER DIEM ($)" value={perDiem} onChange={setPerDiem} prefix="$" placeholder="0" />
              <Field label="DRIVER SHARE" value={driverShare} onChange={setDriverShare} suffix="%" placeholder="0 = owner-op" />
            </View>
          </View>

          {/* ── Calculate ── */}
          <TouchableOpacity
            onPress={onCalculate}
            activeOpacity={0.8}
            style={{ backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 }}>CALCULATE</Text>
          </TouchableOpacity>

          {results && (
            <>
              {/* ── Verdict banner ── */}
              <View style={{
                backgroundColor: verdictColor + '18',
                borderRadius: 16, padding: 20, alignItems: 'center',
                borderWidth: 2, borderColor: verdictColor, gap: 6,
              }}>
                <Ionicons name={verdictIcon as any} size={48} color={verdictColor} />
                <Text style={{ color: verdictColor, fontSize: 40, fontWeight: '900', letterSpacing: 3 }}>
                  {results.verdict}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                  {verdictMsg}
                </Text>
                <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '800', marginTop: 6 }}>
                  Net:{' '}
                  <Text style={{ color: verdictColor }}>{fmt(results.netProfit)}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: '600' }}>
                    {' '}({results.margin.toFixed(1)}%)
                  </Text>
                </Text>
              </View>

              {/* ── Breakdown ── */}
              <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
                <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 }}>BREAKDOWN</Text>
                {([
                  { label: 'Gross Revenue',                               value: results.gross,          color: Colors.text,  sign: '' },
                  { label: 'Fuel',                                         value: results.fuelCost,       color: '#E74C3C',    sign: '−' },
                  { label: 'Tolls',                                        value: results.tollsCost,      color: '#E74C3C',    sign: '−' },
                  { label: 'Per Diem',                                     value: results.perDiemCost,    color: '#E74C3C',    sign: '−' },
                  { label: `Driver Share (${n(driverShare).toFixed(0)}%)`, value: results.driverShareAmt, color: '#E74C3C',    sign: '−' },
                ] as { label: string; value: number; color: string; sign: string }[])
                  .filter(r => r.sign === '' || r.value > 0)
                  .map((row, i, arr) => (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: Colors.border,
                    }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                        {row.sign ? `${row.sign} ` : ''}{row.label}
                      </Text>
                      <Text style={{ color: row.color, fontSize: 13, fontWeight: '700' }}>{fmt(row.value)}</Text>
                    </View>
                  ))}
                <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 }}>
                  <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '800' }}>= Net Profit</Text>
                  <Text style={{ color: verdictColor, fontSize: 15, fontWeight: '900' }}>{fmt(results.netProfit)}</Text>
                </View>
              </View>

              {/* ── Key metrics ── */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { label: 'Rate/Mile',  value: fmtCPM(results.ratePerMile),   icon: 'speedometer-outline',    color: '#3498DB' },
                  { label: 'Cost/Mile',  value: fmtCPM(results.costPerMile),   icon: 'trending-down-outline',  color: '#E74C3C' },
                  { label: 'Break-even', value: fmtCPM(results.breakEvenRate), icon: 'remove-circle-outline',  color: '#F39C12' },
                  { label: 'Fuel %',     value: `${results.fuelPct.toFixed(0)}%`, icon: 'water-outline',       color: '#1ABC9C' },
                ] as { label: string; value: string; icon: string; color: string }[]).map((m, i) => (
                  <View key={i} style={{
                    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
                    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4,
                  }}>
                    <Ionicons name={m.icon as any} size={18} color={m.color} />
                    <Text style={{ color: Colors.text, fontSize: 11, fontWeight: '800' }}>{m.value}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 9, textAlign: 'center' }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
