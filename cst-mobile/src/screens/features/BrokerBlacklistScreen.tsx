import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getBrokerBlacklist, addBrokerBlacklist, upvoteBrokerBlacklist, deleteBrokerBlacklist } from '../../api/features';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['no-pay', 'ghost-load', 'bait-switch', 'harassment', 'fraud', 'other'] as const;
const CAT_LABELS: Record<string, string> = {
  'no-pay': 'No Pay', 'ghost-load': 'Ghost Load', 'bait-switch': 'Bait & Switch',
  'harassment': 'Harassment', 'fraud': 'Fraud', 'other': 'Other',
};
const CAT_COLORS: Record<string, string> = {
  'no-pay': '#E74C3C', 'ghost-load': '#E67E22', 'bait-switch': '#9B59B6',
  'harassment': '#CC0000', 'fraud': '#C0392B', 'other': '#8FA3B1',
};

interface BlacklistEntry {
  _id: string; brokerName: string; mcNum?: string; phone?: string;
  reason: string; category: string; upvotes: string[];
  submitterName: string; createdAt: string; submittedBy: string;
}

export default function BrokerBlacklistScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
    searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
    content: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.danger, borderRadius: 12, paddingVertical: 14 },
    addBtnText: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    subTitle: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    entryCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.danger + '33', padding: 14, gap: 6 },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brokerName: { color: Colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
    catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    catText: { fontSize: 11, fontWeight: '700' },
    entryMeta: { color: Colors.textMuted, fontSize: 12 },
    reason: { color: Colors.text, fontSize: 13, lineHeight: 19 },
    entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    submitter: { color: Colors.textMuted, fontSize: 11 },
    upvoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    upvoteCount: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    chipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.danger, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.text, fontWeight: '800' },
  }), [Colors]);
  const { user } = useAuth();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [brokerName, setBrokerName] = useState('');
  const [mcNum, setMcNum] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('no-pay');

  const load = useCallback(async (q = '') => {
    try {
      const data = await getBrokerBlacklist(q || undefined);
      setEntries(data.entries ?? []);
    } catch {
      Alert.alert('Error', 'Could not load blacklist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSearch = () => { setLoading(true); load(search); };

  const handleSave = async () => {
    if (!brokerName.trim() || !reason.trim()) { Alert.alert('Error', 'Broker name and reason are required'); return; }
    setSaving(true);
    try {
      await addBrokerBlacklist({ brokerName: brokerName.trim(), mcNum: mcNum || undefined, phone: phone || undefined, reason, category });
      setBrokerName(''); setMcNum(''); setPhone(''); setReason(''); setCategory('no-pay');
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpvote = async (id: string) => {
    try { await upvoteBrokerBlacklist(id); load(); } catch { Alert.alert('Error', 'Could not upvote'); }
  };

  const handleDelete = (entry: BlacklistEntry) => {
    if (entry.submittedBy !== user?._id) return;
    Alert.alert('Delete Entry', 'Remove your blacklist entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBrokerBlacklist(entry._id); load(); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput} value={search} onChangeText={setSearch}
          onSubmitEditing={handleSearch} returnKeyType="search"
          placeholder="Search broker name..." placeholderTextColor={Colors.textMuted}
        />
        {search ? <TouchableOpacity onPress={() => { setSearch(''); load(''); }}><Ionicons name="close" size={18} color={Colors.textMuted} /></TouchableOpacity> : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search); }} tintColor={Colors.secondary} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="warning-outline" size={18} color={Colors.textDark} />
          <Text style={styles.addBtnText}>Report a Broker</Text>
        </TouchableOpacity>

        <Text style={styles.subTitle}>{entries.length} report{entries.length !== 1 ? 's' : ''} — community verified</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="thumbs-up-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        ) : (
          entries.map(e => (
            <TouchableOpacity key={e._id} style={styles.entryCard} onLongPress={() => handleDelete(e)}>
              <View style={styles.entryHeader}>
                <Text style={styles.brokerName}>{e.brokerName}</Text>
                <View style={[styles.catBadge, { backgroundColor: CAT_COLORS[e.category] + '22' }]}>
                  <Text style={[styles.catText, { color: CAT_COLORS[e.category] }]}>{CAT_LABELS[e.category]}</Text>
                </View>
              </View>
              {e.mcNum ? <Text style={styles.entryMeta}>MC# {e.mcNum}</Text> : null}
              {e.phone ? <Text style={styles.entryMeta}>{e.phone}</Text> : null}
              <Text style={styles.reason}>{e.reason}</Text>
              <View style={styles.entryFooter}>
                <Text style={styles.submitter}>Reported by {e.submitterName}</Text>
                <TouchableOpacity style={styles.upvoteBtn} onPress={() => handleUpvote(e._id)}>
                  <Ionicons name={e.upvotes.includes(user?._id ?? '') ? 'thumbs-up' : 'thumbs-up-outline'} size={14} color={Colors.secondary} />
                  <Text style={styles.upvoteCount}>{e.upvotes.length}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report a Broker</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={styles.modalLabel}>Broker / Company Name *</Text>
              <TextInput style={styles.modalInput} value={brokerName} onChangeText={setBrokerName} placeholder="Company name" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.modalLabel}>MC Number (optional)</Text>
              <TextInput style={styles.modalInput} value={mcNum} onChangeText={setMcNum} placeholder="MC-XXXXXXX" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />

              <Text style={styles.modalLabel}>Phone (optional)</Text>
              <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.modalLabel}>Category *</Text>
              <View style={styles.chipGroup}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, category === c && { backgroundColor: CAT_COLORS[c], borderColor: CAT_COLORS[c] }]} onPress={() => setCategory(c)}>
                    <Text style={[styles.chipText, category === c && { color: Colors.text }]}>{CAT_LABELS[c]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>What happened? *</Text>
              <TextInput
                style={[styles.modalInput, { height: 90 }]} value={reason} onChangeText={setReason}
                multiline placeholder="Describe your experience in detail..." placeholderTextColor={Colors.textMuted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveText}>Submit Report</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
