import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

type Category = 'national' | 'safety' | 'skill' | 'business' | 'fleet' | 'rising';

interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
  totalScore: number;
  badges: string[];
  isMe: boolean;
}

interface LeaderboardData {
  category: Category;
  top: LeaderEntry[];
  myRank: number | null;
  myScore: number;
  myTotalScore: number;
  totalDrivers: number;
}

const CATEGORIES: { id: Category; label: string; icon: string; color: string; desc: string; maxScore: number }[] = [
  { id: 'national',  label: 'National Top Trucker',  icon: 'trophy-outline',           color: '#FFD700', desc: 'Overall Road Ready Score',         maxScore: 1000 },
  { id: 'safety',    label: 'Cleanest Driver',        icon: 'shield-checkmark-outline',  color: '#2ECC71', desc: 'Fewest violations & damage',        maxScore: 300  },
  { id: 'skill',     label: 'Local Yard Champion',    icon: 'stopwatch-outline',         color: '#3498DB', desc: 'Backing, docking & CDL skills',    maxScore: 200  },
  { id: 'business',  label: 'Best Owner-Operator',    icon: 'trending-up-outline',       color: '#F39C12', desc: 'Highest business score & profit',   maxScore: 150  },
  { id: 'fleet',     label: 'Best Fleet Builder',     icon: 'people-outline',            color: '#E74C3C', desc: 'Fleet profit + safety compliance',  maxScore: 250  },
  { id: 'rising',    label: 'Rising Star',            icon: 'star-outline',              color: '#9B59B6', desc: 'Education & reputation combined',   maxScore: 150  },
];

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const BADGE_LABELS: Record<string, string> = {
  'freight-veteran': '🚛',
  'rate-master':     '💰',
  'oo-survivor':     '🔧',
  'oo-profitable':   '📈',
  'safety-pro':      '🛡️',
  'hos-champion':    '⏱️',
};

function seasonInfo() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const weekNum = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
  return { weekNum, daysLeft: daysUntilSunday };
}

export default function AmericasTopTruckerScreen() {
  const Colors = useColors();
  const { user } = useAuth();
  const [cat, setCat] = useState<Category>('national');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const { weekNum, daysLeft } = seasonInfo();
  const activeCat = CATEGORIES.find(c => c.id === cat)!;

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: d } = await client.get(`/leaderboard?category=${cat}`);
      setData(d);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cat]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderEntry = ({ item }: { item: LeaderEntry }) => {
    const rankIcon = RANK_ICONS[item.rank];
    const isTop3 = item.rank <= 3;
    return (
      <View style={[
        s.entry,
        item.isMe && { borderColor: Colors.secondary, borderWidth: 2, backgroundColor: Colors.secondary + '11' },
      ]}>
        <View style={s.entryRank}>
          {rankIcon
            ? <Text style={s.medal}>{rankIcon}</Text>
            : <Text style={[s.rankNum, { color: isTop3 ? activeCat.color : Colors.textMuted }]}>#{item.rank}</Text>
          }
        </View>
        <View style={s.entryBody}>
          <View style={s.entryNameRow}>
            <Text style={[s.entryName, { color: item.isMe ? Colors.secondary : Colors.text }]}>
              {item.name}{item.isMe ? ' (You)' : ''}
            </Text>
            <View style={s.entryBadges}>
              {item.badges.slice(0, 2).map(b => (
                <Text key={b} style={s.entryBadgeIcon}>{BADGE_LABELS[b] ?? '🏅'}</Text>
              ))}
            </View>
          </View>
          <View style={s.entryBar}>
            <View style={[s.entryBarFill, {
              width: `${Math.min(100, (item.score / activeCat.maxScore) * 100)}%`,
              backgroundColor: item.isMe ? Colors.secondary : activeCat.color,
            }]} />
          </View>
        </View>
        <Text style={[s.entryScore, { color: item.isMe ? Colors.secondary : Colors.text }]}>
          {item.score}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['bottom']}>

      {/* ── Gold header ────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>America's Top Trucker</Text>
            <Text style={s.headerSub}>National Competition — Season {new Date().getFullYear()}</Text>
          </View>
          <View style={s.weekChip}>
            <Text style={s.weekChipTxt}>Week {weekNum}</Text>
            <Text style={s.weekChipSub}>{daysLeft}d left</Text>
          </View>
        </View>

        {/* My rank summary */}
        {data && (
          <View style={s.myRankCard}>
            <View style={s.myRankLeft}>
              <Text style={s.myRankLabel}>YOUR RANK</Text>
              <Text style={s.myRankValue}>
                {data.myRank ? `#${data.myRank}` : 'Unranked'}
              </Text>
              <Text style={s.myRankSub}>
                of {data.totalDrivers} driver{data.totalDrivers !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={s.myRankDivider} />
            <View style={s.myRankRight}>
              <Text style={s.myRankLabel}>{activeCat.label.toUpperCase()}</Text>
              <Text style={[s.myRankValue, { color: activeCat.color }]}>{data.myScore}</Text>
              <Text style={s.myRankSub}>/ {activeCat.maxScore} pts</Text>
            </View>
            <View style={s.myRankDivider} />
            <View style={s.myRankRight}>
              <Text style={s.myRankLabel}>ROAD READY</Text>
              <Text style={[s.myRankValue, { color: Colors.secondary }]}>{data.myTotalScore}</Text>
              <Text style={s.myRankSub}>/ 1,000 pts</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Category tabs ──────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catRow}
        style={[s.catBar, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.catChip, cat === c.id && { backgroundColor: c.color + '22', borderColor: c.color }]}
            onPress={() => setCat(c.id)}
            activeOpacity={0.8}
          >
            <Ionicons name={c.icon as any} size={14} color={cat === c.id ? c.color : Colors.textMuted} />
            <Text style={[s.catChipTxt, { color: cat === c.id ? c.color : Colors.textMuted }]}>
              {c.label.split(' ').slice(0, 2).join(' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Category header ────────────────────────────────────────────── */}
      <View style={[s.catHeader, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
        <Ionicons name={activeCat.icon as any} size={18} color={activeCat.color} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.catHeaderTitle, { color: Colors.text }]}>{activeCat.label}</Text>
          <Text style={[s.catHeaderDesc, { color: Colors.textMuted }]}>{activeCat.desc}</Text>
        </View>
      </View>

      {/* ── Leaderboard list ───────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={[s.loadingTxt, { color: Colors.textMuted }]}>Loading leaderboard…</Text>
        </View>
      ) : !data || data.top.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>🏁</Text>
          <Text style={[s.emptyTitle, { color: Colors.text }]}>No rankings yet</Text>
          <Text style={[s.emptyDesc, { color: Colors.textMuted }]}>
            Be the first! Complete lessons, challenges, and freight runs to earn your score.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.top}
          keyExtractor={(item: LeaderEntry) => String(item.rank)}
          renderItem={renderEntry}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={Colors.secondary}
            />
          }
          ListFooterComponent={
            data.totalDrivers > 10 ? (
              <Text style={[s.footerNote, { color: Colors.textMuted }]}>
                Showing top 10 of {data.totalDrivers} ranked drivers.{' '}
                {data.myRank && data.myRank > 10
                  ? `You are ranked #${data.myRank}.`
                  : 'Keep competing to climb the ranks!'}
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(Colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },

    // Header
    header: { backgroundColor: '#021B3A', padding: 16, paddingBottom: 12 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
    headerSub:   { color: '#FFFFFF88', fontSize: 12, marginTop: 2 },
    weekChip: {
      backgroundColor: '#FFD70022', borderRadius: 10, borderWidth: 1, borderColor: '#FFD700',
      paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center',
    },
    weekChipTxt: { color: '#FFD700', fontSize: 12, fontWeight: '800' },
    weekChipSub: { color: '#FFD700AA', fontSize: 10, fontWeight: '600' },

    myRankCard: {
      backgroundColor: '#FFFFFF12', borderRadius: 14, flexDirection: 'row',
      alignItems: 'center', padding: 12, gap: 4,
    },
    myRankLeft:    { flex: 1, alignItems: 'center' },
    myRankRight:   { flex: 1, alignItems: 'center' },
    myRankDivider: { width: 1, height: 44, backgroundColor: '#FFFFFF22' },
    myRankLabel:   { color: '#FFFFFF66', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
    myRankValue:   { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    myRankSub:     { color: '#FFFFFF66', fontSize: 10, marginTop: 1 },

    // Category tabs
    catBar:   { borderBottomWidth: 1, maxHeight: 60 },
    catRow:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      borderWidth: 1, borderColor: Colors.border,
      backgroundColor: Colors.surfaceLight ?? Colors.surface,
    },
    catChipTxt: { fontSize: 12, fontWeight: '700' },

    // Category header
    catHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1,
    },
    catHeaderTitle: { fontSize: 14, fontWeight: '800' },
    catHeaderDesc:  { fontSize: 11, marginTop: 1 },

    // List
    list: { padding: 12, paddingBottom: 40, gap: 8 },
    entry: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border,
      padding: 12,
    },
    entryRank:    { width: 36, alignItems: 'center' },
    medal:        { fontSize: 22 },
    rankNum:      { fontSize: 15, fontWeight: '900' },
    entryBody:    { flex: 1, gap: 6 },
    entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    entryName:    { fontSize: 14, fontWeight: '700', flex: 1 },
    entryBadges:  { flexDirection: 'row', gap: 2 },
    entryBadgeIcon: { fontSize: 14 },
    entryBar:     { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
    entryBarFill: { height: '100%', borderRadius: 2 },
    entryScore:   { fontSize: 18, fontWeight: '900', minWidth: 44, textAlign: 'right' },

    // States
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    loadingTxt:  { fontSize: 14, marginTop: 8 },
    emptyTitle:  { fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyDesc:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    footerNote:  { fontSize: 12, textAlign: 'center', padding: 16, fontStyle: 'italic' },
  });
}
