import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  Linking, Platform, Animated, ActivityIndicator,
  Alert, TextInput, RefreshControl, StyleSheet, ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { useColors } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { MainStackParamList } from '../../navigation/MainStack';
import client from '../../api/client';
import DashboardMenuDrawer from './DashboardMenuDrawer';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const NAVY      = '#021B3A';
const PEEK_HEIGHT = 156;
const SHEET_SNAP_POINTS = [PEEK_HEIGHT, '52%', '92%'];
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
  { icon: 'language-outline',      label: 'Translator',   screen: 'Translator',  color: '#C8D2DC' },
  { icon: 'document-text-outline', label: 'Broker Notes', screen: 'BrokerNotes', color: '#E74C3C' },
];

const MAP_CATEGORIES = [
  { icon: 'business-outline',   label: 'Truck Stops',   color: '#3498DB', query: 'truck+stop'              },
  { icon: 'water-outline',      label: 'Diesel Fuel',   color: '#1ABC9C', query: 'diesel+fuel+station'     },
  { icon: 'construct-outline',  label: 'Truck Repair',  color: '#E67E22', query: 'semi+truck+repair+shop'  },
  { icon: 'bed-outline',        label: 'Rest Areas',    color: '#F39C12', query: 'rest+area+truck+parking' },
  { icon: 'car-outline',        label: 'Tire Shops',    color: '#2ECC71', query: 'semi+truck+tire+shop'    },
  { icon: 'restaurant-outline', label: 'Restaurants',   color: '#C8D2DC', query: 'truck+friendly+restaurant'},
  { icon: 'medical-outline',    label: 'Hospitals',     color: '#E74C3C', query: 'hospital+emergency+room' },
  { icon: 'home-outline',       label: 'Truck Parking', color: '#8E44AD', query: 'semi+truck+parking'      },
];

// Maps a generic "Search Near Me" pill to the RRN partner category it can
// filter on-map — pills with no alias (or no matching partners yet) fall
// back to opening the phone's Maps app instead.
const CATEGORY_ALIAS: Record<string, string> = {
  'Diesel Fuel':  'Fuel Station',
  'Truck Repair': 'Mechanic',
  'Tire Shops':   'Tire Shop',
  'Restaurants':  'Restaurant',
};

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Mechanic':                       { icon: 'construct-outline',  color: '#E67E22' },
  'Tire Shop':                      { icon: 'car-outline',        color: '#2ECC71' },
  'Fuel Station':                   { icon: 'water-outline',      color: '#1ABC9C' },
  'Hotel / Motel':                  { icon: 'bed-outline',        color: '#F39C12' },
  'Restaurant':                     { icon: 'restaurant-outline', color: '#C8D2DC' },
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
  const Colors = useColors();
  const cat   = CATEGORY_ICONS[listing.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
  const flags = [
    listing.mobileService      && 'Mobile',
    listing.roadsideAssistance && 'Roadside',
    listing.heavyDutyService   && 'Heavy Duty',
    listing.is24Hours          && '24hr',
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, gap: 12 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={cat.icon as any} size={22} color={cat.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: Colors.text }} numberOfLines={1}>{listing.businessName}</Text>
          <View style={{ backgroundColor: NAVY, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#FFFFFF', letterSpacing: 0.5 }}>RRN</Text>
          </View>
        </View>
        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: Colors.textMuted }} numberOfLines={1}>
          {listing.physicalAddress || `${listing.city}, ${listing.state}`}
        </Text>
        {listing.rating > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StarRow rating={listing.rating} />
            <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: Colors.textMuted }}>{listing.rating.toFixed(1)} ({listing.reviewCount})</Text>
          </View>
        )}
        {flags.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {flags.map(f => (
              <View key={f} style={{ backgroundColor: 'rgba(99,102,241,0.18)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#6366F1' }}>{f}</Text>
              </View>
            ))}
          </View>
        )}
        {listing.hours ? (
          <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: Colors.textMuted }} numberOfLines={1}>
            <Ionicons name="time-outline" size={11} /> {listing.hours}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// Isolated so its 3.2s ticking interval only re-renders this small text
// block — not the whole screen (and, critically, not the ~100-marker map).
const PartnerCountTicker = React.memo(function PartnerCountTicker({
  nearbyCount, nationwideCount,
}: { nearbyCount: number | null; nationwideCount: number | null }) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const tickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(tickerAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start(() => {
        setTickerIndex(i => (i + 1) % 2);
        tickerAnim.setValue(0);
      });
    }, 3200);
    return () => clearInterval(id);
  }, [tickerAnim]);

  const stats = [
    { count: nearbyCount,     label: 'Nearby'     },
    { count: nationwideCount, label: 'Nationwide' },
  ];
  const label = (i: number) => {
    const s = stats[i];
    return `${s.count ?? '—'} RRN Partner${s.count === 1 ? '' : 's'} ${s.label}`;
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(2,27,58,0.55)', paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
      <Ionicons name="people" size={16} color="#F5C842" />
      <View style={{ flex: 1, height: 20, overflow: 'hidden' }}>
        <Animated.Text
          numberOfLines={1}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center',
            color: '#FFFFFF', fontSize: 14, fontWeight: '800', fontFamily: FONTS.bodyExtraBold,
            opacity: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ translateY: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }],
          }}
        >
          {label(tickerIndex)}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center',
            color: '#FFFFFF', fontSize: 14, fontWeight: '800', fontFamily: FONTS.bodyExtraBold,
            opacity: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [{ translateY: tickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}
        >
          {label((tickerIndex + 1) % 2)}
        </Animated.Text>
      </View>
    </View>
  );
});

// Isolated + memoized so re-renders elsewhere on screen (search typing, the
// count ticker, sheet drag events, tab focus) never force react-native-maps
// to re-diff every marker — only an actual data/location change does.
const PartnerMap = React.memo(function PartnerMap({
  mapRef, userCoords, mappable, onMapReady, onSelectListing,
}: {
  mapRef: React.RefObject<MapView | null>;
  userCoords: { latitude: number; longitude: number } | null;
  mappable: Listing[];
  onMapReady: () => void;
  onSelectListing: (l: Listing) => void;
}) {
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_DEFAULT}
      initialRegion={userCoords ? { ...userCoords, latitudeDelta: 0.5, longitudeDelta: 0.5 } : DEFAULT_REGION}
      initialCamera={{
        center: userCoords ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude },
        pitch: 60,
        heading: 0,
        altitude: 1200,
        zoom: 15,
      }}
      pitchEnabled
      showsBuildings
      showsUserLocation
      showsMyLocationButton={false}
      onMapReady={onMapReady}
    >
      {mappable.map(l => {
        const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
        return (
          <Marker
            key={l._id}
            coordinate={{ latitude: l.latitude!, longitude: l.longitude! }}
            onPress={() => onSelectListing(l)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cat.color, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 }}>
              <Ionicons name={cat.icon as any} size={15} color="#FFFFFF" />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
});

function BusinessDetailModal({ listing, onClose, onReviewed }: {
  listing: Listing;
  onClose: () => void;
  onReviewed?: (id: string, newRating: number, newCount: number) => void;
}) {
  const Colors = useColors();
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
        style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%' }}
        contentContainerStyle={{ paddingBottom: 44 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: cat.color + '18', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={cat.icon as any} size={26} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: Colors.text }}>{listing.businessName}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>{listing.category}</Text>
          </View>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {listing.rating > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <StarRow rating={listing.rating} />
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: Colors.textMuted }}>{listing.rating.toFixed(1)} · {listing.reviewCount} review{listing.reviewCount !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={{ gap: 10, marginBottom: 20, backgroundColor: Colors.surfaceLight, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border }}>
          {(listing.physicalAddress || listing.city) && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
              <Text style={{ fontFamily: FONTS.body, flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 19 }}>
                {listing.physicalAddress || `${listing.city}, ${listing.state}`}
              </Text>
            </View>
          )}
          {listing.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
              <Text style={{ fontFamily: FONTS.body, flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 19 }}>{listing.hours}</Text>
            </View>
          )}
          {listing.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
              <Text style={{ fontFamily: FONTS.body, flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 19 }}>{listing.phone}</Text>
            </View>
          )}
          {listing.website && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="globe-outline" size={16} color={Colors.textMuted} />
              <Text style={{ fontFamily: FONTS.body, flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 19 }} numberOfLines={1}>{listing.website}</Text>
            </View>
          )}
          {listing.description && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
              <Text style={{ fontFamily: FONTS.body, flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 19 }}>{listing.description}</Text>
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
              <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#FFFFFF' }}>Call Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onPress={getDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={Colors.secondary} />
            <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: Colors.secondary }}>Directions</Text>
          </TouchableOpacity>
          {listing.website && (
            <TouchableOpacity
              style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }}
              onPress={openWebsite}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {listing.coupon ? (
          <View style={{ marginTop: 16, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F5C842', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pricetag" size={15} color="#B45309" />
              <Text style={{ fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#B45309', letterSpacing: 0.8 }}>SPECIAL OFFER</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#92400E', lineHeight: 22 }}>{listing.coupon}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: '#B45309', fontStyle: 'italic' }}>Show this screen at the business to redeem</Text>
          </View>
        ) : null}

        {submitted ? (
          <View style={{ marginTop: 16, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', alignItems: 'center', gap: 12 }}>
            <Ionicons name="checkmark-circle" size={28} color="#27AE60" />
            <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#27AE60' }}>Thanks for your review!</Text>
          </View>
        ) : !showRateForm ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#C5D0E8', backgroundColor: '#EEF2FF' }}
            onPress={() => setShowRateForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={16} color={NAVY} />
            <Text style={{ fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodyBold, color: NAVY }}>Rate this business</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 16, backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#1A1A2E' }}>Rate this business</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRatingPick(n)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={n <= ratingPick ? 'star' : 'star-outline'} size={32} color="#F5C842" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEF', padding: 12, fontSize: 14, fontFamily: FONTS.body, color: '#1A1A2E', minHeight: 72, textAlignVertical: 'top' }}
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
                : <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#FFFFFF' }}>Submit Review</Text>
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
  const isFocused  = useIsFocused();
  const insets     = useSafeAreaInsets();
  const mapRef     = useRef<MapView>(null);
  const sheetRef   = useRef<BottomSheet>(null);
  const { show: showTabBar, hide: hideTabBar } = useTabBarVisibility();

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
  const [nearbyCount,     setNearbyCount]     = useState<number | null>(null);
  const [nationwideCount, setNationwideCount] = useState<number | null>(null);
  const [sheetIndex,      setSheetIndex]      = useState(0);
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

  // "Nearby" vs "Nationwide" partner-count ticker — whichever mode is active
  // already has its count from the main fetch below; the other one is topped
  // up with a cheap limit:1 request just to read the x-total-count header.
  useEffect(() => {
    if (nearbyMode) setNearbyCount(totalCount);
    else setNationwideCount(totalCount);
  }, [totalCount, nearbyMode]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (nearbyMode) {
          const res = await client.get('/partner/listings', { params: { page: '1', limit: '1' } });
          const t = parseInt(res.headers?.['x-total-count'], 10);
          if (!cancelled && Number.isFinite(t)) setNationwideCount(t);
        } else if (userCoords) {
          const res = await client.get('/partner/listings', { params: { lat: String(userCoords.latitude), lng: String(userCoords.longitude), radius: '75', page: '1', limit: '1' } });
          const t = parseInt(res.headers?.['x-total-count'], 10);
          if (!cancelled && Number.isFinite(t)) setNearbyCount(t);
        }
      } catch { /* silent — ticker just shows a dash for that stat */ }
    })();
    return () => { cancelled = true; };
  }, [nearbyMode, userCoords, totalCount]);

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
  // badge total and the actual loaded list should always converge on their
  // own. Gated on focus: the Dashboard's full-screen map + bottom sheet stay
  // mounted while other tabs are active, so an ungated loop here would keep
  // re-rendering (and re-diffing every map marker) behind the scenes and
  // drag down whatever screen the user is actually looking at.
  useEffect(() => {
    if (isFocused && !loading && !refreshing && !loadingMore && listings.length > 0 && listings.length < totalCount) {
      loadMore();
    }
  }, [isFocused, loading, refreshing, loadingMore, listings.length, totalCount, loadMore]);

  // Default to the driver's own area, not the full nationwide directory —
  // with ~4,800 listings total, loading and rendering everything as map pins
  // doesn't scale. Only fall back to a nationwide fetch when location is
  // denied/unavailable, so there's still something to show.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos    = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          if (cancelled) return;
          setUserCoords(coords);
          coordsRef.current = coords;
          setNearbyMode(true);
          fetchListings(coords);
          return;
        }
      } catch {
        // fall through to nationwide fallback below
      }
      if (!cancelled) fetchListings();
    })();
    return () => { cancelled = true; };
  }, [fetchListings]);

  useFocusEffect(useCallback(() => {
    const interval = setInterval(() => {
      fetchListings(nearbyMode ? coordsRef.current : null, true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchListings, nearbyMode]));

  // Tab bar hides while the sheet is fully expanded (immersive full list);
  // always restore it if the user swipes away to another tab mid-expand.
  // Search/category chips only show once the sheet is dragged up past peek.
  const handleSheetChange = useCallback((index: number) => {
    setSheetIndex(index);
    if (index >= 2) hideTabBar(); else showTabBar();
  }, [hideTabBar, showTabBar]);
  useFocusEffect(useCallback(() => () => showTabBar(), [showTabBar]));

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
      mapRef.current.animateCamera({ center: userCoords, pitch: 60, zoom: 15 }, { duration: 700 });
    }
  }, [mapReady, userCoords]);

  const handleMapReady = useCallback(() => setMapReady(true), []);

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

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter(l => {
      if (activeCategory && l.category !== activeCategory) return false;
      if (!q) return true;
      return (
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)         ||
        l.state.toLowerCase().includes(q)        ||
        l.category.toLowerCase().includes(q)
      );
    });
  }, [listings, searchQuery, activeCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, Listing[]> = {};
    for (const l of filteredListings) {
      if (!map[l.category]) map[l.category] = [];
      map[l.category].push(l);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filteredListings]);

  const mappable = useMemo(() =>
    filteredListings.filter(l => l.latitude && l.longitude)
  , [filteredListings]);
  const featured = listings.filter(l => l.tier === 'featured');
  const topRated = useMemo(() =>
    [...listings].filter(l => l.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10)
  , [listings]);

  // Derive chips from actual data so they always match stored category values
  const availableCategories = useMemo(() =>
    Array.from(new Set(listings.map(l => l.category).filter(Boolean))).sort()
  , [listings]);

  // "Search Near Me" pills without real partner data yet fall back to the
  // phone's Maps app instead of filtering an empty set of pins.
  const externalFilters = useMemo(() =>
    MAP_CATEGORIES.filter(c => {
      const alias = CATEGORY_ALIAS[c.label];
      return !alias || !availableCategories.includes(alias);
    })
  , [availableCategories]);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const initials  = (user?.name ?? 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const openFilterChip = (cat: string | null, external?: { icon: string; color: string; query: string; label: string }) => {
    if (external) { openExternalMap(external.query); return; }
    setActiveCategory(cat);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <ImageBackground
        source={require('../../../assets/images/hero-bg_founding_partner.jpeg')}
        style={{ width: '100%' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(2,10,26,0.25)', 'rgba(2,10,26,0.55)', 'rgba(2,10,26,0.92)']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 10 }}>
            <TouchableOpacity
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}
              onPress={() => (navigation as any).navigate('Profile')}
              activeOpacity={0.8}
            >
              {user?.avatarUrl
                ? <Image source={{ uri: user.avatarUrl }} style={{ width: 44, height: 44 }} />
                : <Text style={{ color: NAVY, fontSize: 14, fontWeight: '800', fontFamily: FONTS.bodyExtraBold }}>{initials}</Text>
              }
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontFamily: FONTS.bodySemiBold }}>{greeting},</Text>
              <Text style={{ fontSize: 30, fontFamily: FONTS.display, color: '#FFFFFF', marginTop: -3, letterSpacing: 0.5 }}>{firstName.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}
              onPress={() => navigation.navigate('HOSAlerts')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={18} color={NAVY} />
              <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9500', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="menu" size={18} color={NAVY} />
            </TouchableOpacity>
          </View>

          {/* Quick Tools — overlaid on hero image */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} removeClippedSubviews={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 18 }}>
            {QUICK_TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.screen}
                style={{ width: 74, alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 5 }}
                onPress={() => navigation.navigate(tool.screen as never)}
                activeOpacity={0.75}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tool.color + '33', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={tool.icon as any} size={20} color={tool.color} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: FONTS.bodyBold, color: '#1A1A2E', textAlign: 'center' }} numberOfLines={2}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Partner count ticker — slides between Nearby / Nationwide regardless of which mode is active */}
          <PartnerCountTicker nearbyCount={nearbyCount} nationwideCount={nationwideCount} />
        </SafeAreaView>
      </ImageBackground>

      {/* ── Full-bleed Map ───────────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        <PartnerMap
          mapRef={mapRef}
          userCoords={userCoords}
          mappable={mappable}
          onMapReady={handleMapReady}
          onSelectListing={setSelectedListing}
        />

        {/* Search bar + "search this area" pill — sit on the exposed map area,
            only once the sheet is dragged up past its collapsed peek */}
        {sheetIndex > 0 && (
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }} pointerEvents="box-none">
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY, borderRadius: 28, paddingLeft: 16, paddingRight: 6, height: 52, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 }}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.55)" />
              <TextInput
                style={{ flex: 1, fontSize: 14, fontFamily: FONTS.body, color: '#FFFFFF' }}
                placeholder="Search partners near you…"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.55)" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: nearbyMode ? '#F5C842' : 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' }}
                onPress={toggleNearby}
                activeOpacity={0.8}
                disabled={locLoading}
              >
                {locLoading
                  ? <ActivityIndicator size="small" color={nearbyMode ? NAVY : '#FFFFFF'} />
                  : <Ionicons name="navigate" size={16} color={nearbyMode ? NAVY : '#FFFFFF'} />
                }
              </TouchableOpacity>
            </View>

            {/* Sits directly under the search bar — anchored to the overlay's own
                top offset, not the sheet's edge, since the sheet's live height
                isn't available as plain state (and would be covered at 92% anyway) */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 }}
                onPress={() => fetchListings(nearbyMode ? coordsRef.current : null, true)}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={13} color={NAVY} />
                <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodyBold, color: NAVY }}>Search this area</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Locate-me button — floats just above the collapsed sheet */}
        {userCoords && (
          <TouchableOpacity
            style={{ position: 'absolute', bottom: PEEK_HEIGHT + 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}
            onPress={() => mapRef.current?.animateCamera({ center: userCoords, pitch: 60, zoom: 15 }, { duration: 400 })}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={18} color={NAVY} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── SOS Button — stacked above the locate button ────────────────────────── */}
      <Animated.View style={{
        position: 'absolute', bottom: PEEK_HEIGHT + 68, right: 20,
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
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900', fontFamily: FONTS.bodyBlack, letterSpacing: 1, marginTop: 1 }}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Business list — draggable sheet overlapping the map ─────────────────── */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={SHEET_SNAP_POINTS}
        enableDynamicSizing={false}
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: '#D8D8DE', width: 40 }}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: NAVY + '14', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="storefront" size={17} color={NAVY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: Colors.text }}>
              {totalCount} RRN Partner{totalCount !== 1 ? 's' : ''}{nearbyMode ? ' Nearby' : ' Nationwide'}
            </Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: Colors.textMuted }}>
              {nearbyMode ? 'Within 75 miles of you' : 'Drag up to browse the full directory'}
            </Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C5D0E8' }}
            onPress={() => navigation.navigate('FindHelp')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodyBold, color: NAVY }}>View All</Text>
            <Ionicons name="chevron-forward" size={13} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Discover + category chips — only shown once the sheet is dragged up past peek */}
        {sheetIndex > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, backgroundColor: activeCategory === null ? NAVY : Colors.surface, borderColor: activeCategory === null ? NAVY : Colors.border }}
                onPress={() => openFilterChip(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="compass" size={13} color={activeCategory === null ? '#FFFFFF' : NAVY} />
                <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodyBold, color: activeCategory === null ? '#FFFFFF' : Colors.text }}>Discover</Text>
                <Ionicons name="chevron-down" size={12} color={activeCategory === null ? '#FFFFFF' : Colors.text} />
              </TouchableOpacity>
              {availableCategories.map(cat => {
                const active  = activeCategory === cat;
                const catInfo = CATEGORY_ICONS[cat] ?? { icon: 'business-outline', color: '#7F8C8D' };
                return (
                  <TouchableOpacity
                    key={cat}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, backgroundColor: active ? NAVY : Colors.surface, borderColor: active ? NAVY : Colors.border }}
                    onPress={() => openFilterChip(cat)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={catInfo.icon as any} size={13} color={active ? '#FFFFFF' : catInfo.color} />
                    <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodyBold, color: active ? '#FFFFFF' : Colors.text }}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
              {externalFilters.map(cat => (
                <TouchableOpacity
                  key={cat.label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, backgroundColor: Colors.surface, borderColor: Colors.border }}
                  onPress={() => openFilterChip(null, cat)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cat.icon as any} size={13} color={cat.color} />
                  <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodyBold, color: Colors.text }}>{cat.label}</Text>
                  <Ionicons name="open-outline" size={11} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchListings(nearbyMode ? coordsRef.current : null, true)}
              tintColor={NAVY}
              colors={[NAVY]}
            />
          }
        >
          {/* Featured Partners — wide banner cards, "curations for you" style */}
          {featured.length > 0 && (
            <View style={{ marginBottom: 22 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: Colors.text, marginBottom: 12 }}>
                Featured Partners{nearbyMode ? ' Near You' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {featured.map(l => {
                  const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
                  return (
                    <TouchableOpacity
                      key={l._id}
                      style={{ width: 170, height: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: cat.color }}
                      onPress={() => setSelectedListing(l)}
                      activeOpacity={0.88}
                    >
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={cat.icon as any} size={62} color="rgba(255,255,255,0.32)" />
                      </View>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.78)']}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%', justifyContent: 'flex-end', padding: 14 }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#FFFFFF' }} numberOfLines={1}>{l.businessName}</Text>
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
                          {l.physicalAddress || `${l.city}, ${l.state}`}
                        </Text>
                      </LinearGradient>
                      <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="star" size={11} color="#F5C842" />
                        <Text style={{ fontSize: 10, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#FFFFFF', letterSpacing: 0.4 }}>FEATURED</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Top Rated Partners — circular avatar row, "curators for you" style */}
          {topRated.length > 0 && (
            <View style={{ marginBottom: 22 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: Colors.text, marginBottom: 14 }}>
                Top Rated Partners
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18 }}>
                {topRated.map(l => {
                  const cat = CATEGORY_ICONS[l.category] ?? { icon: 'business-outline', color: '#7F8C8D' };
                  return (
                    <TouchableOpacity key={l._id} style={{ alignItems: 'center', width: 66 }} onPress={() => setSelectedListing(l)} activeOpacity={0.8}>
                      <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: cat.color, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={cat.icon as any} size={24} color="#FFFFFF" />
                        <View style={{ position: 'absolute', bottom: -5, right: -5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 2, borderColor: '#FFFFFF' }}>
                          <Ionicons name="star" size={8} color="#F5C842" />
                          <Text style={{ fontSize: 8, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: '#FFFFFF' }}>{l.rating.toFixed(1)}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: FONTS.bodyBold, color: Colors.text, marginTop: 10, textAlign: 'center' }} numberOfLines={1}>
                        {l.businessName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={{ fontFamily: FONTS.body, color: Colors.textMuted, fontSize: 14 }}>Finding partners...</Text>
            </View>
          ) : grouped.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
              <Text style={{ fontFamily: FONTS.body, color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
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
                    <Text style={{ fontSize: 14, fontWeight: '800', fontFamily: FONTS.bodyExtraBold, color: Colors.text }}>{category}</Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: Colors.textMuted, marginLeft: 'auto' as any }}>
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
              <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: Colors.textMuted }}>
                Loading more partners… ({listings.length} of {totalCount})
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

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
