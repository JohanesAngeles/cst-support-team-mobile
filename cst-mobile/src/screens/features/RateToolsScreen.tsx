import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type Tab = 'cpm' | 'minrate' | 'fsc';

const fmt = (n: number, decimals = 2) =>
  isNaN(n) || !isFinite(n) ? '—' : `$${n.toFixed(decimals)}`;

export default function RateToolsScreen() {
  const [tab, setTab] = useState<Tab>('cpm');

  // Cost Per Mile
  const [fuel, setFuel] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [insurance, setInsurance] = useState('');
  const [truckPayment, setTruckPayment] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [miles, setMiles] = useState('');

  // Minimum Rate
  const [totalCosts, setTotalCosts] = useState('');
  const [desiredProfit, setDesiredProfit] = useState('');
  const [loadMiles, setLoadMiles] = useState('');

  // Fuel Surcharge
  const [currentDiesel, setCurrentDiesel] = useState('');
  const [baseDiesel, setBaseDiesel] = useState('');
  const [mpg, setMpg] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [fscMiles, setFscMiles] = useState('');

  const cpmResult = (() => {
    const totalExp = [fuel, maintenance, insurance, truckPayment, otherCosts]
      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    const m = parseFloat(miles);
    return totalExp / m;
  })();

  const minRateResult = (() => {
    const cost = parseFloat(totalCosts) || 0;
    const profit = parseFloat(desiredProfit) || 0;
    const m = parseFloat(loadMiles);
    return (cost + profit) / m;
  })();

  const fscResult = (() => {
    const curr = parseFloat(currentDiesel) || 0;
    const base = parseFloat(baseDiesel) || 0;
    const m = parseFloat(mpg) || 1;
    const fscPerMile = (curr - base) / m;
    const totalFsc = fscPerMile * (parseFloat(fscMiles) || 0);
    return { perMile: fscPerMile, total: totalFsc };
  })();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'cpm',     label: 'Cost/Mile',  icon: 'speedometer-outline' },
    { key: 'minrate', label: 'Min Rate',   icon: 'trending-up-outline' },
    { key: 'fsc',     label: 'Fuel Surcharge', icon: 'water-outline' },
  ];

  const field = (label: string, value: string, set: (v: string) => void, prefix = '$', hint = '') => (
    <View key={label} style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{hint ? <Text style={styles.hint}> {hint}</Text> : null}</Text>
      <View style={styles.inputRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={set}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={16} color={tab === t.key ? Colors.textDark : Colors.textMuted} />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {tab === 'cpm' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly Expenses</Text>
                {field('Fuel Cost', fuel, setFuel)}
                {field('Maintenance & Repairs', maintenance, setMaintenance)}
                {field('Insurance', insurance, setInsurance)}
                {field('Truck Payment', truckPayment, setTruckPayment)}
                {field('Other (permits, fees, etc.)', otherCosts, setOtherCosts)}
                {field('Total Miles Driven', miles, setMiles, '', '(for same period)')}
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Cost Per Mile</Text>
                <Text style={styles.resultValue}>{fmt(cpmResult)}</Text>
                <Text style={styles.resultSub}>per mile driven</Text>
                {!isNaN(cpmResult) && isFinite(cpmResult) && (
                  <View style={styles.insight}>
                    <Ionicons name="bulb-outline" size={14} color={Colors.secondary} />
                    <Text style={styles.insightText}>
                      To make $0.20/mile profit, you need at least {fmt(cpmResult + 0.20)}/mile rate.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {tab === 'minrate' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Load Details</Text>
                {field('Total Operating Costs', totalCosts, setTotalCosts, '$', '(for this load)')}
                {field('Desired Profit', desiredProfit, setDesiredProfit)}
                {field('Load Miles', loadMiles, setLoadMiles, '', '(miles)')}
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Minimum Rate Needed</Text>
                <Text style={styles.resultValue}>{fmt(minRateResult)}/mi</Text>
                <Text style={styles.resultSub}>to cover costs + profit</Text>
                {!isNaN(minRateResult) && isFinite(minRateResult) && (
                  <View style={styles.totalRow}>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalLabel}>Total Load Revenue</Text>
                      <Text style={styles.totalValue}>{fmt((parseFloat(totalCosts) || 0) + (parseFloat(desiredProfit) || 0))}</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalLabel}>Net Profit</Text>
                      <Text style={[styles.totalValue, { color: Colors.success }]}>{fmt(parseFloat(desiredProfit) || 0)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {tab === 'fsc' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Fuel Surcharge Calculator</Text>
                {field('Current Diesel Price', currentDiesel, setCurrentDiesel, '$', '/gal')}
                {field('Base Diesel Price', baseDiesel, setBaseDiesel, '$', '/gal (in contract)')}
                {field('Truck MPG', mpg, setMpg, '', 'miles per gallon')}
                {field('Load Miles', fscMiles, setFscMiles, '', '(optional)')}
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Fuel Surcharge</Text>
                <Text style={styles.resultValue}>{fmt(fscResult.perMile, 3)}/mi</Text>
                <Text style={styles.resultSub}>per mile surcharge</Text>
                {parseFloat(fscMiles) > 0 && (
                  <View style={styles.totalRow}>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalLabel}>Total FSC for Load</Text>
                      <Text style={styles.totalValue}>{fmt(fscResult.total)}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.insight}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.secondary} />
                  <Text style={styles.insightText}>
                    FSC = (Current Price − Base Price) ÷ MPG. Add this to your base rate per mile.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: 8, gap: 8,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: Colors.surface, borderRadius: 10,
    paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  tabLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: Colors.textDark },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 16, gap: 12,
  },
  cardTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  field: { gap: 6 },
  fieldLabel: { color: Colors.textMuted, fontSize: 13 },
  hint: { color: Colors.textMuted, fontSize: 11 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceLight, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, height: 46,
  },
  prefix: { color: Colors.textMuted, fontSize: 15, marginRight: 4 },
  input: { flex: 1, color: Colors.white, fontSize: 15 },
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.secondary + '55',
    borderLeftWidth: 4, borderLeftColor: Colors.secondary,
    padding: 20, alignItems: 'center', gap: 4,
  },
  resultLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  resultValue: { color: Colors.secondary, fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  resultSub: { color: Colors.textMuted, fontSize: 12 },
  totalRow: { flexDirection: 'row', gap: 16, marginTop: 12, width: '100%', justifyContent: 'center' },
  totalItem: { alignItems: 'center', gap: 2 },
  totalLabel: { color: Colors.textMuted, fontSize: 11 },
  totalValue: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  insight: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.secondary + '15', borderRadius: 8,
    padding: 10, marginTop: 10, width: '100%',
  },
  insightText: { color: Colors.secondary, fontSize: 12, lineHeight: 18, flex: 1 },
});
