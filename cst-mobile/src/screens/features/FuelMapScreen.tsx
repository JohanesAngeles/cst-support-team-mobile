import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getEIADieselPrices } from '../../api/features';

interface RegionPrice {
  region: string;
  price: number;
  change: number;     // week-over-week change
  trend: 'up' | 'down' | 'flat';
}

const REGION_ICONS: Record<string, string> = {
  'East Coast':      '🌊',
  'New England':     '🍂',
  'Central Atlantic':'🏙️',
  'Lower Atlantic':  '🌴',
  'Midwest':         '🌾',
  'Gulf Coast':      '⛽',
  'Rocky Mountain':  '⛰️',
  'West Coast':      '🌅',
  'California':      '🌉',
  'US Average':      '🇺🇸',
};

const fmt = (n: number) => `$${n.toFixed(3)}`;

export default function FuelMapScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    list: { padding: 16, paddingBottom: 40, gap: 10 },
    header: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8,
    },
    headerTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    headerSub: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
    avgCard: {
      backgroundColor: Colors.secondary + '12', borderRadius: 12,
      borderWidth: 1, borderColor: Colors.secondary + '44',
      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    avgPrice: { color: Colors.secondary, fontSize: 36, fontWeight: '900' },
    avgLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 14,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    cardLeft: { flex: 1, gap: 3 },
    region: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    rankText: { color: Colors.textMuted, fontSize: 11 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 22, fontWeight: '900' },
    changeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    changeText: { fontSize: 12, fontWeight: '700' },
    barWrap: { height: 4, backgroundColor: Colors.surfaceLight, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    lastUpdated: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  }), [Colors]);

  const [regions,  setRegions]  = useState<RegionPrice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getEIADieselPrices();
      // EIA returns an array of { region, price, change } objects
      const raw: { region: string; price: number; change?: number }[] = data?.prices ?? data ?? [];
      const mapped: RegionPrice[] = raw.map(r => ({
        region: r.region,
        price:  r.price,
        change: r.change ?? 0,
        trend:  (r.change ?? 0) > 0.005 ? 'up' : (r.change ?? 0) < -0.005 ? 'down' : 'flat',
      }));
      // Sort: US Average first, then ascending price
      const sorted = [
        ...mapped.filter(r => r.region === 'US Average'),
        ...mapped.filter(r => r.region !== 'US Average').sort((a, b) => a.price - b.price),
      ];
      setRegions(sorted);
      setUpdatedAt(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
    } catch {
      // Use placeholder data if EIA API key not configured
      setRegions([
        { region: 'US Average',      price: 3.89, change:  0.02, trend: 'up'   },
        { region: 'Gulf Coast',      price: 3.72, change: -0.01, trend: 'down' },
        { region: 'Midwest',         price: 3.81, change:  0.01, trend: 'up'   },
        { region: 'Lower Atlantic',  price: 3.85, change:  0.00, trend: 'flat' },
        { region: 'Central Atlantic',price: 3.92, change:  0.03, trend: 'up'   },
        { region: 'East Coast',      price: 3.94, change:  0.02, trend: 'up'   },
        { region: 'New England',     price: 4.01, change:  0.04, trend: 'up'   },
        { region: 'Rocky Mountain',  price: 4.05, change: -0.02, trend: 'down' },
        { region: 'West Coast',      price: 4.48, change:  0.05, trend: 'up'   },
        { region: 'California',      price: 4.91, change:  0.08, trend: 'up'   },
      ]);
      setUpdatedAt('Using estimated data — set EIA_API_KEY for live prices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const avg   = regions.find(r => r.region === 'US Average');
  const rest  = regions.filter(r => r.region !== 'US Average');
  const minP  = rest.length ? Math.min(...rest.map(r => r.price)) : 0;
  const maxP  = rest.length ? Math.max(...rest.map(r => r.price)) : 5;

  const renderItem = ({ item, index }: { item: RegionPrice; index: number }) => {
    const isAvg   = item.region === 'US Average';
    const barPct  = maxP > minP ? (item.price - minP) / (maxP - minP) : 0.5;
    const priceColor = item.price <= (avg?.price ?? 4)
      ? '#27AE60'
      : item.price <= (avg?.price ?? 4) * 1.05
        ? '#F39C12'
        : Colors.danger;

    const trendIcon  = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';
    const trendColor = item.trend === 'up' ? Colors.danger : item.trend === 'down' ? '#27AE60' : Colors.textMuted;

    if (isAvg) {
      return (
        <View style={styles.avgCard}>
          <Text style={{ fontSize: 36 }}>🇺🇸</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.avgPrice}>{fmt(item.price)}</Text>
            <Text style={styles.avgLabel}>US National Average · {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'} {Math.abs(item.change).toFixed(3)}/gal this week</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={{ fontSize: 28 }}>{REGION_ICONS[item.region] ?? '⛽'}</Text>
        <View style={styles.cardLeft}>
          <Text style={styles.region}>{item.region}</Text>
          <Text style={styles.rankText}>
            {index === 1 ? '🥇 Cheapest region' : index === rest.length ? '🔴 Most expensive' : `#${index} of ${rest.length}`}
          </Text>
          <View style={styles.barWrap}>
            <View style={[styles.barFill, { width: `${(barPct * 100).toFixed(0)}%` as `${number}%`, backgroundColor: priceColor }]} />
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.price, { color: priceColor }]}>{fmt(item.price)}</Text>
          <View style={styles.changeRow}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
            <Text style={[styles.changeText, { color: trendColor }]}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(3)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={[avg!, ...rest].filter(Boolean)}
        keyExtractor={r => r.region}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        ListHeaderComponent={
          <View style={[styles.header, { marginBottom: 14 }]}>
            <Text style={styles.headerTitle}>Weekly Diesel Prices by Region</Text>
            <Text style={styles.headerSub}>
              Source: U.S. Energy Information Administration (EIA). Updated weekly. Green = below national average. Use this to plan fuel stops along your route.
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text style={styles.lastUpdated}>Last updated: {updatedAt}</Text>
        }
      />
    </SafeAreaView>
  );
}
