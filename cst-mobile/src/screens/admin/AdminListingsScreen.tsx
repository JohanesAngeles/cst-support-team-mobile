import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';

export default function AdminListingsScreen() {
  const [listings,   setListings]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

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

  const active   = listings.filter(l => l.isActive);
  const inactive = listings.filter(l => !l.isActive);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEF', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="business-outline" size={18} color="#27AE60" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A2E' }}>Business Listings</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>{active.length} live · {inactive.length} offline</Text>
          </View>
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
              <ListingCard key={l._id} listing={l} deleting={deleting} onDelete={handleDelete} />
            ))}

            {inactive.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 2 }}>
                OFFLINE ({inactive.length})
              </Text>
            )}
            {inactive.map(l => (
              <ListingCard key={l._id} listing={l} deleting={deleting} onDelete={handleDelete} />
            ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}

function ListingCard({ listing: l, deleting, onDelete }: { listing: any; deleting: string | null; onDelete: (id: string, name: string) => void }) {
  const isDeleting = deleting === l._id;

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EBEBEF', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
      {/* Status dot */}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.isActive ? '#27AE60' : '#C7C7CC', marginTop: 5 }} />

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E' }}>{l.businessName}</Text>
        <Text style={{ fontSize: 13, color: '#8E8E93' }}>{l.category} · {l.city}, {l.state}</Text>
        {l.phone ? <Text style={{ fontSize: 12, color: '#AEAEB2' }}>{l.phone}</Text> : null}
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

      {/* Delete */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', opacity: isDeleting ? 0.5 : 1 }}
        onPress={() => onDelete(l._id, l.businessName)}
        disabled={isDeleting}
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
