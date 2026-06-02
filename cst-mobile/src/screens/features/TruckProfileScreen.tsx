import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getTruckProfile, updateTruckProfile } from '../../api/features';

interface TruckProfile {
  nickname: string;
  make: string;
  truckModel: string;
  truckYear: number;
  vin: string;
  plate: string;
  mcNumber: string;
  dotNumber: string;
  insuranceExpiry: string;
  currentMileage: number;
  mpg: number;
  cheapestFuelPrice: number;
  idleHours: number;
  fuelCardConnected: boolean;
}

const EMPTY: TruckProfile = {
  nickname: '', make: '', truckModel: '', truckYear: 0,
  vin: '', plate: '', mcNumber: '', dotNumber: '', insuranceExpiry: '',
  currentMileage: 0, mpg: 0, cheapestFuelPrice: 0, idleHours: 0, fuelCardConnected: false,
};

const isInsuranceExpiringSoon = (expiry: string) => {
  if (!expiry) return false;
  const d = new Date(expiry);
  const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
};

const isInsuranceExpired = (expiry: string) => {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
};

export default function TruckProfileScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 10 },
    heroCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
    heroIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: Colors.secondary + '1A', borderWidth: 1, borderColor: Colors.secondary + '44', justifyContent: 'center', alignItems: 'center' },
    heroInfo: { flex: 1, gap: 2 },
    rigName: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    rigSub: { color: Colors.textMuted, fontSize: 12 },
    editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.secondary + '1A', borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
    alertText: { flex: 1, fontSize: 13, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 2 },
    sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '66' },
    infoLabel: { color: Colors.textMuted, fontSize: 13 },
    infoValue: { color: Colors.text, fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
    infoMono: { fontFamily: 'monospace', letterSpacing: 0.5 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCard: { flex: 1, minWidth: '44%', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center', gap: 3 },
    statValue: { fontSize: 20, fontWeight: '900' },
    statUnit: { color: Colors.textMuted, fontSize: 10 },
    statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    fuelCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.success + '18', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.success + '44' },
    fuelCardText: { color: Colors.success, fontSize: 13, fontWeight: '700' },
    editBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.secondary + '15', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.secondary + '33' },
    editBannerText: { flex: 1, color: Colors.secondary, fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 10 },
    field: { gap: 5 },
    fieldLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    fieldInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    switchLabel: { color: Colors.textMuted, fontSize: 13 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 2, backgroundColor: Colors.secondary, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  }), [Colors]);
  const [profile, setProfile] = useState<TruckProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TruckProfile>(EMPTY);

  const load = useCallback(async () => {
    try {
      const data = await getTruckProfile();
      const p: TruckProfile = { ...EMPTY, ...data };
      setProfile(p);
      setForm(p);
    } catch { Alert.alert('Error', 'Could not load truck profile'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startEdit = () => { setForm({ ...profile }); setEditing(true); };
  const cancelEdit = () => { setForm({ ...profile }); setEditing(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateTruckProfile({
        nickname: form.nickname, make: form.make, truckModel: form.truckModel,
        truckYear: form.truckYear || 0,
        vin: form.vin, plate: form.plate,
        mcNumber: form.mcNumber, dotNumber: form.dotNumber,
        insuranceExpiry: form.insuranceExpiry,
        currentMileage: parseFloat(String(form.currentMileage)) || 0,
        mpg: parseFloat(String(form.mpg)) || 0,
        cheapestFuelPrice: parseFloat(String(form.cheapestFuelPrice)) || 0,
        idleHours: parseFloat(String(form.idleHours)) || 0,
        fuelCardConnected: form.fuelCardConnected,
      });
      const p: TruckProfile = { ...EMPTY, ...data };
      setProfile(p); setForm(p);
      setEditing(false);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const set = (key: keyof TruckProfile) => (val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const rigName = profile.nickname || (profile.make && profile.truckModel
    ? `${profile.truckYear > 0 ? profile.truckYear + ' ' : ''}${profile.make} ${profile.truckModel}`
    : 'My Truck');

  const insuranceColor = isInsuranceExpired(profile.insuranceExpiry)
    ? Colors.danger
    : isInsuranceExpiringSoon(profile.insuranceExpiry)
    ? '#E67E22'
    : Colors.success;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Rig hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="bus-outline" size={36} color={Colors.secondary} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.rigName}>{rigName}</Text>
            {profile.plate ? <Text style={styles.rigSub}>Plate: {profile.plate}</Text> : null}
            {profile.currentMileage > 0 && (
              <Text style={styles.rigSub}>{profile.currentMileage.toLocaleString()} mi on the clock</Text>
            )}
          </View>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
              <Ionicons name="pencil-outline" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Insurance warning */}
        {profile.insuranceExpiry && (isInsuranceExpired(profile.insuranceExpiry) || isInsuranceExpiringSoon(profile.insuranceExpiry)) && (
          <View style={[styles.alertCard, { borderColor: insuranceColor + '66', backgroundColor: insuranceColor + '18' }]}>
            <Ionicons name="alert-circle" size={18} color={insuranceColor} />
            <Text style={[styles.alertText, { color: insuranceColor }]}>
              {isInsuranceExpired(profile.insuranceExpiry)
                ? 'Insurance expired! Update your policy immediately.'
                : 'Insurance expires within 30 days — renew soon.'}
            </Text>
          </View>
        )}

        {editing ? (
          /* ─── EDIT MODE ─── */
          <>
            <SectionHeader title="Rig Identity" icon="bus-outline" />
            <View style={styles.card}>
              <Field label="Nickname" value={form.nickname} onChangeText={set('nickname')} placeholder="Big Red, Old Faithful..." />
              <Row>
                <Field label="Make" value={form.make} onChangeText={set('make')} placeholder="Kenworth" flex />
                <Field label="Model" value={form.truckModel} onChangeText={set('truckModel')} placeholder="T680" flex />
              </Row>
              <Field label="Year" value={form.truckYear > 0 ? String(form.truckYear) : ''} onChangeText={v => set('truckYear')(v)} placeholder="2022" keyboard="number-pad" />
              <Field label="VIN" value={form.vin} onChangeText={set('vin')} placeholder="17-character VIN" autoCapitalize="characters" />
              <Field label="Plate Number" value={form.plate} onChangeText={set('plate')} placeholder="ABC-1234" autoCapitalize="characters" />
            </View>

            <SectionHeader title="Authority & Insurance" icon="shield-checkmark-outline" />
            <View style={styles.card}>
              <Row>
                <Field label="MC Number" value={form.mcNumber} onChangeText={set('mcNumber')} placeholder="123456" keyboard="number-pad" flex />
                <Field label="DOT Number" value={form.dotNumber} onChangeText={set('dotNumber')} placeholder="7654321" keyboard="number-pad" flex />
              </Row>
              <Field label="Insurance Expiry (YYYY-MM-DD)" value={form.insuranceExpiry} onChangeText={set('insuranceExpiry')} placeholder="2026-12-31" />
            </View>

            <SectionHeader title="Performance Stats" icon="speedometer-outline" />
            <View style={styles.card}>
              <Row>
                <Field label="Current Mileage" value={form.currentMileage > 0 ? String(form.currentMileage) : ''} onChangeText={set('currentMileage')} placeholder="500000" keyboard="number-pad" flex />
                <Field label="MPG" value={form.mpg > 0 ? String(form.mpg) : ''} onChangeText={set('mpg')} placeholder="6.5" keyboard="decimal-pad" flex />
              </Row>
              <Row>
                <Field label="Cheapest Fuel ($/gal)" value={form.cheapestFuelPrice > 0 ? String(form.cheapestFuelPrice) : ''} onChangeText={set('cheapestFuelPrice')} placeholder="3.49" keyboard="decimal-pad" flex />
                <Field label="Idle Hours" value={form.idleHours > 0 ? String(form.idleHours) : ''} onChangeText={set('idleHours')} placeholder="0" keyboard="decimal-pad" flex />
              </Row>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Fuel Card Connected</Text>
                <Switch
                  value={form.fuelCardConnected} onValueChange={set('fuelCardConnected')}
                  trackColor={{ false: Colors.border, true: Colors.success }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ─── VIEW MODE ─── */
          <>
            <SectionHeader title="Rig Identity" icon="bus-outline" />
            <View style={styles.card}>
              <InfoRow label="Make / Model" value={profile.make && profile.truckModel ? `${profile.make} ${profile.truckModel}` : '—'} />
              <InfoRow label="Year" value={profile.truckYear > 0 ? String(profile.truckYear) : '—'} />
              <InfoRow label="VIN" value={profile.vin || '—'} mono />
              <InfoRow label="Plate" value={profile.plate || '—'} />
            </View>

            <SectionHeader title="Authority & Insurance" icon="shield-checkmark-outline" />
            <View style={styles.card}>
              <InfoRow label="MC Number" value={profile.mcNumber ? `MC-${profile.mcNumber}` : '—'} />
              <InfoRow label="DOT Number" value={profile.dotNumber ? `DOT-${profile.dotNumber}` : '—'} />
              <InfoRow
                label="Insurance Expiry"
                value={profile.insuranceExpiry || '—'}
                valueColor={profile.insuranceExpiry ? insuranceColor : undefined}
              />
            </View>

            <SectionHeader title="Performance Stats" icon="speedometer-outline" />
            <View style={styles.statsGrid}>
              {[
                { label: 'Mileage', value: profile.currentMileage > 0 ? profile.currentMileage.toLocaleString() : '—', unit: 'mi', icon: 'speedometer-outline', color: '#3498DB' },
                { label: 'MPG', value: profile.mpg > 0 ? String(profile.mpg) : '—', unit: 'mpg', icon: 'leaf-outline', color: Colors.success },
                { label: 'Best Fuel', value: profile.cheapestFuelPrice > 0 ? `$${profile.cheapestFuelPrice.toFixed(3)}` : '—', unit: '/gal', icon: 'water-outline', color: '#1ABC9C' },
                { label: 'Idle Hours', value: profile.idleHours > 0 ? String(profile.idleHours) : '—', unit: 'hrs', icon: 'time-outline', color: '#E67E22' },
              ].map(({ label, value, unit, icon, color }) => (
                <View key={label} style={styles.statCard}>
                  <Ionicons name={icon as any} size={20} color={color} />
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statUnit}>{unit}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {profile.fuelCardConnected && (
              <View style={styles.fuelCardBadge}>
                <Ionicons name="card-outline" size={16} color={Colors.success} />
                <Text style={styles.fuelCardText}>Fuel Card Connected</Text>
              </View>
            )}

            <TouchableOpacity style={styles.editBanner} onPress={startEdit}>
              <Ionicons name="pencil-outline" size={18} color={Colors.secondary} />
              <Text style={styles.editBannerText}>Edit Truck Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 2 }}>
      <Ionicons name={icon as any} size={15} color={Colors.secondary} />
      <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '66' }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' }, mono ? { fontFamily: 'monospace', letterSpacing: 0.5 } : {}, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

function Field({
  label, value, onChangeText, placeholder, keyboard, flex, autoCapitalize,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboard?: any; flex?: boolean; autoCapitalize?: any;
}) {
  const Colors = useColors();
  return (
    <View style={[{ gap: 5 }, flex ? { flex: 1 } : {}]}>
      <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 }}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? ''} placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard ?? 'default'} autoCapitalize={autoCapitalize ?? 'none'}
      />
    </View>
  );
}
