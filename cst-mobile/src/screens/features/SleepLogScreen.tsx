import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getSleepLogs, addSleepLog, deleteSleepLog } from '../../api/features';

const QUALITY_LABELS = ['', 'Poor', 'Fair', 'OK', 'Good', 'Great'];
const QUALITY_COLORS = ['', '#CC0000', '#E67E22', '#F39C12', '#27AE60', '#2ECC71'];

interface SleepLog {
  _id: string; date: string; sleepStart: string; sleepEnd: string;
  sleepHours: number; quality: number; location?: string; notes?: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

export default function SleepLogScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4 },
    statNum: { fontSize: 24, fontWeight: '900', color: Colors.text },
    statLabel: { color: Colors.textMuted, fontSize: 11 },
    infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.secondary + '18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.secondary + '44' },
    infoText: { flex: 1, color: Colors.secondary, fontSize: 12, lineHeight: 17 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    logCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logDate: { color: Colors.text, fontWeight: '700', fontSize: 14 },
    qualityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    qualityText: { fontSize: 11, fontWeight: '700' },
    logStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logHours: { fontSize: 30, fontWeight: '900' },
    logTime: { color: Colors.textMuted, fontSize: 13 },
    fmcsaBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    fmcsaText: { fontSize: 10, fontWeight: '700' },
    logLocation: { color: Colors.textMuted, fontSize: 12 },
    logNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    hint: { color: Colors.border, fontSize: 10, textAlign: 'right' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    timeRow: { flexDirection: 'row', gap: 10 },
    durationBox: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, borderWidth: 1, alignItems: 'center', marginTop: 6 },
    durationLabel: { color: Colors.textMuted, fontSize: 11 },
    durationValue: { fontSize: 28, fontWeight: '900' },
    durationStatus: { fontSize: 11, fontWeight: '600' },
    qualityRow: { flexDirection: 'row', gap: 6 },
    qualityBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    qualityBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(todayStr());
  const [sleepStart, setSleepStart] = useState('22:00');
  const [sleepEnd, setSleepEnd] = useState('08:00');
  const [quality, setQuality] = useState(3);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getSleepLogs();
      setLogs(data.logs ?? []);
    } catch {
      Alert.alert('Error', 'Could not load sleep logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sleepHours = calcHours(sleepStart, sleepEnd);
  const avgHours = logs.length > 0 ? logs.slice(0, 7).reduce((s, l) => s + l.sleepHours, 0) / Math.min(logs.length, 7) : 0;

  const handleSave = async () => {
    if (!sleepStart || !sleepEnd) { Alert.alert('Error', 'Sleep start and end times are required'); return; }
    if (sleepHours < 1) { Alert.alert('Error', 'Sleep duration seems too short — check times'); return; }
    setSaving(true);
    try {
      await addSleepLog({ date, sleepStart, sleepEnd, sleepHours, quality, location: location || undefined, notes: notes || undefined });
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (l: SleepLog) => {
    Alert.alert('Delete', 'Remove this sleep record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSleepLog(l._id); load(); } },
    ]);
  };

  const fmcsaStatus = sleepHours >= 10 ? 'COMPLIANT' : 'SHORT';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        {/* Stats */}
        {logs.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: avgHours >= 10 ? Colors.success : Colors.danger }]}>{avgHours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>7-Day Avg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{logs[0]?.sleepHours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Last Rest</Text>
            </View>
            <View style={[styles.statBox, { borderColor: avgHours >= 10 ? Colors.success + '44' : Colors.danger + '44' }]}>
              <Ionicons name={avgHours >= 10 ? 'checkmark-circle-outline' : 'warning-outline'} size={24} color={avgHours >= 10 ? Colors.success : Colors.danger} />
              <Text style={[styles.statLabel, { color: avgHours >= 10 ? Colors.success : Colors.danger }]}>
                {avgHours >= 10 ? 'On Track' : 'Fatigue Risk'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="moon-outline" size={16} color={Colors.secondary} />
          <Text style={styles.infoText}>FMCSA requires at least 10 consecutive hours off-duty before driving. Chronic fatigue is a leading cause of trucking accidents.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => { setDate(todayStr()); setSleepStart('22:00'); setSleepEnd('08:00'); setQuality(3); setLocation(''); setNotes(''); setModal(true); }}>
          <Ionicons name="moon-outline" size={18} color={Colors.textDark} />
          <Text style={styles.addBtnText}>Log Rest Period</Text>
        </TouchableOpacity>

        {logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bed-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No sleep logs yet</Text>
          </View>
        ) : (
          logs.map(l => (
            <TouchableOpacity key={l._id} style={styles.logCard} onLongPress={() => handleDelete(l)}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{fmtDate(l.date)}</Text>
                <View style={[styles.qualityBadge, { backgroundColor: QUALITY_COLORS[l.quality] + '22' }]}>
                  <Text style={[styles.qualityText, { color: QUALITY_COLORS[l.quality] }]}>{QUALITY_LABELS[l.quality]}</Text>
                </View>
              </View>
              <View style={styles.logStats}>
                <Text style={[styles.logHours, { color: l.sleepHours >= 10 ? Colors.success : Colors.danger }]}>
                  {l.sleepHours.toFixed(1)}h
                </Text>
                <Text style={styles.logTime}>{l.sleepStart} – {l.sleepEnd}</Text>
                <View style={[styles.fmcsaBadge, { backgroundColor: l.sleepHours >= 10 ? Colors.success + '22' : Colors.danger + '22' }]}>
                  <Text style={[styles.fmcsaText, { color: l.sleepHours >= 10 ? Colors.success : Colors.danger }]}>
                    {l.sleepHours >= 10 ? '✓ 10-HR RULE' : '⚠ SHORT'}
                  </Text>
                </View>
              </View>
              {l.location ? <Text style={styles.logLocation}><Ionicons name="location-outline" size={12} /> {l.location}</Text> : null}
              {l.notes ? <Text style={styles.logNotes}>{l.notes}</Text> : null}
              <Text style={styles.hint}>Long-press to delete</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Rest Period</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Date</Text>
            <TextInput style={styles.modalInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Sleep Start (24h)</Text>
                <TextInput style={styles.modalInput} value={sleepStart} onChangeText={setSleepStart} placeholder="22:00" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Sleep End (24h)</Text>
                <TextInput style={styles.modalInput} value={sleepEnd} onChangeText={setSleepEnd} placeholder="08:00" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            <View style={[styles.durationBox, { borderColor: sleepHours >= 10 ? Colors.success + '44' : Colors.danger + '44' }]}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={[styles.durationValue, { color: sleepHours >= 10 ? Colors.success : Colors.danger }]}>{sleepHours.toFixed(1)} hours</Text>
              <Text style={[styles.durationStatus, { color: sleepHours >= 10 ? Colors.success : Colors.danger }]}>
                {sleepHours >= 10 ? '✓ Meets 10-hr FMCSA requirement' : '⚠ Below 10-hr FMCSA requirement'}
              </Text>
            </View>

            <Text style={styles.modalLabel}>Sleep Quality</Text>
            <View style={styles.qualityRow}>
              {[1, 2, 3, 4, 5].map(q => (
                <TouchableOpacity key={q} style={[styles.qualityBtn, quality === q && { backgroundColor: QUALITY_COLORS[q], borderColor: QUALITY_COLORS[q] }]} onPress={() => setQuality(q)}>
                  <Text style={[styles.qualityBtnText, quality === q && { color: Colors.text }]}>{QUALITY_LABELS[q]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Location (optional)</Text>
            <TextInput style={styles.modalInput} value={location} onChangeText={setLocation} placeholder="Truck stop, rest area..." placeholderTextColor={Colors.textMuted} />

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline placeholder="Noise, comfort, interruptions..." placeholderTextColor={Colors.textMuted} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
