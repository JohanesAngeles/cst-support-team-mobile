import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface RouteResult {
  distanceMiles: number;
  durationHours: number;
  durationDisplay: string;
  fuelGallons: number;
  fuelCost: number;
  estimatedPay: number;
  ratePerMile: number;
  originDisplay: string;
  destDisplay: string;
}

async function geocode(query: string): Promise<{ lat: number; lng: number; display: string }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
  const r = await fetch(url, { headers: { 'User-Agent': 'CSTDriverApp/1.0' } });
  const data = await r.json();
  if (!data.length) throw new Error(`Location not found: "${query}"`);
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name.split(',').slice(0, 2).join(',').trim(),
  };
}

async function getRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<{ meters: number; seconds: number }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Could not calculate route. Check locations.');
  return { meters: data.routes[0].distance, seconds: data.routes[0].duration };
}

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const PRESET_RATES = [
  { label: '$2.00', value: '2.00' },
  { label: '$2.50', value: '2.50' },
  { label: '$3.00', value: '3.00' },
  { label: '$3.50', value: '3.50' },
];

export default function MileageCalculatorScreen() {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [mpg, setMpg] = useState('6.5');
  const [fuelPrice, setFuelPrice] = useState('4.00');
  const [ratePerMile, setRatePerMile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);

  const calculate = async () => {
    if (!origin.trim() || !dest.trim()) { Alert.alert('Error', 'Enter origin and destination'); return; }
    const mpgNum = parseFloat(mpg) || 6.5;
    const fuelNum = parseFloat(fuelPrice) || 4.0;
    const rpmNum = parseFloat(ratePerMile) || 0;
    setLoading(true);
    try {
      const [from, to] = await Promise.all([geocode(origin), geocode(dest)]);
      const route = await getRoute(from.lat, from.lng, to.lat, to.lng);

      const distanceMiles = route.meters * 0.000621371;
      const fuelGallons = distanceMiles / mpgNum;
      const fuelCost = fuelGallons * fuelNum;
      const estimatedPay = rpmNum > 0 ? distanceMiles * rpmNum : 0;
      const durationHours = route.seconds / 3600;

      setResult({
        distanceMiles: Math.round(distanceMiles * 10) / 10,
        durationHours,
        durationDisplay: fmtDuration(route.seconds),
        fuelGallons: Math.round(fuelGallons * 10) / 10,
        fuelCost: Math.round(fuelCost * 100) / 100,
        estimatedPay: Math.round(estimatedPay * 100) / 100,
        ratePerMile: rpmNum,
        originDisplay: from.display,
        destDisplay: to.display,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Mileage Calculator</Text>
        <Text style={s.subheading}>Distance · fuel cost · estimated pay</Text>

        <Text style={s.label}>Origin *</Text>
        <TextInput style={s.input} value={origin} onChangeText={setOrigin} placeholder="City, State or ZIP" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

        <Text style={s.label}>Destination *</Text>
        <TextInput style={s.input} value={dest} onChangeText={setDest} placeholder="City, State or ZIP" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

        <View style={s.row}>
          <View style={s.halfBlock}>
            <Text style={s.label}>Truck MPG</Text>
            <TextInput style={s.input} value={mpg} onChangeText={setMpg} keyboardType="decimal-pad" placeholder="6.5" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={s.halfBlock}>
            <Text style={s.label}>Fuel Price ($/gal)</Text>
            <TextInput style={s.input} value={fuelPrice} onChangeText={setFuelPrice} keyboardType="decimal-pad" placeholder="4.00" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <Text style={s.label}>Rate per Mile (optional)</Text>
        <View style={s.row}>
          <TextInput style={[s.input, { flex: 1 }]} value={ratePerMile} onChangeText={setRatePerMile} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESET_RATES.map(p => (
              <TouchableOpacity key={p.value} style={[s.preset, ratePerMile === p.value && s.presetActive]} onPress={() => setRatePerMile(p.value)}>
                <Text style={[s.presetText, ratePerMile === p.value && s.presetTextActive]}>{p.label}/mi</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={[s.calcBtn, loading && { opacity: 0.6 }]} onPress={calculate} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={Colors.textDark} /> : (
            <>
              <Ionicons name="calculator-outline" size={18} color={Colors.textDark} />
              <Text style={s.calcText}>Calculate Route</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (
          <View style={s.resultCard}>
            <Text style={s.routeText}>{result.originDisplay}</Text>
            <View style={s.routeArrow}>
              <View style={s.divider} />
              <Ionicons name="arrow-down" size={20} color={Colors.secondary} />
              <View style={s.divider} />
            </View>
            <Text style={s.routeText}>{result.destDisplay}</Text>

            {/* Big number */}
            <View style={s.bigStat}>
              <Text style={s.bigNum}>{result.distanceMiles.toLocaleString()}</Text>
              <Text style={s.bigUnit}>miles</Text>
            </View>

            <View style={s.statsGrid}>
              <View style={s.statBox}>
                <Ionicons name="time-outline" size={20} color='#3498DB' />
                <Text style={s.statVal}>{result.durationDisplay}</Text>
                <Text style={s.statLbl}>Drive Time</Text>
              </View>
              <View style={s.statBox}>
                <Ionicons name="water-outline" size={20} color='#E67E22' />
                <Text style={s.statVal}>{result.fuelGallons} gal</Text>
                <Text style={s.statLbl}>Fuel Needed</Text>
              </View>
              <View style={s.statBox}>
                <Ionicons name="cash-outline" size={20} color={Colors.danger} />
                <Text style={s.statVal}>${result.fuelCost.toFixed(2)}</Text>
                <Text style={s.statLbl}>Fuel Cost</Text>
              </View>
              {result.estimatedPay > 0 && (
                <View style={s.statBox}>
                  <Ionicons name="trending-up-outline" size={20} color='#2ECC71' />
                  <Text style={[s.statVal, { color: '#2ECC71' }]}>${result.estimatedPay.toLocaleString()}</Text>
                  <Text style={s.statLbl}>Est. Pay</Text>
                </View>
              )}
            </View>

            {result.estimatedPay > 0 && (
              <View style={s.profitBox}>
                <Text style={s.profitLabel}>Net After Fuel</Text>
                <Text style={[s.profitVal, { color: result.estimatedPay - result.fuelCost > 0 ? '#2ECC71' : Colors.danger }]}>
                  ${(result.estimatedPay - result.fuelCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <Text style={s.disclaimer}>Route via OSRM · distances are estimates · actual mileage may vary</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { color: Colors.white, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subheading: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
  label: { color: Colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 14, color: Colors.white, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  halfBlock: { flex: 1 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  presetActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  presetText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  presetTextActive: { color: Colors.textDark },
  calcBtn: { backgroundColor: Colors.secondary, borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 24 },
  calcText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  resultCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 20, gap: 4 },
  routeText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  routeArrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  bigStat: { alignItems: 'center', paddingVertical: 20 },
  bigNum: { color: Colors.secondary, fontSize: 56, fontWeight: '900' },
  bigUnit: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  statBox: { flex: 1, minWidth: '40%', backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
  statVal: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  statLbl: { color: Colors.textMuted, fontSize: 11 },
  profitBox: { backgroundColor: Colors.secondary + '15', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.secondary + '40' },
  profitLabel: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  profitVal: { fontSize: 20, fontWeight: '900' },
  disclaimer: { color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 12 },
});
