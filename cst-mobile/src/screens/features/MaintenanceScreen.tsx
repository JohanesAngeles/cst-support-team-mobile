import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { getMaintenance, addMaintenanceRecord, completeMaintenance, deleteMaintenanceRecord } from '../../api/features';

interface MaintenanceRecord {
  _id: string;
  name: string;
  icon: string;
  lastDate: string;
  nextDate: string;
  lastMiles: number;
  intervalMiles: number;
}

type Status = 'ok' | 'due_soon' | 'overdue';

const STATUS_CONFIG = {
  ok:       { color: '#27AE60', label: 'OK',       icon: 'checkmark-circle' },
  due_soon: { color: '#E67E22',       label: 'Due Soon', icon: 'warning' },
  overdue:  { color: '#CC0000',   label: 'Overdue',  icon: 'alert-circle' },
};

const getDaysUntil = (dateStr: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
};

const computeStatus = (record: MaintenanceRecord, currentMileage: number): Status => {
  const milesDue = record.intervalMiles - (currentMileage - record.lastMiles);
  const days = getDaysUntil(record.nextDate);
  if (days < 0 || milesDue <= 0) return 'overdue';
  if (days <= 14 || milesDue <= 500) return 'due_soon';
  return 'ok';
};

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
    title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
    subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
    addBtn: { backgroundColor: Colors.secondary, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
    chip: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
    chipCount: { fontSize: 22, fontWeight: '900' },
    chipLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    list: { paddingHorizontal: 20, gap: 10, paddingBottom: 8 },
    card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    cardLeft: { padding: 14, justifyContent: 'center' },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardBody: { flex: 1, padding: 14, gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700' },
    nextDate: { color: Colors.textMuted, fontSize: 12 },
    metricsRow: { flexDirection: 'row' },
    metric: { fontSize: 12 },
    doneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4, alignSelf: 'flex-start', marginTop: 4 },
    doneBtnText: { color: Colors.textDark, fontSize: 12, fontWeight: '700' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
    emptyText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
    emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
    hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 12 },
    overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 6 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    confirmText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNextDate, setNewNextDate] = useState('');
  const [newIntervalMiles, setNewIntervalMiles] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMaintenance();
      setRecords(data.records);
      setCurrentMileage(data.currentMileage);
    } catch {
      Alert.alert(t('common.error'), t('maintenance.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName || !newNextDate) { Alert.alert(t('common.error'), t('maintenance.nameAndDateRequired')); return; }
    setSaving(true);
    try {
      await addMaintenanceRecord({
        name: newName, nextDate: newNextDate,
        lastMiles: currentMileage, intervalMiles: parseInt(newIntervalMiles) || 10000,
        lastDate: new Date().toISOString().split('T')[0],
      });
      setNewName(''); setNewNextDate(''); setNewIntervalMiles('');
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert(t('common.error'), t('maintenance.addError'));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeMaintenance(id);
      await load();
    } catch {
      Alert.alert(t('common.error'), t('maintenance.updateError'));
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(t('maintenance.deleteTitle'), t('maintenance.deleteMsg', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await deleteMaintenanceRecord(id); await load(); } catch { Alert.alert(t('common.error'), t('maintenance.deleteError')); }
      }},
    ]);
  };

  const milesDue = (record: MaintenanceRecord) => Math.max(0, record.intervalMiles - (currentMileage - record.lastMiles));

  const renderItem = ({ item }: { item: MaintenanceRecord }) => {
    const status = computeStatus(item, currentMileage);
    const cfg = STATUS_CONFIG[status];
    const days = getDaysUntil(item.nextDate);
    const miles = milesDue(item);
    return (
      <TouchableOpacity style={[styles.card, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]} onLongPress={() => handleDelete(item._id, item.name)}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.color + '22' }]}>
            <Ionicons name={item.icon as any} size={22} color={cfg.color} />
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}>
              <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{status === 'ok' ? t('maintenance.ok') : status === 'due_soon' ? t('maintenance.dueSoon') : t('maintenance.overdue')}</Text>
            </View>
          </View>
          <Text style={styles.nextDate}>{t('maintenance.nextLabel', { date: item.nextDate })}</Text>
          <View style={styles.metricsRow}>
            <Text style={styles.metric}>
              <Text style={{ color: days < 0 ? Colors.danger : Colors.textMuted }}>
                {days < 0 ? t('maintenance.daysOverdue', { n: Math.abs(days) }) : `${days}d`}
              </Text>
              {' · '}
              <Text style={{ color: miles < 500 ? Colors.danger : Colors.textMuted }}>
                {t('maintenance.miLeft', { n: miles.toLocaleString() })}
              </Text>
            </Text>
          </View>
          {status !== 'ok' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => handleComplete(item._id)}>
              <Ionicons name="checkmark" size={14} color={Colors.textDark} />
              <Text style={styles.doneBtnText}>{t('maintenance.markComplete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );

  const withStatus = records.map(r => ({ ...r, status: computeStatus(r, currentMileage) }));
  const counts = { ok: withStatus.filter(i => i.status === 'ok').length, due_soon: withStatus.filter(i => i.status === 'due_soon').length, overdue: withStatus.filter(i => i.status === 'overdue').length };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('maintenance.title')}</Text>
          <Text style={styles.subtitle}>{currentMileage > 0 ? t('maintenance.currentMi', { mi: currentMileage.toLocaleString() }) : t('maintenance.setMileage')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        {([['ok', Colors.success], ['due_soon', '#E67E22'], ['overdue', Colors.danger]] as const).map(([key, color]) => (
          <View key={key} style={[styles.chip, { borderColor: color }]}>
            <Text style={[styles.chipCount, { color }]}>{counts[key]}</Text>
            <Text style={styles.chipLabel}>{key === 'ok' ? t('maintenance.ok') : key === 'due_soon' ? t('maintenance.dueSoon') : t('maintenance.overdue')}</Text>
          </View>
        ))}
      </View>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{t('maintenance.noRecords')}</Text>
          <Text style={styles.emptySubText}>{t('maintenance.noRecordsSub')}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>{t('maintenance.addFirst')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<Text style={styles.hint}>{t('maintenance.longPressHint')}</Text>}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('maintenance.addTitle')}</Text>
            {[
              { label: t('maintenance.itemNameLabel'), val: newName, set: setNewName, ph: 'e.g. Transmission Service' },
              { label: t('maintenance.nextDateLabel'), val: newNextDate, set: setNewNextDate, ph: '2026-11-01' },
              { label: t('maintenance.intervalLabel'), val: newIntervalMiles, set: setNewIntervalMiles, ph: '10000', keyboard: 'numeric' as const },
            ].map(({ label, val, set, ph, keyboard }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput style={styles.modalInput} value={val} onChangeText={set} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType={keyboard ?? 'default'} />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>{t('maintenance.add')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
