import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface TripResult {
  origin: string;
  destination: string;
  distanceMiles: number;
  durationHours: number;
  fuelGallons: number;
  fuelCost: number;
  drivingDays: number;
  hosBreaks: number;
  estimatedWeighStations: number;
  weather: { label: string; note: string } | null;
}

async function geocode(q: string): Promise<{ lat: number; lng: number; display: string }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`;
  const r = await fetch(url, { headers: { 'User-Agent': 'CSTDriverApp/1.0' } });
  const data = await r.json();
  if (!data.length) throw new Error(`Location not found: "${q}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name.split(',').slice(0, 2).join(',') };
}

async function getRoute(lat1: number, lng1: number, lat2: number, lng2: number) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.code !== 'Ok') throw new Error('Route unavailable. Check city names.');
  return { meters: data.routes[0].distance, seconds: data.routes[0].duration };
}

async function fetchWeather(lat: number, lng: number): Promise<{ code: number; wind: number }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weathercode,windspeed_10m&wind_speed_unit=mph&timezone=auto&forecast_days=1`;
  const r = await fetch(url);
  const data = await r.json();
  return { code: data.current?.weathercode ?? 0, wind: data.current?.windspeed_10m ?? 0 };
}

function weatherNote(code: number, wind: number): { label: string; note: string } | null {
  if (code >= 71 && code <= 77) return { label: '❄️ Snow', note: 'Snow at destination — allow extra time, check chain laws' };
  if (code >= 95) return { label: '⛈ Thunderstorm', note: 'Severe weather at destination — monitor conditions' };
  if (code >= 45 && code <= 48) return { label: '🌫 Fog', note: 'Dense fog — reduce speed, use low beams' };
  if (wind >= 40) return { label: '💨 High Winds', note: `${Math.round(wind)} mph winds — watch for trailer sway` };
  if (code >= 61 && code <= 67) return { label: '🌧 Rain', note: 'Rain at destination — allow extra stopping distance' };
  return null;
}

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const fmtMiles = (n: number) => `${Math.round(n).toLocaleString()} mi`;
const fmtHours = (h: number) => {
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return `${hh}h ${mm}m`;
};

export default function TripPlannerScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 16, paddingBottom: 40, gap: 14 },
    inputCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    cardTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inputDot: { width: 10, height: 10, borderRadius: 5 },
    input: {
      flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10,
      borderWidth: 1, borderColor: Colors.border, padding: 12,
      color: Colors.text, fontSize: 14,
    },
    connector: { width: 1, height: 16, backgroundColor: Colors.border, marginLeft: 4 },
    settingsRow: { flexDirection: 'row', gap: 10 },
    settingItem: { flex: 1, gap: 5 },
    settingLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
    settingInput: {
      backgroundColor: Colors.surfaceLight, borderRadius: 8,
      borderWidth: 1, borderColor: Colors.border, padding: 10,
      color: Colors.text, fontSize: 14, textAlign: 'center',
    },
    planBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    planBtnText: { color: Colors.textDark, fontWeight: '900', fontSize: 15 },
    // Results
    resultCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    resultTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    routeHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: Colors.secondary + '12', borderRadius: 10, padding: 12,
    },
    routeOrigin: { color: Colors.text, fontSize: 13, fontWeight: '700', flex: 1 },
    routeDest: { color: Colors.text, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: {
      flex: 1, minWidth: '45%', backgroundColor: Colors.surfaceLight,
      borderRadius: 10, padding: 12, gap: 4,
    },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
    sectionCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10,
    },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineText: { color: Colors.textMuted, fontSize: 13, flex: 1, lineHeight: 19 },
    alertCard: {
      borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      borderWidth: 1,
    },
    alertText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  }), [Colors]);

  const [origin,      setOrigin]      = useState('');
  const [destination, setDestination] = useState('');
  const [mpg,         setMpg]         = useState('6.5');
  const [dieselPrice, setDieselPrice] = useState('3.89');
  const [ratePerMile, setRatePerMile] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<TripResult | null>(null);

  const planTrip = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Missing Info', 'Enter both origin and destination.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [origGeo, destGeo] = await Promise.all([
        geocode(origin.trim()),
        geocode(destination.trim()),
      ]);
      const route = await getRoute(origGeo.lat, origGeo.lng, destGeo.lat, destGeo.lng);
      const miles = route.meters / 1609.344;
      const durationHours = route.seconds / 3600;
      const truckMpg = parseFloat(mpg) || 6.5;
      const ppg = parseFloat(dieselPrice) || 3.89;
      const gallons = miles / truckMpg;
      const fuelCost = gallons * ppg;

      // HOS planning: 11h drive / day, ~65 mph avg truck speed
      const avgSpeed = 55; // conservative truck average including stops
      const effectiveHours = miles / avgSpeed;
      const drivingDays = Math.ceil(effectiveHours / 11);
      const hosBreaks = Math.max(0, drivingDays - 1); // 10h rest each night

      // Rough weigh station estimate: ~1 per 150 miles for interstate routes
      const weighStations = Math.max(0, Math.floor(miles / 150) - 1);

      // Weather at destination
      let weather = null;
      try {
        const wx = await fetchWeather(destGeo.lat, destGeo.lng);
        weather = weatherNote(wx.code, wx.wind);
      } catch { /* skip if weather fails */ }

      setResult({
        origin: origGeo.display,
        destination: destGeo.display,
        distanceMiles: miles,
        durationHours: effectiveHours,
        fuelGallons: gallons,
        fuelCost,
        drivingDays,
        hosBreaks,
        estimatedWeighStations: weighStations,
        weather,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not plan trip.');
    } finally {
      setLoading(false);
    }
  };

  const rpm   = parseFloat(ratePerMile) || 0;
  const gross = result ? result.distanceMiles * rpm : 0;
  const net   = result ? gross - result.fuelCost : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Route inputs */}
          <View style={styles.inputCard}>
            <Text style={styles.cardTitle}>Plan Your Trip</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputDot, { backgroundColor: '#27AE60' }]} />
              <TextInput style={styles.input} value={origin} onChangeText={setOrigin}
                placeholder="Pickup / Origin" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            </View>

            <View style={styles.connector} />

            <View style={styles.inputRow}>
              <View style={[styles.inputDot, { backgroundColor: Colors.danger }]} />
              <TextInput style={styles.input} value={destination} onChangeText={setDestination}
                placeholder="Delivery / Destination" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            </View>
          </View>

          {/* Settings */}
          <View style={styles.inputCard}>
            <Text style={styles.cardTitle}>Truck & Load Settings</Text>
            <View style={styles.settingsRow}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>TRUCK MPG</Text>
                <TextInput style={styles.settingInput} value={mpg} onChangeText={setMpg}
                  keyboardType="decimal-pad" placeholder="6.5" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>DIESEL ($/GAL)</Text>
                <TextInput style={styles.settingInput} value={dieselPrice} onChangeText={setDieselPrice}
                  keyboardType="decimal-pad" placeholder="3.89" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>RATE ($/MI)</Text>
                <TextInput style={styles.settingInput} value={ratePerMile} onChangeText={setRatePerMile}
                  keyboardType="decimal-pad" placeholder="—" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.planBtn, loading && { opacity: 0.6 }]} onPress={planTrip} disabled={loading}>
            {loading ? (
              <><ActivityIndicator size="small" color={Colors.textDark} /><Text style={styles.planBtnText}>Planning Trip...</Text></>
            ) : (
              <><Ionicons name="navigate-outline" size={18} color={Colors.textDark} /><Text style={styles.planBtnText}>Plan Trip</Text></>
            )}
          </TouchableOpacity>

          {result && (
            <>
              {/* Route summary */}
              <View style={styles.resultCard}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeOrigin} numberOfLines={1}>{result.origin}</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.secondary} />
                  <Text style={styles.routeDest} numberOfLines={1}>{result.destination}</Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.secondary }]}>{fmtMiles(result.distanceMiles)}</Text>
                    <Text style={styles.statLabel}>Total Distance</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.text }]}>{fmtHours(result.durationHours)}</Text>
                    <Text style={styles.statLabel}>Drive Time</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.danger }]}>{fmtMoney(result.fuelCost)}</Text>
                    <Text style={styles.statLabel}>Est. Fuel Cost</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.textMuted }]}>{result.fuelGallons.toFixed(1)} gal</Text>
                    <Text style={styles.statLabel}>Fuel Needed</Text>
                  </View>
                </View>

                {rpm > 0 && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.statBox, { flex: 1 }]}>
                      <Text style={[styles.statValue, { color: Colors.secondary }]}>{fmtMoney(gross)}</Text>
                      <Text style={styles.statLabel}>Gross Revenue</Text>
                    </View>
                    <View style={[styles.statBox, { flex: 1 }]}>
                      <Text style={[styles.statValue, { color: net >= 0 ? '#27AE60' : Colors.danger }]}>{fmtMoney(net)}</Text>
                      <Text style={styles.statLabel}>Net After Fuel</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* HOS Plan */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>HOS Drive Plan</Text>
                {Array.from({ length: result.drivingDays }, (_, i) => {
                  const dayMiles = result.distanceMiles / result.drivingDays;
                  const isLast = i === result.drivingDays - 1;
                  return (
                    <View key={i} style={styles.timelineRow}>
                      <View style={[styles.timelineDot, { backgroundColor: isLast ? '#27AE60' : Colors.secondary }]} />
                      <Text style={styles.timelineText}>
                        <Text style={{ fontWeight: '700', color: Colors.text }}>Day {i + 1}: </Text>
                        Drive ~{fmtMiles(dayMiles)} · {fmtHours(dayMiles / 55)}
                        {isLast ? ' · Deliver ✓' : ' → 10-hr rest stop'}
                      </Text>
                    </View>
                  );
                })}
                <Text style={[styles.timelineText, { color: Colors.textMuted }]}>
                  ~{result.estimatedWeighStations} weigh station check{result.estimatedWeighStations !== 1 ? 's' : ''} expected along route
                </Text>
              </View>

              {/* Weather alert */}
              {result.weather && (
                <View style={[styles.alertCard, { backgroundColor: '#E67E2218', borderColor: '#E67E2244' }]}>
                  <Ionicons name="partly-sunny-outline" size={20} color="#E67E22" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertText, { color: '#E67E22' }]}>{result.weather.label}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{result.weather.note}</Text>
                  </View>
                </View>
              )}

              {!result.weather && (
                <View style={[styles.alertCard, { backgroundColor: '#27AE6018', borderColor: '#27AE6044' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#27AE60" />
                  <Text style={[styles.alertText, { color: '#27AE60' }]}>Weather at destination looks clear</Text>
                </View>
              )}

              <Text style={styles.disclaimer}>
                Route via OSRM · Weather via Open-Meteo · Drive time assumes 55 mph avg. Verify all details before departure.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
