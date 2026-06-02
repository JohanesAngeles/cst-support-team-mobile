import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
  TouchableOpacity, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useColors } from '../../constants/colors';
import { getMapReports, getEIADieselPrices } from '../../api/features';

interface EIAPrice {
  region: string;
  regionLabel: string;
  price: number | null;
  period: string;
}

interface FuelReport {
  _id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  fuelPrice?: number;
  fuelStation?: string;
  isOpen?: boolean;
  rating?: number;
  upvotes?: number;
  createdAt: string;
}

function buildMapHTML(lat: number, lng: number, reports: FuelReport[]): string {
  const markers = reports.map(r => ({
    id: r._id, lat: r.lat, lng: r.lng,
    price: r.fuelPrice ?? null, station: r.fuelStation ?? r.title, isOpen: r.isOpen ?? true,
  }));
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.fuel-popup{font-family:sans-serif;font-size:13px;min-width:120px;}
.fuel-price{font-size:18px;font-weight:900;color:#F1C40F;}
.fuel-station{font-weight:700;color:#fff;}</style>
</head><body>
<div id="map"></div>
<script>
const map = L.map('map',{zoomControl:true}).setView([${lat},${lng}],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
L.marker([${lat},${lng}],{icon:L.divIcon({className:'',html:'<div style="font-size:28px">📍</div>',iconAnchor:[14,28]})}).addTo(map).bindPopup('You are here');
const reports=${JSON.stringify(markers)};
reports.forEach(r=>{
  const color=r.isOpen?'#2ECC71':'#E74C3C';
  const priceLabel=r.price?'⛽ $'+r.price.toFixed(3)+'/gal':'⛽ No price';
  const icon=L.divIcon({className:'',html:'<div style="font-size:26px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))">⛽</div>',iconAnchor:[13,26]});
  L.marker([r.lat,r.lng],{icon}).addTo(map)
    .bindPopup('<div class="fuel-popup"><div class="fuel-station">'+r.station+'</div><div class="fuel-price">'+priceLabel+'</div><div style="color:'+(r.isOpen?'#2ECC71':'#E74C3C')+'">'+( r.isOpen?'Open':'Closed/Unknown')+'</div></div>');
});
</script></body></html>`;
}

export default function FuelFinderScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12 },
    loadingText: { color: Colors.textMuted, fontSize: 14 },
    toggle: { flexDirection: 'row', margin: 12, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    toggleActive: { backgroundColor: Colors.secondary, borderRadius: 10 },
    toggleText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
    toggleTextActive: { color: Colors.textDark },
    list: { padding: 16, paddingBottom: 80 },
    listHeader: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8 },
    bestBadge: { backgroundColor: Colors.secondary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.secondary },
    bestText: { color: Colors.secondary, fontSize: 10, fontWeight: '900' },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    stationName: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    cardSub: { color: Colors.textMuted, fontSize: 12 },
    priceBlock: { alignItems: 'flex-end' },
    priceText: { color: '#F1C40F', fontSize: 22, fontWeight: '900' },
    priceUnit: { color: Colors.textMuted, fontSize: 11 },
    noPriceText: { color: Colors.textMuted, fontSize: 13 },
    openBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    openText: { color: Colors.textMuted, fontSize: 12 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: Colors.border },
    footerText: { color: Colors.textMuted, fontSize: 11, flex: 1 },
    eiaBanner: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 10, marginBottom: 12 },
    eiaHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    eiaTitle: { color: Colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
    eiaDate: { color: Colors.textMuted, fontSize: 10 },
    eiaChip: { backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    eiaChipNational: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '18' },
    eiaChipLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2 },
    eiaChipPrice: { color: '#F1C40F', fontSize: 15, fontWeight: '900' },
  }), [Colors]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [eiaPrices, setEiaPrices] = useState<EIAPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'map' | 'list'>('map');
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = 39.8283, lng = -98.5795;
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
        setLocation({ lat, lng });
        const [mapData, eiaData] = await Promise.allSettled([
          getMapReports(lat, lng, 100, 'fuel'),
          getEIADieselPrices(),
        ]);
        if (mapData.status === 'fulfilled') setReports(mapData.value.reports ?? []);
        if (eiaData.status === 'fulfilled') setEiaPrices(eiaData.value.prices ?? []);
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Could not load fuel data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = [...reports].sort((a, b) => {
    if (a.fuelPrice && b.fuelPrice) return a.fuelPrice - b.fuelPrice;
    if (a.fuelPrice) return -1;
    if (b.fuelPrice) return 1;
    return 0;
  });

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={Colors.secondary} />
      <Text style={s.loadingText}>Finding fuel near you...</Text>
    </View>
  );


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Toggle */}
      <View style={s.toggle}>
        <TouchableOpacity style={[s.toggleBtn, view === 'map' && s.toggleActive]} onPress={() => setView('map')}>
          <Ionicons name="map-outline" size={16} color={view === 'map' ? Colors.textDark : Colors.textMuted} />
          <Text style={[s.toggleText, view === 'map' && s.toggleTextActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.toggleBtn, view === 'list' && s.toggleActive]} onPress={() => setView('list')}>
          <Ionicons name="list-outline" size={16} color={view === 'list' ? Colors.textDark : Colors.textMuted} />
          <Text style={[s.toggleText, view === 'list' && s.toggleTextActive]}>List ({sorted.length})</Text>
        </TouchableOpacity>
      </View>

      {view === 'map' && location ? (
        <WebView
          ref={webRef}
          source={{ html: buildMapHTML(location.lat, location.lng, reports) }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          mixedContentMode="always"
          javaScriptEnabled
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={r => r._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="funnel-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>No fuel reports nearby</Text>
              <Text style={s.emptySub}>Community reports will appear here</Text>
              <Text style={s.emptySub}>Add fuel prices via the Trucker Map</Text>
            </View>
          }
          ListHeaderComponent={
            <>
              {eiaPrices.length > 0 && (
                <View style={s.eiaBanner}>
                  <View style={s.eiaHeader}>
                    <Ionicons name="stats-chart-outline" size={13} color={Colors.secondary} />
                    <Text style={s.eiaTitle}>EIA Weekly Diesel Avg</Text>
                    <Text style={s.eiaDate}>
                      {eiaPrices[0]?.period ? `Week of ${eiaPrices[0].period}` : ''}
                    </Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={eiaPrices as EIAPrice[]}
                    keyExtractor={p => p.region}
                    contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
                    renderItem={({ item }) => (
                      <View style={[s.eiaChip, item.region === 'NUS' && s.eiaChipNational]}>
                        <Text style={s.eiaChipLabel}>{item.regionLabel}</Text>
                        <Text style={s.eiaChipPrice}>
                          {item.price != null ? `$${item.price.toFixed(3)}` : 'N/A'}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              )}
              {sorted.length > 0 && (
                <Text style={s.listHeader}>Sorted by price · community reports</Text>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <View style={s.card}>
              {item.fuelPrice && index === 0 && (
                <View style={s.bestBadge}><Text style={s.bestText}>BEST PRICE</Text></View>
              )}
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.stationName}>{item.fuelStation ?? item.title}</Text>
                  {item.description ? <Text style={s.cardSub}>{item.description}</Text> : null}
                  <Text style={s.cardSub}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {item.upvotes ?? 0} upvotes
                  </Text>
                </View>
                <View style={s.priceBlock}>
                  {item.fuelPrice ? (
                    <>
                      <Text style={s.priceText}>${item.fuelPrice.toFixed(3)}</Text>
                      <Text style={s.priceUnit}>/gal</Text>
                    </>
                  ) : (
                    <Text style={s.noPriceText}>No price</Text>
                  )}
                </View>
              </View>
              <View style={s.openBadge}>
                <View style={[s.dot, { backgroundColor: item.isOpen === false ? Colors.danger : '#2ECC71' }]} />
                <Text style={s.openText}>{item.isOpen === false ? 'Closed / Unknown' : 'Open'}</Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={s.footer}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={s.footerText}>Prices are community-reported. Add reports via Trucker Map.</Text>
      </View>
    </SafeAreaView>
  );
}
