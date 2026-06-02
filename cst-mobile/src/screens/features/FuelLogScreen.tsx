import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { getFuelStops, addFuelStop, updateFuelStop, deleteFuelStop, uploadReceipt } from '../../api/features';

interface FuelStop {
  _id: string;
  date: string;
  location: string;
  state: string;
  gallons: number;
  pricePerGallon: number;
  odometer: number;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function FuelLogScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    header: { marginBottom: 8 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: 'center', gap: 4 },
    summaryValue: { fontSize: 15, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flex: 1, gap: 4 },
    cardLocation: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    stateBadge: { backgroundColor: Colors.secondary + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.secondary },
    stateText: { color: Colors.secondary, fontSize: 11, fontWeight: '900' },
    metaText: { color: Colors.textMuted, fontSize: 12 },
    metaDot: { color: Colors.textMuted, fontSize: 12 },
    cardRight: { alignItems: 'flex-end', gap: 2 },
    totalCost: { color: Colors.danger, fontSize: 18, fontWeight: '900' },
    gallonsText: { color: Colors.text, fontSize: 12, fontWeight: '600' },
    priceText: { color: Colors.textMuted, fontSize: 12 },
    cardNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginTop: 4 },
    previewBox: { backgroundColor: Colors.secondary + '22', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
    previewText: { color: Colors.secondary, fontSize: 16, fontWeight: '800' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [stops, setStops] = useState<FuelStop[]>([]);
  const [totalGallons, setTotalGallons] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [avgPrice, setAvgPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<FuelStop | null>(null);

  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState('');
  const [state, setState] = useState('');
  const [gallons, setGallons] = useState('');
  const [price, setPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getFuelStops();
      setStops(data.stops ?? []);
      setTotalGallons(data.totalGallons ?? 0);
      setTotalSpent(data.totalSpent ?? 0);
      setAvgPrice(data.avgPrice ?? 0);
    } catch { Alert.alert('Error', 'Could not load fuel log'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to attach receipts'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.length) setReceiptUri(result.assets[0].uri);
  };

  const openModal = () => {
    setEditTarget(null);
    setDate(todayStr()); setLocation(''); setState('');
    setGallons(''); setPrice(''); setOdometer(''); setNotes(''); setReceiptUri(null);
    setModal(true);
  };

  const openEdit = (stop: FuelStop) => {
    setEditTarget(stop);
    setDate(stop.date); setLocation(stop.location); setState(stop.state);
    setGallons(String(stop.gallons)); setPrice(String(stop.pricePerGallon));
    setOdometer(stop.odometer > 0 ? String(stop.odometer) : '');
    setNotes(stop.notes ?? ''); setReceiptUri(null);
    setModal(true);
  };

  const handleSave = async () => {
    if (!location.trim() || !state.trim() || !gallons || !price) {
      Alert.alert('Error', 'Location, state, gallons, and price are required'); return;
    }
    let receiptUrl: string | undefined;
    if (receiptUri) {
      setUploadingReceipt(true);
      try {
        const ext = receiptUri.split('.').pop() ?? 'jpg';
        const res = await uploadReceipt({ uri: receiptUri, type: `image/${ext}`, name: `receipt.${ext}` });
        receiptUrl = res.url;
      } finally { setUploadingReceipt(false); }
    }
    const payload = {
      date, location: location.trim(), state: state.trim().toUpperCase(),
      gallons: parseFloat(gallons), pricePerGallon: parseFloat(price),
      odometer: parseFloat(odometer) || 0, notes, receiptUrl,
    };
    setSaving(true);
    try {
      if (editTarget) {
        await updateFuelStop(editTarget._id, payload);
      } else {
        await addFuelStop(payload);
      }
      setModal(false);
      load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (stop: FuelStop) => {
    Alert.alert('Delete Entry', `Remove stop at ${stop.location}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFuelStop(stop._id); load(); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={stops}
        keyExtractor={s => s._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.summaryRow}>
              {[
                { label: 'Total Gallons', value: totalGallons.toFixed(1), icon: 'water-outline', color: '#3498DB' },
                { label: 'Total Spent', value: totalSpent > 0 ? `$${totalSpent.toFixed(2)}` : '—', icon: 'cash-outline', color: Colors.danger },
                { label: 'Avg Price', value: avgPrice > 0 ? `$${avgPrice.toFixed(3)}` : '—', icon: 'trending-down-outline', color: Colors.secondary },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={styles.summaryCard}>
                  <Ionicons name={icon as any} size={18} color={color} />
                  <Text style={[styles.summaryValue, { color }]}>{value}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="water-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No fuel stops logged</Text>
            <Text style={styles.emptySub}>Tap + to log a fuel stop</Text>
          </View>
        }
        renderItem={({ item }) => {
          const total = item.gallons * item.pricePerGallon;
          return (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)} activeOpacity={0.8}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardLocation}>{item.location}</Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.stateBadge}><Text style={styles.stateText}>{item.state}</Text></View>
                    <Text style={styles.metaText}>{fmtDate(item.date)}</Text>
                    {item.odometer > 0 && <><Text style={styles.metaDot}>·</Text><Text style={styles.metaText}>{item.odometer.toLocaleString()} mi</Text></>}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.totalCost}>${total.toFixed(2)}</Text>
                  <Text style={styles.gallonsText}>{item.gallons.toFixed(3)} gal</Text>
                  <Text style={styles.priceText}>${item.pricePerGallon.toFixed(3)}/gal</Text>
                </View>
              </View>
              {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Fuel Stop' : 'Log Fuel Stop'}</Text>

              {[
                { label: 'Date', value: date, set: setDate, placeholder: 'YYYY-MM-DD' },
                { label: 'Location (Truck Stop / City) *', value: location, set: setLocation, placeholder: 'Pilot, TA, Loves...' },
                { label: 'State (2-letter) *', value: state, set: setState, placeholder: 'TX' },
                { label: 'Gallons *', value: gallons, set: setGallons, placeholder: '0.000', keyboard: 'decimal-pad' as const },
                { label: 'Price per Gallon ($) *', value: price, set: setPrice, placeholder: '0.000', keyboard: 'decimal-pad' as const },
                { label: 'Odometer (optional)', value: odometer, set: setOdometer, placeholder: '0', keyboard: 'decimal-pad' as const },
                { label: 'Notes', value: notes, set: setNotes, placeholder: 'Optional' },
              ].map(({ label, value, set, placeholder, keyboard }) => (
                <View key={label}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <TextInput
                    style={styles.modalInput} value={value} onChangeText={set}
                    placeholder={placeholder} placeholderTextColor={Colors.textMuted}
                    keyboardType={keyboard ?? 'default'}
                    autoCapitalize={label.includes('State') ? 'characters' : 'none'}
                  />
                </View>
              ))}

              {gallons && price && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>
                    Total: ${(parseFloat(gallons) * parseFloat(price)).toFixed(2)}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={pickReceipt}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}
              >
                <Ionicons name={receiptUri ? 'checkmark-circle' : 'camera-outline'} size={20} color={receiptUri ? Colors.success : Colors.secondary} />
                <Text style={{ color: receiptUri ? Colors.success : Colors.secondary, fontSize: 13, fontWeight: '700' }}>
                  {receiptUri ? 'Receipt photo selected' : 'Attach Pump Receipt Photo'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, (saving || uploadingReceipt) && { opacity: 0.6 }]} onPress={handleSave} disabled={saving || uploadingReceipt}>
                  {(saving || uploadingReceipt) ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>{editTarget ? 'Update' : 'Save'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
