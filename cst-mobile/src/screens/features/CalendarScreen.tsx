import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import { getDeadlines, addDeadline, deleteDeadline } from '../../api/features';
import { setupNotifications, scheduleDeadlineNotifications } from '../../utils/notifications';

type DeadlineType = 'CDL Renewal' | 'IFTA Quarterly' | 'Registration' | 'Court Date' | 'DOT Inspection' | 'Insurance' | 'Maintenance' | 'Other';

interface Deadline {
  _id: string;
  type: DeadlineType;
  title: string;
  date: string;
  notes?: string;
}

const TYPE_COLORS: Record<DeadlineType, string> = {
  'CDL Renewal': '#3498DB', 'IFTA Quarterly': '#F39C12', 'Registration': '#2ECC71',
  'Court Date': '#E74C3C', 'DOT Inspection': '#9B59B6', 'Insurance': '#1ABC9C',
  'Maintenance': '#E67E22', 'Other': '#95A5A6',
};

const DEADLINE_TYPES: DeadlineType[] = ['CDL Renewal', 'IFTA Quarterly', 'Registration', 'Court Date', 'DOT Inspection', 'Insurance', 'Maintenance', 'Other'];

const getDaysUntil = (dateStr: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const urgencyColor = (days: number) => days < 0 ? '#E74C3C' : days <= 7 ? '#E67E22' : days <= 30 ? '#F39C12' : '#27AE60';
const urgencyLabel = (days: number) => days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days} days`;

export default function CalendarScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
    title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
    subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
    addBtn: { backgroundColor: Colors.secondary, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
    summaryChip: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, backgroundColor: Colors.surface },
    summaryCount: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    list: { paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
    card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    typeBar: { width: 5 },
    cardBody: { flex: 1, padding: 14, gap: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
    urgencyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    urgencyText: { fontSize: 12, fontWeight: '700' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeText: { fontSize: 11, fontWeight: '700' },
    dateText: { color: Colors.textMuted, fontSize: 12 },
    notesText: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
    emptyText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
    emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
    hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', paddingBottom: 12 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
    typeChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    confirmText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newType, setNewType] = useState<DeadlineType>('CDL Renewal');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDeadlines();
      setDeadlines(data);
      const granted = await setupNotifications();
      if (granted) await scheduleDeadlineNotifications(data);
    } catch {
      Alert.alert('Error', 'Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...deadlines].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  const handleAdd = async () => {
    if (!newTitle || !newDate) { Alert.alert('Error', 'Title and date are required'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) { Alert.alert('Error', 'Date format: YYYY-MM-DD'); return; }
    setSaving(true);
    try {
      await addDeadline({ type: newType, title: newTitle, date: newDate, notes: newNotes || undefined });
      setNewTitle(''); setNewDate(''); setNewNotes('');
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to add deadline');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Deadline', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteDeadline(id); await load(); } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Deadline }) => {
    const days = getDaysUntil(item.date);
    const color = TYPE_COLORS[item.type] ?? '#95A5A6';
    const uColor = urgencyColor(days);
    return (
      <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item._id, item.title)}>
        <View style={[styles.typeBar, { backgroundColor: color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: uColor + '22', borderColor: uColor }]}>
              <Text style={[styles.urgencyText, { color: uColor }]}>{urgencyLabel(days)}</Text>
            </View>
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.typeText, { color }]}>{item.type}</Text>
            </View>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Driver Calendar</Text>
          <Text style={styles.subtitle}>Never miss a deadline</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        {[
          { label: 'Overdue', count: sorted.filter(d => getDaysUntil(d.date) < 0).length, color: '#E74C3C' },
          { label: 'This Week', count: sorted.filter(d => { const n = getDaysUntil(d.date); return n >= 0 && n <= 7; }).length, color: '#E67E22' },
          { label: 'This Month', count: sorted.filter(d => { const n = getDaysUntil(d.date); return n > 7 && n <= 30; }).length, color: '#F39C12' },
        ].map(({ label, count, color }) => (
          <View key={label} style={[styles.summaryChip, { borderColor: color }]}>
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No deadlines yet</Text>
          <Text style={styles.emptySubText}>Add CDL renewals, IFTA returns, court dates, and more</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>Add First Deadline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={sorted}
            keyExtractor={(d) => d._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <Text style={styles.hint}>Long-press to delete a deadline</Text>
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Deadline</Text>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeGrid}>
              {DEADLINE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, newType === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.typeChipText, newType === t && { color: Colors.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { label: 'Title *', value: newTitle, set: setNewTitle, placeholder: 'e.g. CDL Renewal' },
              { label: 'Date * (YYYY-MM-DD)', value: newDate, set: setNewDate, placeholder: '2026-08-15' },
              { label: 'Notes (optional)', value: newNotes, set: setNewNotes, placeholder: 'Any additional info' },
            ].map(({ label, value, set, placeholder }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput style={styles.modalInput} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={Colors.textMuted} />
              </View>
            ))}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
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
