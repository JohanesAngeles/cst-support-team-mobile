import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Linking, Platform, Modal,
  Dimensions, RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

const { width: SW } = Dimensions.get('window');
const MAP_HEIGHT = 260;
const DEFAULT_REGION = { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.8, longitudeDelta: 0.8 };

interface Listing {
  _id: string;
  businessName: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  description?: string;
  hours?: string;
  coupon?: string;
  tier?: 'featured' | 'standard';
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  physicalAddress?: string;
  mobileService?: boolean;
  roadsideAssistance?: boolean;
  heavyDutyService?: boolean;
  is24Hours?: boolean;
}

const MAP_CATEGORIES = [
  { icon: 'business-outline',   label: 'Truck Stops',   color: '#3498DB', query: 'truck+stop'             },
  { icon: 'water-outline',      label: 'Diesel Fuel',   color: '#1ABC9C', query: 'diesel+fuel+station'    },
  { icon: 'construct-outline',  label: 'Truck Repair',  color: '#E67E22', query: 'semi+truck+repair+shop' },
  { icon: 'bed-outline',        label: 'Rest Areas',    color: '#F39C12', query: 'rest+area+truck+parking'},
  { icon: 'car-outline',        label: 'Tire Shops',    color: '#2ECC71', query: 'semi+truck+tire+shop'   },
  { icon: 'restaurant-outline', label: 'Restaurants',   color: '#2C6EBD', query: 'truck+friendly+restaurant'},
  { icon: 'medical-outline',    label: 'Hospitals',     color: '#E74C3C', query: 'hospital+emergency+room'},
  { icon: 'home-outline',       label: 'Truck Parking', color: '#8E44AD', query: 'semi+truck+parking'     },
];

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Mechanic':                    { icon: 'construct-outline',  color: '#E67E22' },
  'Tire Shop':                   { icon: 'car-outline',        color: '#2ECC71' },
  'Fuel Station':                { icon: 'water-outline',      color: '#1ABC9C' },
  'Hotel / Motel':               { icon: 'bed-outline',        color: '#F39C12' },
  'Restaurant':                  { icon: 'restaurant-outline', color: '#2C6EBD' },
  'Truck Wash':                  { icon: 'car-wash-outline',   color: '#3498DB' },
  'Compliance Service':          { icon: 'document-outline',   color: '#9B59B6' },
  'Towing':                      { icon: 'car-outline',        color: '#E74C3C' },
  'Other Trucking-Related Service': { icon: 'business-outline', color: '#7F8C8D' },
  'Other':                       { icon: 'business-outline',   color: '#7F8C8D' },
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

function BusinessCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const cat    = CATEGORY_ICONS[listing.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
  const flags  = [
    listing.mobileService      && 'Mobile',
    listing.roadsideAssistance && 'Roadside',
    listing.heavyDutyService   && 'Heavy Duty',
    listing.is24Hours          && '24hr',
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity style={bc.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[bc.left, { backgroundColor: cat.color + '18' }]}>
        <Ionicons name={cat.icon as any} size={22} color={cat.color} />
      </View>
      <View style={bc.body}>
        <View style={bc.titleRow}>
          <Text style={bc.name} numberOfLines={1}>{listing.businessName}</Text>
          <View style={bc.rrnBadge}>
            <Text style={bc.rrnBadgeText}>RRN</Text>
          </View>
        </View>
        <Text style={bc.sub} numberOfLines={1}>
          {listing.physicalAddress || `${listing.city}, ${listing.state}`}
        </Text>
        {listing.rating > 0 && (
          <View style={bc.ratingRow}>
            <StarRow rating={listing.rating} />
            <Text style={bc.ratingText}>{listing.rating.toFixed(1)} ({listing.reviewCount})</Text>
          </View>
        )}
        {flags.length > 0 && (
          <View style={bc.flagRow}>
            {flags.map(f => (
              <View key={f} style={bc.flag}>
                <Text style={bc.flagText}>{f}</Text>
              </View>
            ))}
          </View>
        )}
        {listing.hours ? (
          <Text style={bc.hours} numberOfLines={1}>
            <Ionicons name="time-outline" size={11} /> {listing.hours}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

const bc = StyleSheet.create({
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8FA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EBEBEF', marginBottom: 8, gap: 12 },
  left:         { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  body:         { flex: 1, gap: 3 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:         { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  rrnBadge:     { backgroundColor: '#021B3A', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  rrnBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  sub:          { fontSize: 12, color: '#8E8E93' },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText:   { fontSize: 11, color: '#8E8E93' },
  flagRow:      { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  flag:         { backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  flagText:     { fontSize: 9, fontWeight: '700', color: '#6366F1' },
  hours:        { fontSize: 11, color: '#8E8E93' },
});

function BusinessDetailModal({ listing, onClose, onReviewed }: {
  listing: Listing;
  onClose: () => void;
  onReviewed?: (id: string, newRating: number, newCount: number) => void;
}) {
  const [ratingPick,    setRatingPick]    = useState(0);
  const [comment,       setComment]       = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [showRateForm,  setShowRateForm]  = useState(false);

  const callBusiness = () => {
    if (!listing.phone) return;
    Linking.openURL(`tel:${listing.phone.replace(/\D/g, '')}`);
    client.post(`/partner/listing/${listing._id}/click`).catch(() => {});
  };

  const getDirections = () => {
    const addr  = listing.physicalAddress || `${listing.businessName}, ${listing.city}, ${listing.state}`;
    const query = encodeURIComponent(addr);
    const url = listing.latitude && listing.longitude
      ? (Platform.OS === 'ios'
          ? `maps://maps.apple.com/?daddr=${listing.latitude},${listing.longitude}`
          : `geo:${listing.latitude},${listing.longitude}?q=${query}`)
      : (Platform.OS === 'ios'
          ? `maps://maps.apple.com/?q=${query}`
          : `geo:0,0?q=${query}`);
    Linking.canOpenURL(url).then(can =>
      Linking.openURL(can ? url : `https://www.google.com/maps/search/${query}`)
    );
    client.post(`/partner/listing/${listing._id}/click`).catch(() => {});
  };

  const openWebsite = () => {
    if (!listing.website) return;
    const url = listing.website.startsWith('http') ? listing.website : `https://${listing.website}`;
    Linking.openURL(url);
    client.post(`/partner/listing/${listing._id}/click`).catch(() => {});
  };

  const submitReview = async () => {
    if (ratingPick === 0) { Alert.alert('Select a rating', 'Tap a star to rate this business.'); return; }
    setSubmitting(true);
    try {
      const { data } = await client.post(`/partner/listing/${listing._id}/review`, {
        rating: ratingPick,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onReviewed?.(listing._id, data.rating ?? ratingPick, data.reviewCount ?? listing.reviewCount + 1);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not submit review.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const cat = CATEGORY_ICONS[listing.category] ?? { icon: 'business-outline', color: '#7F8C8D' };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={dm.overlay} activeOpacity={1} onPress={onClose} />
      <ScrollView style={dm.sheet} contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <View style={dm.handle} />

        <View style={dm.header}>
          <View style={[dm.headerIcon, { backgroundColor: cat.color + '18' }]}>
            <Ionicons name={cat.icon as any} size={26} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dm.bName}>{listing.businessName}</Text>
            <Text style={dm.bMeta}>{listing.category}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
            <Ionicons name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {listing.rating > 0 && (
          <View style={dm.ratingRow}>
            <StarRow rating={listing.rating} />
            <Text style={dm.ratingText}>{listing.rating.toFixed(1)} · {listing.reviewCount} review{listing.reviewCount !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={dm.details}>
          {(listing.physicalAddress || listing.city) ? (
            <View style={dm.detailRow}>
              <Ionicons name="location-outline" size={16} color="#8E8E93" />
              <Text style={dm.detailText}>{listing.physicalAddress || `${listing.city}, ${listing.state}`}</Text>
            </View>
          ) : null}
          {listing.hours ? (
            <View style={dm.detailRow}>
              <Ionicons name="time-outline" size={16} color="#8E8E93" />
              <Text style={dm.detailText}>{listing.hours}</Text>
            </View>
          ) : null}
          {listing.phone ? (
            <View style={dm.detailRow}>
              <Ionicons name="call-outline" size={16} color="#8E8E93" />
              <Text style={dm.detailText}>{listing.phone}</Text>
            </View>
          ) : null}
          {listing.website ? (
            <View style={dm.detailRow}>
              <Ionicons name="globe-outline" size={16} color="#8E8E93" />
              <Text style={dm.detailText} numberOfLines={1}>{listing.website}</Text>
            </View>
          ) : null}
          {listing.description ? (
            <View style={dm.detailRow}>
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
              <Text style={dm.detailText}>{listing.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={dm.actions}>
          {listing.phone ? (
            <TouchableOpacity style={dm.callBtn} onPress={callBusiness} activeOpacity={0.85}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={dm.callBtnText}>Call Now</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={dm.dirBtn} onPress={getDirections} activeOpacity={0.85}>
            <Ionicons name="navigate" size={18} color="#021B3A" />
            <Text style={dm.dirBtnText}>Directions</Text>
          </TouchableOpacity>
          {listing.website ? (
            <TouchableOpacity style={dm.webBtn} onPress={openWebsite} activeOpacity={0.85}>
              <Ionicons name="globe-outline" size={18} color="#021B3A" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Coupon / Special Offer ─────────────────────────────────────── */}
        {listing.coupon ? (
          <View style={dm.couponBox}>
            <View style={dm.couponHeader}>
              <Ionicons name="pricetag" size={15} color="#B45309" />
              <Text style={dm.couponLabel}>SPECIAL OFFER</Text>
            </View>
            <Text style={dm.couponText}>{listing.coupon}</Text>
            <Text style={dm.couponHint}>Show this screen at the business to redeem</Text>
          </View>
        ) : null}

        {/* ── Rate this business ──────────────────────────────────────────── */}
        {submitted ? (
          <View style={dm.rateBox}>
            <Ionicons name="checkmark-circle" size={28} color="#27AE60" />
            <Text style={dm.rateThanks}>Thanks for your review!</Text>
          </View>
        ) : !showRateForm ? (
          <TouchableOpacity style={dm.rateToggle} onPress={() => setShowRateForm(true)} activeOpacity={0.8}>
            <Ionicons name="star-outline" size={16} color="#021B3A" />
            <Text style={dm.rateToggleText}>Rate this business</Text>
          </TouchableOpacity>
        ) : (
          <View style={dm.rateBox}>
            <Text style={dm.rateTitle}>Rate this business</Text>
            <View style={dm.starPicker}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRatingPick(n)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={n <= ratingPick ? 'star' : 'star-outline'} size={32} color="#F5C842" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={dm.commentInput}
              placeholder="Leave a comment (optional)"
              placeholderTextColor="#AEAEB2"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[dm.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={submitReview}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={dm.submitBtnText}>Submit Review</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:      { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  headerIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bName:      { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  bMeta:      { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 2 },
  ratingText: { fontSize: 13, color: '#8E8E93' },
  details:    { gap: 10, marginBottom: 20, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EBEBEF' },
  detailRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailText: { flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 },
  actions:    { flexDirection: 'row', gap: 10 },
  callBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, backgroundColor: '#021B3A', gap: 8 },
  callBtnText:{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  dirBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C5D0E8', gap: 8 },
  dirBtnText: { fontSize: 15, fontWeight: '700', color: '#021B3A' },
  webBtn:     { width: 52, height: 52, borderRadius: 14, backgroundColor: '#F8F8FA', borderWidth: 1, borderColor: '#EBEBEF', justifyContent: 'center', alignItems: 'center' },
  couponBox:    { marginTop: 16, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F5C842', gap: 6 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  couponLabel:  { fontSize: 11, fontWeight: '800', color: '#B45309', letterSpacing: 0.8 },
  couponText:   { fontSize: 15, fontWeight: '700', color: '#92400E', lineHeight: 22 },
  couponHint:   { fontSize: 11, color: '#B45309', fontStyle: 'italic' },
  rateToggle:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#C5D0E8', backgroundColor: '#EEF2FF' },
  rateToggleText: { fontSize: 14, fontWeight: '700', color: '#021B3A' },
  rateBox:        { marginTop: 16, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', alignItems: 'center', gap: 12 },
  rateTitle:      { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  starPicker:     { flexDirection: 'row', gap: 8 },
  commentInput:   { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEF', padding: 12, fontSize: 14, color: '#1A1A2E', minHeight: 72, textAlignVertical: 'top' },
  submitBtn:      { width: '100%', height: 48, borderRadius: 12, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center' },
  submitBtnText:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  rateThanks:     { fontSize: 15, fontWeight: '700', color: '#27AE60' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FindHelpScreen() {
  const Colors = useColors();
  const mapRef = useRef<MapView>(null);

  const [listings,        setListings]        = useState<Listing[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [userCoords,      setUserCoords]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady,        setMapReady]        = useState(false);
  const [nearbyMode,      setNearbyMode]      = useState(false);
  const [locLoading,      setLocLoading]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // ── Fetch — no params = all partners, coords = nearby filter ─────────────
  const fetchListings = useCallback(async (coords?: { latitude: number; longitude: number } | null, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params: Record<string, string> = coords
        ? { lat: String(coords.latitude), lng: String(coords.longitude), radius: '75' }
        : {};
      const res = await client.get('/partner/listings', { params });
      const results: Listing[] = res.data ?? [];
      setListings(results);
      if (!isRefresh) results.slice(0, 10).forEach(l => client.post(`/partner/listing/${l._id}/view`).catch(() => {}));
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Initial load — show ALL partners ─────────────────────────────────────
  useEffect(() => {
    fetchListings();
    // Get GPS in background for "Near Me" button — don't wait for it
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(pos => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserCoords(coords);
          coordsRef.current = coords;
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [fetchListings]);

  // ── Auto-refresh every 60 seconds ────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const interval = setInterval(() => {
      fetchListings(nearbyMode ? coordsRef.current : null, true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchListings, nearbyMode]));

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
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Enable location to filter nearby partners.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(coords);
        coordsRef.current = coords;
      } catch {
        Alert.alert('Error', 'Could not get your location.');
        return;
      } finally { setLocLoading(false); }
    }
    setNearbyMode(true);
    fetchListings(coords);
  }, [nearbyMode, fetchListings]);

  // Re-center map when coords are ready
  useEffect(() => {
    if (mapReady && userCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userCoords,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 600);
    }
  }, [mapReady, userCoords]);

  const recenter = () => {
    if (!userCoords || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 400);
  };

  const openExternalMap = async (query: string) => {
    if (!userCoords) {
      Alert.alert('Location Required', 'Enable location to use this feature.'); return;
    }
    const { latitude: lat, longitude: lng } = userCoords;
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${query}&sll=${lat},${lng}&z=12`
      : `geo:${lat},${lng}?q=${query}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : `https://www.google.com/maps/search/${query}/@${lat},${lng},12z`);
  };

  const handleReviewed = useCallback((id: string, newRating: number, newCount: number) => {
    setListings(prev => prev.map(l => l._id === id ? { ...l, rating: newRating, reviewCount: newCount } : l));
    setSelectedListing(prev => prev?._id === id ? { ...prev, rating: newRating, reviewCount: newCount } : prev);
  }, []);

  // Filter + group listings
  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = listings.filter(l => {
      if (activeCategory && l.category !== activeCategory) return false;
      if (!q) return true;
      return (
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    });
    const map: Record<string, Listing[]> = {};
    for (const l of filtered) {
      if (!map[l.category]) map[l.category] = [];
      map[l.category].push(l);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [listings, searchQuery, activeCategory]);

  const mappable  = listings.filter(l => l.latitude && l.longitude);
  const featured  = listings.filter(l => l.tier === 'featured');

  const styles = useMemo(() => StyleSheet.create({
    container:    { flex: 1, backgroundColor: Colors.background },
    scroll:       { paddingBottom: 40 },

    mapWrapper:   { height: MAP_HEIGHT, width: SW, backgroundColor: '#E8EDF2' },
    map:          { flex: 1 },
    recenterBtn:  { position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
    mapOverlay:   { position: 'absolute', top: 12, left: 12, backgroundColor: '#021B3A', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
    mapOverlayTx: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

    body:         { padding: 16 },
    sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
    sectionSub:   { color: Colors.textMuted, fontSize: 12, marginBottom: 14 },

    searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8, marginBottom: 10, height: 44 },
    searchInput:  { flex: 1, fontSize: 14, color: Colors.text },
    chipScroll:   { marginBottom: 14 },
    chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    chipText:     { fontSize: 12, fontWeight: '700' },
    catHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
    catIcon:      { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    catLabel:     { fontSize: 14, fontWeight: '800', color: Colors.text },
    catCount:     { fontSize: 12, color: Colors.textMuted, marginLeft: 'auto' as any },

    emptyBox:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText:    { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    featuredSection:  { marginBottom: 18 },
    featuredLabel:    { fontSize: 11, fontWeight: '800', color: '#92400E', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
    featuredCard:     { width: 200, backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, marginRight: 12, borderWidth: 1.5, borderColor: '#F5C842', gap: 6 },
    featuredBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F5C842', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
    featuredBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#92400E' },
    featuredName:     { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    featuredSub:      { fontSize: 12, color: '#8E8E93' },
    featuredPhone:    { fontSize: 12, color: '#021B3A', fontWeight: '600' },
    divider:      { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
    mapGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mapCard:      { width: (SW - 48) / 2, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
    mapIconCircle:{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    mapLabel:     { color: Colors.text, fontSize: 13, fontWeight: '700' },
    mapBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: Colors.secondary + '18', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.secondary + '44' },
    mapBadgeText: { color: Colors.secondary, fontSize: 9, fontWeight: '800' },
  }), [Colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchListings(coordsRef.current, true)}
            tintColor="#021B3A"
            colors={['#021B3A']}
          />
        }
      >

        {/* ── Live Map ───────────────────────────────────────────────────────── */}
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={userCoords ? { ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 } : DEFAULT_REGION}
            showsUserLocation
            showsMyLocationButton={false}
            onMapReady={() => setMapReady(true)}
          >
            {mappable.map(l => {
              const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
              return (
                <Marker
                  key={l._id}
                  coordinate={{ latitude: l.latitude!, longitude: l.longitude! }}
                  title={l.businessName}
                  description={l.category}
                  pinColor={cat.color}
                  onCalloutPress={() => setSelectedListing(l)}
                />
              );
            })}
          </MapView>

          {/* Partner count badge */}
          <View style={styles.mapOverlay}>
            <Ionicons name="storefront" size={13} color="#F5C842" />
            <Text style={styles.mapOverlayTx}>
              {listings.length} RRN Partner{listings.length !== 1 ? 's' : ''}
              {nearbyMode ? ' Nearby' : ' Nationwide'}
            </Text>
          </View>

          {/* Re-center button */}
          {userCoords && (
            <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.8}>
              <Ionicons name="locate" size={18} color="#021B3A" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.body}>

          {/* ── Search bar ───────────────────────────────────────────────────── */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, city, or state…"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Category chips ───────────────────────────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {[null, ...Object.keys(CATEGORY_ICONS)].map(cat => {
              const isAll    = cat === null;
              const active   = isAll ? activeCategory === null : activeCategory === cat;
              const catInfo  = cat ? CATEGORY_ICONS[cat] : null;
              return (
                <TouchableOpacity
                  key={cat ?? '__all'}
                  style={[styles.chip, { backgroundColor: active ? '#021B3A' : Colors.surface, borderColor: active ? '#021B3A' : Colors.border }]}
                  onPress={() => setActiveCategory(isAll ? null : cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : Colors.text }]}>
                    {isAll ? 'All' : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Featured Partners ($49.99/mo) ────────────────────────────────── */}
          {featured.length > 0 && (
            <View style={styles.featuredSection}>
              <Text style={styles.featuredLabel}>★ Featured Partners{nearbyMode ? ' Near You' : ''}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {featured.map(l => {
                  const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
                  return (
                    <TouchableOpacity
                      key={l._id}
                      style={styles.featuredCard}
                      onPress={() => setSelectedListing(l)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={9} color="#92400E" />
                        <Text style={styles.featuredBadgeTxt}>FEATURED</Text>
                      </View>
                      <Text style={styles.featuredName} numberOfLines={1}>{l.businessName}</Text>
                      <Text style={styles.featuredSub} numberOfLines={1}>{l.category}</Text>
                      <Text style={styles.featuredSub} numberOfLines={1}>{l.physicalAddress || `${l.city}, ${l.state}`}</Text>
                      {l.phone ? <Text style={styles.featuredPhone}>{l.phone}</Text> : null}
                      {l.rating > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <StarRow rating={l.rating} />
                          <Text style={{ fontSize: 11, color: '#8E8E93' }}>{l.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── RRN Partner Directory ─────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { flex: 1 }]}>Road Ready Network Partners</Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: nearbyMode ? '#021B3A' : '#EEF2FF',
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
                borderWidth: 1, borderColor: nearbyMode ? '#021B3A' : '#C5D0E8',
              }}
              onPress={toggleNearby}
              activeOpacity={0.8}
              disabled={locLoading}
            >
              {locLoading
                ? <ActivityIndicator size="small" color={nearbyMode ? '#FFF' : '#021B3A'} />
                : <Ionicons name="locate" size={14} color={nearbyMode ? '#FFFFFF' : '#021B3A'} />
              }
              <Text style={{ fontSize: 12, fontWeight: '700', color: nearbyMode ? '#FFFFFF' : '#021B3A' }}>
                {nearbyMode ? 'Near Me ✓' : 'Near Me'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>
            {nearbyMode
              ? 'Showing partners within 75 miles of your location.'
              : 'All verified businesses on the Road Ready Network.'}
          </Text>

          {loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#021B3A" />
              <Text style={styles.emptyText}>Finding nearby partners...</Text>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {nearbyMode
                  ? 'No RRN partners within 75 miles of your location.\nTry turning off Near Me to see all partners.'
                  : 'No RRN partners yet.\nCheck back soon as more businesses join the network.'}
              </Text>
            </View>
          ) : (
            grouped.map(([category, items]) => {
              const cat = CATEGORY_ICONS[category] ?? { icon: 'business-outline', color: '#7F8C8D' };
              return (
                <View key={category}>
                  <View style={styles.catHeader}>
                    <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}>
                      <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    </View>
                    <Text style={styles.catLabel}>{category}</Text>
                    <Text style={styles.catCount}>{items.length} location{items.length !== 1 ? 's' : ''}</Text>
                  </View>
                  {items.map(l => (
                    <BusinessCard key={l._id} listing={l} onPress={() => setSelectedListing(l)} />
                  ))}
                </View>
              );
            })
          )}

          {/* ── Divider ────────────────────────────────────────────────────────── */}
          <View style={styles.divider} />

          {/* ── External Maps Fallback ─────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Search Near Me</Text>
          <Text style={styles.sectionSub}>Opens your phone's maps app for general searches.</Text>

          <View style={styles.mapGrid}>
            {MAP_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={styles.mapCard}
                onPress={() => openExternalMap(cat.query)}
                activeOpacity={0.75}
              >
                <View style={[styles.mapIconCircle, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon as any} size={26} color={cat.color} />
                </View>
                <Text style={styles.mapLabel}>{cat.label}</Text>
                <View style={styles.mapBadge}>
                  <Ionicons name="map-outline" size={10} color={Colors.secondary} />
                  <Text style={styles.mapBadgeText}>OPEN MAPS</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>

      {selectedListing && (
        <BusinessDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onReviewed={handleReviewed}
        />
      )}
    </SafeAreaView>
  );
}
