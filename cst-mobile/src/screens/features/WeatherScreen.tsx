import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';

interface WeatherPoint {
  label: string;
  city: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  windSpeed: number;
  precipitation: number;
  code: number;
  forecast: Array<{ date: string; code: number; high: number; low: number; precip: number }>;
}

function wmoEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 75) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 84) return '🌨️';
  if (code <= 94) return '🌩️';
  return '⛈️';
}

function wmoDesc(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 75) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 84) return 'Snow showers';
  if (code <= 94) return 'Thunderstorm';
  return 'Severe thunderstorm';
}

function roadAlert(code: number, wind: number, precip: number): string | null {
  if (code >= 71 && code <= 77) return '⚠️ Snow on road — use chains, reduce speed';
  if (code >= 95) return '🚨 Severe thunderstorm — consider delaying';
  if (code >= 45 && code <= 48) return '⚠️ Dense fog — reduce speed, use lights';
  if (wind >= 40) return '⚠️ High winds — watch for trailer sway';
  if (code >= 61 && precip >= 0.5) return '⚠️ Heavy rain — reduce speed';
  return null;
}

async function geocode(query: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
  const r = await fetch(url, { headers: { 'User-Agent': 'CSTDriverApp/1.0' } });
  const data = await r.json();
  if (!data.length) throw new Error(`Could not find location: "${query}"`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name.split(',').slice(0, 2).join(',') };
}

async function fetchWeather(lat: number, lng: number): Promise<{ current: any; daily: any }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,windspeed_10m,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=4`;
  const r = await fetch(url);
  const data = await r.json();
  return { current: data.current, daily: data.daily };
}

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function WeatherScreen() {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<WeatherPoint[]>([]);

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Location access is needed'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`, { headers: { 'User-Agent': 'CSTDriverApp/1.0' } });
      const data = await r.json();
      const city = data.address?.city || data.address?.town || data.address?.state || 'My Location';
      setOrigin(city);
    } catch { Alert.alert('Error', 'Could not get your location'); }
  };

  const handleSearch = async () => {
    if (!origin.trim()) { Alert.alert('Error', 'Enter at least an origin location'); return; }
    setLoading(true);
    try {
      const locations = [{ label: 'Origin', query: origin }];
      if (dest.trim()) locations.push({ label: 'Destination', query: dest });

      const results: WeatherPoint[] = [];
      for (const loc of locations) {
        const geo = await geocode(loc.query);
        const { current, daily } = await fetchWeather(geo.lat, geo.lng);
        results.push({
          label: loc.label,
          city: geo.displayName,
          temp: Math.round(current.temperature_2m),
          tempMin: Math.round(daily.temperature_2m_min[0]),
          tempMax: Math.round(daily.temperature_2m_max[0]),
          windSpeed: Math.round(current.windspeed_10m),
          precipitation: current.precipitation,
          code: current.weathercode,
          forecast: daily.time.slice(1, 4).map((date: string, i: number) => ({
            date,
            code: daily.weathercode[i + 1],
            high: Math.round(daily.temperature_2m_max[i + 1]),
            low: Math.round(daily.temperature_2m_min[i + 1]),
            precip: daily.precipitation_sum[i + 1],
          })),
        });
      }
      setPoints(results);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not load weather');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Route Weather</Text>
        <Text style={s.subheading}>Check conditions before you roll out</Text>

        <View style={s.inputRow}>
          <TextInput style={[s.input, { flex: 1 }]} value={origin} onChangeText={setOrigin} placeholder="Origin (city, state or zip)" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
          <TouchableOpacity style={s.locationBtn} onPress={useMyLocation}>
            <Ionicons name="locate-outline" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <TextInput style={s.input} value={dest} onChangeText={setDest} placeholder="Destination (optional)" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

        <TouchableOpacity style={[s.searchBtn, loading && { opacity: 0.6 }]} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={Colors.textDark} /> : (
            <>
              <Ionicons name="cloud-outline" size={18} color={Colors.textDark} />
              <Text style={s.searchText}>Check Weather</Text>
            </>
          )}
        </TouchableOpacity>

        {points.map((pt) => {
          const alert = roadAlert(pt.code, pt.windSpeed, pt.precipitation);
          const emoji = wmoEmoji(pt.code);
          return (
            <View key={pt.label} style={s.weatherCard}>
              <View style={s.cardHeader}>
                <View>
                  <Text style={s.cardLabel}>{pt.label}</Text>
                  <Text style={s.cardCity}>{pt.city}</Text>
                </View>
                <Text style={s.bigEmoji}>{emoji}</Text>
              </View>

              <View style={s.currentRow}>
                <Text style={s.tempBig}>{pt.temp}°F</Text>
                <View style={s.currentMeta}>
                  <Text style={s.condText}>{wmoDesc(pt.code)}</Text>
                  <Text style={s.metaText}>H: {pt.tempMax}° · L: {pt.tempMin}°</Text>
                  <Text style={s.metaText}>💨 {pt.windSpeed} mph</Text>
                  {pt.precipitation > 0 ? <Text style={s.metaText}>💧 {pt.precipitation.toFixed(2)}"</Text> : null}
                </View>
              </View>

              {alert ? (
                <View style={s.alertBox}>
                  <Text style={s.alertText}>{alert}</Text>
                </View>
              ) : (
                <View style={s.clearBox}>
                  <Text style={s.clearText}>✅ Road conditions look good</Text>
                </View>
              )}

              <Text style={s.forecastLabel}>3-Day Forecast</Text>
              <View style={s.forecastRow}>
                {pt.forecast.map(f => (
                  <View key={f.date} style={s.forecastDay}>
                    <Text style={s.forecastDate}>{new Date(f.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                    <Text style={s.forecastEmoji}>{wmoEmoji(f.code)}</Text>
                    <Text style={s.forecastTemp}>{f.high}°/{f.low}°</Text>
                    {f.precip > 0 ? <Text style={s.forecastPrecip}>{f.precip.toFixed(2)}"</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {points.length === 0 && !loading && (
          <View style={s.placeholder}>
            <Text style={s.placeholderEmoji}>🌤️</Text>
            <Text style={s.placeholderText}>Enter a location above to see current weather and road conditions along your route</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { color: Colors.white, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subheading: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 14, color: Colors.white, fontSize: 14, marginBottom: 10 },
  locationBtn: { width: 50, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  searchBtn: { backgroundColor: Colors.secondary, borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  searchText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  weatherCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 18, marginBottom: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { color: Colors.secondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  cardCity: { color: Colors.white, fontSize: 15, fontWeight: '700', marginTop: 2 },
  bigEmoji: { fontSize: 48 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tempBig: { color: Colors.white, fontSize: 52, fontWeight: '900' },
  currentMeta: { gap: 4 },
  condText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  metaText: { color: Colors.textMuted, fontSize: 13 },
  alertBox: { backgroundColor: '#E74C3C22', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.danger },
  alertText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  clearBox: { backgroundColor: '#2ECC7122', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2ECC71' },
  clearText: { color: '#2ECC71', fontSize: 13, fontWeight: '600' },
  forecastLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  forecastRow: { flexDirection: 'row', gap: 8 },
  forecastDay: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  forecastDate: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  forecastEmoji: { fontSize: 22 },
  forecastTemp: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  forecastPrecip: { color: '#3498DB', fontSize: 10 },
  placeholder: { alignItems: 'center', paddingTop: 40, gap: 16 },
  placeholderEmoji: { fontSize: 64 },
  placeholderText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
