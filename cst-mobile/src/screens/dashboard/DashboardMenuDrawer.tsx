import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import {
  getLiveRevenue, getRevenue, getHOSEntries, getDeadlines,
} from '../../api/features';
import { getRecentFeatures, recordFeatureUse, RecentFeature } from '../../utils/recentFeatures';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const NAVY   = '#021B3A';
const ORANGE = '#F97316';
const INDIGO = '#6366F1';
const VIOLET = '#8B5CF6';
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const { width: SW } = Dimensions.get('window');
const RECENT_W = (SW - 48) / 3;

function HosBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct  = Math.min(Math.max(used / total, 0), 1);
  const warn = pct >= 0.8;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
          {Math.max(total - used, 0).toFixed(1)}h left
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}> · {used.toFixed(1)}/{total}h</Text>
        </Text>
      </View>
      <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4 }}>
        <View style={{ width: `${pct * 100}%` as any, height: '100%', borderRadius: 4, backgroundColor: warn ? '#FF5E5E' : color }} />
      </View>
    </View>
  );
}

const deadlineColor = (d: number) => d <= 7 ? '#FF3B30' : d <= 30 ? '#FF9500' : '#27AE60';
const deadlineLabel = (d: number) => d === 0 ? 'Today' : `${d}d`;

interface Props {
  navigation: Nav;
  onClose: () => void;
}

export default function DashboardMenuDrawer({ navigation, onClose }: Props) {
  const Colors = useColors();
  const [grossRevenue, setGrossRevenue] = useState('—');
  const [revTrend,     setRevTrend]     = useState(0);
  const [weekTrend,    setWeekTrend]    = useState<number[]>([]);
  const [period,       setPeriod]       = useState<'7d' | '15d' | '30d'>('7d');
  const [hos,          setHos]          = useState({ driving: 0, onDuty: 0, cycle: 0 });
  const [deadlines,    setDeadlines]    = useState<any[]>([]);
  const [recent,       setRecent]       = useState<RecentFeature[]>([]);

  useEffect(() => {
    Promise.all([
      getLiveRevenue('Month').catch(() => null),
      getRevenue('Week').catch(() => null),
      getHOSEntries().catch(() => null),
      getDeadlines().catch(() => null),
    ]).then(([monthly, weekly, hosData, deadlineData]) => {
      if (monthly?.grossRevenue > 0) {
        setGrossRevenue(`$${monthly.grossRevenue.toLocaleString()}`);
        if (monthly.trend?.length > 1) {
          const first = monthly.trend[0] || 1;
          const last  = monthly.trend[monthly.trend.length - 1];
          setRevTrend(Math.round(((last - first) / first) * 100));
        }
      }
      if (weekly?.trend?.length) setWeekTrend(weekly.trend);
      if (hosData?.entries?.length) {
        const today = new Date().toISOString().split('T')[0];
        const entry = hosData.entries.find((e: any) => e.date?.startsWith(today));
        const cycle = hosData.entries.slice(0, 8).reduce((s: number, e: any) => s + (e.onDutyHours || 0), 0);
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

  useEffect(() => { getRecentFeatures().then(setRecent); }, []);

  const goTo = async (screen: string, f?: RecentFeature) => {
    if (f) {
      await recordFeatureUse(f);
      setRecent(prev => [f, ...prev.filter(x => x.screen !== f.screen)].slice(0, 5));
    }
    onClose();
    (navigation as any).navigate(screen);
  };

  const todayIdx  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const maxBar    = Math.max(...weekTrend, 1);
  const chartData = weekTrend.length === 7 ? weekTrend : Array(7).fill(0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* ── Revenue + HOS tiles ────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border }}
          onPress={() => goTo('ProfitLoss')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#27AE6015', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="cash-outline" size={16} color="#27AE60" />
            </View>
            {revTrend !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: (revTrend > 0 ? '#27AE60' : '#FF3B30') + '15', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 }}>
                <Ionicons name={revTrend > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={revTrend > 0 ? '#27AE60' : '#FF3B30'} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: revTrend > 0 ? '#27AE60' : '#FF3B30' }}>{Math.abs(revTrend)}%</Text>
              </View>
            )}
          </View>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '900' }}>{grossRevenue}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>Gross Revenue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border }}
          onPress={() => goTo('HOSTracker')}
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
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '900' }}>
            {Math.max(11 - hos.driving, 0).toFixed(1)}h
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>Drive Time Left</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick action pills ─────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Log Trip',  icon: 'map-outline',   screen: 'TripLog'    },
          { label: 'Add Fuel',  icon: 'water-outline', screen: 'FuelLog'    },
          { label: 'Log HOS',   icon: 'time-outline',  screen: 'HOSTracker' },
        ].map(a => (
          <TouchableOpacity
            key={a.label}
            style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Colors.border }}
            onPress={() => goTo(a.screen)}
            activeOpacity={0.75}
          >
            <Ionicons name={a.icon as any} size={18} color={Colors.secondary} />
            <Text style={{ color: Colors.text, fontSize: 11, fontWeight: '600' }}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── On the Road — HOS card ─────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
        <LinearGradient colors={['#0D1B3E', '#2D1B69']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>On the Road</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>HOS Status — Today</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => goTo('HOSTracker')}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Details</Text>
              <Ionicons name="chevron-forward" size={13} color="#FFF" />
            </TouchableOpacity>
          </View>
          <HosBar label="Driving"     used={hos.driving} total={11} color={ORANGE} />
          <HosBar label="On Duty"     used={hos.onDuty}  total={14} color={INDIGO} />
          <HosBar label="70-Hr Cycle" used={hos.cycle}   total={70} color={VIOLET} />
          {hos.driving === 0 && hos.onDuty === 0 && (
            <TouchableOpacity
              style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              onPress={() => goTo('HOSTracker')}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>+ Log today's hours</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* ── Earnings chart ─────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '800' }}>Earnings</Text>
            {revTrend !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                <Ionicons name={revTrend > 0 ? 'arrow-up' : 'arrow-down'} size={11} color={revTrend > 0 ? '#27AE60' : '#FF3B30'} />
                <Text style={{ fontSize: 11, color: revTrend > 0 ? '#27AE60' : '#FF3B30', fontWeight: '600' }}>
                  {revTrend > 0 ? '+' : ''}{revTrend}% vs last period
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 3, gap: 2 }}>
            {(['7d', '15d', '30d'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: period === p ? Colors.surface : 'transparent' }}
                onPress={() => setPeriod(p)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: period === p ? Colors.secondary : Colors.textMuted }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {weekTrend.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 72 }}>
            {chartData.map((val, i) => {
              const barH  = maxBar > 0 ? Math.max((val / maxBar) * 60, 4) : 4;
              const today = i === todayIdx;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: barH, borderRadius: 5, backgroundColor: today ? ORANGE : Colors.border }} />
                  <Text style={{ fontSize: 10, color: today ? Colors.secondary : Colors.textMuted, fontWeight: today ? '800' : '400' }}>
                    {WEEK_DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
            <Ionicons name="bar-chart-outline" size={28} color="#DCE6F0" />
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>No data yet</Text>
            <TouchableOpacity onPress={() => goTo('ProfitLoss')} activeOpacity={0.8}>
              <Text style={{ color: Colors.secondary, fontSize: 13, fontWeight: '600' }}>Add revenue →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Due Soon ───────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '800' }}>Due Soon</Text>
          <TouchableOpacity onPress={() => goTo('Calendar')} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.secondary }}>Manage ›</Text>
          </TouchableOpacity>
        </View>
        {deadlines.length > 0 ? deadlines.map((d, i) => (
          <View key={d._id ?? i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < deadlines.length - 1 ? 1 : 0, borderColor: Colors.border }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: deadlineColor(d.daysLeft), marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }} numberOfLines={1}>{d.title}</Text>
              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>{d.type ?? 'Reminder'}</Text>
            </View>
            <View style={{ backgroundColor: deadlineColor(d.daysLeft) + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: deadlineColor(d.daysLeft) }}>
                {deadlineLabel(d.daysLeft)}
              </Text>
            </View>
          </View>
        )) : (
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={30} color="#27AE60" />
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>All clear — no upcoming deadlines</Text>
            <TouchableOpacity onPress={() => goTo('Calendar')} activeOpacity={0.8}>
              <Text style={{ color: Colors.secondary, fontSize: 13, fontWeight: '600' }}>Add a deadline →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Recently Used ──────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '800' }}>Recently Used</Text>
          <TouchableOpacity onPress={() => goTo('Tools')} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.secondary }}>View all ›</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <TouchableOpacity
            style={{ backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 22, alignItems: 'center', gap: 8 }}
            onPress={() => goTo('Tools')}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={30} color="#C8D8EC" />
            <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600' }}>No recent tools yet</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
              Go to the Tools tab to explore features.{'\n'}Your last 5 will appear here.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {recent.map(f => (
              <TouchableOpacity
                key={f.screen}
                style={{ width: RECENT_W, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 6 }}
                onPress={() => goTo(f.screen!, f)}
                activeOpacity={0.75}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: f.color + '22' }}>
                  <Ionicons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text style={{ color: Colors.text, fontSize: 11, fontWeight: '700', lineHeight: 15 }} numberOfLines={2}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}
