import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getBrokerNotes, addBrokerNote, updateBrokerNote, deleteBrokerNote } from '../../api/features';

interface BrokerNote {
  _id: string;
  brokerName: string;
  mcNum: string;
  phone: string;
  paySpeed: number;
  communication: number;
  loadQuality: number;
  wouldUseAgain: boolean;
  notes: string;
}

const Stars = ({ value, onPress }: { value: number; onPress?: (v: number) => void }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onPress?.(i)} disabled={!onPress}>
        <Ionicons name={i <= value ? 'star' : 'star-outline'} size={onPress ? 24 : 14} color={i <= value ? '#2C6EBD' : '#757575'} />
      </TouchableOpacity>
    ))}
  </View>
);

const avgRating = (b: BrokerNote) => ((b.paySpeed + b.communication + b.loadQuality) / 3).toFixed(1);

export default function BrokerNotesScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginTop: 12, marginBottom: 8, paddingHorizontal: 12, height: 46 },
    searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: 'center', gap: 4 },
    summaryValue: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flex: 1, gap: 2 },
    brokerName: { color: Colors.text, fontSize: 16, fontWeight: '800' },
    mcNum: { color: Colors.textMuted, fontSize: 12 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    avgRating: { color: Colors.secondary, fontSize: 22, fontWeight: '900' },
    ratingsRow: { gap: 6 },
    ratingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ratingLabel: { color: Colors.textMuted, fontSize: 12, flex: 1 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    useAgainBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    useAgainText: { fontSize: 11, fontWeight: '700' },
    cardNotes: { color: Colors.textMuted, fontSize: 12, flex: 1 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
    twoCol: { flexDirection: 'row', gap: 10 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [notes, setNotes] = useState<BrokerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BrokerNote | null>(null);
  const [saving, setSaving] = useState(false);

  const [brokerName, setBrokerName] = useState('');
  const [mcNum, setMcNum] = useState('');
  const [phone, setPhone] = useState('');
  const [paySpeed, setPaySpeed] = useState(3);
  const [communication, setCommunication] = useState(3);
  const [loadQuality, setLoadQuality] = useState(3);
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async () => {
    try { const data = await getBrokerNotes(); setNotes(data.notes ?? []); }
    catch { Alert.alert('Error', 'Could not load broker notes'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditTarget(null);
    setBrokerName(''); setMcNum(''); setPhone('');
    setPaySpeed(3); setCommunication(3); setLoadQuality(3);
    setWouldUseAgain(true); setNoteText('');
    setModal(true);
  };

  const openEdit = (b: BrokerNote) => {
    setEditTarget(b);
    setBrokerName(b.brokerName); setMcNum(b.mcNum); setPhone(b.phone);
    setPaySpeed(b.paySpeed); setCommunication(b.communication); setLoadQuality(b.loadQuality);
    setWouldUseAgain(b.wouldUseAgain); setNoteText(b.notes);
    setModal(true);
  };

  const handleSave = async () => {
    if (!brokerName.trim()) { Alert.alert('Error', 'Broker name is required'); return; }
    setSaving(true);
    try {
      const payload = { brokerName: brokerName.trim(), mcNum, phone, paySpeed, communication, loadQuality, wouldUseAgain, notes: noteText };
      if (editTarget) { await updateBrokerNote(editTarget._id, payload); }
      else { await addBrokerNote(payload); }
      setModal(false); load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (b: BrokerNote) => {
    Alert.alert('Delete Broker', `Remove notes for ${b.brokerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBrokerNote(b._id); load(); } },
    ]);
  };

  const filtered = query.trim()
    ? notes.filter(n => n.brokerName.toLowerCase().includes(query.toLowerCase()) || n.mcNum.includes(query))
    : notes;

  const goodBrokers = notes.filter(n => n.wouldUseAgain).length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput} value={query} onChangeText={setQuery}
          placeholder="Search brokers..." placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={b => b._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={notes.length > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="business-outline" size={18} color={Colors.secondary} />
              <Text style={styles.summaryValue}>{notes.length}</Text>
              <Text style={styles.summaryLabel}>Brokers</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="thumbs-up-outline" size={18} color={Colors.success} />
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{goodBrokers}</Text>
              <Text style={styles.summaryLabel}>Would Use Again</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="thumbs-down-outline" size={18} color={Colors.danger} />
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>{notes.length - goodBrokers}</Text>
              <Text style={styles.summaryLabel}>Avoid</Text>
            </View>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{query ? 'No brokers match' : 'No broker notes yet'}</Text>
            <Text style={styles.emptySub}>Tap + to add your first broker rating</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={styles.brokerName}>{item.brokerName}</Text>
                {item.mcNum ? <Text style={styles.mcNum}>MC-{item.mcNum}</Text> : null}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.avgRating}>{avgRating(item)}</Text>
                <Stars value={Math.round(parseFloat(avgRating(item)))} />
              </View>
            </View>
            <View style={styles.ratingsRow}>
              {[
                { label: 'Pay Speed', value: item.paySpeed },
                { label: 'Communication', value: item.communication },
                { label: 'Load Quality', value: item.loadQuality },
              ].map(({ label, value }) => (
                <View key={label} style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>{label}</Text>
                  <Stars value={value} />
                </View>
              ))}
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.useAgainBadge, { backgroundColor: item.wouldUseAgain ? Colors.success + '22' : Colors.danger + '22' }]}>
                <Ionicons name={item.wouldUseAgain ? 'thumbs-up' : 'thumbs-down'} size={12} color={item.wouldUseAgain ? Colors.success : Colors.danger} />
                <Text style={[styles.useAgainText, { color: item.wouldUseAgain ? Colors.success : Colors.danger }]}>
                  {item.wouldUseAgain ? 'Would Use Again' : 'Avoid'}
                </Text>
              </View>
              {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Broker' : 'Add Broker'}</Text>

              <Text style={styles.modalLabel}>Broker Name *</Text>
              <TextInput style={styles.modalInput} value={brokerName} onChangeText={setBrokerName} placeholder="Company name" placeholderTextColor={Colors.textMuted} />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>MC Number</Text>
                  <TextInput style={styles.modalInput} value={mcNum} onChangeText={setMcNum} placeholder="Optional" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Phone</Text>
                  <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} placeholder="Optional" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                </View>
              </View>

              {[
                { label: 'Pay Speed', value: paySpeed, set: setPaySpeed },
                { label: 'Communication', value: communication, set: setCommunication },
                { label: 'Load Quality', value: loadQuality, set: setLoadQuality },
              ].map(({ label, value, set }) => (
                <View key={label}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <Stars value={value} onPress={set} />
                </View>
              ))}

              <View style={styles.switchRow}>
                <Text style={styles.modalLabel}>Would Use Again?</Text>
                <Switch
                  value={wouldUseAgain} onValueChange={setWouldUseAgain}
                  trackColor={{ false: Colors.danger, true: Colors.success }}
                  thumbColor={Colors.white}
                />
              </View>

              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 70 }]}
                value={noteText} onChangeText={setNoteText}
                placeholder="Pay terms, load types, contact notes..." placeholderTextColor={Colors.textMuted}
                multiline textAlignVertical="top"
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
