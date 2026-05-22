import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getIFTA, addIFTAEntry, deleteIFTAEntry } from '../../api/features';

interface IFTAData {
  quarter: number;
  year: number;
  entries: { _id: string; state: string; miles: number; gallons: number; taxAmount: number }[];
  totalMiles: number;
  totalGallons: number;
  totalTax: number;
}

export default function IFTAScreen() {
  const [data, setData] = useState<IFTAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [state, setState] = useState('');
  const [miles, setMiles] = useState('');
  const [gallons, setGallons] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getIFTA();
      setData(d);
    } catch {
      Alert.alert('Error', 'Failed to load IFTA data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!state) { Alert.alert('Error', 'State is required'); return; }
    setSaving(true);
    try {
      await addIFTAEntry({ state, miles: parseFloat(miles) || 0, gallons: parseFloat(gallons) || 0, taxAmount: parseFloat(taxAmount) || 0 });
      setState(''); setMiles(''); setGallons(''); setTaxAmount('');
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this IFTA entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteIFTAEntry(id); await load(); } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const fmtTax = (n: number) => `$${n.toFixed(2)}`;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );

  const quarter = data?.quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);
  const year = data?.year ?? new Date().getFullYear();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IFTA Tracking</Text>
        <View style={styles.headerRight}>
          <Text style={styles.quarter}>Q{quarter} {year}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryRow}>
          {[
            ['Total Miles', (data?.totalMiles ?? 0).toLocaleString()],
            ['Total Gallons', (data?.totalGallons ?? 0).toLocaleString()],
            ['Total Tax', fmtTax(data?.totalTax ?? 0)],
          ].map(([label, val]) => (
            <View key={label} style={styles.summaryCard}>
              <Text style={styles.summaryVal}>{val}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>State-by-State Breakdown</Text>

        {(!data?.entries.length) ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No IFTA entries for this quarter</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.emptyBtnText}>Add First Entry</Text>
            </TouchableOpacity>
          </View>
        ) : data.entries.map((e) => (
          <TouchableOpacity key={e._id} style={styles.stateRow} onLongPress={() => handleDelete(e._id)}>
            <View style={styles.stateDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stateName}>{e.state}</Text>
              <Text style={styles.stateDetail}>{e.miles.toLocaleString()} mi · {e.gallons.toLocaleString()} gal</Text>
            </View>
            <Text style={styles.stateTax}>{fmtTax(e.taxAmount)}</Text>
          </TouchableOpacity>
        ))}

        {!!data?.entries.length && (
          <Text style={styles.hint}>Long-press a row to delete it</Text>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add IFTA Entry</Text>
            {[
              { label: 'State *', val: state, set: setState, ph: 'e.g. Texas' },
              { label: 'Miles', val: miles, set: setMiles, ph: '0', kb: 'numeric' as const },
              { label: 'Gallons', val: gallons, set: setGallons, ph: '0', kb: 'numeric' as const },
              { label: 'Tax Amount ($)', val: taxAmount, set: setTaxAmount, ph: '0.00', kb: 'numeric' as const },
            ].map(({ label, val, set, ph, kb }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput style={styles.modalInput} value={val} onChangeText={set} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType={kb ?? 'default'} />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Add</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quarter: { color: Colors.secondary, fontSize: 14, fontWeight: '700' },
  addBtn: { backgroundColor: Colors.secondary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  summaryVal: { color: Colors.secondary, fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  stateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  stateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.secondary },
  stateName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  stateDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  stateTax: { color: Colors.success, fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
  hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 6 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.white, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: Colors.textDark, fontWeight: '800' },
});
