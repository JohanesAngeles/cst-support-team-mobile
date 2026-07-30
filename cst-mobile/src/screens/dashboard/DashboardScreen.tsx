import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  Linking, Platform, Dimensions, Animated, ActivityIndicator,
  Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import client from '../../api/client';
import DashboardMenuDrawer from './DashboardMenuDrawer';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SW } = Dimensions.get('window');
const NAVY      = '#021B3A';
const MAP_HEIGHT = 240;
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

const QUICK_TOOLS: { icon: string; label: string; screen: keyof MainStackParamList; color: string }[] = [
  { icon: 'time-outline',          label: 'HOS',          screen: 'HOSTracker',  color: '#E67E22' },
  { icon: 'water-outline',         label: 'Fuel Log',     screen: 'FuelLog',     color: '#1ABC9C' },
  { icon: 'map-outline',           label: 'Trip Log',     screen: 'TripLog',     color: '#3498DB' },
  { icon: 'trending-up-outline',   label: 'AI Rate',      screen: 'AILoadRate',  color: '#9B59B6' },
  { icon: 'list-outline',          label: 'Load Board',   screen: 'LoadBoard',   color: '#2ECC71' },
  { icon: 'cash-outline',          label: 'Expenses',     screen: 'Expenses',    color: '#F39C12' },
  { icon: 'language-outline',      label: 'Translator',   screen: 'Translator',  color: '#2C6EBD' },
  { icon: 'document-text-outline', label: 'Broker Notes', screen: 'BrokerNotes', color: '#E74C3C' },
];

const MAP_CATEGORIES = [
  { icon: 'business-outline',   label: 'Truck Stops',   color: '#3498DB', query: 'truck+stop'              },
  { icon: 'water-outline',      label: 'Diesel Fuel',   color: '#1ABC9C', query: 'diesel+fuel+station'     },
  { icon: 'construct-outline',  label: 'Truck Repair',  color: '#E67E22', query: 'semi+truck+repair+shop'  },
  { icon: 'bed-outline',        label: 'Rest Areas',    color: '#F39C12', query: 'rest+area+truck+parking' },
  { icon: 'car-outline',        label: 'Tire Shops',    color: '#2ECC71', query: 'semi+truck+tire+shop'    },
  { icon: 'restaurant-outline', label: 'Restaurants',   color: '#2C6EBD', query: 'truck+friendly+restaurant'},
  { icon: 'medical-outline',    label: 'Hospitals',     color: '#E74C3C', query: 'hospital+emergency+room' },
  { icon: 'home-outline',       label: 'Truck Parking', color: '#8E44AD', query: 'semi+truck+parking'      },
];

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Mechanic':                       { icon: 'construct-outline',  color: '#E67E22' },
  'Tire Shop':                      { icon: 'car-outline',        color: '#2ECC71' },
  'Fuel Station':                   { icon: 'water-outline',      color: '#1ABC9C' },
  'Hotel / Motel':                  { icon: 'bed-outline',        color: '#F39C12' },
  'Restaurant':                     { icon: 'restaurant-outline', color: '#2C6EBD' },
  'Truck Wash':                     { icon: 'water-outline',      color: '#3498DB' },
  'Compliance Service':             { icon: 'document-outline',   color: '#9B59B6' },
  'Towing':                         { icon: 'car-outline',        color: '#E74C3C' },
  'Other Trucking-Related Service': { icon: 'business-outline',   color: '#7F8C8D' },
  'Other':                          { icon: 'business-outline',   color: '#7F8C8D' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const cat   = CATEGORY_ICONS[listing.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
  const flags = [
    listing.mobileService      && 'Mobile',
    listing.roadsideAssistance && 'Roadside',
    listing.heavyDutyService   && 'Heavy Duty',
    listing.is24Hours          && '24hr',
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8FA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EBEBEF', marginBottom: 8, gap: 12 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={cat.icon as any} size={22} color={cat.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A2E' }} numberOfLines={1}>{listing.businessName}</Text>
          <View style={{ backgroundColor: NAVY, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>RRN</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: '#8E8E93' }} numberOfLines={1}>
          {listing.physicalAddress || `${listing.city}, ${listing.state}`}
        </Text>
        {listing.rating > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StarRow rating={listing.rating} />
            <Text style={{ fontSize: 11, color: '#8E8E93' }}>{listing.rating.toFixed(1)} ({listing.reviewCount})</Text>
          </View>
        )}
        {flags.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {flags.map(f => (
              <View key={f} style={{ backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#6366F1' }}>{f}</Text>
              </View>
            ))}
          </View>
        )}
        {listing.hours ? (
          <Text style={{ fontSize: 11, color: '#8E8E93' }} numberOfLines={1}>
            <Ionicons name="time-outline" size={11} /> {listing.hours}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

function BusinessDetailModal({ listing, onClose, onReviewed }: {
  listing: Listing;
  onClose: () => void;
  onReviewed?: (id: string, newRating: number, newCount: number) => void;
}) {
  const [ratingPick,   setRatingPick]   = useState(0);
  const [comment,      setComment]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  const callBusiness = () => {
    if (!listing.phone) return;
    Linking.openURL(`tel:${listing.phone.replace(/\D/g, '')}`);
    client.post(`/partner/listing/${listing._id}/click`).catch(() => {});
  };

  const getDirections = () => {
    const addr  = listing.physicalAddress || `${listing.businessName}, ${listing.city}, ${listing.state}`;
    const query = encodeURIComponent(addr);
    const url   = listing.latitude && listing.longitude
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
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const cat = CATEGORY_ICONS[listing.category] ?? { icon: 'business-outline', color: '#7F8C8D' };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
      <ScrollView
        style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%' }}
        contentContainerStyle={{ paddingBottom: 44 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={cat.icon as any} size={26} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E' }}>{listing.businessName}</Text>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{listing.category}</Text>
          </View>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {listing.rating > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <StarRow rating={listing.rating} />
            <Text style={{ fontSize: 13, color: '#8E8E93' }}>{listing.rating.toFixed(1)} · {listing.reviewCount} review{listing.reviewCount !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={{ gap: 10, marginBottom: 20, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EBEBEF' }}>
          {(listing.physicalAddress || listing.city) && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="location-outline" size={16} color="#8E8E93" />
              <Text style={{ flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 }}>
                {listing.physicalAddress || `${listing.city}, ${listing.state}`}
              </Text>
            </View>
          )}
          {listing.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="time-outline" size={16} color="#8E8E93" />
              <Text style={{ flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 }}>{listing.hours}</Text>
            </View>
          )}
          {listing.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="call-outline" size={16} color="#8E8E93" />
              <Text style={{ flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 }}>{listing.phone}</Text>
            </View>
          )}
          {listing.website && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="globe-outline" size={16} color="#8E8E93" />
              <Text style={{ flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 }} numberOfLines={1}>{listing.website}</Text>
            </View>
          )}
          {listing.description && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
              <Text style={{ flex: 1, fontSize: 14, color: '#4A4A5A', lineHeight: 19 }}>{listing.description}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {listing.phone && (
            <TouchableOpacity
              style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onPress={callBusiness}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Call Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C5D0E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onPress={getDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={NAVY} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY }}>Directions</Text>
          </TouchableOpacity>
          {listing.website && (
            <TouchableOpacity
              style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#F8F8FA', borderWidth: 1, borderColor: '#EBEBEF', justifyContent: 'center', alignItems: 'center' }}
              onPress={openWebsite}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={18} color={NAVY} />
            </TouchableOpacity>
          )}
        </View>

        {listing.coupon ? (
          <View style={{ marginTop: 16, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F5C842', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pricetag" size={15} color="#B45309" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309', letterSpacing: 0.8 }}>SPECIAL OFFER</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E', lineHeight: 22 }}>{listing.coupon}</Text>
            <Text style={{ fontSize: 11, color: '#B45309', fontStyle: 'italic' }}>Show this screen at the business to redeem</Text>
          </View>
        ) : null}

        {submitted ? (
          <View style={{ marginTop: 16, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', alignItems: 'center', gap: 12 }}>
            <Ionicons name="checkmark-circle" size={28} color="#27AE60" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#27AE60' }}>Thanks for your review!</Text>
          </View>
        ) : !showRateForm ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#C5D0E8', backgroundColor: '#EEF2FF' }}
            onPress={() => setShowRateForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={16} color={NAVY} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>Rate this business</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 16, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E' }}>Rate this business</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRatingPick(n)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={n <= ratingPick ? 'star' : 'star-outline'} size={32} color="#F5C842" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEF', padding: 12, fontSize: 14, color: '#1A1A2E', minHeight: 72, textAlignVertical: 'top' }}
              placeholder="Leave a comment (optional)"
              placeholderTextColor="#AEAEB2"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={{ width: '100%', height: 48, borderRadius: 12, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
              onPress={submitReview}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Submit Review</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const Colors     = useColors();
  const { user }   = useAuth();
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const mapRef     = useRef<MapView>(null);

  const [listings,        setListings]        = useState<Listing[]>([]);
  const [totalCount,      setTotalCount]      = useState(0);
  const [page,            setPage]            = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [userCoords,      setUserCoords]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady,        setMapReady]        = useState(false);
  const [nearbyMode,      setNearbyMode]      = useState(false);
  const [locLoading,      setLocLoading]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const [menuOpen,        setMenuOpen]        = useState(false);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const PAGE_SIZE = 100;

  // SOS pulse animation
  const sosPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [sosPulse]);

  // Fetch partner listings — pageNum > 1 appends instead of replacing, so
  // "Load More" can page past the 100-per-request cap.
  const fetchListings = useCallback(async (coords?: { latitude: number; longitude: number } | null, isRefresh = false, pageNum = 1) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum > 1) setLoadingMore(true);
    else setLoading(true);
    try {
      const params: Record<string, string> = {
        ...(coords ? { lat: String(coords.latitude), lng: String(coords.longitude), radius: '75' } : {}),
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      };
      const res     = await client.get('/partner/listings', { params });
      const results: Listing[] = res.data ?? [];
      const total = parseInt(res.headers?.['x-total-count'], 10);
      setTotalCount(Number.isFinite(total) ? total : results.length);
      setPage(pageNum);
      setListings(prev => pageNum > 1 ? [...prev, ...results] : results);
      if (!isRefresh && pageNum === 1) results.slice(0, 10).forEach(l => client.post(`/partner/listing/${l._id}/view`).catch(() => {}));
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || listings.length >= totalCount) return;
    fetchListings(nearbyMode ? coordsRef.current : null, false, page + 1);
  }, [fetchListings, loadingMore, listings.length, totalCount, nearbyMode, page]);

  // ── Auto-load remaining pages in the background — no tap required, the
  // badge total and the actual loaded list should always converge on their own.
  useEffect(() => {
    if (!loading && !refreshing && !loadingMore && listings.length > 0 && listings.length < totalCount) {
      loadMore();
    }
  }, [loading, refreshing, loadingMore, listings.length, totalCount, loadMore]);

  useEffect(() => {
    fetchListings();
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

  useFocusEffect(useCallback(() => {
    const interval = setInterval(() => {
      fetchListings(nearbyMode ? coordsRef.current : null, true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchListings, nearbyMode]));

  const toggleNearby = useCallback(async () => {
    if (nearbyMode) { setNearbyMode(false); fetchListings(null); return; }
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

  useEffect(() => {
    if (mapReady && userCoords && mapRef.current) {
      mapRef.current.animateToRegion({ ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 600);
    }
  }, [mapReady, userCoords]);

  const openExternalMap = async (query: string) => {
    if (!userCoords) { Alert.alert('Location Required', 'Enable location to use this feature.'); return; }
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

  const grouped = useMemo(() => {
    const q        = searchQuery.trim().toLowerCase();
    const filtered = listings.filter(l => {
      if (activeCategory && l.category !== activeCategory) return false;
      if (!q) return true;
      return (
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)         ||
        l.state.toLowerCase().includes(q)        ||
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

  const mappable = listings.filter(l => l.latitude && l.longitude);
  const featured = listings.filter(l => l.tier === 'featured');

  // Derive chips from actual data so they always match stored category values
  const availableCategories = useMemo(() =>
    Array.from(new Set(listings.map(l => l.category).filter(Boolean))).sort()
  , [listings]);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const initials  = (user?.name ?? 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => (navigation as any).navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{initials}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>{greeting},</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A2E', marginTop: -1 }}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.navigate('HOSAlerts')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color={NAVY} />
            <View style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9500', borderWidth: 1.5, borderColor: '#FFF' }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchListings(nearbyMode ? coordsRef.current : null, true)}
            tintColor={NAVY}
            colors={[NAVY]}
          />
        }
      >

        {/* ── Quick Tools ───────────────────────────────────────────────────── */}
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEF', backgroundColor: '#FFFFFF' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} removeClippedSubviews={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
            {QUICK_TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.screen}
                style={{ alignItems: 'center', gap: 6 }}
                onPress={() => navigation.navigate(tool.screen as never)}
                activeOpacity={0.75}
              >
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tool.color + '18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: tool.color + '33' }}>
                  <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#4A4A5A', textAlign: 'center', maxWidth: 56 }} numberOfLines={2}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <View style={{ height: MAP_HEIGHT, backgroundColor: '#E8EDF2' }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
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
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="storefront" size={13} color="#F5C842" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              {totalCount} RRN Partner{totalCount !== 1 ? 's' : ''}{nearbyMode ? ' Nearby' : ' Nationwide'}
            </Text>
          </View>
          {userCoords && (
            <TouchableOpacity
              style={{ position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}
              onPress={() => mapRef.current?.animateToRegion({ ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 400)}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={18} color={NAVY} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <View style={{ padding: 16 }}>

          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8, marginBottom: 10, height: 44 }}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: Colors.text }}
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

          {/* Category chips — derived from real data so they always match */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {[null, ...availableCategories].map(cat => {
              const isAll  = cat === null;
              const active = isAll ? activeCategory === null : activeCategory === cat;
              const catInfo = cat ? (CATEGORY_ICONS[cat] ?? { icon: 'business-outline', color: '#7F8C8D' }) : null;
              return (
                <TouchableOpacity
                  key={cat ?? '__all'}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8, backgroundColor: active ? NAVY : Colors.surface, borderColor: active ? NAVY : Colors.border }}
                  onPress={() => setActiveCategory(isAll ? null : cat)}
                  activeOpacity={0.8}
                >
                  {catInfo && <Ionicons name={catInfo.icon as any} size={13} color={active ? '#FFF' : catInfo.color} />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : Colors.text }}>
                    {isAll ? 'All' : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Featured Partners */}
          {featured.length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
                ★ Featured Partners{nearbyMode ? ' Near You' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {featured.map(l => (
                  <TouchableOpacity
                    key={l._id}
                    style={{ width: 200, backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, marginRight: 12, borderWidth: 1.5, borderColor: '#F5C842', gap: 6 }}
                    onPress={() => setSelectedListing(l)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F5C842', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 }}>
                      <Ionicons name="star" size={9} color="#92400E" />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#92400E' }}>FEATURED</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A2E' }} numberOfLines={1}>{l.businessName}</Text>
                    <Text style={{ fontSize: 12, color: '#8E8E93' }} numberOfLines={1}>{l.category}</Text>
                    <Text style={{ fontSize: 12, color: '#8E8E93' }} numberOfLines={1}>{l.physicalAddress || `${l.city}, ${l.state}`}</Text>
                    {l.phone ? <Text style={{ fontSize: 12, color: NAVY, fontWeight: '600' }}>{l.phone}</Text> : null}
                    {l.rating > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <StarRow rating={l.rating} />
                        <Text style={{ fontSize: 11, color: '#8E8E93' }}>{l.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Partner Directory */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: Colors.text }}>Road Ready Network Partners</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: nearbyMode ? NAVY : '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: nearbyMode ? NAVY : '#C5D0E8' }}
              onPress={toggleNearby}
              activeOpacity={0.8}
              disabled={locLoading}
            >
              {locLoading
                ? <ActivityIndicator size="small" color={nearbyMode ? '#FFF' : NAVY} />
                : <Ionicons name="locate" size={14} color={nearbyMode ? '#FFFFFF' : NAVY} />
              }
              <Text style={{ fontSize: 12, fontWeight: '700', color: nearbyMode ? '#FFFFFF' : NAVY }}>
                {nearbyMode ? 'Near Me ✓' : 'Near Me'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 14 }}>
            {nearbyMode
              ? 'Showing partners within 75 miles of your location.'
              : 'All verified businesses on the Road Ready Network.'}
          </Text>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Finding partners...</Text>
            </View>
          ) : grouped.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
              <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {nearbyMode
                  ? 'No RRN partners within 75 miles.\nTry turning off Near Me to see all partners.'
                  : 'No RRN partners yet.\nCheck back soon as more businesses join the network.'}
              </Text>
            </View>
          ) : (
            grouped.map(([category, items]) => {
              const cat = CATEGORY_ICONS[category] ?? { icon: 'business-outline', color: '#7F8C8D' };
              return (
                <View key={category}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.text }}>{category}</Text>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, marginLeft: 'auto' as any }}>
                      {items.length} location{items.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {items.map(l => (
                    <BusinessCard key={l._id} listing={l} onPress={() => setSelectedListing(l)} />
                  ))}
                </View>
              );
            })
          )}

          {/* Loading indicator — remaining pages load automatically in the
              background, no tap required */}
          {!loading && listings.length < totalCount && (
            <View style={{
              marginTop: 8, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
              flexDirection: 'row', gap: 8,
            }}>
              <ActivityIndicator size="small" color={NAVY} />
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                Loading more partners… ({listings.length} of {totalCount})
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 20 }} />

          {/* Search Near Me */}
          <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>Search Near Me</Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 14 }}>Opens your phone's maps app for general searches.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {MAP_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={{ width: (SW - 48) / 2, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border }}
                onPress={() => openExternalMap(cat.query)}
                activeOpacity={0.75}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: cat.color + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={cat.icon as any} size={26} color={cat.color} />
                </View>
                <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '700' }}>{cat.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: Colors.secondary + '18', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.secondary + '44' }}>
                  <Ionicons name="map-outline" size={10} color={Colors.secondary} />
                  <Text style={{ color: Colors.secondary, fontSize: 9, fontWeight: '800' }}>OPEN MAPS</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── SOS Button ───────────────────────────────────────────────────────── */}
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

      {/* ── Business Detail Modal ─────────────────────────────────────────────── */}
      {selectedListing && (
        <BusinessDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onReviewed={handleReviewed}
        />
      )}

      {/* ── Burger Menu ──────────────────────────────────────────────────────── */}
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={{ backgroundColor: '#F5F7FA', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', paddingBottom: insets.bottom }}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
            </View>
            <DashboardMenuDrawer navigation={navigation} onClose={() => setMenuOpen(false)} />
          </View>
        </View>
      </Modal>

    </View>
  );
}
