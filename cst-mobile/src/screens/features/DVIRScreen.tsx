import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Switch, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { getDVIREntries, addDVIREntry, deleteDVIREntry, uploadReceipt } from '../../api/features';

const DEFAULT_ITEMS = [
  'Air Brakes / Brake System', 'Coupling Devices', 'Exhaust System', 'Fuel System',
  'Heater / Defroster', 'Horn', 'Lights — Head / Tail / Turn', 'Mirrors',
  'Parking Brake', 'Rearview Mirror', 'Safety Equipment (flares, fire ext., reflectors)',
  'Steering Mechanism', 'Tires', 'Wheels & Rims', 'Windshield Wipers',
  'Engine / Coolant', 'Oil Pressure', 'Transmission', 'Fifth Wheel',
  'Trailer Brakes', 'Trailer Lights', 'Trailer Tires & Wheels',
];

interface CheckItem { label: string; pass: boolean; notes: string; photoUri?: string }
interface DVIREntry {
  _id: string; type: string; date: string; odometer?: number;
  items: { label: string; pass: boolean; notes?: string }[];
  defectsFound: boolean; driverSignature: string; remarks?: string; createdAt: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DVIRScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    infoCard: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: Colors.secondary + '18', borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: Colors.secondary + '44',
    },
    infoText: { flex: 1, color: Colors.secondary, fontSize: 12, lineHeight: 17 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14,
    },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    entryCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8,
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadgeText: { fontSize: 11, fontWeight: '700' },
    entryDate: { color: Colors.textMuted, fontSize: 12 },
    entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    defectBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    defectText: { fontSize: 12, fontWeight: '700' },
    entryMuted: { color: Colors.textMuted, fontSize: 12 },
    signatureText: { color: Colors.textMuted, fontSize: 11 },
    longPressHint: { color: Colors.border, fontSize: 10, textAlign: 'right' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    typeBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    typeBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
    typeBtnTextActive: { color: Colors.textDark },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 4 },
    modalSectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginTop: 14, marginBottom: 6 },
    modalInput: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1,
      borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14,
    },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
    checkLabel: { flex: 1, color: Colors.text, fontSize: 13 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [entries, setEntries] = useState<DVIREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tripType, setTripType] = useState<'pre-trip' | 'post-trip'>('pre-trip');
  const [odometer, setOdometer] = useState('');
  const [signature, setSignature] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<CheckItem[]>(DEFAULT_ITEMS.map(l => ({ label: l, pass: true, notes: '' })));

  const load = useCallback(async () => {
    try {
      const data = await getDVIREntries();
      setEntries(data.entries ?? []);
    } catch {
      Alert.alert('Error', 'Could not load DVIR entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setTripType('pre-trip');
    setOdometer('');
    setSignature('');
    setRemarks('');
    setItems(DEFAULT_ITEMS.map(l => ({ label: l, pass: true, notes: '' })));
    setModal(true);
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, pass: !it.pass, photoUri: it.pass ? it.photoUri : undefined } : it));
  };

  const pickDefectPhoto = async (idx: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera to document defects'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, photoUri: uri } : it));
    }
  };

  const handleSave = async () => {
    if (!signature.trim()) { Alert.alert('Error', 'Driver signature is required'); return; }
    setSaving(true);
    try {
      // Upload any defect photos before saving
      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          if (!item.pass && item.photoUri) {
            try {
              const ext = item.photoUri.split('.').pop() ?? 'jpg';
              const res = await uploadReceipt({ uri: item.photoUri, type: `image/${ext}`, name: `defect.${ext}` });
              return { label: item.label, pass: item.pass, notes: item.notes || undefined, photoUrl: res.url };
            } catch { /* non-fatal — save without photo */ }
          }
          return { label: item.label, pass: item.pass, notes: item.notes || undefined };
        })
      );
      await addDVIREntry({
        type: tripType, date: todayStr(),
        odometer: odometer ? parseFloat(odometer) : undefined,
        items: uploadedItems,
        driverSignature: signature.trim(), remarks: remarks || undefined,
      });
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: DVIREntry) => {
    Alert.alert('Delete DVIR', 'Remove this inspection report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDVIREntry(entry._id); load(); } },
    ]);
  };

  const defectCount = items.filter(i => !i.pass).length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
          <Text style={styles.infoText}>FMCSA requires a DVIR before and after each trip. Defects must be repaired before operating.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={styles.addBtnText}>New Inspection Report</Text>
        </TouchableOpacity>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No DVIR reports yet</Text>
          </View>
        ) : (
          entries.map(entry => (
            <TouchableOpacity key={entry._id} style={styles.entryCard} onLongPress={() => handleDelete(entry)}>
              <View style={styles.entryHeader}>
                <View style={[styles.typeBadge, { backgroundColor: entry.type === 'pre-trip' ? '#2ECC71' + '22' : '#3498DB' + '22' }]}>
                  <Text style={[styles.typeBadgeText, { color: entry.type === 'pre-trip' ? '#2ECC71' : '#3498DB' }]}>
                    {entry.type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'}
                  </Text>
                </View>
                <Text style={styles.entryDate}>{fmtDate(entry.createdAt)}</Text>
              </View>
              <View style={styles.entryRow}>
                <View style={[styles.defectBadge, { backgroundColor: entry.defectsFound ? Colors.danger + '22' : Colors.success + '22' }]}>
                  <Ionicons name={entry.defectsFound ? 'warning-outline' : 'checkmark-circle-outline'} size={14} color={entry.defectsFound ? Colors.danger : Colors.success} />
                  <Text style={[styles.defectText, { color: entry.defectsFound ? Colors.danger : Colors.success }]}>
                    {entry.defectsFound ? 'Defects Found' : 'No Defects'}
                  </Text>
                </View>
                {entry.odometer ? <Text style={styles.entryMuted}>{entry.odometer.toLocaleString()} mi</Text> : null}
              </View>
              <Text style={styles.signatureText}>Signed: {entry.driverSignature}</Text>
              <Text style={styles.longPressHint}>Long-press to delete</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inspection Report</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Type toggle */}
              <View style={styles.typeRow}>
                {(['pre-trip', 'post-trip'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, tripType === t && styles.typeBtnActive]} onPress={() => setTripType(t)}>
                    <Text style={[styles.typeBtnText, tripType === t && styles.typeBtnTextActive]}>
                      {t === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Odometer (optional)</Text>
              <TextInput style={styles.modalInput} value={odometer} onChangeText={setOdometer} keyboardType="numeric" placeholder="Miles" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.modalSectionTitle}>Inspection Checklist ({defectCount} defect{defectCount !== 1 ? 's' : ''})</Text>
              {items.map((item, idx) => (
                <View key={item.label} style={styles.checkRow}>
                  <Switch
                    value={item.pass}
                    onValueChange={() => toggleItem(idx)}
                    trackColor={{ false: Colors.danger, true: Colors.success }}
                    thumbColor={Colors.white}
                  />
                  <Text style={[styles.checkLabel, !item.pass && { color: Colors.danger }]}>{item.label}</Text>
                  {!item.pass && (
                    <TouchableOpacity onPress={() => pickDefectPhoto(idx)} style={{ padding: 4 }}>
                      <Ionicons
                        name={item.photoUri ? 'checkmark-circle' : 'camera-outline'}
                        size={20}
                        color={item.photoUri ? Colors.success : Colors.danger}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Text style={styles.modalLabel}>Remarks (optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]} value={remarks} onChangeText={setRemarks}
                multiline placeholder="Any additional notes..." placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.modalLabel}>Driver Signature (type full name) *</Text>
              <TextInput style={styles.modalInput} value={signature} onChangeText={setSignature} placeholder="Full name" placeholderTextColor={Colors.textMuted} />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Submit Report</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
