import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getHOSEntries } from '../../api/features';

const STORAGE_KEY = '@rrn_hos_alerts';

interface AlertSettings {
  enabled: boolean;
  warnAt8h: boolean;
  warnAt10h: boolean;
  warnAt11h: boolean;
  cycleWarnAt80pct: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true, warnAt8h: true, warnAt10h: true, warnAt11h: true, cycleWarnAt80pct: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function HOSAlertsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    masterCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: Colors.secondary + '44',
    },
    masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    masterTitle: { color: Colors.text, fontWeight: '800', fontSize: 16 },
    masterSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 4 },
    cardTitle: { color: Colors.text, fontWeight: '800', fontSize: 14, marginBottom: 2 },
    cardSub: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
    alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
    alertDot: { width: 10, height: 10, borderRadius: 5 },
    alertInfo: { flex: 1 },
    alertLabel: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    alertSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
    checkBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 15,
    },
    checkBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    lastCheckCard: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      backgroundColor: Colors.secondary + '18', borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: Colors.secondary + '33',
    },
    lastCheckText: { flex: 1, color: Colors.secondary, fontSize: 12 },
    infoCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 6 },
    infoTitle: { color: Colors.text, fontWeight: '700', fontSize: 13 },
    infoText: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  }), [Colors]);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setSettings(JSON.parse(val));
      setLoading(false);
    });
  }, []));

  const save = async (updated: AlertSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggle = (key: keyof AlertSettings) => {
    save({ ...settings, [key]: !settings[key] });
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const checkAndAlert = async () => {
    if (!settings.enabled) { Alert.alert('Alerts Off', 'Enable HOS alerts first'); return; }
    setChecking(true);
    try {
      const granted = await requestPermission();
      if (!granted) { Alert.alert('Permission Required', 'Enable notifications in your device settings to receive HOS alerts.'); return; }

      const data = await getHOSEntries();
      const todayStr = new Date().toISOString().split('T')[0];
      const todayEntry = (data.entries ?? []).find((e: any) => e.date === todayStr);

      if (!todayEntry) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'HOS Reminder', body: "You haven't logged today's hours yet. Stay compliant!", sound: true },
          trigger: null,
        });
        setLastCheck('No HOS log today — reminder sent');
        return;
      }

      const { drivingHours, onDutyHours } = todayEntry;
      const alerts: string[] = [];

      if (settings.warnAt11h && drivingHours >= 11) {
        alerts.push('🚨 11-Hour driving limit reached — you must stop driving');
      } else if (settings.warnAt10h && drivingHours >= 10) {
        alerts.push('⚠️ 10 hours driven — 1 hour remaining before limit');
      } else if (settings.warnAt8h && drivingHours >= 8) {
        alerts.push('⚠️ 8 hours driven — 30-min break required, 3 hours remaining');
      }

      if (onDutyHours >= 14) {
        alerts.push('🚨 14-Hour on-duty window reached — must go off-duty');
      }

      if (alerts.length > 0) {
        for (const body of alerts) {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'HOS Limit Alert', body, sound: true },
            trigger: null,
          });
        }
        setLastCheck(`${alerts.length} alert(s) sent — ${drivingHours}h driving / ${onDutyHours}h on-duty`);
      } else {
        setLastCheck(`All good — ${drivingHours}h driving / ${onDutyHours}h on-duty logged today`);
        Alert.alert('HOS Status OK', `You have ${(11 - drivingHours).toFixed(1)} driving hours and ${(14 - onDutyHours).toFixed(1)} on-duty hours remaining today.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Master toggle */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <Ionicons name="notifications-outline" size={24} color={settings.enabled ? Colors.secondary : Colors.textMuted} />
            <View>
              <Text style={styles.masterTitle}>HOS Push Alerts</Text>
              <Text style={styles.masterSub}>{settings.enabled ? 'Active — alerts enabled' : 'Disabled'}</Text>
            </View>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={() => toggle('enabled')}
            trackColor={{ false: Colors.border, true: Colors.secondary }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Alert thresholds */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driving Hour Alerts</Text>
          <Text style={styles.cardSub}>Get notified as you approach your 11-hour driving limit</Text>

          {[
            { key: 'warnAt8h' as keyof AlertSettings, label: 'Alert at 8 hours', sub: '30-min break required + 3 hours remaining', color: Colors.secondary },
            { key: 'warnAt10h' as keyof AlertSettings, label: 'Alert at 10 hours', sub: 'Only 1 hour of driving left', color: '#E67E22' },
            { key: 'warnAt11h' as keyof AlertSettings, label: 'Alert at 11 hours', sub: 'LIMIT REACHED — stop driving immediately', color: Colors.danger },
          ].map(({ key, label, sub, color }) => (
            <View key={key} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: color }]} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertLabel}>{label}</Text>
                <Text style={styles.alertSub}>{sub}</Text>
              </View>
              <Switch
                value={settings[key] as boolean}
                onValueChange={() => toggle(key)}
                disabled={!settings.enabled}
                trackColor={{ false: Colors.border, true: color }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cycle Alerts</Text>
          {[
            { key: 'cycleWarnAt80pct' as keyof AlertSettings, label: 'Alert at 80% of cycle used', sub: '56h of 70-hr cycle (or 48h of 60-hr) used', color: '#E67E22' },
          ].map(({ key, label, sub, color }) => (
            <View key={key} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: color }]} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertLabel}>{label}</Text>
                <Text style={styles.alertSub}>{sub}</Text>
              </View>
              <Switch
                value={settings[key] as boolean}
                onValueChange={() => toggle(key)}
                disabled={!settings.enabled}
                trackColor={{ false: Colors.border, true: color }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>

        {/* Manual check */}
        <TouchableOpacity
          style={[styles.checkBtn, checking && { opacity: 0.6 }]}
          onPress={checkAndAlert}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator size="small" color={Colors.textDark} />
            : <><Ionicons name="pulse-outline" size={18} color={Colors.textDark} /><Text style={styles.checkBtnText}>Check HOS Status Now</Text></>
          }
        </TouchableOpacity>

        {lastCheck && (
          <View style={styles.lastCheckCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
            <Text style={styles.lastCheckText}>{lastCheck}</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Alerts Work</Text>
          <Text style={styles.infoText}>
            Tap "Check HOS Status Now" after logging your hours in the HOS Tracker. CST reads your most recent log entry and sends push notifications based on your alert settings above.
            {'\n\n'}
            For best results, log your hours in the HOS Tracker at the end of each shift, then check your status here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
