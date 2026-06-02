import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getDrugTests, addDrugTest, updateDrugTest, deleteDrugTest } from '../../api/features';

const TEST_TYPES = ['pre-employment', 'random', 'post-accident', 'reasonable-cause', 'return-to-duty', 'follow-up'];
const RESULT_COLORS: Record<string, string> = { negative: '#27AE60', positive: '#CC0000', pending: '#F39C12' };
const RESULT_ICONS: Record<string, string> = { negative: 'checkmark-circle-outline', positive: 'close-circle-outline', pending: 'time-outline' };

interface DrugTest {
  _id: string; date: string; testType: string; result: string;
  testingCompany: string; clearinghouse: boolean; notes?: string; createdAt: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtType = (t: string) => t.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-');

export default function DrugTestScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.secondary + '18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.secondary + '44' },
    infoText: { flex: 1, color: Colors.secondary, fontSize: 12, lineHeight: 17 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
    statNum: { fontSize: 26, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    testCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    testType: { color: Colors.text, fontWeight: '700', fontSize: 14 },
    testDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    resultText: { fontSize: 11, fontWeight: '700' },
    testCompany: { color: Colors.textMuted, fontSize: 13 },
    clearingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearingText: { color: Colors.success, fontSize: 11, fontWeight: '600' },
    testNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    hint: { color: Colors.border, fontSize: 10, textAlign: 'right' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    chipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    chipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: Colors.textDark },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    checkLabel: { color: Colors.text, fontSize: 13 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [tests, setTests] = useState<DrugTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [date, setDate] = useState(todayStr());
  const [testType, setTestType] = useState('pre-employment');
  const [result, setResult] = useState('pending');
  const [company, setCompany] = useState('');
  const [clearinghouse, setClearinghouse] = useState(false);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getDrugTests();
      setTests(data.tests ?? []);
    } catch {
      Alert.alert('Error', 'Could not load test records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditId(null);
    setDate(todayStr()); setTestType('pre-employment'); setResult('pending');
    setCompany(''); setClearinghouse(false); setNotes('');
    setModal(true);
  };

  const openEdit = (t: DrugTest) => {
    setEditId(t._id); setDate(t.date); setTestType(t.testType);
    setResult(t.result); setCompany(t.testingCompany);
    setClearinghouse(t.clearinghouse); setNotes(t.notes ?? '');
    setModal(true);
  };

  const handleSave = async () => {
    if (!company.trim()) { Alert.alert('Error', 'Testing company is required'); return; }
    setSaving(true);
    try {
      const payload = { date, testType, result, testingCompany: company, clearinghouse, notes: notes || undefined };
      if (editId) await updateDrugTest(editId, payload);
      else await addDrugTest(payload);
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (t: DrugTest) => {
    Alert.alert('Delete Record', 'Remove this test record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDrugTest(t._id); load(); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.secondary} />
          <Text style={styles.infoText}>FMCSA requires drug & alcohol testing records to be kept. Clearinghouse registration is mandatory since Jan 6, 2020.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={styles.addBtnText}>Add Test Record</Text>
        </TouchableOpacity>

        {/* Stats strip */}
        {tests.length > 0 && (
          <View style={styles.statsRow}>
            {(['negative', 'positive', 'pending'] as const).map(r => {
              const count = tests.filter(t => t.result === r).length;
              return (
                <View key={r} style={[styles.statBox, { borderColor: RESULT_COLORS[r] + '44' }]}>
                  <Text style={[styles.statNum, { color: RESULT_COLORS[r] }]}>{count}</Text>
                  <Text style={styles.statLabel}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {tests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flask-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No test records yet</Text>
          </View>
        ) : (
          tests.map(t => (
            <TouchableOpacity key={t._id} style={styles.testCard} onPress={() => openEdit(t)} onLongPress={() => handleDelete(t)}>
              <View style={styles.testHeader}>
                <View>
                  <Text style={styles.testType}>{fmtType(t.testType)}</Text>
                  <Text style={styles.testDate}>{t.date}</Text>
                </View>
                <View style={[styles.resultBadge, { backgroundColor: RESULT_COLORS[t.result] + '22' }]}>
                  <Ionicons name={RESULT_ICONS[t.result] as any} size={14} color={RESULT_COLORS[t.result]} />
                  <Text style={[styles.resultText, { color: RESULT_COLORS[t.result] }]}>{t.result.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.testCompany}>{t.testingCompany}</Text>
              {t.clearinghouse && (
                <View style={styles.clearingBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={styles.clearingText}>Clearinghouse Reported</Text>
                </View>
              )}
              {t.notes ? <Text style={styles.testNotes}>{t.notes}</Text> : null}
              <Text style={styles.hint}>Tap to edit · Long-press to delete</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Record' : 'New Test Record'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={styles.modalLabel}>Date</Text>
              <TextInput style={styles.modalInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.modalLabel}>Test Type</Text>
              <View style={styles.chipGroup}>
                {TEST_TYPES.map(tt => (
                  <TouchableOpacity key={tt} style={[styles.chip, testType === tt && styles.chipActive]} onPress={() => setTestType(tt)}>
                    <Text style={[styles.chipText, testType === tt && styles.chipTextActive]}>{fmtType(tt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Result</Text>
              <View style={styles.chipGroup}>
                {(['pending', 'negative', 'positive'] as const).map(r => (
                  <TouchableOpacity key={r} style={[styles.chip, result === r && { backgroundColor: RESULT_COLORS[r], borderColor: RESULT_COLORS[r] }]} onPress={() => setResult(r)}>
                    <Text style={[styles.chipText, result === r && { color: Colors.text }]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Testing Company *</Text>
              <TextInput style={styles.modalInput} value={company} onChangeText={setCompany} placeholder="Lab or clinic name" placeholderTextColor={Colors.textMuted} />

              <TouchableOpacity style={styles.checkRow} onPress={() => setClearinghouse(!clearinghouse)}>
                <View style={[styles.checkbox, clearinghouse && styles.checkboxActive]}>
                  {clearinghouse && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <Text style={styles.checkLabel}>Reported to FMCSA Clearinghouse</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput style={[styles.modalInput, { height: 70 }]} value={notes} onChangeText={setNotes} multiline placeholder="Additional details..." placeholderTextColor={Colors.textMuted} />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
