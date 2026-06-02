import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getScorecard } from '../../api/features';

interface Scorecard {
  weekStart: string;
  weekEnd: string;
  grossRevenue: number;
  netRevenue: number;
  totalMiles: number;
  totalExpenses: number;
  fuelCost: number;
  fuelGallons: number;
  fuelEfficiency: number;
  avgRatePerMile: number;
  drivingHours: number;
  onDutyHours: number;
  completedTrips: number;
  totalTrips: number;
}

const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

function grade(sc: Scorecard): { letter: string; color: string; label: string } {
  if (!sc.totalMiles && !sc.grossRevenue) return { letter: '—', color: '#757575', label: 'No data' };
  const rpm = sc.avgRatePerMile;
  const mpg = sc.fuelEfficiency;
  const score = (rpm > 3.0 ? 4 : rpm > 2.5 ? 3 : rpm > 2.0 ? 2 : rpm > 1.5 ? 1 : 0)
    + (mpg > 8 ? 2 : mpg > 6 ? 1 : 0)
    + (sc.netRevenue > 1500 ? 2 : sc.netRevenue > 500 ? 1 : 0);
  if (score >= 7) return { letter: 'A+', color: '#2ECC71', label: 'Excellent week!' };
  if (score >= 5) return { letter: 'A', color: '#27AE60', label: 'Strong performance' };
  if (score >= 4) return { letter: 'B', color: '#F1C40F', label: 'Good week' };
  if (score >= 2) return { letter: 'C', color: '#E67E22', label: 'Room to improve' };
  return { letter: 'D', color: '#CC0000', label: 'Low-revenue week' };
}

export default function ScorecardScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    weekNav: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: Colors.border },
    navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    weekCenter: { flex: 1, alignItems: 'center' },
    weekLabel: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    weekSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    scroll: { padding: 16, paddingBottom: 40 },
    gradeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 2, padding: 16, gap: 14, marginBottom: 24 },
    gradeBadge: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    gradeLetter: { fontSize: 24, fontWeight: '900' },
    gradeLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 2 },
    gradeDesc: { fontSize: 14, fontWeight: '800' },
    shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12, marginTop: 4 },
    bigRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    bigCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 2, padding: 14, gap: 4 },
    bigCardLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
    bigCardVal: { fontSize: 20, fontWeight: '900' },
    bigCardSub: { color: Colors.textMuted, fontSize: 11 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    statVal: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 11 },
    fuelCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12, marginBottom: 20 },
    fuelRow: { flexDirection: 'row', justifyContent: 'space-around' },
    fuelStat: { alignItems: 'center', gap: 4 },
    fuelVal: { color: Colors.text, fontSize: 22, fontWeight: '900' },
    fuelLabel: { color: Colors.textMuted, fontSize: 11 },
    fuelPct: { gap: 8 },
    fuelPctLabel: { color: Colors.textMuted, fontSize: 12 },
    fuelBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    fuelBarFill: { height: '100%', borderRadius: 3 },
    expCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10, marginBottom: 20 },
    expRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expLabel: { color: Colors.textMuted, fontSize: 13 },
    expVal: { fontSize: 14, fontWeight: '700' },
    tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F1C40F22', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1C40F44' },
    tipText: { color: Colors.text, fontSize: 12, lineHeight: 18, flex: 1 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { color: Colors.text, fontSize: 17, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  }), [Colors]);
  const [sc, setSc] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const data = await getScorecard(offset);
      setSc(data);
    } catch { Alert.alert('Error', 'Could not load scorecard'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(weekOffset); }, [load, weekOffset]));

  const shareScorecard = async () => {
    if (!sc) return;
    const g = grade(sc);
    const msg = `CST Driver Weekly Scorecard — ${fmtDate(sc.weekStart)} to ${fmtDate(sc.weekEnd)}

Grade: ${g.letter} (${g.label})
Revenue: $${sc.grossRevenue.toFixed(2)}
Net: $${sc.netRevenue.toFixed(2)}
Miles: ${sc.totalMiles.toLocaleString()} mi
Trips: ${sc.completedTrips}
Rate/Mile: $${sc.avgRatePerMile.toFixed(2)}
Fuel: ${sc.fuelGallons} gal · $${sc.fuelCost.toFixed(2)} · ${sc.fuelEfficiency.toFixed(1)} MPG
Drive Time: ${sc.drivingHours.toFixed(1)}h

Sent via CST Driver App`;
    try { await Share.share({ message: msg }); } catch { /* cancelled */ }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  const g = sc ? grade(sc) : null;


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Week Navigation */}
      <View style={s.weekNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => { setWeekOffset(w => w + 1); }}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={s.weekCenter}>
          <Text style={s.weekLabel}>
            {sc ? `${fmtDate(sc.weekStart)} – ${fmtDate(sc.weekEnd)}` : 'This Week'}
          </Text>
          <Text style={s.weekSub}>{weekOffset === 0 ? 'Current Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} weeks ago`}</Text>
        </View>
        <TouchableOpacity style={[s.navBtn, weekOffset === 0 && { opacity: 0.3 }]} onPress={() => { if (weekOffset > 0) setWeekOffset(w => w - 1); }} disabled={weekOffset === 0}>
          <Ionicons name="chevron-forward" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {sc && g ? (
          <>
            {/* Grade Card */}
            <View style={[s.gradeCard, { borderColor: g.color }]}>
              <View style={[s.gradeBadge, { backgroundColor: g.color + '22', borderColor: g.color }]}>
                <Text style={[s.gradeLetter, { color: g.color }]}>{g.letter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.gradeLabel}>Weekly Performance Grade</Text>
                <Text style={[s.gradeDesc, { color: g.color }]}>{g.label}</Text>
              </View>
              <TouchableOpacity style={s.shareBtn} onPress={shareScorecard}>
                <Ionicons name="share-outline" size={20} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* Revenue Row */}
            <Text style={s.sectionTitle}>Revenue</Text>
            <View style={s.bigRow}>
              <View style={[s.bigCard, { flex: 1, borderColor: Colors.secondary }]}>
                <Text style={s.bigCardLabel}>Gross Revenue</Text>
                <Text style={[s.bigCardVal, { color: Colors.secondary }]}>${sc.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                <Text style={s.bigCardSub}>{sc.completedTrips} trip{sc.completedTrips !== 1 ? 's' : ''} completed</Text>
              </View>
              <View style={[s.bigCard, { flex: 1, borderColor: sc.netRevenue >= 0 ? '#2ECC71' : Colors.danger }]}>
                <Text style={s.bigCardLabel}>Net Revenue</Text>
                <Text style={[s.bigCardVal, { color: sc.netRevenue >= 0 ? '#2ECC71' : Colors.danger }]}>${sc.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                <Text style={s.bigCardSub}>after expenses & fuel</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <Text style={s.sectionTitle}>Performance</Text>
            <View style={s.grid}>
              {[
                { icon: 'speedometer-outline', label: 'Miles Driven', value: `${sc.totalMiles.toLocaleString()} mi`, color: '#3498DB' },
                { icon: 'trending-up-outline', label: 'Rate/Mile', value: `$${sc.avgRatePerMile.toFixed(2)}/mi`, color: Colors.secondary },
                { icon: 'time-outline', label: 'Drive Time', value: `${sc.drivingHours.toFixed(1)}h`, color: '#E67E22' },
                { icon: 'briefcase-outline', label: 'On-Duty Time', value: `${sc.onDutyHours.toFixed(1)}h`, color: '#9B59B6' },
              ].map(item => (
                <View key={item.label} style={s.statCard}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                  <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Fuel Section */}
            <Text style={s.sectionTitle}>Fuel Efficiency</Text>
            <View style={s.fuelCard}>
              <View style={s.fuelRow}>
                <View style={s.fuelStat}>
                  <Text style={s.fuelVal}>{sc.fuelGallons.toFixed(1)}</Text>
                  <Text style={s.fuelLabel}>Gallons</Text>
                </View>
                <View style={s.fuelStat}>
                  <Text style={[s.fuelVal, { color: Colors.danger }]}>${sc.fuelCost.toFixed(2)}</Text>
                  <Text style={s.fuelLabel}>Fuel Spent</Text>
                </View>
                <View style={s.fuelStat}>
                  <Text style={[s.fuelVal, { color: sc.fuelEfficiency >= 6 ? '#2ECC71' : '#E67E22' }]}>
                    {sc.fuelEfficiency > 0 ? sc.fuelEfficiency.toFixed(1) : '—'}
                  </Text>
                  <Text style={s.fuelLabel}>MPG</Text>
                </View>
              </View>
              {sc.fuelCost > 0 && sc.grossRevenue > 0 && (
                <View style={s.fuelPct}>
                  <Text style={s.fuelPctLabel}>Fuel is {Math.round((sc.fuelCost / sc.grossRevenue) * 100)}% of gross revenue</Text>
                  <View style={s.fuelBar}>
                    <View style={[s.fuelBarFill, { width: `${Math.min(100, (sc.fuelCost / sc.grossRevenue) * 100)}%` as any, backgroundColor: sc.fuelCost / sc.grossRevenue < 0.3 ? '#2ECC71' : Colors.danger }]} />
                  </View>
                </View>
              )}
            </View>

            {/* Expenses */}
            {sc.totalExpenses > 0 && (
              <>
                <Text style={s.sectionTitle}>Expenses</Text>
                <View style={s.expCard}>
                  <View style={s.expRow}>
                    <Text style={s.expLabel}>Business Expenses</Text>
                    <Text style={[s.expVal, { color: Colors.danger }]}>${sc.totalExpenses.toFixed(2)}</Text>
                  </View>
                  <View style={s.expRow}>
                    <Text style={s.expLabel}>Fuel Costs</Text>
                    <Text style={[s.expVal, { color: Colors.danger }]}>${sc.fuelCost.toFixed(2)}</Text>
                  </View>
                  <View style={[s.expRow, { borderTopWidth: 1, borderColor: Colors.border, paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[s.expLabel, { color: Colors.text, fontWeight: '700' }]}>Total Costs</Text>
                    <Text style={[s.expVal, { color: Colors.danger, fontSize: 16 }]}>${(sc.totalExpenses + sc.fuelCost).toFixed(2)}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Tips */}
            {sc.avgRatePerMile > 0 && sc.avgRatePerMile < 2.0 && (
              <View style={s.tipBox}>
                <Ionicons name="bulb-outline" size={18} color='#F1C40F' />
                <Text style={s.tipText}>Your rate per mile is below $2.00. Consider negotiating higher rates or targeting shorter, higher-paying loads.</Text>
              </View>
            )}
            {sc.fuelEfficiency > 0 && sc.fuelEfficiency < 5.5 && (
              <View style={s.tipBox}>
                <Ionicons name="bulb-outline" size={18} color='#F1C40F' />
                <Text style={s.tipText}>Fuel efficiency is low. Check tire pressure, reduce idle time, and maintain steady highway speeds.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={s.empty}>
            <Ionicons name="stats-chart-outline" size={64} color={Colors.textMuted} />
            <Text style={s.emptyText}>No data for this week</Text>
            <Text style={s.emptySub}>Log trips, expenses, and fuel to see your scorecard</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
