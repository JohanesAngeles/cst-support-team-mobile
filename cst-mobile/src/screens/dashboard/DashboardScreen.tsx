import React, {
  useState, useCallback, useMemo, useRef, useEffect,
} from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  Linking, Platform, Dimensions, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import client from '../../api/client';
import DashboardMenuDrawer from './DashboardMenuDrawer';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SW } = Dimensions.get('window');
const NAVY = '#021B3A';

const DEFAULT_REGION = {
  latitude: 34.0522, longitude: -118.2437,
  latitudeDelta: 0.8, longitudeDelta: 0.8,
};

// ── Business listing types ────────────────────────────────────────────────────
interface Listing {
  _id: string;
  businessName: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  hours?: string;
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  physicalAddress?: string;
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Mechanic':                       { icon: 'construct-outline',  color: '#E67E22' },
  'Tire Shop':                      { icon: 'car-outline',        color: '#2ECC71' },
  'Fuel Station':                   { icon: 'water-outline',      color: '#1ABC9C' },
  'Hotel / Motel':                  { icon: 'bed-outline',        color: '#F39C12' },
  'Restaurant':                     { icon: 'restaurant-outline', color: '#2C6EBD' },
  'Truck Wash':                     { icon: 'car-outline',        color: '#3498DB' },
  'Compliance Service':             { icon: 'document-outline',   color: '#9B59B6' },
  'Towing':                         { icon: 'car-outline',        color: '#E74C3C' },
  'Other':                          { icon: 'business-outline',   color: '#7F8C8D' },
};


function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Ionicons key={n} name={n <= Math.round(rating) ? 'star' : 'star-outline'} size={12} color="#F5C842" />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const Colors     = useColors();
  const { user }   = useAuth();
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const mapRef     = useRef<MapView>(null);

  // ── Map / listings state ──────────────────────────────────────────────────
  const [listings,        setListings]        = useState<Listing[]>([]);
  const [loadingMap,      setLoadingMap]      = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [userCoords,      setUserCoords]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady,        setMapReady]        = useState(false);
  const [nearbyMode,      setNearbyMode]      = useState(false);
  const [locLoading,      setLocLoading]      = useState(false);
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // ── Burger menu state ─────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);

  // ── SOS pulse ─────────────────────────────────────────────────────────────
  const sosPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [sosPulse]);

  // ── Bottom card slide animation ───────────────────────────────────────────
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: selectedListing ? 1 : 0,
      useNativeDriver: true,
      tension: 65, friction: 11,
    }).start();
  }, [selectedListing]);

  // ── Fetch listings ────────────────────────────────────────────────────────
  const fetchListings = useCallback(async (coords?: { latitude: number; longitude: number } | null) => {
    setLoadingMap(true);
    try {
      const params: Record<string, string> = coords
        ? { lat: String(coords.latitude), lng: String(coords.longitude), radius: '75' }
        : {};
      const res = await client.get('/partner/listings', { params });
      setListings(res.data ?? []);
    } catch {
      // silent
    } finally {
      setLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(pos => {
          const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserCoords(c);
          coordsRef.current = c;
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [fetchListings]);

  // ── Near Me toggle ────────────────────────────────────────────────────────
  const toggleNearby = useCallback(async () => {
    if (nearbyMode) {
      setNearbyMode(false);
      fetchListings(null);
      return;
    }
    let coords = coordsRef.current;
    if (!coords) {
      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Location Required', 'Enable location to filter nearby partners.'); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(coords);
        coordsRef.current = coords;
      } catch { Alert.alert('Error', 'Could not get your location.'); return; }
      finally { setLocLoading(false); }
    }
    setNearbyMode(true);
    fetchListings(coords);
  }, [nearbyMode, fetchListings]);

  // Re-center map
  useEffect(() => {
    if (mapReady && userCoords && mapRef.current) {
      mapRef.current.animateToRegion({ ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 600);
    }
  }, [mapReady, userCoords]);

  // ── Filtered listings for pins + card ────────────────────────────────────
  const filtered = useMemo(() => {
    if (!activeCategory) return listings;
    return listings.filter(l => l.category === activeCategory);
  }, [listings, activeCategory]);

  const mappable = filtered.filter(l => l.latitude && l.longitude);

  // ── Actions ───────────────────────────────────────────────────────────────
  const callBusiness = (l: Listing) => {
    if (!l.phone) return;
    Linking.openURL(`tel:${l.phone.replace(/\D/g, '')}`);
    client.post(`/partner/listing/${l._id}/click`).catch(() => {});
  };

  const getDirections = (l: Listing) => {
    const addr  = l.physicalAddress || `${l.businessName}, ${l.city}, ${l.state}`;
    const query = encodeURIComponent(addr);
    const url = l.latitude && l.longitude
      ? (Platform.OS === 'ios'
          ? `maps://maps.apple.com/?daddr=${l.latitude},${l.longitude}`
          : `geo:${l.latitude},${l.longitude}?q=${query}`)
      : (Platform.OS === 'ios'
          ? `maps://maps.apple.com/?q=${query}`
          : `geo:0,0?q=${query}`);
    Linking.canOpenURL(url).then(can =>
      Linking.openURL(can ? url : `https://www.google.com/maps/search/${query}`)
    );
    client.post(`/partner/listing/${l._id}/click`).catch(() => {});
  };

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const initials  = (user?.name ?? 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  // ── Category chips list ───────────────────────────────────────────────────
  const categories = [null, ...Object.keys(CATEGORY_ICONS)];

  return (
    <View style={{ flex: 1, backgroundColor: '#E8EDF2' }}>

      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>

        {/* Row 1: Greeting + avatar + icons */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 10,
        }}>
          {/* Avatar */}
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => (navigation as any).navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{initials}</Text>
          </TouchableOpacity>

          {/* Greeting */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>{greeting},</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A2E', marginTop: -1 }}>{firstName}</Text>
          </View>

          {/* Search */}
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.navigate('Tools' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={18} color={NAVY} />
          </TouchableOpacity>

          {/* Bell */}
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.navigate('HOSAlerts')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color={NAVY} />
            <View style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9500', borderWidth: 1.5, borderColor: '#FFF' }} />
          </TouchableOpacity>

          {/* Burger menu */}
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Row 2: All / Near Me tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, backgroundColor: !nearbyMode ? NAVY : '#F0F4F8' }}
            onPress={() => nearbyMode && toggleNearby()}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: !nearbyMode ? '#FFF' : '#8E8E93' }}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, backgroundColor: nearbyMode ? NAVY : '#F0F4F8', flexDirection: 'row', alignItems: 'center', gap: 5 }}
            onPress={toggleNearby}
            activeOpacity={0.8}
            disabled={locLoading}
          >
            {locLoading
              ? <ActivityIndicator size="small" color={nearbyMode ? '#FFF' : NAVY} />
              : <Ionicons name="locate" size={13} color={nearbyMode ? '#FFF' : '#8E8E93'} />
            }
            <Text style={{ fontSize: 13, fontWeight: '700', color: nearbyMode ? '#FFF' : '#8E8E93' }}>Near Me</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {categories.map(cat => {
            const isAll   = cat === null;
            const active  = isAll ? activeCategory === null : activeCategory === cat;
            const catInfo = cat ? CATEGORY_ICONS[cat] : null;
            return (
              <TouchableOpacity
                key={cat ?? '__all'}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? NAVY : '#F0F4F8',
                  borderWidth: active ? 0 : 1,
                  borderColor: '#E0E0E0',
                }}
                onPress={() => setActiveCategory(isAll ? null : cat)}
                activeOpacity={0.8}
              >
                {catInfo && <Ionicons name={catInfo.icon as any} size={13} color={active ? '#FFF' : catInfo.color} />}
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : '#4A4A5A' }}>
                  {isAll ? 'All' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={userCoords ? { ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 } : DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedListing(null)}
      >
        {mappable.map(l => {
          const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
          return (
            <Marker
              key={l._id}
              coordinate={{ latitude: l.latitude!, longitude: l.longitude! }}
              pinColor={cat.color}
              onPress={() => {
                setSelectedListing(l);
                mapRef.current?.animateToRegion(
                  { latitude: l.latitude! - 0.01, longitude: l.longitude!, latitudeDelta: 0.08, longitudeDelta: 0.08 },
                  400
                );
                client.post(`/partner/listing/${l._id}/view`).catch(() => {});
              }}
            />
          );
        })}
      </MapView>

      {/* Map overlay badges */}
      <View style={{ position: 'absolute', top: 0, right: 12, marginTop: insets.top + 150 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 }}
          onPress={() => { if (userCoords && mapRef.current) mapRef.current.animateToRegion({ ...userCoords, latitudeDelta: 0.3, longitudeDelta: 0.3 }, 400); }}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={13} color={NAVY} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: NAVY }}>Re-center</Text>
        </TouchableOpacity>
      </View>

      {loadingMap && (
        <View style={{ position: 'absolute', bottom: 220, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={NAVY} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: NAVY }}>Loading partners…</Text>
        </View>
      )}

      {!loadingMap && filtered.length === 0 && (
        <View style={{ position: 'absolute', bottom: 220, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY }}>No partners found</Text>
          <Text style={{ fontSize: 11, color: '#8E8E93' }}>Try switching to All or a different category</Text>
        </View>
      )}

      {/* ── Bottom business card (Navios-style) ──────────────────────────── */}
      {selectedListing && (
        <Animated.View style={{
          position: 'absolute', bottom: insets.bottom + 90, left: 12, right: 12,
          transform: [{ translateY: cardTranslateY }],
        }}>
          {(() => {
            const l   = selectedListing;
            const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
            return (
              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 24,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.14, shadowRadius: 20, elevation: 12,
                overflow: 'hidden',
              }}>
                {/* Card header */}
                <View style={{ padding: 16, paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {/* Category icon block (like date block in Navios) */}
                    <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.3 }} numberOfLines={1}>
                        {l.businessName}
                      </Text>
                      {l.hours ? (
                        <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>{l.hours}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Ionicons name="location-outline" size={13} color="#8E8E93" />
                        <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={cat.icon as any} size={11} color={cat.color} />
                        </View>
                        <Text style={{ fontSize: 13, color: '#8E8E93' }} numberOfLines={1}>
                          {l.physicalAddress ?? `${l.city}, ${l.state}`}
                        </Text>
                      </View>
                    </View>

                    {/* Dismiss */}
                    <TouchableOpacity
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginLeft: 6 }}
                      onPress={() => setSelectedListing(null)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>

                  {/* Rating */}
                  {l.rating > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 64 }}>
                      <StarRow rating={l.rating} />
                      <Text style={{ fontSize: 12, color: '#8E8E93' }}>{l.rating.toFixed(1)} ({l.reviewCount})</Text>
                    </View>
                  )}
                </View>

                {/* Action row */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
                  {l.phone ? (
                    <TouchableOpacity
                      style={{ flex: 2, height: 46, borderRadius: 14, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onPress={() => callBusiness(l)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Call Now</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={{ flex: 2, height: 46, borderRadius: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C5D0E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onPress={() => getDirections(l)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="navigate" size={16} color={NAVY} />
                    <Text style={{ color: NAVY, fontWeight: '700', fontSize: 14 }}>Directions</Text>
                  </TouchableOpacity>
                  {l.website ? (
                    <TouchableOpacity
                      style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#F8F8FA', borderWidth: 1, borderColor: '#EBEBEF', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        const url = l.website!.startsWith('http') ? l.website! : `https://${l.website}`;
                        Linking.openURL(url);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="globe-outline" size={18} color={NAVY} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })()}
        </Animated.View>
      )}

      {/* ── Partner card strip ───────────────────────────────────────────── */}
      {!selectedListing && filtered.length > 0 && (
        <View style={{ position: 'absolute', bottom: insets.bottom + 90, left: 0, right: 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          >
            {filtered.map(l => {
              const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
              return (
                <TouchableOpacity
                  key={l._id}
                  style={{
                    width: 220, backgroundColor: '#FFF', borderRadius: 16,
                    padding: 12, gap: 6,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
                  }}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedListing(l);
                    if (l.latitude && l.longitude) {
                      mapRef.current?.animateToRegion(
                        { latitude: l.latitude - 0.01, longitude: l.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 },
                        400
                      );
                    }
                    client.post(`/partner/listing/${l._id}/view`).catch(() => {});
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A2E' }} numberOfLines={1}>{l.businessName}</Text>
                      <Text style={{ fontSize: 11, color: '#8E8E93' }} numberOfLines={1}>{l.city}, {l.state}</Text>
                    </View>
                  </View>
                  {l.rating > 0 && <StarRow rating={l.rating} />}
                  {!l.latitude && (
                    <Text style={{ fontSize: 10, color: '#C0C0C0' }}>No map pin</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── SOS button ───────────────────────────────────────────────────── */}
      <Animated.View style={{
        position: 'absolute', bottom: insets.bottom + 98, right: 20,
        transform: [{ scale: sosPulse }],
        shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55, shadowRadius: 12, elevation: 10,
      }}>
        <TouchableOpacity
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' }}
          onPress={() => navigation.navigate('EmergencySOS')}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 1 }}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Burger menu drawer ───────────────────────────────────────────── */}
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={{
            backgroundColor: '#F5F7FA', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            maxHeight: '90%', paddingBottom: insets.bottom,
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
            </View>

            <DashboardMenuDrawer
              navigation={navigation}
              onClose={() => setMenuOpen(false)}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}
