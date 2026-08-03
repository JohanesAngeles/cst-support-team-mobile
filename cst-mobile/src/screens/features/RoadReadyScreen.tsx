import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { getRoadReadyProfile, refreshSafetyScore, syncRoadReadyScores } from '../../api/roadReady';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const SCORE_BUCKETS = [
  { label: 'Safety',      key: 'safetyScore',     max: 300, color: '#E74C3C', icon: 'shield-checkmark-outline' },
  { label: 'Skill',       key: 'skillScore',       max: 200, color: '#3498DB', icon: 'trophy-outline' },
  { label: 'Compliance',  key: 'complianceScore',  max: 200, color: '#2ECC71', icon: 'clipboard-outline' },
  { label: 'Business',    key: 'businessScore',    max: 150, color: '#F39C12', icon: 'trending-up-outline' },
  { label: 'Reputation',  key: 'reputationScore',  max: 100, color: '#9B59B6', icon: 'star-outline' },
  { label: 'Education',   key: 'educationScore',   max: 50,  color: '#1ABC9C', icon: 'school-outline' },
] as const;

const BADGE_LABELS: Record<string, string> = {
  'freight-veteran': '🚛 Freight Veteran',
  'rate-master':     '💰 Rate Master',
  'oo-survivor':     '🔧 O/O Survivor',
  'oo-profitable':   '📈 O/O Profitable',
  'safety-pro':      '🛡️ Safety Pro',
  'hos-champion':    '⏱️ HOS Champion',
};

const MODES = [
  {
    screen: 'StudentDriver' as keyof MainStackParamList,
    label: 'Student Driver',
    icon: 'school-outline',
    color: '#1ABC9C',
    desc: 'Learn CDL knowledge & pass quizzes',
    tag: 'EDUCATION',
  },
  {
    screen: 'CDLChallenge' as keyof MainStackParamList,
    label: 'CDL Skill Challenge',
    icon: 'stopwatch-outline',
    color: '#3498DB',
    desc: 'Timed challenges — prove your skills',
    tag: 'SKILL',
  },
  {
    screen: 'FreightCareer' as keyof MainStackParamList,
    label: 'Freight Career',
    icon: 'cube-outline',
    color: '#F39C12',
    desc: 'Accept loads, maximize rate-per-mile',
    tag: 'BUSINESS',
  },
  {
    screen: 'OOSim' as keyof MainStackParamList,
    label: 'Owner-Operator Sim',
    icon: 'business-outline',
    color: '#9B59B6',
    desc: 'Run your own trucking business',
    tag: 'O/O MODE',
  },
];

const rankFromScore = (score: number) => {
  if (score >= 900) return { rank: 'National Champion', color: '#FFD700' };
  if (score >= 750) return { rank: 'Pro Driver', color: '#C0C0C0' };
  if (score >= 500) return { rank: 'Owner-Operator', color: '#CD7F32' };
  if (score >= 300) return { rank: 'Company Driver', color: '#3498DB' };
  if (score >= 100) return { rank: 'Student Driver', color: '#2ECC71' };
  return { rank: 'Rookie', color: '#8FA0B3' };
};

export default function RoadReadyScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    scoreCard: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
      borderWidth: 2, borderColor: Colors.secondary + '44', gap: 14,
    },
    scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    scoreLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    scoreValue: { color: Colors.secondary, fontSize: 52, fontWeight: '900', lineHeight: 58 },
    scoreMax: { color: Colors.textMuted, fontSize: 12 },
    rankBadge: { borderRadius: 10, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 6 },
    rankText: { fontSize: 13, fontWeight: '900' },
    masterBar: { height: 10, backgroundColor: Colors.surfaceLight, borderRadius: 5, overflow: 'hidden' },
    masterFill: { height: '100%', borderRadius: 5 },
    bucketsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, paddingTop: 8 },
    bucketItem: { flex: 1, alignItems: 'center', gap: 2 },
    bucketBar: { width: 14, borderRadius: 4, minHeight: 3 },
    bucketVal: { fontSize: 11, fontWeight: '800' },
    bucketLabel: { color: Colors.textMuted, fontSize: 8, textAlign: 'center' },
    bucketMax: { color: Colors.border, fontSize: 8 },
    badgesCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { backgroundColor: Colors.secondary + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.secondary + '44' },
    badgeText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    modeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14,
    },
    modeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modeInfo: { flex: 1, gap: 3 },
    modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modeLabel: { color: Colors.text, fontWeight: '800', fontSize: 14 },
    modeTag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    modeTagText: { fontSize: 9, fontWeight: '700' },
    modeDesc: { color: Colors.textMuted, fontSize: 12 },
    comingSoonCard: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: Colors.surface, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: Colors.border,
    },
    comingSoonText: { flex: 1, color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  }), [Colors]);
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    // Sync all score buckets from real activity data, then load profile
    Promise.allSettled([refreshSafetyScore(), syncRoadReadyScores()])
      .finally(() => {
        getRoadReadyProfile()
          .then(d => setProfile(d.profile))
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, []));

  const total = profile?.totalScore ?? 0;
  const { rank, color: rankColor } = rankFromScore(total);
  const pct = Math.min(1, total / 1000);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Road Ready Score card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={styles.scoreLabel}>ROAD READY SCORE</Text>
              <Text style={styles.scoreValue}>{total}</Text>
              <Text style={styles.scoreMax}>/ 1,000 points</Text>
            </View>
            <View style={[styles.rankBadge, { borderColor: rankColor }]}>
              <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
            </View>
          </View>

          {/* Master progress bar */}
          <View style={styles.masterBar}>
            <View style={[styles.masterFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.8 ? '#FFD700' : pct > 0.5 ? Colors.secondary : Colors.success }]} />
          </View>

          {/* Score buckets */}
          <View style={styles.bucketsGrid}>
            {SCORE_BUCKETS.map(b => {
              const val = profile?.[b.key] ?? 0;
              const p = Math.min(1, val / b.max);
              return (
                <View key={b.key} style={styles.bucketItem}>
                  <View style={[styles.bucketBar, { height: 40 * p || 3, backgroundColor: b.color }]} />
                  <Text style={[styles.bucketVal, { color: b.color }]}>{val}</Text>
                  <Text style={styles.bucketLabel}>{b.label}</Text>
                  <Text style={styles.bucketMax}>/{b.max}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Badges */}
        {profile?.badges?.length > 0 && (
          <View style={styles.badgesCard}>
            <Text style={styles.sectionTitle}>Badges Earned</Text>
            <View style={styles.badgesRow}>
              {profile.badges.map((b: string) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{BADGE_LABELS[b] ?? b}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Game modes */}
        <Text style={styles.sectionTitle}>Game Modes — Phase 1</Text>
        {MODES.map(m => (
          <TouchableOpacity key={m.label} style={styles.modeCard} onPress={() => navigation.navigate(m.screen as any)} activeOpacity={0.8}>
            <View style={[styles.modeIcon, { backgroundColor: m.color + '22' }]}>
              <Ionicons name={m.icon as any} size={28} color={m.color} />
            </View>
            <View style={styles.modeInfo}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeLabel}>{m.label}</Text>
                <View style={[styles.modeTag, { backgroundColor: m.color + '22' }]}>
                  <Text style={[styles.modeTagText, { color: m.color }]}>{m.tag}</Text>
                </View>
              </View>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Phase 2 */}
        <Text style={styles.sectionTitle}>Game Modes — Phase 2</Text>
        {[
          { screen: 'FleetOwner' as keyof MainStackParamList,    icon: 'people-outline',  color: '#E74C3C', label: 'Fleet Owner Mode',                  desc: 'Manage a full fleet — hire drivers, buy trucks, scale your business', tag: 'NEW' },
          { screen: 'TRACCommunity' as keyof MainStackParamList, icon: 'globe-outline',   color: '#1ABC9C', label: 'TRAC Community Mode',               desc: 'Driver-to-driver network — share tips, routes, and road knowledge',   tag: 'EARLY ACCESS' },
        ].map(m => (
          <TouchableOpacity key={m.label} style={styles.modeCard} onPress={() => navigation.navigate(m.screen as any)} activeOpacity={0.8}>
            <View style={[styles.modeIcon, { backgroundColor: m.color + '22' }]}>
              <Ionicons name={m.icon as any} size={28} color={m.color} />
            </View>
            <View style={styles.modeInfo}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeLabel}>{m.label}</Text>
                <View style={[styles.modeTag, { backgroundColor: m.color + '22' }]}>
                  <Text style={[styles.modeTagText, { color: m.color }]}>{m.tag}</Text>
                </View>
              </View>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
        {/* Top Trucker Competition */}
        <TouchableOpacity style={styles.modeCard} onPress={() => navigation.navigate('AmericasTopTrucker' as any)} activeOpacity={0.8}>
          <View style={[styles.modeIcon, { backgroundColor: '#FFD70022' }]}>
            <Ionicons name="trophy-outline" size={28} color="#FFD700" />
          </View>
          <View style={styles.modeInfo}>
            <View style={styles.modeTitleRow}>
              <Text style={styles.modeLabel}>America's Top Trucker</Text>
              <View style={[styles.modeTag, { backgroundColor: '#FFD70022' }]}>
                <Text style={[styles.modeTagText, { color: '#FFD700' }]}>COMPETE</Text>
              </View>
            </View>
            <Text style={styles.modeDesc}>Compete nationally — leaderboards, prizes, and industry recognition</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
