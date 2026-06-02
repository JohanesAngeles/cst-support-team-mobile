import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

const PER_DIEM_RATE = 69;        // IRS 2024 rate for transportation workers
const DEDUCTIBLE_PCT = 0.80;     // 80% deductible for transportation workers

const TAX_BRACKETS = [
  { label: '10%', rate: 0.10 },
  { label: '12%', rate: 0.12 },
  { label: '22%', rate: 0.22 },
  { label: '24%', rate: 0.24 },
  { label: '32%', rate: 0.32 },
  { label: '35%', rate: 0.35 },
];

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PerDiemScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    infoBanner: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: Colors.secondary + '18', borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: Colors.secondary + '33',
    },
    infoBannerText: { flex: 1, color: Colors.secondary, fontSize: 13, lineHeight: 19 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12 },
    cardTitle: { color: Colors.text, fontWeight: '800', fontSize: 14 },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputWrap: { flex: 1, gap: 6 },
    fieldLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1,
      borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14,
      paddingVertical: 12, fontSize: 20, fontWeight: '800', textAlign: 'center',
    },
    inputHint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
    bracketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bracketBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
      backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    },
    bracketBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    bracketBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: 14 },
    bracketBtnTextActive: { color: Colors.textDark },
    resultsCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    resultsTitle: { color: Colors.text, fontWeight: '800', fontSize: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    resultRowHighlight: { backgroundColor: Colors.secondary + '11' },
    resultLabel: { color: Colors.textMuted, fontSize: 13 },
    resultSub: { color: Colors.border, fontSize: 11, marginTop: 2 },
    resultValue: { color: Colors.secondary, fontWeight: '800', fontSize: 15 },
    savingsCard: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      margin: 12, backgroundColor: '#2ECC7122', borderRadius: 12, padding: 14,
      borderWidth: 2, borderColor: '#2ECC71',
    },
    savingsLabel: { color: '#2ECC71', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    savingsSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    savingsValue: { color: '#2ECC71', fontSize: 28, fontWeight: '900' },
    projectionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingBottom: 14,
    },
    projectionText: { color: Colors.textMuted, fontSize: 13 },
    refCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
    refTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
    refLeft: { flex: 1 },
    refLabel: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    refSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    refValue: { color: Colors.secondary, fontWeight: '800', fontSize: 14 },
    refDisclaimer: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic', lineHeight: 16, marginTop: 4 },
  }), [Colors]);
  const [fullDays, setFullDays] = useState('');
  const [halfDays, setHalfDays] = useState('');
  const [bracketIdx, setBracketIdx] = useState(2); // default 22%

  const full   = parseInt(fullDays)  || 0;
  const half   = parseInt(halfDays)  || 0;
  const bracket = TAX_BRACKETS[bracketIdx];

  const fullAllowance = full * PER_DIEM_RATE;
  const halfAllowance = half * (PER_DIEM_RATE * 0.75); // IRS: 75% for partial days
  const totalAllowance = fullAllowance + halfAllowance;
  const deductibleAmount = totalAllowance * DEDUCTIBLE_PCT;
  const taxSavings = deductibleAmount * bracket.rate;
  const annualProjection = (full + half > 0)
    ? (taxSavings / (full + half * 0.75)) * 365
    : 0;

  const infoRows = [
    { label: 'IRS Daily Rate', value: fmt(PER_DIEM_RATE), sub: '2024 rate for transportation workers' },
    { label: 'Deductible %', value: '80%', sub: 'IRS allows 80% deduction for truckers' },
    { label: 'Partial Day Rate', value: fmt(PER_DIEM_RATE * 0.75), sub: '75% of daily rate on departure/arrival days' },
  ];


  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
          <Text style={s.infoBannerText}>
            The IRS allows transportation workers to deduct 80% of the federal per diem rate for each day away from home — no receipts required.
          </Text>
        </View>

        {/* Inputs */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Days Away From Home</Text>

          <View style={s.inputRow}>
            <View style={s.inputWrap}>
              <Text style={s.fieldLabel}>Full Days</Text>
              <TextInput
                style={s.input} value={fullDays} onChangeText={setFullDays}
                placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="number-pad"
              />
              <Text style={s.inputHint}>Overnight stays</Text>
            </View>
            <View style={s.inputWrap}>
              <Text style={s.fieldLabel}>Half Days</Text>
              <TextInput
                style={s.input} value={halfDays} onChangeText={setHalfDays}
                placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="number-pad"
              />
              <Text style={s.inputHint}>Departure/arrival days</Text>
            </View>
          </View>
        </View>

        {/* Tax bracket */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Tax Bracket</Text>
          <View style={s.bracketRow}>
            {TAX_BRACKETS.map((b, i) => (
              <TouchableOpacity
                key={b.label}
                style={[s.bracketBtn, i === bracketIdx && s.bracketBtnActive]}
                onPress={() => setBracketIdx(i)}
              >
                <Text style={[s.bracketBtnText, i === bracketIdx && s.bracketBtnTextActive]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        {(full > 0 || half > 0) && (
          <View style={s.resultsCard}>
            <Text style={s.resultsTitle}>Your Per Diem Summary</Text>

            {[
              { label: 'Full Day Allowance',      value: fmt(fullAllowance),    sub: `${full} days × ${fmt(PER_DIEM_RATE)}` },
              { label: 'Partial Day Allowance',   value: fmt(halfAllowance),    sub: `${half} days × ${fmt(PER_DIEM_RATE * 0.75)}` },
              { label: 'Total Gross Allowance',   value: fmt(totalAllowance),   highlight: true },
              { label: '80% Deductible Amount',   value: fmt(deductibleAmount), sub: 'Amount you can deduct on taxes' },
            ].map(row => (
              <View key={row.label} style={[s.resultRow, row.highlight && s.resultRowHighlight]}>
                <View>
                  <Text style={[s.resultLabel, row.highlight && { color: Colors.text, fontWeight: '700' }]}>{row.label}</Text>
                  {row.sub && <Text style={s.resultSub}>{row.sub}</Text>}
                </View>
                <Text style={[s.resultValue, row.highlight && { color: Colors.secondary, fontSize: 18 }]}>{row.value}</Text>
              </View>
            ))}

            {/* Tax savings highlight */}
            <View style={s.savingsCard}>
              <View>
                <Text style={s.savingsLabel}>ESTIMATED TAX SAVINGS</Text>
                <Text style={s.savingsSub}>At {bracket.label} bracket · {full + half} days logged</Text>
              </View>
              <Text style={s.savingsValue}>{fmt(taxSavings)}</Text>
            </View>

            {annualProjection > 0 && (
              <View style={s.projectionRow}>
                <Ionicons name="trending-up-outline" size={16} color='#2ECC71' />
                <Text style={s.projectionText}>
                  Annualized at this pace: <Text style={{ color: '#2ECC71', fontWeight: '800' }}>{fmt(annualProjection)}/yr</Text> in tax savings
                </Text>
              </View>
            )}
          </View>
        )}

        {/* IRS reference */}
        <View style={s.refCard}>
          <Text style={s.refTitle}>IRS Reference Rates (2024)</Text>
          {infoRows.map(r => (
            <View key={r.label} style={s.refRow}>
              <View style={s.refLeft}>
                <Text style={s.refLabel}>{r.label}</Text>
                <Text style={s.refSub}>{r.sub}</Text>
              </View>
              <Text style={s.refValue}>{r.value}</Text>
            </View>
          ))}
          <Text style={s.refDisclaimer}>
            Per IRS Publication 463. Always consult a tax professional for your specific situation.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
