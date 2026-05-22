import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getExpenses, addExpense, deleteExpense, getRevenue, updateRevenue } from '../../api/features';

type Category = 'Fuel' | 'Repairs' | 'Meals' | 'Lodging' | 'Tolls' | 'Insurance' | 'Office' | 'Other';

interface Expense {
  _id: string;
  category: Category;
  amount: number;
  description: string;
}

const CATEGORIES: { name: Category; icon: string; color: string }[] = [
  { name: 'Fuel',      icon: 'water-outline',               color: '#3498DB' },
  { name: 'Repairs',   icon: 'construct-outline',           color: '#E67E22' },
  { name: 'Meals',     icon: 'restaurant-outline',          color: '#2ECC71' },
  { name: 'Lodging',   icon: 'bed-outline',                 color: '#9B59B6' },
  { name: 'Tolls',     icon: 'car-outline',                 color: '#1ABC9C' },
  { name: 'Insurance', icon: 'shield-outline',              color: '#E74C3C' },
  { name: 'Office',    icon: 'briefcase-outline',           color: '#F39C12' },
  { name: 'Other',     icon: 'ellipsis-horizontal-outline', color: '#95A5A6' },
];

const SE_TAX_RATE = 0.1413;
const INCOME_TAX_RATE = 0.22;

export default function TaxCalculatorScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [grossIncome, setGrossIncome] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>('Fuel');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [expData, revData] = await Promise.all([getExpenses(), getRevenue('Quarter')]);
      setExpenses(expData);
      if (revData.grossRevenue > 0) setGrossIncome(revData.grossRevenue.toString());
    } catch {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrossBlur = async () => {
    const val = parseFloat(grossIncome);
    if (val > 0) {
      try { await updateRevenue('Quarter', { grossRevenue: val }); } catch { /* silent */ }
    }
  };

  const totalDeductions = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = Math.max(0, parseFloat(grossIncome || '0') - totalDeductions);
  const seTax = netIncome * SE_TAX_RATE;
  const incomeTax = netIncome * INCOME_TAX_RATE;
  const estimatedTotal = seTax + incomeTax;

  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.name).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  const handleAdd = useCallback(async () => {
    const amt = parseFloat(newAmount);
    if (!newAmount || isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      await addExpense({ category: newCategory, amount: amt, description: newDesc || newCategory });
      setNewAmount(''); setNewDesc('');
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  }, [newAmount, newCategory, newDesc, load]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteExpense(id); await load(); } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gross Revenue</Text>
          <View style={styles.incomeRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.incomeInput}
              value={grossIncome}
              onChangeText={setGrossIncome}
              onBlur={handleGrossBlur}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Deductions</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={18} color={Colors.textDark} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 ? (
            <Text style={styles.noExpenses}>No expenses yet. Tap Add to start tracking deductions.</Text>
          ) : (
            <>
              {byCategory.map((cat) => (
                <View key={cat.name} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Ionicons name={cat.icon as any} size={16} color={cat.color} style={{ marginRight: 8 }} />
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={[styles.catAmount, { color: cat.color }]}>{fmt(cat.total)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.catRow}>
                <Text style={[styles.catName, { color: Colors.white, fontWeight: '800', flex: 1 }]}>Total Deductions</Text>
                <Text style={[styles.catAmount, { color: Colors.secondary, fontSize: 17 }]}>{fmt(totalDeductions)}</Text>
              </View>
              <Text style={styles.hint}>Long-press an expense item to delete it</Text>
            </>
          )}

          {expenses.length > 0 && (
            <ScrollView style={styles.expenseList} showsVerticalScrollIndicator={false}>
              {expenses.map((e) => (
                <TouchableOpacity key={e._id} style={styles.expRow} onLongPress={() => handleDelete(e._id)}>
                  <Text style={styles.expDesc}>{e.description}</Text>
                  <Text style={styles.expCat}>{e.category}</Text>
                  <Text style={styles.expAmount}>{fmt(e.amount)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tax Estimate</Text>
          {[
            { label: 'Net Taxable Income', value: fmt(netIncome), color: Colors.white },
            { label: 'Self-Employment Tax (14.13%)', value: fmt(seTax), color: '#E74C3C' },
            { label: 'Est. Federal Income Tax (22%)', value: fmt(incomeTax), color: '#E74C3C' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.taxRow}>
              <Text style={styles.taxLabel}>{label}</Text>
              <Text style={[styles.taxValue, { color }]}>{value}</Text>
            </View>
          ))}
          <View style={styles.totalTaxCard}>
            <Text style={styles.totalTaxLabel}>ESTIMATED TOTAL TAX</Text>
            <Text style={styles.totalTaxValue}>{fmt(estimatedTotal)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export Package</Text>
          <View style={styles.exportGrid}>
            {['PDF Report', 'Excel Report', 'CPA Package', 'Audit Package'].map((label) => (
              <TouchableOpacity key={label} style={styles.exportBtn}>
                <Ionicons name="download-outline" size={18} color={Colors.secondary} />
                <Text style={styles.exportBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.oneButtonExport}>
            <Ionicons name="flash" size={20} color={Colors.textDark} />
            <Text style={styles.oneButtonText}>EXPORT ALL — ONE PUSH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Expense</Text>

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.catChip, newCategory === cat.name && { backgroundColor: Colors.secondary }]}
                  onPress={() => setNewCategory(cat.name)}
                >
                  <Text style={[styles.catChipText, newCategory === cat.name && { color: Colors.textDark }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput style={styles.modalInput} value={newAmount} onChangeText={setNewAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput style={styles.modalInput} value={newDesc} onChangeText={setNewDesc} placeholder="e.g. Diesel fill-up" placeholderTextColor={Colors.textMuted} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.modalConfirmText}>Add</Text>}
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
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  incomeRow: { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { color: Colors.secondary, fontSize: 28, fontWeight: '800', marginRight: 4 },
  incomeInput: { color: Colors.secondary, fontSize: 32, fontWeight: '900', flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  addBtnText: { color: Colors.textDark, fontWeight: '700', fontSize: 13 },
  noExpenses: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  catName: { flex: 1, color: Colors.textMuted, fontSize: 14 },
  catAmount: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  expenseList: { maxHeight: 200, marginTop: 8 },
  expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  expDesc: { flex: 1, color: Colors.textMuted, fontSize: 12 },
  expCat: { color: Colors.textMuted, fontSize: 11, marginHorizontal: 8 },
  expAmount: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  taxLabel: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  taxValue: { fontSize: 14, fontWeight: '700' },
  totalTaxCard: { backgroundColor: Colors.danger + '22', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: Colors.danger },
  totalTaxLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 0.5, fontWeight: '700' },
  totalTaxValue: { color: Colors.danger, fontSize: 36, fontWeight: '900', marginTop: 4 },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10, gap: 6, width: '47%' },
  exportBtnText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  oneButtonExport: { backgroundColor: Colors.secondary, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  oneButtonText: { color: Colors.textDark, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 10 },
  catScroll: { marginBottom: 4 },
  catChip: { backgroundColor: Colors.surfaceLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  catChipText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: Colors.textMuted, fontWeight: '700' },
  modalConfirm: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: Colors.textDark, fontWeight: '800' },
});
