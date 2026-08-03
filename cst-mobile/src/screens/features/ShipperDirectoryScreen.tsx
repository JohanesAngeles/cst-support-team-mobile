import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getShippers, addShipper, updateShipper, toggleShipperFavorite, deleteShipper } from '../../api/features';

const TYPE_COLORS: Record<string, string> = { shipper: '#3498DB', receiver: '#2ECC71', both: '#C8D2DC' };

interface Shipper {
  _id: string; name: string; type: string; address: string; city: string; state: string;
  phone?: string; contact?: string; hours?: string; appointmentRequired: boolean;
  dockInfo?: string; notes?: string; isFavorite: boolean;
}

export default function ShipperDirectoryScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
    searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
    filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 4 },
    filterBtn: { flex: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    filterText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    content: { paddingHorizontal: 12, paddingBottom: 40, gap: 10 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 13 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 14 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    emptyHint: { color: Colors.border, fontSize: 12, textAlign: 'center' },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    shipperName: { color: Colors.text, fontWeight: '800', fontSize: 14, flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    typeBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    typeText: { fontSize: 10, fontWeight: '700' },
    location: { color: Colors.textMuted, fontSize: 12 },
    apptBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    apptText: { color: Colors.danger, fontSize: 10, fontWeight: '600' },
    address: { color: Colors.textMuted, fontSize: 12 },
    detail: { color: Colors.textMuted, fontSize: 12, gap: 4 },
    notes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: 6, marginTop: 6 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, paddingVertical: 7, borderWidth: 1, borderColor: Colors.secondary + '44' },
    actionText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 3 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    rowInputs: { flexDirection: 'row', gap: 8 },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    typeBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    checkLabel: { color: Colors.text, fontSize: 13 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<'shipper' | 'receiver' | 'both'>('shipper');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [hours, setHours] = useState('');
  const [apptRequired, setApptRequired] = useState(false);
  const [dockInfo, setDockInfo] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async (t = typeFilter) => {
    try {
      const data = await getShippers(t || undefined);
      setShippers(data.shippers ?? []);
    } catch {
      Alert.alert('Error', 'Could not load directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setEditId(null); setName(''); setType('shipper'); setAddress('');
    setCity(''); setState(''); setPhone(''); setContact('');
    setHours(''); setApptRequired(false); setDockInfo(''); setNotes('');
  };

  const openEdit = (s: Shipper) => {
    setEditId(s._id); setName(s.name); setType(s.type as any);
    setAddress(s.address); setCity(s.city); setState(s.state);
    setPhone(s.phone ?? ''); setContact(s.contact ?? '');
    setHours(s.hours ?? ''); setApptRequired(s.appointmentRequired);
    setDockInfo(s.dockInfo ?? ''); setNotes(s.notes ?? '');
    setModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Error', 'Name, address, city, and state are required'); return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), type, address: address.trim(), city: city.trim(), state: state.trim(), phone: phone || undefined, contact: contact || undefined, hours: hours || undefined, appointmentRequired: apptRequired, dockInfo: dockInfo || undefined, notes: notes || undefined };
      if (editId) await updateShipper(editId, payload);
      else await addShipper(payload);
      setModal(false);
      resetForm();
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFavorite = async (id: string) => {
    try { await toggleShipperFavorite(id); load(); } catch { Alert.alert('Error', 'Could not update favorite'); }
  };

  const handleDelete = (s: Shipper) => {
    Alert.alert('Delete', `Remove ${s.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteShipper(s._id); load(); } },
    ]);
  };

  const filtered = shippers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) || s.state.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search name, city, state..." placeholderTextColor={Colors.textMuted} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close" size={18} color={Colors.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['', 'shipper', 'receiver', 'both'] as const).map(t => (
          <TouchableOpacity
            key={t || 'all'}
            style={[styles.filterBtn, typeFilter === t && { backgroundColor: t ? TYPE_COLORS[t] : Colors.secondary, borderColor: t ? TYPE_COLORS[t] : Colors.secondary }]}
            onPress={() => { setTypeFilter(t); load(t); }}
          >
            <Text style={[styles.filterText, typeFilter === t && { color: Colors.text }]}>
              {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModal(true); }}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.textDark} />
          <Text style={styles.addBtnText}>Add Shipper / Receiver</Text>
        </TouchableOpacity>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptyHint}>Build your personal directory of shippers and receivers</Text>
          </View>
        ) : (
          filtered.map(s => (
            <View key={s._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.shipperName}>{s.name}</Text>
                    <TouchableOpacity onPress={() => handleFavorite(s._id)}>
                      <Ionicons name={s.isFavorite ? 'star' : 'star-outline'} size={18} color={s.isFavorite ? Colors.secondary : Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[s.type] + '22' }]}>
                      <Text style={[styles.typeText, { color: TYPE_COLORS[s.type] }]}>{s.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.location}>{s.city}, {s.state}</Text>
                    {s.appointmentRequired && (
                      <View style={styles.apptBadge}>
                        <Ionicons name="calendar-outline" size={11} color={Colors.danger} />
                        <Text style={styles.apptText}>Appt Required</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.address}>{s.address}</Text>
              {s.hours ? <Text style={styles.detail}><Ionicons name="time-outline" size={12} /> {s.hours}</Text> : null}
              {s.contact ? <Text style={styles.detail}><Ionicons name="person-outline" size={12} /> {s.contact}</Text> : null}
              {s.dockInfo ? <Text style={styles.detail}><Ionicons name="information-circle-outline" size={12} /> {s.dockInfo}</Text> : null}
              {s.notes ? <Text style={styles.notes}>{s.notes}</Text> : null}
              <View style={styles.actions}>
                {s.phone ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${s.phone}`)}>
                    <Ionicons name="call-outline" size={14} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(s)}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.secondary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.danger + '44' }]} onPress={() => handleDelete(s)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Entry' : 'New Shipper / Receiver'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['shipper', 'receiver', 'both'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, type === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]} onPress={() => setType(t)}>
                    <Text style={[styles.typeBtnText, type === t && { color: Colors.text }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.modalLabel}>Company Name *</Text>
              <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Company name" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.modalLabel}>Address *</Text>
              <TextInput style={styles.modalInput} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={Colors.textMuted} />
              <View style={styles.rowInputs}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.modalLabel}>City *</Text>
                  <TextInput style={styles.modalInput} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>State *</Text>
                  <TextInput style={styles.modalInput} value={state} onChangeText={setState} placeholder="TX" placeholderTextColor={Colors.textMuted} maxLength={2} autoCapitalize="characters" />
                </View>
              </View>
              <Text style={styles.modalLabel}>Phone (optional)</Text>
              <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
              <Text style={styles.modalLabel}>Contact Person (optional)</Text>
              <TextInput style={styles.modalInput} value={contact} onChangeText={setContact} placeholder="Gate guard, dock supervisor..." placeholderTextColor={Colors.textMuted} />
              <Text style={styles.modalLabel}>Hours of Operation (optional)</Text>
              <TextInput style={styles.modalInput} value={hours} onChangeText={setHours} placeholder="Mon–Fri 6AM–4PM" placeholderTextColor={Colors.textMuted} />
              <TouchableOpacity style={styles.checkRow} onPress={() => setApptRequired(!apptRequired)}>
                <View style={[styles.checkbox, apptRequired && styles.checkboxActive]}>
                  {apptRequired && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <Text style={styles.checkLabel}>Appointment Required</Text>
              </TouchableOpacity>
              <Text style={styles.modalLabel}>Dock Info (optional)</Text>
              <TextInput style={styles.modalInput} value={dockInfo} onChangeText={setDockInfo} placeholder="Dock #3, back entrance..." placeholderTextColor={Colors.textMuted} />
              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput style={[styles.modalInput, { height: 70 }]} value={notes} onChangeText={setNotes} multiline placeholder="Parking, tips, special instructions..." placeholderTextColor={Colors.textMuted} />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
