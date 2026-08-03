import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

interface AdvisorResult {
  verdict: 'LOW' | 'FAIR' | 'GOOD' | null;
  marketRpmMin: number | null;
  marketRpmMax: number | null;
  suggestedCounter: number | null;
  reason: string | null;
  fuelCost: number;
  estimatedProfit: number;
  profitPerMile: number;
  rpm: number;
  upgrade?: boolean;
  upgradeMsg?: string;
}

const VERDICT_CONFIG = {
  LOW:  { color: '#E74C3C', bg: '#E74C3C22', icon: 'trending-down-outline' as const, label: 'Below Market' },
  FAIR: { color: '#F39C12', bg: '#F39C1222', icon: 'remove-outline' as const,        label: 'Fair Rate'    },
  GOOD: { color: '#2ECC71', bg: '#2ECC7122', icon: 'trending-up-outline' as const,   label: 'Good Rate'    },
};

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AILoadRateScreen() {
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
    analyzeBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: 8, marginBottom: 20,
    },
    analyzeTxt: { color: Colors.textDark, fontWeight: '900', fontSize: 15 },
    verdictCard: {
      borderRadius: 14, borderWidth: 2, padding: 18, marginBottom: 14,
    },
    verdictRow: { flexDirection: 'row', alignItems: 'flex-start' },
    verdictLabel: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
    verdictReason: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: {
      flex: 1, minWidth: '45%', backgroundColor: Colors.surfaceLight ?? '#2A2A2E',
      borderRadius: 10, padding: 12, alignItems: 'center', gap: 4,
    },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    marketRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    marketText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
    disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  }), [Colors]);
  const [origin, setOrigin]         = useState('');
  const [dest, setDest]             = useState('');
  const [miles, setMiles]           = useState('');
  const [offeredRate, setOfferedRate] = useState('');
  const [fuelPrice, setFuelPrice]   = useState('3.80');
  const [truckMpg, setTruckMpg]     = useState('6.5');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AdvisorResult | null>(null);

  const analyze = async () => {
    if (!origin.trim() || !dest.trim() || !miles || !offeredRate) {
      Alert.alert('Missing info', 'Fill in origin, destination, miles, and the offered rate.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post('/ai/rate-advisor', {
        origin: origin.trim(),
        destination: dest.trim(),
        miles,
        offeredRate,
        fuelPrice,
        truckMpg,
      }, { timeout: 30000 });
      setResult(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not analyze rate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const vc = result?.verdict ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={s.subheading}>Enter the load details and let AI tell you if the rate is worth it.</Text>

          {/* Lane */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Load Details</Text>

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
                  placeholder="e.g. Chicago, IL" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Total Miles</Text>
                <TextInput style={s.input} value={miles} onChangeText={setMiles}
                  placeholder="920" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Offered Rate ($)</Text>
                <TextInput style={s.input} value={offeredRate} onChangeText={setOfferedRate}
                  placeholder="2100" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>

          {/* Fuel & MPG */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Fuel Settings</Text>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Diesel Price ($/gal)</Text>
                <TextInput style={s.input} value={fuelPrice} onChangeText={setFuelPrice}
                  placeholder="3.80" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Truck MPG</Text>
                <TextInput style={s.input} value={truckMpg} onChangeText={setTruckMpg}
                  placeholder="6.5" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>

          <TouchableOpacity style={[s.analyzeBtn, loading && { opacity: 0.6 }]} onPress={analyze} disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color={Colors.textDark} />
                <Text style={s.analyzeTxt}>Analyzing with AI...</Text>
              </>
            ) : (
              <>
                <Ionicons name="analytics-outline" size={18} color={Colors.textDark} />
                <Text style={s.analyzeTxt}>Analyze This Rate</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Results */}
          {result && (
            <>
              {/* AI Verdict — premium only */}
              {vc ? (
                <View style={[s.verdictCard, { borderColor: vc.color, backgroundColor: vc.bg }]}>
                  <View style={s.verdictRow}>
                    <Ionicons name={vc.icon} size={32} color={vc.color} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.verdictLabel, { color: vc.color }]}>{result.verdict} — {vc.label}</Text>
                      <Text style={s.verdictReason}>{result.reason}</Text>
                    </View>
                  </View>
                </View>
              ) : result.upgrade ? (
                <View style={[s.verdictCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
                  <View style={s.verdictRow}>
                    <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.verdictLabel, { color: Colors.text }]}>AI Verdict — Premium</Text>
                      <Text style={s.verdictReason}>{result.upgradeMsg}</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Numbers — always shown */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Profit Breakdown</Text>
                <View style={s.statGrid}>
                  <StatBox label="Rate per Mile"    value={`${fmt(result.rpm)}/mi`}            color={Colors.secondary} />
                  <StatBox label="Fuel Cost"        value={fmt(result.fuelCost)}                color="#E74C3C" />
                  <StatBox label="Net Profit"       value={fmt(result.estimatedProfit)}         color={result.estimatedProfit >= 0 ? '#2ECC71' : '#E74C3C'} />
                  <StatBox label="Profit per Mile"  value={`${fmt(result.profitPerMile)}/mi`}   color={result.profitPerMile >= 0 ? '#2ECC71' : '#E74C3C'} />
                </View>
              </View>

              {/* Market context — premium only */}
              {(result.marketRpmMin || result.suggestedCounter) ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Market Intelligence</Text>
                  {result.marketRpmMin && result.marketRpmMax ? (
                    <View style={s.marketRow}>
                      <Ionicons name="pulse-outline" size={16} color={Colors.secondary} />
                      <Text style={s.marketText}>
                        Typical range for this lane:{' '}
                        <Text style={{ color: Colors.secondary, fontWeight: '800' }}>
                          {fmt(result.marketRpmMin)}–{fmt(result.marketRpmMax)}/mi
                        </Text>
                      </Text>
                    </View>
                  ) : null}
                  {result.suggestedCounter ? (
                    <View style={[s.marketRow, { marginTop: 10 }]}>
                      <Ionicons name="chatbubble-outline" size={16} color={Colors.secondary} />
                      <Text style={s.marketText}>
                        Suggested counter-offer:{' '}
                        <Text style={{ color: Colors.secondary, fontWeight: '800' }}>
                          {fmt(result.suggestedCounter)} total
                          {miles ? ` (${fmt(result.suggestedCounter / parseFloat(miles))}/mi)` : ''}
                        </Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Text style={s.disclaimer}>AI analysis is for reference only. Verify market rates before negotiating.</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const Colors = useColors();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: Colors.surfaceLight ?? '#2A2A2E', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
