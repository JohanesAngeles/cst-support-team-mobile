import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getParkingReservations, addParkingReservation, updateParkingReservation, deleteParkingReservation } from '../../api/features';

const STATUS_COLORS: Record<string, string> = { upcoming: '#F39C12', used: '#27AE60', cancelled: '#CC0000' };

interface Reservation {
  _id: string; location: string; date: string; confirmationNumber: string;
  arrivalWindow?: string; notes?: string; status: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function ParkingTrackerScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    sectionTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    emptyHint: { color: Colors.border, fontSize: 12, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr());
  const [confNum, setConfNum] = useState('');
  const [arrival, setArrival] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getParkingReservations();
      setReservations(data.reservations ?? []);
    } catch {
      Alert.alert('Error', 'Could not load reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditId(null); setLocation(''); setDate(todayStr());
    setConfNum(''); setArrival(''); setNotes('');
    setModal(true);
  };

  const openEdit = (r: Reservation) => {
    setEditId(r._id); setLocation(r.location); setDate(r.date);
    setConfNum(r.confirmationNumber); setArrival(r.arrivalWindow ?? ''); setNotes(r.notes ?? '');
    setModal(true);
  };

  const handleSave = async () => {
    if (!location.trim() || !confNum.trim()) { Alert.alert('Error', 'Location and confirmation number are required'); return; }
    setSaving(true);
    try {
      const payload = { location: location.trim(), date, confirmationNumber: confNum.trim(), arrivalWindow: arrival || undefined, notes: notes || undefined };
      if (editId) await updateParkingReservation(editId, payload);
      else await addParkingReservation(payload);
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (r: Reservation) => {
    const next = r.status === 'upcoming' ? 'used' : r.status === 'used' ? 'cancelled' : 'upcoming';
    try { await updateParkingReservation(r._id, { status: next }); load(); }
    catch { Alert.alert('Error', 'Could not update status'); }
  };

  const handleDelete = (r: Reservation) => {
    Alert.alert('Delete', 'Remove this reservation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteParkingReservation(r._id); load(); } },
    ]);
  };

  const upcoming = reservations.filter(r => r.status === 'upcoming');
  const past = reservations.filter(r => r.status !== 'upcoming');


  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={styles.addBtnText}>Add Reservation</Text>
        </TouchableOpacity>

        {reservations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No parking reservations</Text>
            <Text style={styles.emptyHint}>Log your Pilot, Love's, or TA reservations here</Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming ({upcoming.length})</Text>
                {upcoming.map(r => <ReservationCard key={r._id} r={r} onEdit={openEdit} onDelete={handleDelete} onStatus={cycleStatus} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Past</Text>
                {past.map(r => <ReservationCard key={r._id} r={r} onEdit={openEdit} onDelete={handleDelete} onStatus={cycleStatus} />)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Reservation' : 'New Reservation'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Location *</Text>
            <TextInput style={styles.modalInput} value={location} onChangeText={setLocation} placeholder="Pilot #789, Love's Exit 42..." placeholderTextColor={Colors.textMuted} />
            <Text style={styles.modalLabel}>Date *</Text>
            <TextInput style={styles.modalInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.modalLabel}>Confirmation Number *</Text>
            <TextInput style={styles.modalInput} value={confNum} onChangeText={setConfNum} placeholder="e.g. PLT-123456" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.modalLabel}>Arrival Window (optional)</Text>
            <TextInput style={styles.modalInput} value={arrival} onChangeText={setArrival} placeholder="e.g. 8 PM – 10 PM" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline placeholder="Spot number, special instructions..." placeholderTextColor={Colors.textMuted} />
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

function ReservationCard({ r, onEdit, onDelete, onStatus }: { r: Reservation; onEdit: (r: Reservation) => void; onDelete: (r: Reservation) => void; onStatus: (r: Reservation) => void }) {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    location: { color: Colors.text, fontWeight: '800', fontSize: 14, flex: 1 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '700' },
    date: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
    confRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    confNum: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    arrival: { color: Colors.textMuted, fontSize: 12 },
    notes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, paddingVertical: 7, borderWidth: 1, borderColor: Colors.secondary + '44' },
    actionText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
  }), [Colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.location}>{r.location}</Text>
        <TouchableOpacity style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[r.status] + '22' }]} onPress={() => onStatus(r)}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[r.status] }]}>{r.status.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.date}>{fmtDate(r.date)}</Text>
      <View style={styles.confRow}>
        <Ionicons name="barcode-outline" size={14} color={Colors.secondary} />
        <Text style={styles.confNum}>{r.confirmationNumber}</Text>
      </View>
      {r.arrivalWindow ? <Text style={styles.arrival}>Arrival: {r.arrivalWindow}</Text> : null}
      {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(r)}>
          <Ionicons name="pencil-outline" size={14} color={Colors.secondary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.danger + '44' }]} onPress={() => onDelete(r)}>
          <Ionicons name="trash-outline" size={14} color={Colors.danger} />
          <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

