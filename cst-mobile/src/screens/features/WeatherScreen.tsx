import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';

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

type TFunc = (key: string) => string;

function wmoDesc(code: number, t: TFunc): string {
  if (code === 0) return t('weather.cond.clear');
  if (code === 1) return t('weather.cond.mostlyClear');
  if (code === 2) return t('weather.cond.partlyCloudy');
  if (code === 3) return t('weather.cond.overcast');
  if (code <= 48) return t('weather.cond.foggy');
  if (code <= 55) return t('weather.cond.drizzle');
  if (code <= 65) return t('weather.cond.rain');
  if (code <= 75) return t('weather.cond.snow');
  if (code <= 82) return t('weather.cond.rainShowers');
  if (code <= 84) return t('weather.cond.snowShowers');
  if (code <= 94) return t('weather.cond.thunderstorm');
  return t('weather.cond.severeThunderstorm');
}

function roadAlert(code: number, wind: number, precip: number, t: TFunc): string | null {
  if (code >= 71 && code <= 77) return t('weather.alert.snow');
  if (code >= 95) return t('weather.alert.severeThunderstorm');
  if (code >= 45 && code <= 48) return t('weather.alert.fog');
  if (wind >= 40) return t('weather.alert.wind');
  if (code >= 61 && precip >= 0.5) return t('weather.alert.heavyRain');
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
  const Colors = useColors();
  const { t } = useTranslation();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 20, paddingBottom: 40 },
    heading: { color: Colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    subheading: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 14, color: Colors.text, fontSize: 14, marginBottom: 10 },
    locationBtn: { width: 50, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
    searchBtn: { backgroundColor: Colors.secondary, borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
    searchText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    weatherCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 18, marginBottom: 16, gap: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLabel: { color: Colors.secondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    cardCity: { color: Colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
    bigEmoji: { fontSize: 48 },
    currentRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    tempBig: { color: Colors.text, fontSize: 52, fontWeight: '900' },
    currentMeta: { gap: 4 },
    condText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
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
    forecastTemp: { color: Colors.text, fontSize: 12, fontWeight: '700' },
    forecastPrecip: { color: '#3498DB', fontSize: 10 },
    placeholder: { alignItems: 'center', paddingTop: 40, gap: 16 },
    placeholderEmoji: { fontSize: 64 },
    placeholderText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  }), [Colors]);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<WeatherPoint[]>([]);
  const searching = React.useRef(false);

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('weather.permissionDenied'), t('weather.locationNeeded')); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`, { headers: { 'User-Agent': 'CSTDriverApp/1.0' } });
      const data = await r.json();
      const city = data.address?.city || data.address?.town || data.address?.state || 'My Location';
      setOrigin(city);
    } catch { Alert.alert(t('common.error'), t('weather.locationError')); }
  };

  const handleSearch = async () => {
    if (!origin.trim()) { Alert.alert(t('common.error'), t('weather.enterOrigin')); return; }
    if (searching.current) return;
    searching.current = true;
    setLoading(true);
    try {
      const locations = [{ label: t('tripLog.origin'), query: origin }];
      if (dest.trim()) locations.push({ label: t('tripLog.destination'), query: dest });

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
      Alert.alert(t('common.error'), err.message ?? t('weather.loadError'));
    } finally {
      setLoading(false);
      searching.current = false;
    }
  };


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>{t('weather.title')}</Text>
        <Text style={s.subheading}>{t('weather.subtitle')}</Text>

        <View style={s.inputRow}>
          <TextInput style={[s.input, { flex: 1 }]} value={origin} onChangeText={setOrigin} placeholder={t('weather.originPlaceholder')} placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
          <TouchableOpacity style={s.locationBtn} onPress={useMyLocation}>
            <Ionicons name="locate-outline" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <TextInput style={s.input} value={dest} onChangeText={setDest} placeholder={t('weather.destPlaceholder')} placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

        <TouchableOpacity style={[s.searchBtn, loading && { opacity: 0.6 }]} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={Colors.textDark} /> : (
            <>
              <Ionicons name="cloud-outline" size={18} color={Colors.textDark} />
              <Text style={s.searchText}>{t('weather.checkBtn')}</Text>
            </>
          )}
        </TouchableOpacity>

        {points.map((pt) => {
          const alert = roadAlert(pt.code, pt.windSpeed, pt.precipitation, t);
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
                  <Text style={s.condText}>{wmoDesc(pt.code, t)}</Text>
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
                  <Text style={s.clearText}>{t('weather.roadClear')}</Text>
                </View>
              )}

              <Text style={s.forecastLabel}>{t('weather.forecast')}</Text>
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
            <Text style={s.placeholderText}>{t('weather.placeholder')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
