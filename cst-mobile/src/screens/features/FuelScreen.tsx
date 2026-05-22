import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getTruckProfile, updateTruckProfile } from '../../api/features';

interface TruckProfile {
  currentMileage: number;
  mpg: number;
  cheapestFuelPrice: number;
  idleHours: number;
  fuelCardConnected: boolean;
}

export default function FuelScreen() {
  const [profile, setProfile] = useState<TruckProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [mpg, setMpg] = useState('');
  const [price, setPrice] = useState('');
  const [idle, setIdle] = useState('');
  const [mileage, setMileage] = useState('');
  const [cardConnected, setCardConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getTruckProfile();
      setProfile(p);
    } catch {
      Alert.alert('Error', 'Failed to load truck profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => {
    if (profile) {
      setMpg(profile.mpg ? profile.mpg.toString() : '');
      setPrice(profile.cheapestFuelPrice ? profile.cheapestFuelPrice.toString() : '');
      setIdle(profile.idleHours ? profile.idleHours.toString() : '');
      setMileage(profile.currentMileage ? profile.currentMileage.toString() : '');
      setCardConnected(profile.fuelCardConnected);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const p = await updateTruckProfile({
        mpg: parseFloat(mpg) || 0,
        cheapestFuelPrice: parseFloat(price) || 0,
        idleHours: parseFloat(idle) || 0,
        currentMileage: parseFloat(mileage) || 0,
        fuelCardConnected: cardConnected,
      });
      setProfile(p);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );

  const hasData = profile && (profile.mpg > 0 || profile.currentMileage > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fuel Management</Text>
        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Ionicons name="pencil-outline" size={18} color={Colors.textDark} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!hasData ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No fuel data yet</Text>
            <Text style={styles.emptySubText}>Tap the edit button to enter your truck stats</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openEdit}>
              <Text style={styles.emptyBtnText}>Set Up Truck Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.bigCard}>
              <Text style={styles.bigLabel}>MPG This Month</Text>
              <Text style={styles.bigValue}>{profile.mpg > 0 ? profile.mpg.toFixed(1) : '—'}</Text>
              {profile.currentMileage > 0 && (
                <Text style={styles.mileageText}>{profile.currentMileage.toLocaleString()} miles on odometer</Text>
              )}
            </View>

            <View style={styles.row}>
              {[
                { label: 'Cheapest Fuel', value: profile.cheapestFuelPrice > 0 ? `$${profile.cheapestFuelPrice.toFixed(2)}/gal` : '—', icon: 'pricetag-outline', color: Colors.success },
                { label: 'Idle Time', value: profile.idleHours > 0 ? `${profile.idleHours.toFixed(1)} hrs` : '—', icon: 'time-outline', color: '#E67E22' },
              ].map((item) => (
                <View key={item.label} style={styles.halfCard}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                  <Text style={styles.halfValue}>{item.value}</Text>
                  <Text style={styles.halfLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.fuelCardStatus}>
              <Ionicons name="card-outline" size={22} color={profile.fuelCardConnected ? Colors.success : Colors.textMuted} />
              <Text style={styles.fuelCardText}>Fuel Card Sync</Text>
              <Text style={[styles.statusText, { color: profile.fuelCardConnected ? Colors.success : Colors.textMuted }]}>
                {profile.fuelCardConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Truck Stats</Text>
            {[
              { label: 'Current Mileage (odometer)', val: mileage, set: setMileage, ph: 'e.g. 187450' },
              { label: 'MPG This Month', val: mpg, set: setMpg, ph: 'e.g. 7.2' },
              { label: 'Cheapest Fuel Price ($/gal)', val: price, set: setPrice, ph: 'e.g. 3.29' },
              { label: 'Idle Hours This Month', val: idle, set: setIdle, ph: 'e.g. 3.4' },
            ].map(({ label, val, set, ph }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput style={styles.modalInput} value={val} onChangeText={set} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
              </View>
            ))}
            <View style={styles.switchRow}>
              <Text style={styles.modalLabel}>Fuel Card Connected</Text>
              <Switch value={cardConnected} onValueChange={setCardConnected} trackColor={{ true: Colors.success }} />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Save</Text>}
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
  editBtn: { backgroundColor: Colors.secondary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 240 },
  emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
  bigCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  bigLabel: { color: Colors.textMuted, fontSize: 13 },
  bigValue: { color: Colors.secondary, fontSize: 64, fontWeight: '900', lineHeight: 72 },
  mileageText: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
  halfValue: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  halfLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
  fuelCardStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 18, gap: 12, borderWidth: 1, borderColor: Colors.border },
  fuelCardText: { color: Colors.white, fontSize: 15, flex: 1 },
  statusText: { fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.white, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: Colors.textDark, fontWeight: '800' },
});
