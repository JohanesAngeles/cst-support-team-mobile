import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, Linking,
  KeyboardAvoidingView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import { getMapReports, createMapReport, upvoteMapReport, deleteMapReport } from '../../api/features';
import { useAuth } from '../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportType = 'truck_stop' | 'hazard' | 'weigh_station' | 'parking' | 'fuel';

interface MapReport {
  _id: string;
  userId: string;
  userName: string;
  type: ReportType;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  fuelPrice?: number;
  fuelStation?: string;
  isOpen?: boolean;
  waitMinutes?: number;
  rating?: number;
  amenities?: string[];
  hazardType?: string;
  parkingSpots?: number;
  upvotes: number;
  distanceMiles?: number;
  createdAt: string;
  expiresAt?: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const REPORT_TYPES: { key: ReportType; label: string; icon: string; color: string; emoji: string }[] = [
  { key: 'truck_stop',    label: 'Truck Stop',    icon: 'business-outline',  color: '#3498DB', emoji: '🏪' },
  { key: 'hazard',        label: 'Road Hazard',   icon: 'warning-outline',   color: '#E74C3C', emoji: '⚠️' },
  { key: 'weigh_station', label: 'Weigh Station', icon: 'scale-outline',     color: '#9B59B6', emoji: '⚖️' },
  { key: 'parking',       label: 'Parking',       icon: 'car-outline',       color: '#2ECC71', emoji: '🅿️' },
  { key: 'fuel',          label: 'Fuel Price',    icon: 'water-outline',     color: '#F39C12', emoji: '⛽' },
];

const HAZARD_TYPES = ['Construction', 'Accident', 'Low Bridge', 'Rough Road', 'Road Closure', 'Other'];
const TRUCK_AMENITIES = ['Showers', 'Restaurant', 'Scales', 'Truck Wash', 'Laundry', 'WiFi', 'Parking', 'ATM'];

const typeConfig = (type: ReportType) => REPORT_TYPES.find(r => r.key === type)!;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Leaflet HTML ─────────────────────────────────────────────────────────────

const buildMapHTML = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;background:#121212}
    .mkr{display:flex;align-items:center;justify-content:center;
         width:36px;height:36px;border-radius:50%;border:2.5px solid #fff;
         font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.6)}
    .leaflet-control-attribution{display:none}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const COLORS={truck_stop:'#3498DB',hazard:'#E74C3C',weigh_station:'#9B59B6',parking:'#2ECC71',fuel:'#F39C12'};
  const EMOJI={truck_stop:'🏪',hazard:'⚠️',weigh_station:'⚖️',parking:'🅿️',fuel:'⛽'};

  const map=L.map('map',{zoomControl:true}).setView([39.8283,-98.5795],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  let markerMap={};
  let lastReports=[];
  let activeFilters=new Set(['truck_stop','hazard','weigh_station','parking','fuel']);

  function icon(type){
    return L.divIcon({
      html:'<div class="mkr" style="background:'+COLORS[type]+'">'+EMOJI[type]+'</div>',
      className:'',iconSize:[36,36],iconAnchor:[18,18]
    });
  }

  function renderMarkers(reports){
    lastReports=reports;
    Object.values(markerMap).forEach(m=>map.removeLayer(m));
    markerMap={};
    reports.forEach(r=>{
      if(!activeFilters.has(r.type))return;
      const m=L.marker([r.lat,r.lng],{icon:icon(r.type)});
      m.on('click',()=>post({type:'tap',report:r}));
      m.addTo(map);
      markerMap[r._id]=m;
    });
  }

  function post(obj){
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  }

  // Long-press via Leaflet contextmenu (fires on mobile hold + desktop right-click)
  map.on('contextmenu',e=>post({type:'longpress',lat:e.latlng.lat,lng:e.latlng.lng}));

  // Fallback touch-hold for older Android
  let holdTimer=null;
  let holdLatLng=null;
  map.on('mousedown',e=>{holdLatLng=e.latlng;holdTimer=setTimeout(()=>post({type:'longpress',lat:holdLatLng.lat,lng:holdLatLng.lng}),700);});
  map.on('mouseup mousemove',()=>{clearTimeout(holdTimer);});

  map.on('moveend',()=>{
    const c=map.getCenter();
    post({type:'region',lat:c.lat,lng:c.lng,zoom:map.getZoom()});
  });

  // Messages from React Native
  function onMsg(e){
    try{
      const d=JSON.parse(e.data);
      if(d.action==='reports') renderMarkers(d.reports);
      if(d.action==='location') map.setView([d.lat,d.lng],12,{animate:true});
      if(d.action==='filters'){activeFilters=new Set(d.filters);renderMarkers(lastReports);}
      if(d.action==='removeMarker'&&markerMap[d.id]){map.removeLayer(markerMap[d.id]);delete markerMap[d.id];}
      if(d.action==='addMarker'){
        const r=d.report;
        if(!activeFilters.has(r.type))return;
        const m=L.marker([r.lat,r.lng],{icon:icon(r.type)});
        m.on('click',()=>post({type:'tap',report:r}));
        m.addTo(map);
        markerMap[r._id]=m;
        lastReports=[r,...lastReports];
      }
    }catch(err){}
  }
  document.addEventListener('message',onMsg);
  window.addEventListener('message',onMsg);
</script>
</body>
</html>
`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function TruckerMapScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    map: { flex: 1 },
    filterBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
    filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: Colors.surface + 'EE', borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 7,
      borderWidth: 1, borderColor: Colors.border,
    },
    filterEmoji: { fontSize: 14 },
    filterLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    controls: { position: 'absolute', right: 16, bottom: 80, gap: 10, alignItems: 'center' },
    controlBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: Colors.surface + 'EE',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: Colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    addBtn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary, width: 56, height: 56, borderRadius: 28 },
    hintBar: {
      position: 'absolute', bottom: 20, left: 16, right: 80,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: Colors.surface + 'DD', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border,
    },
    hintText: { color: Colors.textMuted, fontSize: 11, flex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: '#00000066' },
    detailCard: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
    },
    detailTypeBar: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
    detailTypeText: { color: Colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    detailExpiry: { color: Colors.text + 'AA', fontSize: 11 },
    detailBody: { padding: 20, gap: 10 },
    detailTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    detailDesc: { color: Colors.textMuted, fontSize: 14, lineHeight: 20 },
    detailChip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    detailChipLabel: { color: Colors.textMuted, fontSize: 13 },
    detailChipValue: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    detailStars: { color: Colors.secondary, fontSize: 22, letterSpacing: 2 },
    amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    amenityChip: { backgroundColor: Colors.surfaceLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
    amenityChipText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
    detailMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    detailMetaText: { color: Colors.textMuted, fontSize: 11 },
    detailActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    detailActionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: Colors.secondary,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    },
    detailActionText: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    addSheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, maxHeight: '85%',
    },
    addSheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    addSheetTitle: { color: Colors.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
    addSheetCoords: { color: Colors.textMuted, fontSize: 11, marginBottom: 14 },
    addLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    addInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
    addNote: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: Colors.surfaceLight, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 7,
      borderWidth: 1, borderColor: Colors.border, marginRight: 8,
    },
    typeChipLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    switchStatus: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    starBtn: { fontSize: 32, color: Colors.border },
    amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    amenityToggle: { backgroundColor: Colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
    amenityToggleOn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    amenityToggleText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    addBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
    addCancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, alignItems: 'center' },
    addCancelText: { color: Colors.textMuted, fontWeight: '700' },
    addSubmitBtn: { flex: 2, backgroundColor: Colors.secondary, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addSubmitText: { color: Colors.textDark, fontWeight: '900', fontSize: 14 },
  }), [Colors]);
  const { user } = useAuth();
  const webRef = useRef<WebView>(null);

  const [reports, setReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Set<ReportType>>(
    new Set(['truck_stop', 'hazard', 'weigh_station', 'parking', 'fuel'])
  );

  const [selected, setSelected] = useState<MapReport | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const [addVisible, setAddVisible] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);

  const [formType, setFormType] = useState<ReportType>('hazard');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFuelPrice, setFormFuelPrice] = useState('');
  const [formFuelStation, setFormFuelStation] = useState('');
  const [formIsOpen, setFormIsOpen] = useState(true);
  const [formWait, setFormWait] = useState('');
  const [formRating, setFormRating] = useState(0);
  const [formHazardType, setFormHazardType] = useState('Construction');
  const [formAmenities, setFormAmenities] = useState<string[]>([]);
  const [formParking, setFormParking] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // ── Send message to WebView ──────────────────────────────────────────────────

  const send = useCallback((obj: object) => {
    webRef.current?.injectJavaScript(`
      (function(){
        var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}});
        window.dispatchEvent(e);
        document.dispatchEvent(e);
      })();true;
    `);
  }, []);

  // ── Location + initial load ──────────────────────────────────────────────────

  const goToMyLocation = useCallback(async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Enable location to center the map on you.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setUserLocation({ latitude, longitude });
      send({ action: 'location', lat: latitude, lng: longitude });
      loadReports(latitude, longitude);
    } catch { Alert.alert('Error', 'Could not get location.'); }
    finally { setLocLoading(false); }
  }, [send]);

  useEffect(() => { if (mapReady) goToMyLocation(); }, [mapReady]);

  // ── Load reports ─────────────────────────────────────────────────────────────

  const loadReports = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const data = await getMapReports(lat, lng, 100);
      const list = Array.isArray(data) ? data : [];
      setReports(list);
      send({ action: 'reports', reports: list });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [send]);

  // ── Filter toggle ────────────────────────────────────────────────────────────

  const toggleFilter = (type: ReportType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      send({ action: 'filters', filters: Array.from(next) });
      return next;
    });
  };

  // ── WebView messages ─────────────────────────────────────────────────────────

  const onWebMessage = useCallback((e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'tap') {
        setSelected(msg.report);
        setDetailVisible(true);
      }
      if (msg.type === 'longpress') {
        setPendingLat(msg.lat);
        setPendingLng(msg.lng);
        resetForm();
        setAddVisible(true);
      }
      if (msg.type === 'region') {
        if (msg.zoom >= 9) loadReports(msg.lat, msg.lng);
      }
    } catch { /* ignore */ }
  }, [loadReports]);

  // ── Add report ───────────────────────────────────────────────────────────────

  const addAtMyLocation = () => {
    if (!userLocation) { Alert.alert('No location', 'Enable location first.'); return; }
    setPendingLat(userLocation.latitude);
    setPendingLng(userLocation.longitude);
    resetForm();
    setAddVisible(true);
  };

  const resetForm = () => {
    setFormType('hazard'); setFormTitle(''); setFormDesc('');
    setFormFuelPrice(''); setFormFuelStation(''); setFormIsOpen(true);
    setFormWait(''); setFormRating(0); setFormHazardType('Construction');
    setFormAmenities([]); setFormParking('');
  };

  const submitReport = async () => {
    if (!pendingLat || !pendingLng) return;
    if (!formTitle.trim()) { Alert.alert('Title required', 'Give this report a short title.'); return; }
    setFormSaving(true);
    try {
      const payload: any = {
        type: formType, lat: pendingLat, lng: pendingLng,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
      };
      if (formType === 'fuel') { payload.fuelPrice = parseFloat(formFuelPrice) || undefined; payload.fuelStation = formFuelStation.trim() || undefined; }
      if (formType === 'weigh_station') { payload.isOpen = formIsOpen; payload.waitMinutes = parseInt(formWait) || undefined; }
      if (formType === 'truck_stop') { payload.rating = formRating || undefined; payload.amenities = formAmenities.length > 0 ? formAmenities : undefined; }
      if (formType === 'hazard') { payload.hazardType = formHazardType; }
      if (formType === 'parking') { payload.parkingSpots = parseInt(formParking) || undefined; }

      const newReport = await createMapReport(payload);
      setReports(prev => [newReport, ...prev]);
      send({ action: 'addMarker', report: newReport });
      setAddVisible(false);
      Alert.alert('Posted!', 'Your report is now visible to all Road Ready truckers nearby.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not post report.');
    } finally { setFormSaving(false); }
  };

  // ── Navigate ─────────────────────────────────────────────────────────────────

  const navigateTo = (lat: number, lng: number, label: string) => {
    Alert.alert('Navigate to ' + label, 'Choose your navigation app:', [
      {
        text: 'Google Maps (Truck Mode)',
        onPress: () => {
          const url = Platform.OS === 'ios'
            ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
            : `google.navigation:q=${lat},${lng}&mode=d`;
          Linking.canOpenURL(url).then(can =>
            can ? Linking.openURL(url)
                : Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`)
          );
        },
      },
      {
        text: Platform.OS === 'ios' ? 'Apple Maps' : 'Default Maps',
        onPress: () => Linking.openURL(Platform.OS === 'ios' ? `maps://?daddr=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Upvote / Delete ──────────────────────────────────────────────────────────

  const handleUpvote = async (report: MapReport) => {
    try {
      const res = await upvoteMapReport(report._id);
      setReports(prev => prev.map(r => r._id === report._id ? { ...r, upvotes: res.upvotes } : r));
      if (selected?._id === report._id) setSelected(prev => prev ? { ...prev, upvotes: res.upvotes } : null);
    } catch { /* silent */ }
  };

  const handleDelete = (report: MapReport) => {
    Alert.alert('Delete report?', 'This will remove your report for all drivers.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteMapReport(report._id);
            setReports(prev => prev.filter(r => r._id !== report._id));
            send({ action: 'removeMarker', id: report._id });
            setDetailVisible(false);
          } catch { Alert.alert('Error', 'Could not delete report.'); }
        },
      },
    ]);
  };

  // ── Detail card ──────────────────────────────────────────────────────────────

  const renderStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const renderDetailCard = (report: MapReport) => {
    const cfg = typeConfig(report.type);
    return (
      <View style={styles.detailCard}>
        <View style={[styles.detailTypeBar, { backgroundColor: cfg.color }]}>
          <Text style={styles.detailTypeText}>{cfg.emoji}  {cfg.label.toUpperCase()}</Text>
          {report.expiresAt && <Text style={styles.detailExpiry}>expires in 24h</Text>}
        </View>
        <View style={styles.detailBody}>
          <Text style={styles.detailTitle}>{report.title}</Text>
          {report.description ? <Text style={styles.detailDesc}>{report.description}</Text> : null}
          {report.type === 'fuel' && report.fuelPrice && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>⛽ Diesel</Text>
              <Text style={[styles.detailChipValue, { color: Colors.secondary }]}>${report.fuelPrice.toFixed(3)}/gal</Text>
            </View>
          )}
          {report.type === 'weigh_station' && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Status</Text>
              <Text style={[styles.detailChipValue, { color: report.isOpen ? Colors.danger : Colors.success }]}>
                {report.isOpen ? '🔴 OPEN' : '🟢 CLOSED'}
              </Text>
              {report.waitMinutes ? <Text style={styles.detailChipLabel}>  ~{report.waitMinutes} min wait</Text> : null}
            </View>
          )}
          {report.type === 'truck_stop' && report.rating && (
            <Text style={styles.detailStars}>{renderStars(report.rating)}</Text>
          )}
          {report.type === 'truck_stop' && report.amenities && report.amenities.length > 0 && (
            <View style={styles.amenityRow}>
              {report.amenities.map(a => (
                <View key={a} style={styles.amenityChip}><Text style={styles.amenityChipText}>{a}</Text></View>
              ))}
            </View>
          )}
          {report.type === 'hazard' && report.hazardType && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Type</Text>
              <Text style={[styles.detailChipValue, { color: '#E74C3C' }]}>{report.hazardType}</Text>
            </View>
          )}
          {report.type === 'parking' && report.parkingSpots != null && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>🅿️ Est. spots</Text>
              <Text style={styles.detailChipValue}>{report.parkingSpots}</Text>
            </View>
          )}
          <View style={styles.detailMeta}>
            <Text style={styles.detailMetaText}>by {report.userName}  ·  {timeAgo(report.createdAt)}</Text>
            {report.distanceMiles != null && <Text style={styles.detailMetaText}>{report.distanceMiles} mi away</Text>}
          </View>
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.detailActionBtn} onPress={() => handleUpvote(report)}>
              <Ionicons name="thumbs-up-outline" size={16} color={Colors.secondary} />
              <Text style={styles.detailActionText}>{report.upvotes} helpful</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailActionBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
              onPress={() => navigateTo(report.lat, report.lng, report.title)}
            >
              <Ionicons name="navigate-outline" size={16} color={Colors.white} />
              <Text style={[styles.detailActionText, { color: Colors.text }]}>Navigate Here</Text>
            </TouchableOpacity>
            {report.userId === user?._id && (
              <TouchableOpacity style={[styles.detailActionBtn, { borderColor: Colors.danger }]} onPress={() => handleDelete(report)}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────


  return (
    <View style={styles.container}>
      {/* Leaflet map via WebView */}
      <WebView
        ref={webRef}
        style={styles.map}
        source={{ html: buildMapHTML() }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setMapReady(true)}
        onMessage={onWebMessage}
        allowsInlineMediaPlayback
        mixedContentMode="always"
      />

      {/* Top filter bar */}
      <SafeAreaView style={styles.filterBar} edges={['top']}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {REPORT_TYPES.map(rt => {
            const active = activeFilters.has(rt.key);
            return (
              <TouchableOpacity
                key={rt.key}
                style={[styles.filterChip, active && { backgroundColor: rt.color, borderColor: rt.color }]}
                onPress={() => toggleFilter(rt.key)}
              >
                <Text style={styles.filterEmoji}>{rt.emoji}</Text>
                <Text style={[styles.filterLabel, active && { color: Colors.text }]}>{rt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {loading && <ActivityIndicator size="small" color={Colors.secondary} style={{ marginRight: 12 }} />}
      </SafeAreaView>

      {/* Bottom right controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={goToMyLocation} disabled={locLoading}>
          {locLoading
            ? <ActivityIndicator size="small" color={Colors.secondary} />
            : <Ionicons name="locate-outline" size={22} color={Colors.secondary} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.addBtn]} onPress={addAtMyLocation}>
          <Ionicons name="add" size={26} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* Long-press hint */}
      <View style={styles.hintBar}>
        <Ionicons name="finger-print-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.hintText}>Long-press map to drop a report · {reports.length} reports nearby</Text>
      </View>

      {/* Report detail bottom sheet */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDetailVisible(false)} />
        {selected && renderDetailCard(selected)}
      </Modal>

      {/* Add report modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAddVisible(false)} />
          <View style={styles.addSheet}>
            <View style={styles.addSheetHandle} />
            <Text style={styles.addSheetTitle}>Report to Truckers</Text>
            {pendingLat && (
              <Text style={styles.addSheetCoords}>📍 {pendingLat.toFixed(5)}, {pendingLng?.toFixed(5)}</Text>
            )}

            <Text style={styles.addLabel}>Report Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {REPORT_TYPES.map(rt => (
                <TouchableOpacity
                  key={rt.key}
                  style={[styles.typeChip, formType === rt.key && { backgroundColor: rt.color, borderColor: rt.color }]}
                  onPress={() => setFormType(rt.key)}
                >
                  <Text style={styles.filterEmoji}>{rt.emoji}</Text>
                  <Text style={[styles.typeChipLabel, formType === rt.key && { color: Colors.text }]}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.addLabel}>Title *</Text>
              <TextInput
                style={styles.addInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder={
                  formType === 'fuel' ? 'e.g. Loves Travel Stop – cheap diesel' :
                  formType === 'hazard' ? 'e.g. Construction I-40 mile 82' :
                  formType === 'weigh_station' ? 'e.g. TX I-40 Eastbound' :
                  formType === 'parking' ? 'e.g. Walmart lot – 20+ spots free' :
                  'e.g. Flying J Amarillo'
                }
                placeholderTextColor={Colors.textMuted}
                maxLength={80}
              />

              {formType === 'fuel' && (
                <>
                  <Text style={styles.addLabel}>Diesel Price ($/gal)</Text>
                  <TextInput style={styles.addInput} value={formFuelPrice} onChangeText={setFormFuelPrice}
                    placeholder="3.89" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                  <Text style={styles.addLabel}>Station Name</Text>
                  <TextInput style={styles.addInput} value={formFuelStation} onChangeText={setFormFuelStation}
                    placeholder="e.g. Pilot Flying J" placeholderTextColor={Colors.textMuted} />
                </>
              )}

              {formType === 'weigh_station' && (
                <>
                  <View style={styles.switchRow}>
                    <Text style={styles.addLabel}>Scale is OPEN</Text>
                    <Switch value={formIsOpen} onValueChange={setFormIsOpen}
                      trackColor={{ false: Colors.success, true: Colors.danger }} thumbColor={Colors.white} />
                  </View>
                  <Text style={[styles.switchStatus, { color: formIsOpen ? Colors.danger : Colors.success }]}>
                    {formIsOpen ? '🔴 Currently OPEN — truckers must stop' : '🟢 Currently CLOSED — pass through'}
                  </Text>
                  <Text style={styles.addLabel}>Estimated Wait (minutes)</Text>
                  <TextInput style={styles.addInput} value={formWait} onChangeText={setFormWait}
                    placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
                </>
              )}

              {formType === 'truck_stop' && (
                <>
                  <Text style={styles.addLabel}>Rating</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setFormRating(n)}>
                        <Text style={[styles.starBtn, n <= formRating && { color: Colors.secondary }]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.addLabel}>Amenities</Text>
                  <View style={styles.amenityGrid}>
                    {TRUCK_AMENITIES.map(a => {
                      const on = formAmenities.includes(a);
                      return (
                        <TouchableOpacity
                          key={a}
                          style={[styles.amenityToggle, on && styles.amenityToggleOn]}
                          onPress={() => setFormAmenities(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                        >
                          <Text style={[styles.amenityToggleText, on && { color: Colors.textDark }]}>{a}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {formType === 'hazard' && (
                <>
                  <Text style={styles.addLabel}>Hazard Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {HAZARD_TYPES.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.typeChip, formHazardType === h && { backgroundColor: '#E74C3C', borderColor: '#E74C3C' }]}
                        onPress={() => setFormHazardType(h)}
                      >
                        <Text style={[styles.typeChipLabel, formHazardType === h && { color: Colors.text }]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.addNote}>⏱ Hazard reports auto-expire after 24 hours</Text>
                </>
              )}

              {formType === 'parking' && (
                <>
                  <Text style={styles.addLabel}>Estimated Available Spots</Text>
                  <TextInput style={styles.addInput} value={formParking} onChangeText={setFormParking}
                    placeholder="e.g. 20" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
                </>
              )}

              <Text style={styles.addLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.addInput, { height: 72, textAlignVertical: 'top' }]}
                value={formDesc} onChangeText={setFormDesc}
                placeholder="Any extra info for other truckers..."
                placeholderTextColor={Colors.textMuted}
                multiline maxLength={300}
              />

              <View style={styles.addBtns}>
                <TouchableOpacity style={styles.addCancelBtn} onPress={() => setAddVisible(false)}>
                  <Text style={styles.addCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addSubmitBtn, formSaving && { opacity: 0.6 }]}
                  onPress={submitReport}
                  disabled={formSaving}
                >
                  {formSaving
                    ? <ActivityIndicator size="small" color={Colors.textDark} />
                    : <>
                        <Ionicons name="radio-outline" size={16} color={Colors.textDark} />
                        <Text style={styles.addSubmitText}>Broadcast to Truckers</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
