import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { PartnerTabParamList } from '../../navigation/PartnerStack';
import client from '../../api/client';

type Nav = BottomTabNavigationProp<PartnerTabParamList>;

interface Analytics {
  viewCount: number;
  clickCount: number;
  rating: number;
  reviewCount: number;
}

interface Listing {
  businessName: string;
  category: string;
  city: string;
  state: string;
  isActive: boolean;
}

export default function PartnerDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [listing,   setListing]   = useState<Listing | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [aRes, lRes] = await Promise.all([
        client.get('/partner/analytics'),
        client.get('/partner/listing'),
      ]);
      setAnalytics(aRes.data);
      setListing(lRes.data);
    } catch {
      // silently fail — user sees empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) => (
    <View style={[s.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const stars = analytics?.rating ?? 0;

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#021B3A" />}
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.name}>{user?.name ?? 'Partner'}</Text>
            </View>
            <View style={[s.statusBadge, listing?.isActive ? s.badgeActive : s.badgeInactive]}>
              <View style={[s.statusDot, listing?.isActive ? s.dotActive : s.dotInactive]} />
              <Text style={[s.statusText, listing?.isActive ? s.textActive : s.textInactive]}>
                {listing?.isActive ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#021B3A" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Listing preview card */}
              {listing ? (
                <View style={s.listingCard}>
                  <View style={s.listingCardIcon}>
                    <Ionicons name="storefront" size={26} color="#021B3A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listingName}>{listing.businessName}</Text>
                    <Text style={s.listingMeta}>{listing.category} · {listing.city}, {listing.state}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('MyListing')} style={s.editBtn}>
                    <Text style={s.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.setupCard} onPress={() => navigation.navigate('MyListing')} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={28} color="#021B3A" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.setupTitle}>Set up your listing</Text>
                    <Text style={s.setupSub}>Add your business details so drivers can find you on the map.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                </TouchableOpacity>
              )}

              {/* Analytics stats */}
              <Text style={s.sectionLabel}>THIS WEEK</Text>
              <View style={s.statsRow}>
                <StatCard icon="eye-outline"       label="Profile Views" value={analytics?.viewCount  ?? 0} color="#021B3A" />
                <StatCard icon="hand-right-outline" label="Tap-to-Calls"  value={analytics?.clickCount ?? 0} color="#D4A017" />
                <StatCard icon="star"              label="Avg Rating"    value={stars > 0 ? stars.toFixed(1) : '—'} color="#F5C842" />
              </View>

              {/* Star rating visual */}
              {(analytics?.reviewCount ?? 0) > 0 && (
                <View style={s.ratingCard}>
                  <View style={s.starsRow}>
                    {[1,2,3,4,5].map(n => (
                      <Ionicons key={n} name={n <= Math.round(stars) ? 'star' : 'star-outline'} size={22} color="#F5C842" />
                    ))}
                  </View>
                  <Text style={s.ratingText}>
                    {stars.toFixed(1)} out of 5 · {analytics?.reviewCount} review{analytics?.reviewCount !== 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Reviews')}>
                    <Text style={s.viewReviews}>View all reviews →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Quick actions */}
              <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
              <View style={s.actionList}>
                {[
                  { icon: 'storefront-outline', label: 'Edit My Listing',      screen: 'MyListing'    },
                  { icon: 'star-outline',        label: 'Driver Reviews',        screen: 'Reviews'      },
                  { icon: 'card-outline',        label: 'Billing & Subscription', screen: 'Subscription' },
                  { icon: 'person-outline',      label: 'Account Settings',      screen: 'Account'      },
                ].map(item => (
                  <TouchableOpacity
                    key={item.screen}
                    style={s.actionRow}
                    onPress={() => navigation.navigate(item.screen as any)}
                    activeOpacity={0.8}
                  >
                    <View style={s.actionIcon}>
                      <Ionicons name={item.icon as any} size={20} color="#021B3A" />
                    </View>
                    <Text style={s.actionLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  greeting:    { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  name:        { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginTop: 2 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  badgeInactive: { backgroundColor: '#FFF3E0', borderColor: '#FF9800' },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  dotActive:   { backgroundColor: '#4CAF50' },
  dotInactive: { backgroundColor: '#FF9800' },
  statusText:  { fontSize: 13, fontWeight: '700' },
  textActive:  { color: '#2E7D32' },
  textInactive: { color: '#E65100' },

  listingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8F8FA', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#EBEBEF', marginBottom: 20,
  },
  listingCardIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  listingName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  listingMeta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  editBtn:     { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#021B3A', borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  setupCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18, marginBottom: 20,
    backgroundColor: '#FFF8E1', borderWidth: 1.5,
    borderColor: '#FFE082', borderStyle: 'dashed',
  },
  setupTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  setupSub:   { fontSize: 13, color: '#8E8E93', marginTop: 2, lineHeight: 18 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8E8E93',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 4,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#F8F8FA', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6,
    borderTopWidth: 3, borderWidth: 1, borderColor: '#EBEBEF',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textAlign: 'center' },

  ratingCard: {
    backgroundColor: '#FFFDE7', borderRadius: 16, padding: 18,
    alignItems: 'center', gap: 8, marginBottom: 24,
    borderWidth: 1, borderColor: '#FFE082',
  },
  starsRow:    { flexDirection: 'row', gap: 4 },
  ratingText:  { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  viewReviews: { fontSize: 14, fontWeight: '700', color: '#021B3A' },

  actionList: { gap: 8, marginBottom: 20 },
  actionRow:  {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8F8FA', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EBEBEF',
  },
  actionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
});
