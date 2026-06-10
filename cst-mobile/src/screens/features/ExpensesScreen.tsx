import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { getExpenses, addExpense, updateExpense, deleteExpense, getTrips, uploadReceipt } from '../../api/features';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  tripId?: string;
  createdAt: string;
}

interface Trip {
  _id: string;
  date: string;
  origin: string;
  destination: string;
  loadNum: string;
}

const CATEGORIES: { label: string; icon: string; color: string }[] = [
  { label: 'Fuel',      icon: 'water-outline',        color: '#3498DB' },
  { label: 'Repairs',   icon: 'construct-outline',    color: '#E67E22' },
  { label: 'Insurance', icon: 'shield-outline',       color: '#27AE60' },
  { label: 'Permits',   icon: 'document-text-outline', color: '#9B59B6' },
  { label: 'Food',      icon: 'restaurant-outline',   color: '#F39C12' },
  { label: 'Tolls',     icon: 'trail-sign-outline',   color: '#E74C3C' },
  { label: 'Other',     icon: 'ellipsis-horizontal-outline', color: '#7F8C8D' },
];

const catMeta = (label: string) => CATEGORIES.find(c => c.label === label) ?? CATEGORIES[CATEGORIES.length - 1];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ExpensesScreen() {
  const Colors = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    list: { padding: 16, paddingBottom: 100 },
    totalBanner: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center', marginBottom: 12 },
    totalLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    totalValue: { color: Colors.text, fontSize: 32, fontWeight: '900', marginTop: 4 },
    catScroll: { marginBottom: 14 },
    catRow: { gap: 8, paddingRight: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6 },
    catChipActive: { backgroundColor: Colors.secondary + '22', borderColor: Colors.secondary },
    catChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    catChipTextActive: { color: Colors.secondary },
    catChipAmt: { fontSize: 11, fontWeight: '800' },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    catIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardBody: { flex: 1, gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardCat: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    cardAmount: { fontSize: 17, fontWeight: '900' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardDesc: { color: Colors.textMuted, fontSize: 12, flex: 1, marginRight: 8 },
    cardDate: { color: Colors.textMuted, fontSize: 11 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 6 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catOption: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
    catOptionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [category, setCategory] = useState('Fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [tripId, setTripId] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const load = useCallback(async () => {
    try {
      const [expData, tripData] = await Promise.all([getExpenses(), getTrips()]);
      setExpenses(Array.isArray(expData) ? expData : []);
      const tripArr = tripData?.trips ?? tripData;
      setTrips(Array.isArray(tripArr) ? tripArr.slice(0, 30) : []);
    } catch { Alert.alert(t('common.error'), t('expenses.loadError')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exportCSV = useCallback(() => {
    if (expenses.length === 0) { Alert.alert(t('expenses.nothingToExport'), t('expenses.noExpensesFirst')); return; }
    const q = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const header = 'Date,Category,Amount ($),Description';
    const rows = expenses.map(e =>
      [new Date(e.createdAt).toLocaleDateString('en-US'), e.category, e.amount.toFixed(2), q(e.description)].join(',')
    );
    Share.share({ message: [header, ...rows].join('\n'), title: 'Expenses.csv' });
  }, [expenses, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={exportCSV} style={{ marginRight: 4, padding: 6 }}>
          <Ionicons name="share-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, exportCSV]);

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('expenses.permissionNeeded'), t('expenses.photoPermission')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.length) setReceiptUri(result.assets[0].uri);
  };

  const openModal = () => {
    setEditTarget(null);
    setCategory('Fuel'); setAmount(''); setDescription(''); setTripId(null); setReceiptUri(null);
    setModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditTarget(e);
    setCategory(e.category); setAmount(String(e.amount)); setDescription(e.description ?? '');
    setTripId(e.tripId ?? null); setReceiptUri(null);
    setModal(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert(t('common.error'), t('expenses.invalidAmount')); return; }
    setSaving(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptUri) {
        setUploadingReceipt(true);
        try {
          const ext = receiptUri.split('.').pop() ?? 'jpg';
          const res = await uploadReceipt({ uri: receiptUri, type: `image/${ext}`, name: `receipt.${ext}` });
          receiptUrl = res.url;
        } finally { setUploadingReceipt(false); }
      }
      if (editTarget) {
        await updateExpense(editTarget._id, { category, amount: amt, description, tripId: tripId ?? undefined, receiptUrl });
      } else {
        await addExpense({ category, amount: amt, description, tripId: tripId ?? undefined, receiptUrl });
      }
      setModal(false);
      load();
    } catch (err: any) { Alert.alert(t('common.error'), err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (e: Expense) => {
    Alert.alert(t('expenses.deleteTitle'), `Remove $${e.amount.toFixed(2)} ${e.category}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteExpense(e._id);
            load();
          } catch (err: any) {
            Alert.alert(t('common.error'), err.message ?? t('expenses.deleteError'));
          }
        },
      },
    ]);
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map(c => ({
    ...c,
    total: expenses.filter(e => e.category === c.label).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  const filtered = filterCat ? expenses.filter(e => e.category === filterCat) : expenses;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={e => e._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            {/* Total banner */}
            <View style={styles.totalBanner}>
              <Text style={styles.totalLabel}>{t('expenses.totalExpenses')}</Text>
              <Text style={styles.totalValue}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            {/* Category breakdown */}
            {byCategory.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
                <TouchableOpacity
                  style={[styles.catChip, !filterCat && styles.catChipActive]}
                  onPress={() => setFilterCat(null)}
                >
                  <Text style={[styles.catChipText, !filterCat && styles.catChipTextActive]}>{t('expenses.all')}</Text>
                </TouchableOpacity>
                {byCategory.map(c => (
                  <TouchableOpacity
                    key={c.label}
                    style={[styles.catChip, filterCat === c.label && { backgroundColor: c.color + '33', borderColor: c.color }]}
                    onPress={() => setFilterCat(filterCat === c.label ? null : c.label)}
                  >
                    <Ionicons name={c.icon as any} size={13} color={filterCat === c.label ? c.color : Colors.textMuted} />
                    <Text style={[styles.catChipText, filterCat === c.label && { color: c.color }]}>{c.label}</Text>
                    <Text style={[styles.catChipAmt, { color: c.color }]}>${c.total.toFixed(0)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {filterCat ? t('expenses.noExpensesInCat', { cat: filterCat }) : t('expenses.noExpenses')}
            </Text>
            <Text style={styles.emptySub}>{t('expenses.tapToAdd')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = catMeta(item.category);
          return (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)} activeOpacity={0.8}>
              <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={meta.icon as any} size={20} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardCat}>{item.category}</Text>
                  <Text style={[styles.cardAmount, { color: meta.color }]}>
                    ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.cardBottom}>
                  {item.description ? <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
                  <Text style={styles.cardDate}>{fmtDate(item.createdAt)}</Text>
                </View>
                {item.tripId ? (() => {
                  const tr = trips.find(x => x._id === item.tripId);
                  return tr ? (
                    <Text style={{ color: Colors.secondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      Trip: {tr.origin} → {tr.destination}{tr.loadNum ? ` #${tr.loadNum}` : ''}
                    </Text>
                  ) : null;
                })() : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editTarget ? t('expenses.editExpense') : t('expenses.addExpense')}</Text>

            <Text style={styles.modalLabel}>{t('expenses.categoryLabel')}</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.label}
                  style={[styles.catOption, category === c.label && { backgroundColor: c.color + '33', borderColor: c.color }]}
                  onPress={() => setCategory(c.label)}
                >
                  <Ionicons name={c.icon as any} size={18} color={category === c.label ? c.color : Colors.textMuted} />
                  <Text style={[styles.catOptionText, category === c.label && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('expenses.amountLabel')}</Text>
            <TextInput
              style={styles.modalInput} value={amount} onChangeText={setAmount}
              placeholder="0.00" placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>{t('expenses.descriptionLabel')}</Text>
            <TextInput
              style={styles.modalInput} value={description} onChangeText={setDescription}
              placeholder="What was it for?" placeholderTextColor={Colors.textMuted}
            />

            {trips.length > 0 && (
              <>
                <Text style={styles.modalLabel}>{t('expenses.tripLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.catOption, !tripId && { backgroundColor: Colors.secondary + '33', borderColor: Colors.secondary }]}
                      onPress={() => setTripId(null)}
                    >
                      <Text style={[styles.catOptionText, !tripId && { color: Colors.secondary }]}>None</Text>
                    </TouchableOpacity>
                    {trips.map(tr => (
                      <TouchableOpacity
                        key={tr._id}
                        style={[styles.catOption, tripId === tr._id && { backgroundColor: Colors.secondary + '33', borderColor: Colors.secondary }]}
                        onPress={() => setTripId(tr._id)}
                      >
                        <Text style={[styles.catOptionText, tripId === tr._id && { color: Colors.secondary }]} numberOfLines={1}>
                          {tr.origin} → {tr.destination}{tr.loadNum ? ` #${tr.loadNum}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              onPress={pickReceipt}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 4 }}
            >
              <Ionicons name={receiptUri ? 'checkmark-circle' : 'camera-outline'} size={20} color={receiptUri ? Colors.success : Colors.secondary} />
              <Text style={{ color: receiptUri ? Colors.success : Colors.secondary, fontSize: 13, fontWeight: '700' }}>
                {receiptUri ? t('expenses.receiptAttached') : t('expenses.attachReceipt')}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, (saving || uploadingReceipt) && { opacity: 0.6 }]} onPress={handleSave} disabled={saving || uploadingReceipt}>
                {(saving || uploadingReceipt)
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <Text style={styles.saveText}>{editTarget ? t('tripLog.update') : t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
