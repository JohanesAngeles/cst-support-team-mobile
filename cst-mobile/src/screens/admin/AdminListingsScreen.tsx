import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';

const NAVY = '#021B3A';

export default function AdminListingsScreen() {
  const [listings,   setListings]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [toggling,   setToggling]   = useState<string | null>(null);
  const [featuring,  setFeaturing]  = useState<string | null>(null);
  const [geocoding,  setGeocoding]  = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await client.get('/admin/listings');
      setListings(data);
    } catch {
      Alert.alert('Error', 'Could not load listings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggle = async (id: string, currentActive: boolean) => {
    setToggling(id);
    try {
      const { data } = await client.patch(`/admin/listings/${id}`, { isActive: !currentActive });
      setListings(prev => prev.map(l => l._id === id ? { ...l, isActive: data.isActive } : l));
    } catch {
      Alert.alert('Error', 'Could not update listing.');
    } finally {
      setToggling(null);
    }
  };

  const handleTier = async (id: string, currentTier: string) => {
    const newTier = currentTier === 'featured' ? 'standard' : 'featured';
    setFeaturing(id);
    try {
      const { data } = await client.patch(`/admin/listings/${id}`, { tier: newTier });
      setListings(prev => prev.map(l => l._id === id ? { ...l, tier: data.tier } : l));
    } catch {
      Alert.alert('Error', 'Could not update tier.');
    } finally {
      setFeaturing(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Listing',
      `Remove "${name}" from the directory? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(id);
            try {
              await client.delete(`/admin/listings/${id}`);
              setListings(prev => prev.filter(l => l._id !== id));
            } catch {
              Alert.alert('Error', 'Could not remove listing.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleGeocodeBackfill = async () => {
    const missing = listings.filter(l => !l.latitude).length;
    if (missing === 0) {
      Alert.alert('All good!', 'All listings already have map coordinates.');
      return;
    }
    Alert.alert(
      'Fix Map Pins',
      `${missing} listing${missing > 1 ? 's are' : ' is'} missing coordinates. This will geocode them now (takes ~${missing} seconds). Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Now',
          onPress: async () => {
            setGeocoding(true);
            try {
              const { data } = await client.post('/admin/listings/geocode-missing');
              Alert.alert('Done', `Updated ${data.updated} listing${data.updated !== 1 ? 's' : ''}.${data.failed > 0 ? ` ${data.failed} could not be geocoded.` : ''}`);
              load();
            } catch {
              Alert.alert('Error', 'Geocoding failed. Check the server logs.');
            } finally {
              setGeocoding(false);
            }
          },
        },
      ]
    );
  };

  const active   = listings.filter(l => l.isActive);
  const inactive = listings.filter(l => !l.isActive);
  const noPin    = listings.filter(l => !l.latitude).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEF', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="business-outline" size={18} color="#27AE60" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A2E' }}>Business Listings</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>
              {active.length} live · {inactive.length} offline
              {noPin > 0 ? ` · ${noPin} no pin` : ''}
            </Text>
          </View>
          {noPin > 0 && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, opacity: geocoding ? 0.6 : 1 }}
              onPress={handleGeocodeBackfill}
              disabled={geocoding}
              activeOpacity={0.8}
            >
              {geocoding
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="location-outline" size={14} color="#FFF" />
              }
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                {geocoding ? 'Fixing…' : 'Fix Pins'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#021B3A" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            showsVerticalScrollIndicator={false}
          >
            {listings.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                <Ionicons name="business-outline" size={48} color="#C7C7CC" />
                <Text style={{ color: '#8E8E93', fontSize: 15, fontWeight: '600' }}>No listings yet</Text>
                <Text style={{ color: '#AEAEB2', fontSize: 13, textAlign: 'center' }}>Use the admin bulk import to add{'\n'}Truck Club Magazine listings.</Text>
              </View>
            )}

            {active.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                LIVE ({active.length})
              </Text>
            )}
            {active.map(l => (
              <ListingCard key={l._id} listing={l} deleting={deleting} toggling={toggling} featuring={featuring} onDelete={handleDelete} onToggle={handleToggle} onTier={handleTier} />
            ))}

            {inactive.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 2 }}>
                OFFLINE ({inactive.length})
              </Text>
            )}
            {inactive.map(l => (
              <ListingCard key={l._id} listing={l} deleting={deleting} toggling={toggling} featuring={featuring} onDelete={handleDelete} onToggle={handleToggle} onTier={handleTier} />
            ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}

function ListingCard({ listing: l, deleting, toggling, featuring, onDelete, onToggle, onTier }: {
  listing: any;
  deleting: string | null;
  toggling: string | null;
  featuring: string | null;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string, currentActive: boolean) => void;
  onTier: (id: string, currentTier: string) => void;
}) {
  const isDeleting  = deleting  === l._id;
  const isToggling  = toggling  === l._id;
  const isFeaturing = featuring === l._id;
  const isFeatured  = l.tier === 'featured';

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EBEBEF', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
      {/* Status dot */}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.isActive ? '#27AE60' : '#C7C7CC', marginTop: 5 }} />

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E', flex: 1 }}>{l.businessName}</Text>
          {isFeatured && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#F5C842' }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#92400E' }}>★ FEATURED</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: '#8E8E93' }}>{l.category} · {l.city}, {l.state}</Text>
        {l.phone ? <Text style={{ fontSize: 12, color: '#AEAEB2' }}>{l.phone}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Ionicons name={l.latitude ? 'location' : 'location-outline'} size={12} color={l.latitude ? '#27AE60' : '#E53935'} />
          <Text style={{ fontSize: 11, color: l.latitude ? '#27AE60' : '#E53935' }}>
            {l.latitude ? 'Map pin set' : 'No map pin'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={13} color="#8E8E93" />
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>{l.viewCount ?? 0} views</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={13} color="#F5C842" />
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>{l.rating?.toFixed(1) ?? '—'} ({l.reviewCount ?? 0})</Text>
          </View>
        </View>
      </View>

      {/* Featured toggle */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isFeatured ? '#FEF3C7' : '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isFeatured ? '#F5C842' : '#E0E0E0', opacity: isFeaturing ? 0.5 : 1 }}
        onPress={() => onTier(l._id, l.tier ?? 'standard')}
        disabled={isFeaturing || isDeleting || isToggling}
        activeOpacity={0.8}
      >
        {isFeaturing
          ? <ActivityIndicator size="small" color="#B45309" />
          : <Ionicons name={isFeatured ? 'star' : 'star-outline'} size={16} color={isFeatured ? '#B45309' : '#8E8E93'} />
        }
      </TouchableOpacity>

      {/* Toggle active/inactive */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: l.isActive ? '#E8F5E9' : '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: l.isActive ? '#A5D6A7' : '#E0E0E0', opacity: isToggling ? 0.5 : 1 }}
        onPress={() => onToggle(l._id, l.isActive)}
        disabled={isToggling || isDeleting}
        activeOpacity={0.8}
      >
        {isToggling
          ? <ActivityIndicator size="small" color={l.isActive ? '#27AE60' : '#8E8E93'} />
          : <Ionicons name={l.isActive ? 'eye-outline' : 'eye-off-outline'} size={16} color={l.isActive ? '#27AE60' : '#8E8E93'} />
        }
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', opacity: isDeleting ? 0.5 : 1 }}
        onPress={() => onDelete(l._id, l.businessName)}
        disabled={isDeleting || isToggling}
        activeOpacity={0.8}
      >
        {isDeleting
          ? <ActivityIndicator size="small" color="#E53935" />
          : <Ionicons name="trash-outline" size={16} color="#E53935" />
        }
      </TouchableOpacity>
    </View>
  );
}
