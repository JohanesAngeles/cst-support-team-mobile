import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  Image, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { MainStackParamList } from '../../navigation/MainStack';
import {
  getLiveRevenue, getRevenue, getHOSEntries, getDeadlines,
} from '../../api/features';
import { getRecentFeatures, recordFeatureUse, RecentFeature } from '../../utils/recentFeatures';

const NAVY   = '#021B3A';
const ORANGE = '#F97316';
const INDIGO = '#6366F1';
const VIOLET = '#8B5CF6';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SW } = Dimensions.get('window');
const CARD_W   = SW - 32;
const RECENT_W = (SW - 48) / 3;

// ─── Carousel ─────────────────────────────────────────────────────────────────
const CAROUSEL = [
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?fm=jpg&q=80&w=1200&auto=format&fit=crop',
  'https://images.pexels.com/photos/27099096/pexels-photo-27099096.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://i2.pickpik.com/photos/359/125/230/truck-semi-trailers-usa-towing-vehicle-716066c4c2ff9118e68019d2a4d8f409.jpg',
];
const HERO_H = 180;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—';
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const deadlineColor = (d: number) => d <= 7 ? '#FF3B30' : d <= 30 ? '#FF9500' : '#27AE60';
const deadlineLabel = (d: number) => d === 0 ? 'Today' : `${d}d`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function HosBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct  = Math.min(Math.max(used / total, 0), 1);
  const warn = pct >= 0.8;
  const left = Math.max(total - used, 0);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
          {left.toFixed(1)}h left
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}> · {used.toFixed(1)}/{total}h</Text>
        </Text>
      </View>
      <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4 }}>
        <View style={{ width: `${pct * 100}%` as any, height: '100%', borderRadius: 4, backgroundColor: warn ? '#FF5E5E' : color }} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();

  const [grossRevenue, setGrossRevenue] = useState('—');
  const [netProfit,    setNetProfit]    = useState('—');
  const [revTrend,     setRevTrend]     = useState(0);
  const [weekTrend,    setWeekTrend]    = useState<number[]>([]);
  const [period,       setPeriod]       = useState<'7d' | '15d' | '30d'>('7d');
  const [hos,          setHos]          = useState({ driving: 0, onDuty: 0, cycle: 0 });
  const [deadlines,    setDeadlines]    = useState<any[]>([]);
  const [recent,       setRecent]       = useState<RecentFeature[]>([]);
  const [slideIdx,     setSlideIdx]     = useState(0);

  const carouselRef = useRef<FlatList>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const sosPulse    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [sosPulse]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getLiveRevenue('Month').catch(() => null),
      getRevenue('Week').catch(() => null),
      getHOSEntries().catch(() => null),
      getDeadlines().catch(() => null),
    ]).then(([monthly, weekly, hosData, deadlineData]) => {
      if (monthly?.grossRevenue > 0) {
        setGrossRevenue(fmtMoney(monthly.grossRevenue));
        setNetProfit(fmtMoney(monthly.netProfit));
        if (monthly.trend?.length > 1) {
          const first = monthly.trend[0] || 1;
          const last  = monthly.trend[monthly.trend.length - 1];
          setRevTrend(Math.round(((last - first) / first) * 100));
        }
      }
      if (weekly?.trend?.length) setWeekTrend(weekly.trend);

      if (hosData?.entries?.length) {
        const today    = new Date().toISOString().split('T')[0];
        const entry    = hosData.entries.find((e: any) => e.date?.startsWith(today));
        const cycle    = hosData.entries.slice(0, 8).reduce((s: number, e: any) => s + (e.onDutyHours || 0), 0);
        setHos({ driving: entry?.drivingHours ?? 0, onDuty: entry?.onDutyHours ?? 0, cycle: Math.min(cycle, 70) });
      }

      if (deadlineData) {
        const items = (deadlineData.deadlines ?? deadlineData ?? [])
          .map((d: any) => ({ ...d, daysLeft: Math.ceil((new Date(d.date).getTime() - Date.now()) / 86_400_000) }))
          .filter((d: any) => d.daysLeft >= 0)
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
          .slice(0, 4);
        setDeadlines(items);
      }
    });
  }, []);

  useFocusEffect(useCallback(() => { getRecentFeatures().then(setRecent); }, []));

  // ── Carousel auto-scroll ───────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlideIdx(prev => {
        const next = (prev + 1) % CAROUSEL.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
  }, []);

  useEffect(() => { startTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [startTimer]);

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (idx !== slideIdx) { setSlideIdx(idx); startTimer(); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const goTo = async (f: RecentFeature) => {
    if (!f.screen) return;
    await recordFeatureUse(f);
    setRecent(prev => [f, ...prev.filter(x => x.screen !== f.screen)].slice(0, 5));
    navigation.navigate(f.screen as any);
  };

  const hour      = new Date().getHours();
  const timeLabel = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const dateStr   = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const initials  = (user?.name ?? 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const todayIdx  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const maxBar    = Math.max(...weekTrend, 1);
  const chartData = weekTrend.length === 7 ? weekTrend : Array(7).fill(0);

  return (
    <View style={{ flex: 1 }}>

      {/* ── Header (fixed) ───────────────────────────────────────────────── */}
      <SafeAreaView style={{ backgroundColor: 'rgba(250,251,255,0.95)' }} edges={['top']}>
        <View style={{
          backgroundColor: 'transparent',
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
          flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ color: '#8E8E93', fontSize: 14 }}>{timeLabel},</Text>
            <Text style={{ color: '#1A1A2E', fontSize: 26, fontWeight: '900', marginTop: 1 }}>{firstName}</Text>
            <Text style={{ color: '#AEAEB2', fontSize: 12, marginTop: 2 }}>{dateStr}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            {/* Bell */}
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => navigation.navigate('HOSAlerts')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color="#1A1A2E" />
              <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9500', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
            </TouchableOpacity>
            {/* Avatar */}
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => (navigation as any).navigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        style={{ flex: 1 }}
      >

        {/* ① Stats tiles */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12, marginBottom: 4 }}>
          {/* Revenue tile */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
            onPress={() => navigation.navigate('ProfitLoss')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#27AE6015', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="cash-outline" size={16} color="#27AE60" />
              </View>
              {revTrend !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: (revTrend > 0 ? '#27AE60' : '#FF3B30') + '15', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 }}>
                  <Ionicons name={revTrend > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={revTrend > 0 ? '#27AE60' : '#FF3B30'} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: revTrend > 0 ? '#27AE60' : '#FF3B30' }}>
                    {Math.abs(revTrend)}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#1A1A2E', fontSize: 20, fontWeight: '900' }}>{grossRevenue}</Text>
            <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>Gross Revenue</Text>
          </TouchableOpacity>

          {/* HOS remaining tile */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
            onPress={() => navigation.navigate('HOSTracker')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#E67E2215', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="timer-outline" size={16} color="#E67E22" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60' }} />
                <Text style={{ fontSize: 10, color: '#27AE60', fontWeight: '700' }}>Live</Text>
              </View>
            </View>
            <Text style={{ color: '#1A1A2E', fontSize: 20, fontWeight: '900' }}>
              {Math.max(11 - hos.driving, 0).toFixed(1)}h
            </Text>
            <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>Drive Time Left</Text>
          </TouchableOpacity>
        </View>

        {/* ② Primary CTA — Start Today's Log */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, marginBottom: 4 }}>
          <TouchableOpacity
            style={{ borderRadius: 14, overflow: 'hidden' }}
            onPress={() => navigation.navigate('HOSTracker')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[ORANGE, INDIGO]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Start Today's Log</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ③ Quick action pills */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8, marginBottom: 4 }}>
          {[
            { label: 'Log Trip',  icon: 'map-outline',   screen: 'TripLog'    },
            { label: 'Add Fuel',  icon: 'water-outline', screen: 'FuelLog'    },
            { label: 'Search',    icon: 'search-outline', screen: 'Tools'     },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}
              onPress={() => navigation.navigate(a.screen as any)}
              activeOpacity={0.75}
            >
              <Ionicons name={a.icon as any} size={18} color={NAVY} />
              <Text style={{ color: '#1A1A2E', fontSize: 11, fontWeight: '600' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ④ "On the Road" dark card — HOS live status (like Testora's Live Exams) */}
        <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 4 }}>
          <LinearGradient
            colors={['#0D1B3E', '#2D1B69']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            {/* Card header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>On the Road</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>HOS Status — Today</Text>
              </View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
                onPress={() => navigation.navigate('HOSTracker')}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Details</Text>
                <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <HosBar label="Driving"      used={hos.driving} total={11} color={ORANGE} />
            <HosBar label="On Duty"      used={hos.onDuty}  total={14} color={INDIGO} />
            <HosBar label="70-Hr Cycle"  used={hos.cycle}   total={70} color={VIOLET} />

            {hos.driving === 0 && hos.onDuty === 0 && (
              <TouchableOpacity
                style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                onPress={() => navigation.navigate('HOSTracker')}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>+ Log today's hours</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* ⑤ Carousel promo banner */}
        <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden', height: HERO_H, marginBottom: 4 }}>
          <FlatList
            ref={carouselRef}
            data={CAROUSEL}
            keyExtractor={(_, i) => String(i)}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            onMomentumScrollEnd={onCarouselScroll}
            getItemLayout={(_, i) => ({ length: CARD_W, offset: CARD_W * i, index: i })}
            style={{ position: 'absolute', top: 0, left: 0, width: CARD_W, height: HERO_H }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width: CARD_W, height: HERO_H }} resizeMode="cover" />
            )}
          />
          <LinearGradient
            colors={['rgba(2,27,58,0.1)', 'rgba(2,27,58,0.75)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', lineHeight: 24 }}>
                YOUR LOAD,{'\n'}ONE TAP AWAY!
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>
                Fast & Reliable Trucker Tools
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {CAROUSEL.map((_, i) => (
                  <View key={i} style={{ height: 4, width: i === slideIdx ? 18 : 4, borderRadius: 2, backgroundColor: i === slideIdx ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />
                ))}
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}
                onPress={() => navigation.navigate('PremiumGate')}
                activeOpacity={0.85}
              >
                <Text style={{ color: NAVY, fontSize: 11, fontWeight: '700' }}>Explore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ⑥ This Week chart + period selector */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.82)', marginHorizontal: 16, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 4 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ color: '#1A1A2E', fontSize: 15, fontWeight: '800' }}>Earnings</Text>
              {revTrend !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  <Ionicons name={revTrend > 0 ? 'arrow-up' : 'arrow-down'} size={11} color={revTrend > 0 ? '#27AE60' : '#FF3B30'} />
                  <Text style={{ fontSize: 11, color: revTrend > 0 ? '#27AE60' : '#FF3B30', fontWeight: '600' }}>
                    {revTrend > 0 ? '+' : ''}{revTrend}% vs last period
                  </Text>
                </View>
              )}
            </View>
            {/* Period selector */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['7d', '15d', '30d'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: period === p ? '#FFFFFF' : 'transparent' }}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: period === p ? NAVY : '#8E8E93' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar chart */}
          {weekTrend.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 72 }}>
              {chartData.map((val, i) => {
                const barH  = maxBar > 0 ? Math.max((val / maxBar) * 60, 4) : 4;
                const today = i === todayIdx;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: barH, borderRadius: 5, backgroundColor: today ? ORANGE : '#DCE6F0' }} />
                    <Text style={{ fontSize: 10, color: today ? NAVY : '#AEAEB2', fontWeight: today ? '800' : '400' }}>
                      {WEEK_DAYS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
              <Ionicons name="bar-chart-outline" size={28} color="#DCE6F0" />
              <Text style={{ color: '#AEAEB2', fontSize: 13 }}>No data yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProfitLoss')} activeOpacity={0.8}>
                <Text style={{ color: NAVY, fontSize: 13, fontWeight: '600' }}>Add revenue →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ⑦ Due Soon */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.82)', marginHorizontal: 16, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: '#1A1A2E', fontSize: 15, fontWeight: '800' }}>Due Soon</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: NAVY }}>Manage  ›</Text>
            </TouchableOpacity>
          </View>

          {deadlines.length > 0 ? (
            deadlines.map((d, i) => (
              <View
                key={d._id ?? i}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < deadlines.length - 1 ? 1 : 0, borderColor: '#F0F4F8' }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: deadlineColor(d.daysLeft), marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A2E' }} numberOfLines={1}>{d.title}</Text>
                  <Text style={{ fontSize: 11, color: '#8E8E93', marginTop: 1 }}>{d.type ?? 'Reminder'}</Text>
                </View>
                <View style={{ backgroundColor: deadlineColor(d.daysLeft) + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: deadlineColor(d.daysLeft) }}>
                    {deadlineLabel(d.daysLeft)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={30} color="#27AE60" />
              <Text style={{ color: '#8E8E93', fontSize: 13 }}>All clear — no upcoming deadlines</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Calendar')} activeOpacity={0.8}>
                <Text style={{ color: NAVY, fontSize: 13, fontWeight: '600' }}>Add a deadline →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ⑧ Recently Used */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#1A1A2E', fontSize: 15, fontWeight: '800' }}>Recently Used</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tools' as any)} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: NAVY }}>View all  ›</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <TouchableOpacity
              style={{ backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 22, alignItems: 'center', gap: 8 }}
              onPress={() => navigation.navigate('Tools' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="grid-outline" size={30} color="#C8D8EC" />
              <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>No recent tools yet</Text>
              <Text style={{ color: '#AEAEB2', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                Go to the Tools tab to explore features.{'\n'}Your last 5 will appear here.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {recent.map(f => (
                <TouchableOpacity
                  key={f.screen}
                  style={{ width: RECENT_W, backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', gap: 6, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 }}
                  onPress={() => goTo(f)}
                  activeOpacity={0.75}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: f.color + '22' }}>
                    <Ionicons name={f.icon as any} size={20} color={f.color} />
                  </View>
                  <Text style={{ color: '#1A1A2E', fontSize: 11, fontWeight: '700', lineHeight: 15 }} numberOfLines={2}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>


      </ScrollView>

      {/* ── Floating SOS Button (always visible above tab bar) ─────────────── */}
      <Animated.View style={{
        position: 'absolute',
        bottom: 98,
        right: 20,
        transform: [{ scale: sosPulse }],
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
      }}>
        <TouchableOpacity
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#FF3B30',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: '#FFFFFF',
          }}
          onPress={() => navigation.navigate('EmergencySOS')}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 1 }}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}
