import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useColors } from '../../constants/colors';
import { getHOSEntries, getELDEntries } from '../../api/features';

const DRIVE_LIMIT  = 11;   // hours
const DUTY_LIMIT   = 14;   // hours
const BREAK_AFTER  = 8;    // must take 30-min break after 8h driving
const CYCLE_70     = 70;   // 70-hour / 8-day cycle
const CYCLE_60     = 60;   // 60-hour / 7-day cycle

const fmtHMS = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtHM = (hours: number): string => {
  if (hours <= 0) return '0h 0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const urgencyColor = (remainSec: number, limitSec: number) => {
  const pct = remainSec / limitSec;
  if (pct <= 0) return '#CC0000';
  if (pct <= 0.15) return '#E74C3C';
  if (pct <= 0.30) return '#E67E22';
  return '#27AE60';
};

export default function HOSCountdownScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { padding: 20, paddingBottom: 40, gap: 16 },
    timerCard: {
      backgroundColor: Colors.surface, borderRadius: 20,
      borderWidth: 2, padding: 24, alignItems: 'center', gap: 8,
    },
    timerLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    timerValue: { fontSize: 64, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] as any },
    timerSub: { color: Colors.textMuted, fontSize: 13 },
    sessionRow: { flexDirection: 'row', gap: 10 },
    sessionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 12, paddingVertical: 14,
    },
    sessionBtnText: { fontWeight: '900', fontSize: 15 },
    limitsCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    limitsTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    limitLabel: { color: Colors.textMuted, fontSize: 13, flex: 1 },
    limitRight: { alignItems: 'flex-end', gap: 3 },
    limitValue: { fontSize: 13, fontWeight: '800' },
    limitBar: { width: 80, height: 5, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    limitFill: { height: '100%', borderRadius: 3 },
    warningCard: {
      borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1,
    },
    warningText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    cycleCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10,
    },
    cycleTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    cycleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cycleLabel: { color: Colors.textMuted, fontSize: 13 },
    cycleValue: { fontSize: 13, fontWeight: '800' },
    cycleBarWrap: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    cycleFill: { height: '100%', borderRadius: 3 },
  }), [Colors]);

  const [todayDriving,   setTodayDriving]   = useState(0);   // hours already logged today
  const [todayOnDuty,    setTodayOnDuty]    = useState(0);
  const [cycleUsed70,    setCycleUsed70]    = useState(0);   // last 8 days on-duty
  const [cycleUsed60,    setCycleUsed60]    = useState(0);   // last 7 days on-duty
  const [sessionSec,     setSessionSec]     = useState(0);   // current live session seconds
  const [sessionActive,  setSessionActive]  = useState(false);
  const [sessionStart,   setSessionStart]   = useState<Date | null>(null);
  const [loading,        setLoading]        = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch today's logged HOS + 8-day cycle total
  const load = useCallback(async () => {
    try {
      const data = await getHOSEntries();
      const entries: { date: string; drivingHours: number; onDutyHours: number }[] = data.entries ?? [];
      const todayStr = new Date().toISOString().split('T')[0];

      const today = entries.find(e => e.date === todayStr);
      setTodayDriving(today?.drivingHours ?? 0);
      setTodayOnDuty(today?.onDutyHours ?? 0);

      // 8-day rolling cycle (70h rule)
      const cutoff8 = new Date(); cutoff8.setDate(cutoff8.getDate() - 8);
      const cutoff7 = new Date(); cutoff7.setDate(cutoff7.getDate() - 7);
      const c70 = entries
        .filter(e => new Date(e.date + 'T12:00:00') >= cutoff8)
        .reduce((s, e) => s + e.onDutyHours, 0);
      const c60 = entries
        .filter(e => new Date(e.date + 'T12:00:00') >= cutoff7)
        .reduce((s, e) => s + e.onDutyHours, 0);
      setCycleUsed70(c70);
      setCycleUsed60(c60);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Tick session timer
  useEffect(() => {
    if (sessionActive) {
      intervalRef.current = setInterval(() => setSessionSec(s => s + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionActive]);

  // Alert thresholds
  useEffect(() => {
    const sessionHours = sessionSec / 3600;
    const totalDriving = todayDriving + sessionHours;
    const remainDrive = DRIVE_LIMIT - totalDriving;

    if (sessionActive) {
      if (Math.abs(remainDrive - 1.0) < 1 / 3600) {
        Notifications.scheduleNotificationAsync({
          content: { title: '⚠️ 1 Hour of Drive Time Left', body: 'Plan your rest stop now.' },
          trigger: null,
        });
      }
      if (Math.abs(remainDrive - 0.5) < 1 / 3600) {
        Notifications.scheduleNotificationAsync({
          content: { title: '🚨 30 Minutes of Drive Time Left', body: 'Find a safe place to stop immediately.' },
          trigger: null,
        });
      }
    }
  }, [sessionSec, sessionActive, todayDriving]);

  const sessionHours   = sessionSec / 3600;
  const totalDriving   = todayDriving + sessionHours;
  const totalOnDuty    = todayOnDuty + sessionHours;
  const remainDriveSec = Math.max(0, Math.round((DRIVE_LIMIT - totalDriving) * 3600));
  const remainDutySec  = Math.max(0, Math.round((DUTY_LIMIT - totalOnDuty) * 3600));
  const effectiveRemain = Math.min(remainDriveSec, remainDutySec);

  const driveColor = urgencyColor(remainDriveSec, DRIVE_LIMIT * 3600);
  const dutyColor  = urgencyColor(remainDutySec,  DUTY_LIMIT  * 3600);

  const startSession = () => {
    if (totalDriving >= DRIVE_LIMIT) {
      Alert.alert('Drive Limit Reached', 'You have used your 11-hour driving allowance for today.');
      return;
    }
    setSessionStart(new Date());
    setSessionSec(0);
    setSessionActive(true);
  };

  const stopSession = () => {
    setSessionActive(false);
    Alert.alert(
      'Session Ended',
      `You drove ${fmtHM(sessionSec / 3600)} this session.\n\nLog this in HOS Tracker to save it.`,
      [{ text: 'OK' }]
    );
  };

  const warnings: { msg: string; color: string }[] = [];
  if (totalDriving >= DRIVE_LIMIT)
    warnings.push({ msg: '🚨 11-hour driving limit reached. Stop driving.', color: Colors.danger });
  else if (remainDriveSec <= 3600)
    warnings.push({ msg: `⚠️ ${fmtHM(remainDriveSec / 3600)} of drive time remaining.`, color: '#E67E22' });
  if (totalDriving >= BREAK_AFTER && totalDriving < DRIVE_LIMIT)
    warnings.push({ msg: '⏸ After 8 hours of driving you must take a 30-minute break (49 CFR §395.3).', color: '#F39C12' });
  if (totalOnDuty >= DUTY_LIMIT)
    warnings.push({ msg: '🚨 14-hour on-duty window reached.', color: Colors.danger });

  if (loading) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Big countdown */}
        <View style={[styles.timerCard, { borderColor: driveColor + '66' }]}>
          <Text style={styles.timerLabel}>Drive Time Remaining</Text>
          <Text style={[styles.timerValue, { color: driveColor }]}>{fmtHMS(effectiveRemain)}</Text>
          <Text style={styles.timerSub}>
            {sessionActive
              ? `Session: ${fmtHMS(sessionSec)} · Total today: ${fmtHM(totalDriving)}`
              : `Today logged: ${fmtHM(todayDriving)} · Tap Start to begin session`}
          </Text>
        </View>

        {/* Start / Stop */}
        <View style={styles.sessionRow}>
          {!sessionActive ? (
            <TouchableOpacity
              style={[styles.sessionBtn, { backgroundColor: '#27AE60', flex: 1 }]}
              onPress={startSession}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={[styles.sessionBtnText, { color: '#FFFFFF' }]}>Start Driving Session</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.sessionBtn, { backgroundColor: Colors.danger }]}
                onPress={stopSession}
              >
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={[styles.sessionBtnText, { color: '#FFFFFF' }]}>Stop Session</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Warnings */}
        {warnings.map((w, i) => (
          <View key={i} style={[styles.warningCard, { backgroundColor: w.color + '18', borderColor: w.color + '44' }]}>
            <Text style={[styles.warningText, { color: w.color }]}>{w.msg}</Text>
          </View>
        ))}

        {/* Limits breakdown */}
        <View style={styles.limitsCard}>
          <Text style={styles.limitsTitle}>Today's Limits (FMCSA Property Carrier)</Text>

          {[
            { label: '11-Hour Drive Limit',   used: totalDriving, limit: DRIVE_LIMIT, color: driveColor },
            { label: '14-Hour On-Duty Window', used: totalOnDuty,  limit: DUTY_LIMIT,  color: dutyColor  },
          ].map(row => {
            const pct = Math.min(1, row.used / row.limit);
            return (
              <View key={row.label} style={styles.limitRow}>
                <Text style={styles.limitLabel}>{row.label}</Text>
                <View style={styles.limitRight}>
                  <Text style={[styles.limitValue, { color: row.color }]}>
                    {fmtHM(row.used)} / {row.limit}h
                  </Text>
                  <View style={styles.limitBar}>
                    <View style={[styles.limitFill, { width: `${pct * 100}%`, backgroundColor: row.color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* 70-hr / 60-hr cycle */}
        <View style={styles.cycleCard}>
          <Text style={styles.cycleTitle}>Rolling Cycle Usage</Text>
          {[
            { label: '70-hr / 8-day Cycle', used: cycleUsed70, limit: CYCLE_70 },
            { label: '60-hr / 7-day Cycle', used: cycleUsed60, limit: CYCLE_60 },
          ].map(row => {
            const pct = Math.min(1, row.used / row.limit);
            const remaining = Math.max(0, row.limit - row.used);
            const c = urgencyColor(remaining * 3600, row.limit * 3600);
            return (
              <View key={row.label} style={{ gap: 6 }}>
                <View style={styles.cycleRow}>
                  <Text style={styles.cycleLabel}>{row.label}</Text>
                  <Text style={[styles.cycleValue, { color: c }]}>{fmtHM(remaining)} left</Text>
                </View>
                <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
                  {fmtHM(row.used)} used of {row.limit}h
                </Text>
                <View style={styles.cycleBarWrap}>
                  <View style={[styles.cycleFill, { width: `${pct * 100}%`, backgroundColor: c }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            ⚠️ This timer is for reference only. Log your hours in the HOS Tracker to save them. Always comply with all FMCSA Hours of Service regulations (49 CFR Part 395).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
