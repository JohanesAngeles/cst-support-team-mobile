import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Share, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { getTrips, addTrip, updateTrip, deleteTrip } from '../../api/features';

interface Trip {
  _id: string;
  date: string;
  origin: string;
  destination: string;
  miles: number;
  loadNum: string;
  rate: number;
  broker: string;
  notes: string;
  status: 'Completed' | 'In Progress' | 'Cancelled';
}

const STATUS_COLORS = { Completed: '#27AE60', 'In Progress': '#2C6EBD', Cancelled: '#CC0000' };
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TripLogScreen() {
  const Colors = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    summaryRow: { flexDirection: 'row', padding: 16, gap: 10 },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: 'center', gap: 4 },
    summaryValue: { fontSize: 17, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    filterChipActive: { backgroundColor: Colors.secondary + '22', borderColor: Colors.secondary },
    filterChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    filterChipTextActive: { color: Colors.secondary },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    origin: { color: Colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
    dest: { color: Colors.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    metaText: { color: Colors.textMuted, fontSize: 12 },
    metaDot: { color: Colors.textMuted, fontSize: 12 },
    loadNum: { color: Colors.textMuted, fontSize: 11 },
    cardNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4, maxHeight: '90%' },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginTop: 4 },
    statusRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    statusChip: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    statusChipText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const navigation = useNavigation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Trip | null>(null);

  type DatePreset = 'All' | 'Week' | 'Month' | 'Last Month';
  const [datePreset, setDatePreset] = useState<DatePreset>('All');

  const [date, setDate] = useState(todayStr());
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [miles, setMiles] = useState('');
  const [loadNum, setLoadNum] = useState('');
  const [rate, setRate] = useState('');
  const [broker, setBroker] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Trip['status']>('Completed');

  const load = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data.trips ?? []);
    } catch { Alert.alert(t('common.error'), t('tripLog.loadError')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredTrips = useMemo(() => {
    if (datePreset === 'All') return trips;
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (datePreset === 'Week') {
      from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    } else if (datePreset === 'Month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }
    return trips.filter(tr => {
      const d = new Date(tr.date + 'T12:00:00');
      return d >= from && d <= to;
    });
  }, [trips, datePreset]);

  const exportCSV = useCallback(() => {
    if (filteredTrips.length === 0) { Alert.alert(t('tripLog.nothingToExport'), t('tripLog.noTripsRangeMsg')); return; }
    const q = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const header = 'Date,Origin,Destination,Miles,Rate ($),Load #,Broker,Status,Notes';
    const rows = filteredTrips.map(tr =>
      [tr.date, q(tr.origin), q(tr.destination), tr.miles, tr.rate, q(tr.loadNum), q(tr.broker), tr.status, q(tr.notes)].join(',')
    );
    Share.share({ message: [header, ...rows].join('\n'), title: 'Trip Log.csv' });
  }, [filteredTrips, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={exportCSV} style={{ marginRight: 4, padding: 6 }}>
          <Ionicons name="share-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, exportCSV]);

  const openModal = () => {
    setEditTarget(null);
    setDate(todayStr()); setOrigin(''); setDestination('');
    setMiles(''); setLoadNum(''); setRate(''); setBroker(''); setNotes('');
    setStatus('Completed'); setModal(true);
  };

  const openEdit = (trip: Trip) => {
    setEditTarget(trip);
    setDate(trip.date); setOrigin(trip.origin); setDestination(trip.destination);
    setMiles(String(trip.miles)); setLoadNum(trip.loadNum ?? '');
    setRate(trip.rate > 0 ? String(trip.rate) : '');
    setBroker(trip.broker ?? ''); setNotes(trip.notes ?? '');
    setStatus(trip.status); setModal(true);
  };

  const handleSave = async () => {
    if (!origin.trim() || !destination.trim() || !miles) {
      Alert.alert(t('common.error'), t('tripLog.requiredFields')); return;
    }
    const payload = {
      date, origin: origin.trim(), destination: destination.trim(),
      miles: parseFloat(miles), loadNum, rate: parseFloat(rate) || 0,
      broker, notes, status,
    };
    setSaving(true);
    try {
      if (editTarget) {
        await updateTrip(editTarget._id, payload);
      } else {
        await addTrip(payload);
      }
      setModal(false);
      load();
    } catch (err: any) { Alert.alert(t('common.error'), err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (trip: Trip) => {
    Alert.alert(t('tripLog.deleteTitle'), `Remove ${trip.origin} → ${trip.destination}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteTrip(trip._id);
            load();
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message ?? t('tripLog.deleteError'));
          }
        },
      },
    ]);
  };

  const statusLabel = (s: Trip['status']) => {
    if (s === 'Completed') return t('tripLog.completed');
    if (s === 'In Progress') return t('tripLog.inProgress');
    return t('tripLog.cancelled');
  };

  const FILTER_PRESETS: { key: DatePreset; label: string }[] = [
    { key: 'All', label: t('tripLog.filterAll') },
    { key: 'Week', label: t('tripLog.filterWeek') },
    { key: 'Month', label: t('tripLog.filterMonth') },
    { key: 'Last Month', label: t('tripLog.filterLastMonth') },
  ];

  const totalMiles = filteredTrips.reduce((s, tr) => s + tr.miles, 0);
  const totalRevenue = filteredTrips.reduce((s, tr) => s + tr.rate, 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  const summaryCards = [
    { label: t('tripLog.totalTrips'), value: String(filteredTrips.length), icon: 'map-outline', color: Colors.secondary },
    { label: t('tripLog.totalMiles'), value: totalMiles.toLocaleString(), icon: 'speedometer-outline', color: '#3498DB' },
    { label: t('tripLog.revenue'), value: totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '—', icon: 'cash-outline', color: Colors.success },
  ];

  const formFields = [
    { label: t('tripLog.date'), value: date, set: setDate, placeholder: 'YYYY-MM-DD' },
    { label: t('tripLog.origin'), value: origin, set: setOrigin, placeholder: 'City, State' },
    { label: t('tripLog.destination'), value: destination, set: setDestination, placeholder: 'City, State' },
    { label: t('tripLog.miles'), value: miles, set: setMiles, placeholder: '0', keyboard: 'decimal-pad' as const },
    { label: t('tripLog.loadNum'), value: loadNum, set: setLoadNum, placeholder: 'Optional' },
    { label: t('tripLog.rate'), value: rate, set: setRate, placeholder: '0.00', keyboard: 'decimal-pad' as const },
    { label: t('tripLog.broker'), value: broker, set: setBroker, placeholder: 'Broker name' },
    { label: t('tripLog.notes'), value: notes, set: setNotes, placeholder: 'Optional' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        {summaryCards.map(({ label, value, icon, color }) => (
          <View key={label} style={styles.summaryCard}>
            <Ionicons name={icon as any} size={18} color={color} />
            <Text style={[styles.summaryValue, { color }]}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={tr => tr._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {FILTER_PRESETS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, datePreset === key && styles.filterChipActive]}
                onPress={() => setDatePreset(key)}
              >
                <Text style={[styles.filterChipText, datePreset === key && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {datePreset === 'All' ? t('tripLog.noTrips') : t('tripLog.noTripsInRange', { range: datePreset })}
            </Text>
            <Text style={styles.emptySub}>
              {datePreset === 'All' ? t('tripLog.tapToAdd') : t('tripLog.tryDifferentRange')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <View style={styles.routeRow}>
                <Text style={styles.origin} numberOfLines={1}>{item.origin}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                <Text style={styles.dest} numberOfLines={1}>{item.destination}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{fmtDate(item.date)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{item.miles.toLocaleString()} mi</Text>
              {item.rate > 0 && <><Text style={styles.metaDot}>·</Text><Text style={[styles.metaText, { color: Colors.success }]}>${item.rate.toLocaleString()}</Text></>}
              {item.broker ? <><Text style={styles.metaDot}>·</Text><Text style={styles.metaText}>{item.broker}</Text></> : null}
            </View>
            {item.loadNum ? <Text style={styles.loadNum}>{t('tripLog.loadPrefix')} {item.loadNum}</Text> : null}
            {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editTarget ? t('tripLog.editTrip') : t('tripLog.logTrip')}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formFields.map(({ label, value, set, placeholder, keyboard }) => (
                <View key={label}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <TextInput
                    style={styles.modalInput} value={value} onChangeText={set}
                    placeholder={placeholder} placeholderTextColor={Colors.textMuted}
                    keyboardType={keyboard ?? 'default'}
                  />
                </View>
              ))}

              <Text style={styles.modalLabel}>{t('tripLog.statusLabel')}</Text>
              <View style={styles.statusRow}>
                {(['Completed', 'In Progress', 'Cancelled'] as Trip['status'][]).map(s => (
                  <TouchableOpacity key={s} style={[styles.statusChip, status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]} onPress={() => setStatus(s)}>
                    <Text style={[styles.statusChipText, status === s && { color: Colors.textDark }]}>{statusLabel(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color={Colors.textDark} />
                    : <Text style={styles.saveText}>{editTarget ? t('tripLog.update') : t('tripLog.save')}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
