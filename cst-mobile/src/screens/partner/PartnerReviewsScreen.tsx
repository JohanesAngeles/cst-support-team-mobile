import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

interface Review {
  _id: string;
  driverName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={14} color="#F5C842" />
      ))}
    </View>
  );
}

export default function PartnerReviewsScreen() {
  const Colors = useColors();
  const s = makeStyles(Colors);
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating,  setAvgRating]  = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/partner/reviews');
      const data: Review[] = res.data ?? [];
      setReviews(data);
      if (data.length > 0) {
        setAvgRating(data.reduce((s, r) => s + r.rating, 0) / data.length);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem: ListRenderItem<Review> = ({ item }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{item.driverName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.driverName}>{item.driverName}</Text>
          <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>
        <StarRow rating={item.rating} />
      </View>
      {item.comment ? (
        <Text style={s.comment}>{item.comment}</Text>
      ) : null}
    </View>
  );

  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={s.topBar}>
          <View style={s.topBarIcon}>
            <Ionicons name="star" size={20} color="#F5C842" />
          </View>
          <Text style={s.topBarTitle}>Driver Reviews</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.secondary} style={{ marginTop: 40 }} />
        ) : reviews.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="star-outline" size={56} color={Colors.border} />
            <Text style={s.emptyTitle}>No reviews yet</Text>
            <Text style={s.emptySub}>Once drivers interact with your listing, their reviews will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
            ListHeaderComponent={
              <View style={s.summary}>
                <View style={s.summaryLeft}>
                  <Text style={s.bigRating}>{avgRating.toFixed(1)}</Text>
                  <StarRow rating={Math.round(avgRating)} />
                  <Text style={s.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={s.summaryBars}>
                  {ratingCounts.map(({ star, count }) => (
                    <View key={star} style={s.barRow}>
                      <Text style={s.barLabel}>{star}</Text>
                      <Ionicons name="star" size={10} color="#F5C842" />
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }]} />
                      </View>
                      <Text style={s.barCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: Colors.background },

    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
    topBarIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
    topBarTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },

    list: { padding: 20, paddingBottom: 100 },

    summary: {
      flexDirection: 'row', alignItems: 'center', gap: 20,
      backgroundColor: Colors.surface, borderRadius: 18, padding: 18,
      borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
    },
    summaryLeft: { alignItems: 'center', gap: 6 },
    bigRating:   { fontSize: 44, fontWeight: '800', color: Colors.text, lineHeight: 48 },
    reviewCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
    summaryBars: { flex: 1, gap: 6 },
    barRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel:    { fontSize: 12, color: Colors.textMuted, width: 10, textAlign: 'right' },
    barTrack:    { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
    barFill:     { height: 6, backgroundColor: '#F5C842', borderRadius: 3 },
    barCount:    { fontSize: 11, color: Colors.textMuted, width: 16, textAlign: 'right' },

    card: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    },
    cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    avatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText:  { fontSize: 16, fontWeight: '800', color: Colors.white },
    driverName:  { fontSize: 15, fontWeight: '700', color: Colors.text },
    date:        { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
    comment:     { fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginTop: 4 },

    emptyState:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
    emptyTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text },
    emptySub:    { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
