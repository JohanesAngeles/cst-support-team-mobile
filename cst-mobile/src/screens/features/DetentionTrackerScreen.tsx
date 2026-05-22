import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getDetentionEvents, startDetention, stopDetention, deleteDetentionEvent } from '../../api/features';

interface DetentionEvent {
  _id: string;
  location: string;
  type: 'Shipper' | 'Receiver' | 'Other';
  loadNum: string;
  clockIn: string;
  clockOut?: string;
  freeHours: number;
  ratePerHour: number;
}

const TYPES = ['Shipper', 'Receiver', 'Other'] as const;

const calcPay = (event: DetentionEvent, now?: number): { totalHours: number; detentionHours: number; pay: number } => {
  const inTime = new Date(event.clockIn).getTime();
  const outTime = event.clockOut ? new Date(event.clockOut).getTime() : (now ?? Date.now());
  const totalHours = (outTime - inTime) / 3600000;
  const detentionHours = Math.max(0, totalHours - event.freeHours);
  const pay = detentionHours * event.ratePerHour;
  return { totalHours, detentionHours, pay };
};

const fmtDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function DetentionTrackerScreen() {
  const [events, setEvents] = useState<DetentionEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<DetentionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [clockInModal, setClockInModal] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Clock-in form
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'Shipper' | 'Receiver' | 'Other'>('Shipper');
  const [loadNum, setLoadNum] = useState('');
  const [freeHours, setFreeHours] = useState('2');
  const [rate, setRate] = useState('50');
  const [clocking, setClocking] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDetentionEvents();
      const all: DetentionEvent[] = data.events ?? [];
      setEvents(all);
      setActiveEvent(all.find(e => !e.clockOut) ?? null);
    } catch {
      Alert.alert('Error', 'Could not load detention events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live timer when active
  useEffect(() => {
    if (activeEvent) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeEvent]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleClockIn = async () => {
    if (!location.trim()) { Alert.alert('Error', 'Location is required'); return; }
    setClocking(true);
    try {
      await startDetention({
        location: location.trim(),
        type,
        loadNum: loadNum.trim(),
        freeHours: parseFloat(freeHours) || 2,
        ratePerHour: parseFloat(rate) || 50,
      });
      setClockInModal(false);
      setLocation(''); setLoadNum(''); setFreeHours('2'); setRate('50');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setClocking(false);
    }
  };

  const handleStop = async () => {
    if (!activeEvent) return;
    setStopping(true);
    try {
      await stopDetention(activeEvent._id);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setStopping(false);
    }
  };

  const handleDelete = (event: DetentionEvent) => {
    Alert.alert('Delete Event', `Remove entry for ${event.location}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDetentionEvent(event._id); load(); } },
    ]);
  };

  const activePay = activeEvent ? calcPay(activeEvent, now) : null;
  const completed = events.filter(e => e.clockOut);
  const totalEarned = completed.reduce((sum, e) => sum + calcPay(e).pay, 0);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* Active session */}
        {activeEvent ? (
          <View style={[styles.activeCard, { borderColor: Colors.secondary }]}>
            <View style={styles.activeHeader}>
              <View style={styles.activeDot} />
              <Text style={styles.activeTitle}>Active Session</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{activeEvent.type}</Text>
              </View>
            </View>

            <Text style={styles.activeLocation}>{activeEvent.location}</Text>
            {activeEvent.loadNum ? <Text style={styles.activeLoad}>Load: {activeEvent.loadNum}</Text> : null}

            <View style={styles.timerRow}>
              <View style={styles.timerItem}>
                <Text style={styles.timerLabel}>Total Time</Text>
                <Text style={styles.timerValue}>{fmtDuration(activePay!.totalHours)}</Text>
              </View>
              <View style={styles.timerDivider} />
              <View style={styles.timerItem}>
                <Text style={styles.timerLabel}>Detention Time</Text>
                <Text style={[styles.timerValue, { color: activePay!.detentionHours > 0 ? Colors.secondary : Colors.textMuted }]}>
                  {fmtDuration(Math.max(0, activePay!.detentionHours))}
                </Text>
              </View>
              <View style={styles.timerDivider} />
              <View style={styles.timerItem}>
                <Text style={styles.timerLabel}>Pay Owed</Text>
                <Text style={[styles.timerValue, { color: activePay!.pay > 0 ? Colors.success : Colors.textMuted }]}>
                  ${activePay!.pay.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.freeTimeNote}>
              Free time: {activeEvent.freeHours}h · Rate: ${activeEvent.ratePerHour}/hr · Clocked in: {fmtTime(activeEvent.clockIn)}
            </Text>

            <TouchableOpacity style={styles.stopBtn} onPress={handleStop} disabled={stopping}>
              {stopping ? <ActivityIndicator size="small" color={Colors.white} /> : (
                <>
                  <Ionicons name="stop-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.stopText}>Clock Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.clockInBtn} onPress={() => setClockInModal(true)}>
            <Ionicons name="time-outline" size={24} color={Colors.textDark} />
            <Text style={styles.clockInText}>Clock In at Shipper / Receiver</Text>
          </TouchableOpacity>
        )}

        {/* Summary */}
        {completed.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="receipt-outline" size={20} color={Colors.secondary} />
              <Text style={styles.summaryValue}>{completed.length}</Text>
              <Text style={styles.summaryLabel}>Events</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={20} color={Colors.success} />
              <Text style={[styles.summaryValue, { color: Colors.success }]}>${totalEarned.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Earned</Text>
            </View>
          </View>
        )}

        {/* History */}
        {completed.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>History</Text>
            {completed.map((event) => {
              const { totalHours, detentionHours, pay } = calcPay(event);
              return (
                <TouchableOpacity key={event._id} style={styles.historyRow} onLongPress={() => handleDelete(event)}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyLocation}>{event.location}</Text>
                      <View style={styles.historyTypeBadge}>
                        <Text style={styles.historyTypeText}>{event.type}</Text>
                      </View>
                    </View>
                    {event.loadNum ? <Text style={styles.historyLoad}>Load: {event.loadNum}</Text> : null}
                    <Text style={styles.historyTime}>
                      {fmtDate(event.clockIn)} · {fmtTime(event.clockIn)} → {event.clockOut ? fmtTime(event.clockOut) : '—'}
                    </Text>
                    <Text style={styles.historyDuration}>
                      Total: {fmtDuration(totalHours)} · Detention: {fmtDuration(Math.max(0, detentionHours))}
                    </Text>
                  </View>
                  <View style={styles.historyPay}>
                    <Text style={[styles.historyPayAmt, { color: pay > 0 ? Colors.success : Colors.textMuted }]}>
                      ${pay.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.longPressHint}>Long-press to delete</Text>
          </View>
        )}

        {!activeEvent && completed.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No detention events yet</Text>
            <Text style={styles.emptyText}>Clock in when you arrive at a shipper or receiver to start tracking detention time.</Text>
          </View>
        )}
      </ScrollView>

      {/* Clock In Modal */}
      <Modal visible={clockInModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Clock In</Text>

            <Text style={styles.modalLabel}>Location *</Text>
            <TextInput
              style={styles.modalInput} value={location} onChangeText={setLocation}
              placeholder="Company name or address" placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Load # (optional)</Text>
            <TextInput
              style={styles.modalInput} value={loadNum} onChangeText={setLoadNum}
              placeholder="Load or PO number" placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Free Hours</Text>
                <TextInput
                  style={styles.modalInput} value={freeHours} onChangeText={setFreeHours}
                  keyboardType="decimal-pad" placeholder="2" placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Rate ($/hr)</Text>
                <TextInput
                  style={styles.modalInput} value={rate} onChangeText={setRate}
                  keyboardType="decimal-pad" placeholder="50" placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setClockInModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, clocking && { opacity: 0.6 }]} onPress={handleClockIn} disabled={clocking}>
                {clocking ? <ActivityIndicator size="small" color={Colors.textDark} /> : (
                  <>
                    <Ionicons name="time-outline" size={16} color={Colors.textDark} />
                    <Text style={styles.saveText}>Clock In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  activeCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 2, padding: 16, gap: 10,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  activeTitle: { color: Colors.white, fontSize: 14, fontWeight: '800', flex: 1 },
  typeBadge: {
    backgroundColor: Colors.secondary + '22', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.secondary,
  },
  typeBadgeText: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
  activeLocation: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  activeLoad: { color: Colors.textMuted, fontSize: 13 },
  timerRow: { flexDirection: 'row', backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14 },
  timerItem: { flex: 1, alignItems: 'center', gap: 4 },
  timerDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 4 },
  timerLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  timerValue: { color: Colors.white, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  freeTimeNote: { color: Colors.textMuted, fontSize: 11 },
  stopBtn: {
    backgroundColor: Colors.danger, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, marginTop: 4,
  },
  stopText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  clockInBtn: {
    backgroundColor: Colors.secondary, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, height: 60,
  },
  clockInText: { color: Colors.textDark, fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, alignItems: 'center', gap: 4,
  },
  summaryValue: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: Colors.textMuted, fontSize: 11 },
  historyCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  historyTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  historyLeft: { flex: 1, gap: 3 },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyLocation: { color: Colors.white, fontSize: 14, fontWeight: '700', flex: 1 },
  historyTypeBadge: { backgroundColor: Colors.surfaceLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  historyTypeText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  historyLoad: { color: Colors.textMuted, fontSize: 11 },
  historyTime: { color: Colors.textMuted, fontSize: 11 },
  historyDuration: { color: Colors.textMuted, fontSize: 11 },
  historyPay: { marginLeft: 12, alignItems: 'flex-end' },
  historyPayAmt: { fontSize: 16, fontWeight: '900' },
  longPressHint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 10 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10 },
  modalInput: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, color: Colors.white, fontSize: 15, marginTop: 4,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  typeChipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  typeChipTextActive: { color: Colors.textDark },
  twoCol: { flexDirection: 'row', gap: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  saveBtn: {
    flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  saveText: { color: Colors.textDark, fontWeight: '800' },
});
