import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface WeighStation {
  id: string;
  name: string;
  state: string;
  highway: string;
  direction: string;
  lat: number;
  lng: number;
  bypass: string;
}

const STATIONS: WeighStation[] = [
  // I-10
  { id: 'tx01', name: 'El Paso WS', state: 'TX', highway: 'I-10', direction: 'EB/WB', lat: 31.78, lng: -106.43, bypass: 'PrePass eligible' },
  { id: 'tx02', name: 'San Antonio WS', state: 'TX', highway: 'I-10', direction: 'EB', lat: 29.42, lng: -98.49, bypass: 'PrePass eligible' },
  { id: 'tx03', name: 'Beaumont WS', state: 'TX', highway: 'I-10', direction: 'EB', lat: 30.09, lng: -94.10, bypass: 'PrePass eligible' },
  { id: 'la01', name: 'Baton Rouge WS', state: 'LA', highway: 'I-10', direction: 'WB', lat: 30.45, lng: -91.13, bypass: 'Check FMCSA' },
  { id: 'fl01', name: 'Pensacola WS', state: 'FL', highway: 'I-10', direction: 'EB/WB', lat: 30.44, lng: -87.28, bypass: 'PrePass eligible' },
  // I-40
  { id: 'tx04', name: 'Amarillo WS', state: 'TX', highway: 'I-40', direction: 'EB/WB', lat: 35.22, lng: -101.83, bypass: 'PrePass eligible' },
  { id: 'nm01', name: 'Albuquerque WS', state: 'NM', highway: 'I-40', direction: 'EB', lat: 35.08, lng: -106.65, bypass: 'PrePass eligible' },
  { id: 'az01', name: 'Flagstaff WS', state: 'AZ', highway: 'I-40', direction: 'WB', lat: 35.19, lng: -111.65, bypass: 'PrePass eligible' },
  { id: 'ok01', name: 'Oklahoma City WS', state: 'OK', highway: 'I-40', direction: 'EB', lat: 35.47, lng: -97.51, bypass: 'PrePass eligible' },
  { id: 'tn01', name: 'Memphis WS', state: 'TN', highway: 'I-40', direction: 'WB', lat: 35.15, lng: -90.04, bypass: 'PrePass eligible' },
  // I-80
  { id: 'ut01', name: 'Salt Lake City WS', state: 'UT', highway: 'I-80', direction: 'EB/WB', lat: 40.76, lng: -111.89, bypass: 'PrePass eligible' },
  { id: 'nv01', name: 'Elko WS', state: 'NV', highway: 'I-80', direction: 'WB', lat: 40.83, lng: -115.76, bypass: 'PrePass eligible' },
  { id: 'nv02', name: 'Reno WS', state: 'NV', highway: 'I-80', direction: 'EB', lat: 39.53, lng: -119.81, bypass: 'PrePass eligible' },
  { id: 'ca01', name: 'Truckee/Sacramento WS', state: 'CA', highway: 'I-80', direction: 'WB', lat: 39.32, lng: -120.18, bypass: 'PrePass eligible' },
  { id: 'wy01', name: 'Cheyenne WS', state: 'WY', highway: 'I-80', direction: 'EB/WB', lat: 41.14, lng: -104.82, bypass: 'PrePass eligible' },
  { id: 'ne01', name: 'North Platte WS', state: 'NE', highway: 'I-80', direction: 'EB', lat: 41.12, lng: -100.77, bypass: 'Check FMCSA' },
  // I-70
  { id: 'co01', name: 'Denver WS (Wheat Ridge)', state: 'CO', highway: 'I-70', direction: 'WB', lat: 39.77, lng: -105.10, bypass: 'PrePass eligible' },
  { id: 'ks01', name: 'Kansas City WS', state: 'KS', highway: 'I-70', direction: 'WB', lat: 39.10, lng: -94.82, bypass: 'PrePass eligible' },
  { id: 'mo01', name: 'St. Louis WS', state: 'MO', highway: 'I-70', direction: 'EB', lat: 38.63, lng: -90.20, bypass: 'PrePass eligible' },
  // I-90
  { id: 'wa01', name: 'Moses Lake WS', state: 'WA', highway: 'I-90', direction: 'WB', lat: 47.13, lng: -119.28, bypass: 'PrePass eligible' },
  { id: 'mt01', name: 'Billings WS', state: 'MT', highway: 'I-90', direction: 'EB/WB', lat: 45.78, lng: -108.50, bypass: 'PrePass eligible' },
  { id: 'ny01', name: 'Buffalo WS', state: 'NY', highway: 'I-90', direction: 'WB', lat: 42.89, lng: -78.88, bypass: 'Check FMCSA' },
  // I-95
  { id: 'fl02', name: 'Jacksonville WS', state: 'FL', highway: 'I-95', direction: 'NB/SB', lat: 30.33, lng: -81.66, bypass: 'PrePass eligible' },
  { id: 'ga01', name: 'Savannah WS', state: 'GA', highway: 'I-95', direction: 'SB', lat: 32.08, lng: -81.10, bypass: 'PrePass eligible' },
  { id: 'va01', name: 'Richmond WS', state: 'VA', highway: 'I-95', direction: 'NB', lat: 37.54, lng: -77.44, bypass: 'PrePass eligible' },
  { id: 'md01', name: 'Baltimore WS', state: 'MD', highway: 'I-95', direction: 'SB', lat: 39.29, lng: -76.72, bypass: 'PrePass eligible' },
  // I-15
  { id: 'nv03', name: 'Las Vegas WS', state: 'NV', highway: 'I-15', direction: 'NB', lat: 36.18, lng: -115.14, bypass: 'PrePass eligible' },
  { id: 'ca02', name: 'Barstow WS', state: 'CA', highway: 'I-15', direction: 'SB', lat: 34.90, lng: -117.02, bypass: 'PrePass eligible' },
  // I-5
  { id: 'ca03', name: 'Grapevine WS', state: 'CA', highway: 'I-5', direction: 'NB', lat: 34.84, lng: -118.91, bypass: 'PrePass eligible' },
  { id: 'ca04', name: 'Stockton WS', state: 'CA', highway: 'I-5', direction: 'NB/SB', lat: 37.96, lng: -121.29, bypass: 'PrePass eligible' },
  { id: 'or01', name: 'Portland WS (Wilsonville)', state: 'OR', highway: 'I-5', direction: 'NB/SB', lat: 45.30, lng: -122.77, bypass: 'PrePass eligible' },
  // I-20
  { id: 'tx05', name: 'Dallas/Mesquite WS', state: 'TX', highway: 'I-20', direction: 'WB', lat: 32.77, lng: -96.60, bypass: 'PrePass eligible' },
  // I-75
  { id: 'ga02', name: 'Atlanta WS (Morrow)', state: 'GA', highway: 'I-75', direction: 'NB/SB', lat: 33.58, lng: -84.34, bypass: 'PrePass eligible' },
  { id: 'oh01', name: 'Cincinnati WS', state: 'OH', highway: 'I-75', direction: 'NB', lat: 39.10, lng: -84.51, bypass: 'PrePass eligible' },
  { id: 'mi01', name: 'Monroe WS', state: 'MI', highway: 'I-75', direction: 'NB', lat: 41.92, lng: -83.40, bypass: 'PrePass eligible' },
];

function buildMapHTML(stations: WeighStation[]): string {
  const center = [39.5, -98.35];
  const markers = JSON.stringify(stations.map(ws => ({
    id: ws.id, lat: ws.lat, lng: ws.lng,
    name: ws.name, state: ws.state, highway: ws.highway,
    direction: ws.direction, bypass: ws.bypass,
  })));
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.ws-popup{font-family:sans-serif;font-size:13px;min-width:160px;}
.ws-name{font-weight:900;color:#1a1a1a;margin-bottom:4px;}
.ws-hw{font-size:12px;color:#666;}
.ws-bypass{font-size:11px;color:#27AE60;margin-top:4px;font-weight:700;}</style>
</head><body><div id="map"></div>
<script>
const map=L.map('map').setView(${JSON.stringify(center)},5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
const stations=${markers};
stations.forEach(ws=>{
  const icon=L.divIcon({className:'',html:'<div style="font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))">⚖️</div>',iconAnchor:[11,22]});
  L.marker([ws.lat,ws.lng],{icon}).addTo(map)
    .bindPopup('<div class="ws-popup"><div class="ws-name">'+ws.name+'</div><div class="ws-hw">'+ws.highway+' · '+ws.direction+'</div><div class="ws-bypass">'+ws.bypass+'</div></div>');
});
</script></body></html>`;
}

export default function WeighStationScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: 12, gap: 10 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border },
    infoText: { color: Colors.textMuted, fontSize: 11, flex: 1 },
    toggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, gap: 6 },
    toggleActive: { backgroundColor: Colors.secondary },
    toggleText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
    toggleActiveText: { color: Colors.textDark },
    search: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
    list: { paddingHorizontal: 12, paddingBottom: 30 },
    card: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    wsIcon: { fontSize: 24 },
    wsName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    wsMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    stateBadge: { backgroundColor: Colors.secondary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.secondary },
    stateText: { color: Colors.secondary, fontSize: 12, fontWeight: '900' },
    bypassRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bypassText: { color: '#2ECC71', fontSize: 12, fontWeight: '600' },
    emptyText: { color: Colors.textMuted, textAlign: 'center', paddingTop: 30, fontSize: 14 },
  }), [Colors]);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('');
  const webRef = useRef<WebView>(null);

  const filtered = STATIONS.filter(ws =>
    !search || ws.state.toLowerCase().includes(search.toLowerCase()) ||
    ws.highway.toLowerCase().includes(search.toLowerCase()) ||
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  const statesWithStations = [...new Set(STATIONS.map(ws => ws.state))].sort();


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={s.infoText}>⚖️ = weigh station · Most are PrePass eligible for bypass</Text>
        </View>
        <View style={s.toggle}>
          <TouchableOpacity style={[s.toggleBtn, view === 'map' && s.toggleActive]} onPress={() => setView('map')}>
            <Ionicons name="map-outline" size={15} color={view === 'map' ? Colors.textDark : Colors.textMuted} />
            <Text style={[s.toggleText, view === 'map' && s.toggleActiveText]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, view === 'list' && s.toggleActive]} onPress={() => setView('list')}>
            <Ionicons name="list-outline" size={15} color={view === 'list' ? Colors.textDark : Colors.textMuted} />
            <Text style={[s.toggleText, view === 'list' && s.toggleActiveText]}>List ({STATIONS.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {view === 'map' ? (
        <WebView
          ref={webRef}
          source={{ html: buildMapHTML(STATIONS) }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          mixedContentMode="always"
          javaScriptEnabled
        />
      ) : (
        <>
          <TextInput
            style={s.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by state or highway (e.g. TX, I-40)"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />
          <FlatList
            data={filtered}
            keyExtractor={ws => ws.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={s.emptyText}>No stations match your filter</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.cardRow}>
                  <Text style={s.wsIcon}>⚖️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.wsName}>{item.name}</Text>
                    <Text style={s.wsMeta}>{item.highway} · {item.direction}</Text>
                  </View>
                  <View style={[s.stateBadge]}>
                    <Text style={s.stateText}>{item.state}</Text>
                  </View>
                </View>
                <View style={s.bypassRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color='#2ECC71' />
                  <Text style={s.bypassText}>{item.bypass}</Text>
                </View>
              </View>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}
