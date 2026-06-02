import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getELDEntries, startELDStatus, closeELDStatus, syncELDtoHOS, deleteELDEntry } from '../../api/features';

type ELDStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty';

interface ELDEntry {
  _id: string;
  status: ELDStatus;
  startTime: string;
  endTime?: string;
  location?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<ELDStatus, { label: string; color: string; icon: string; desc: string }> = {
  off_duty:      { label: 'Off Duty',           color: '#95A5A6', icon: 'bed-outline',       desc: 'Not working or driving' },
  sleeper_berth: { label: 'Sleeper Berth',       color: '#3498DB', icon: 'moon-outline',      desc: 'Resting in sleeper cab' },
  driving:       { label: 'Driving',             color: '#2ECC71', icon: 'car-outline',        desc: 'Operating the vehicle' },
  on_duty:       { label: 'On Duty (Not Driving)', color: '#E67E22', icon: 'briefcase-outline', desc: 'Fueling, loading, paperwork' },
};

const STATUS_ORDER: ELDStatus[] = ['off_duty', 'sleeper_berth', 'driving', 'on_duty'];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function calcDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function calcTotals(entries: ELDEntry[]) {
  let drivingMs = 0, onDutyMs = 0, sleeperMs = 0, offMs = 0;
  const now = Date.now();
  for (const e of entries) {
    const start = new Date(e.startTime).getTime();
    const end = e.endTime ? new Date(e.endTime).getTime() : now;
    const ms = Math.max(0, end - start);
    if (e.status === 'driving') drivingMs += ms;
    else if (e.status === 'on_duty') onDutyMs += ms;
    else if (e.status === 'sleeper_berth') sleeperMs += ms;
    else offMs += ms;
  }
  const toH = (ms: number) => (ms / 3600000).toFixed(1);
  return {
    driving: toH(drivingMs),
    onDuty: toH(onDutyMs + drivingMs),
    sleeper: toH(sleeperMs),
    off: toH(offMs),
  };
}

export default function ELDStatusScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    scroll: { padding: 16, paddingBottom: 40 },
    currentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 2, padding: 16, gap: 12, marginBottom: 24 },
    statusDot: { width: 14, height: 14, borderRadius: 7 },
    currentLabel: { fontSize: 17, fontWeight: '800' },
    currentDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    timerBadge: { backgroundColor: Colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    timerText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
    noStatusText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
    sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statusBtn: { width: '47%', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 2, padding: 16, alignItems: 'center', gap: 8, position: 'relative' },
    statusBtnLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
    activePip: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
    totalsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    totalBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
    totalVal: { fontSize: 16, fontWeight: '900' },
    totalLbl: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    limitsBox: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8, marginBottom: 20 },
    limitsTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
    limitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    limitLabel: { color: Colors.textMuted, fontSize: 13 },
    limitVal: { fontSize: 13, fontWeight: '700' },
    limitOk: { color: '#2ECC71' },
    limitWarn: { color: Colors.danger },
    timelineEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 8 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineStatus: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    timelineTime: { color: Colors.textMuted, fontSize: 12 },
    timelineMeta: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
    livePip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71', marginTop: 4 },
    syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.secondary, borderRadius: 14, padding: 15, marginTop: 24 },
    syncText: { color: Colors.textDark, fontWeight: '800', fontSize: 14 },
    hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
    overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    inputLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginTop: 4 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    confirmBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
    confirmText: { color: '#fff', fontWeight: '800' },
  }), [Colors]);
  const [entries, setEntries] = useState<ELDEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ELDStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ELDStatus | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getELDEntries();
      setEntries(data.entries ?? []);
      const open = (data.entries ?? []).find((e: ELDEntry) => !e.endTime);
      setCurrentStatus(open?.status ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    timerRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]));

  const openStatusPicker = (status: ELDStatus) => {
    if (status === currentStatus) return;
    setPendingStatus(status);
    setLocation('');
    setNotes('');
    setShowModal(true);
  };

  const confirmStatus = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    try {
      await startELDStatus({ status: pendingStatus, location: location.trim() || undefined, notes: notes.trim() || undefined });
      setShowModal(false);
      load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await syncELDtoHOS();
      Alert.alert('Synced to HOS', `Driving: ${data.drivingHours}h\nOn-Duty: ${data.onDutyHours}h\n\nHOS Tracker updated for today.`);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSyncing(false); }
  };

  const handleDelete = (entry: ELDEntry) => {
    Alert.alert('Delete Entry', 'Remove this status entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteELDEntry(entry._id); load(); } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  const totals = calcTotals(entries);
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null;


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Current Status Display */}
        <View style={[s.currentCard, cfg && { borderColor: cfg.color }]}>
          {cfg ? (
            <>
              <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.currentLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={s.currentDesc}>{cfg.desc}</Text>
              </View>
              <View style={s.timerBadge}>
                {entries.find(e => !e.endTime) && (
                  <Text style={s.timerText}>{calcDuration(entries.find(e => !e.endTime)!.startTime)}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={[s.statusDot, { backgroundColor: Colors.textMuted }]} />
              <Text style={s.noStatusText}>No active status — tap a button below</Text>
            </>
          )}
        </View>

        {/* Status Buttons */}
        <Text style={s.sectionTitle}>Change Status</Text>
        <View style={s.statusGrid}>
          {STATUS_ORDER.map(st => {
            const c = STATUS_CONFIG[st];
            const isActive = currentStatus === st;
            return (
              <TouchableOpacity
                key={st}
                style={[s.statusBtn, { borderColor: c.color }, isActive && { backgroundColor: c.color + '33' }]}
                onPress={() => openStatusPicker(st)}
                activeOpacity={0.8}
              >
                <Ionicons name={c.icon as any} size={28} color={c.color} />
                <Text style={[s.statusBtnLabel, { color: c.color }]}>{c.label}</Text>
                {isActive && <View style={[s.activePip, { backgroundColor: c.color }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Today's Totals */}
        {entries.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Today's Hours</Text>
            <View style={s.totalsRow}>
              {[
                { label: 'Driving', value: totals.driving, color: '#2ECC71' },
                { label: 'On-Duty', value: totals.onDuty, color: '#E67E22' },
                { label: 'Sleeper', value: totals.sleeper, color: '#3498DB' },
                { label: 'Off Duty', value: totals.off, color: '#95A5A6' },
              ].map(t => (
                <View key={t.label} style={s.totalBox}>
                  <Text style={[s.totalVal, { color: t.color }]}>{t.value}h</Text>
                  <Text style={s.totalLbl}>{t.label}</Text>
                </View>
              ))}
            </View>

            {/* HOS Limits */}
            <View style={s.limitsBox}>
              <Text style={s.limitsTitle}>HOS Limits</Text>
              <View style={s.limitRow}>
                <Text style={s.limitLabel}>Driving (11h limit)</Text>
                <Text style={[s.limitVal, parseFloat(totals.driving) >= 10 ? s.limitWarn : s.limitOk]}>{totals.driving}h / 11h</Text>
              </View>
              <View style={s.limitRow}>
                <Text style={s.limitLabel}>On-Duty (14h window)</Text>
                <Text style={[s.limitVal, parseFloat(totals.onDuty) >= 13 ? s.limitWarn : s.limitOk]}>{totals.onDuty}h / 14h</Text>
              </View>
            </View>
          </>
        )}

        {/* Timeline */}
        {entries.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Today's Timeline</Text>
            {[...entries].reverse().map((entry) => {
              const c = STATUS_CONFIG[entry.status];
              return (
                <TouchableOpacity key={entry._id} style={s.timelineEntry} onLongPress={() => handleDelete(entry)} activeOpacity={0.8}>
                  <View style={[s.timelineDot, { backgroundColor: c.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.timelineStatus, { color: c.color }]}>{c.label}</Text>
                    <Text style={s.timelineTime}>
                      {fmtTime(entry.startTime)} → {entry.endTime ? fmtTime(entry.endTime) : 'Now'}
                      {' · '}{calcDuration(entry.startTime, entry.endTime)}
                    </Text>
                    {entry.location ? <Text style={s.timelineMeta}>{entry.location}</Text> : null}
                    {entry.notes ? <Text style={s.timelineMeta}>{entry.notes}</Text> : null}
                  </View>
                  {!entry.endTime && <View style={s.livePip} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Sync Button */}
        <TouchableOpacity style={[s.syncBtn, syncing && { opacity: 0.6 }]} onPress={handleSync} disabled={syncing}>
          {syncing ? <ActivityIndicator size="small" color={Colors.white} /> : (
            <>
              <Ionicons name="sync-outline" size={18} color={Colors.white} />
              <Text style={s.syncText}>Sync Today to HOS Tracker</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.hint}>Long-press a timeline entry to delete it</Text>
      </ScrollView>

      {/* Status Change Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            {pendingStatus && (
              <>
                <Text style={[s.modalTitle, { color: STATUS_CONFIG[pendingStatus].color }]}>
                  → {STATUS_CONFIG[pendingStatus].label}
                </Text>
                <Text style={s.inputLabel}>Location (optional)</Text>
                <TextInput style={s.modalInput} value={location} onChangeText={setLocation} placeholder="Truck stop, city..." placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
                <Text style={s.inputLabel}>Notes (optional)</Text>
                <TextInput style={s.modalInput} value={notes} onChangeText={setNotes} placeholder="Any notes..." placeholderTextColor={Colors.textMuted} autoCapitalize="sentences" />
                <View style={s.modalBtns}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.confirmBtn, { backgroundColor: STATUS_CONFIG[pendingStatus].color }, saving && { opacity: 0.6 }]} onPress={confirmStatus} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.confirmText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
