import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getLoads, addLoad, updateLoad, updateLoadStatus, deleteLoad } from '../../api/features';

type LoadStatus = 'booked' | 'in_transit' | 'delivered' | 'invoiced' | 'paid';

interface Load {
  _id: string;
  loadNumber?: string;
  broker: { name: string; mc?: string; phone?: string; email?: string };
  shipper: { name: string; city: string; state: string; address?: string; date?: string; time?: string };
  consignee: { name: string; city: string; state: string; address?: string; date?: string; time?: string };
  commodity?: string;
  weight?: number;
  miles?: number;
  rate: number;
  ratePerMile?: number;
  status: LoadStatus;
  notes?: string;
}

const STATUS_ORDER: LoadStatus[] = ['booked', 'in_transit', 'delivered', 'invoiced', 'paid'];
const STATUS_LABELS: Record<LoadStatus, string> = {
  booked: 'Booked', in_transit: 'In Transit', delivered: 'Delivered', invoiced: 'Invoiced', paid: 'Paid',
};
const STATUS_COLORS: Record<LoadStatus, string> = {
  booked: '#3498DB', in_transit: '#E67E22', delivered: '#2ECC71', invoiced: '#9B59B6', paid: '#27AE60',
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'Booked', value: 'booked' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Invoiced', value: 'invoiced' },
  { label: 'Paid', value: 'paid' },
];

const blank = () => ({
  loadNumber: '', brokerName: '', brokerMc: '', brokerPhone: '', brokerEmail: '',
  shipperName: '', shipperCity: '', shipperState: '', shipperDate: '', shipperTime: '',
  consigneeName: '', consigneeCity: '', consigneeState: '', consigneeDate: '', consigneeTime: '',
  commodity: '', weight: '', miles: '', rate: '', notes: '',
});

export default function LoadBoardScreen() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Load | null>(null);
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [form, setForm] = useState(blank());

  const load = useCallback(async () => {
    try {
      const data = await getLoads(filter || undefined);
      setLoads(data.loads ?? []);
    } catch { Alert.alert('Error', 'Could not load loads'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof ReturnType<typeof blank>) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const openModal = () => {
    setEditTarget(null);
    setForm(blank());
    setModal(true);
  };

  const openEdit = (l: Load) => {
    setEditTarget(l);
    setForm({
      loadNumber: l.loadNumber ?? '',
      brokerName: l.broker.name, brokerMc: l.broker.mc ?? '', brokerPhone: l.broker.phone ?? '', brokerEmail: l.broker.email ?? '',
      shipperName: l.shipper.name, shipperCity: l.shipper.city, shipperState: l.shipper.state,
      shipperDate: l.shipper.date ?? '', shipperTime: l.shipper.time ?? '',
      consigneeName: l.consignee.name, consigneeCity: l.consignee.city, consigneeState: l.consignee.state,
      consigneeDate: l.consignee.date ?? '', consigneeTime: l.consignee.time ?? '',
      commodity: l.commodity ?? '', weight: l.weight ? String(l.weight) : '',
      miles: l.miles ? String(l.miles) : '', rate: String(l.rate), notes: l.notes ?? '',
    });
    setDetailLoad(null);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.brokerName.trim() || !form.shipperName.trim() || !form.shipperCity.trim() || !form.shipperState.trim() ||
        !form.consigneeName.trim() || !form.consigneeCity.trim() || !form.consigneeState.trim() || !form.rate) {
      Alert.alert('Error', 'Broker name, shipper, consignee, and rate are required'); return;
    }
    const payload = {
      loadNumber: form.loadNumber.trim() || undefined,
      broker: { name: form.brokerName.trim(), mc: form.brokerMc.trim() || undefined, phone: form.brokerPhone.trim() || undefined, email: form.brokerEmail.trim() || undefined },
      shipper: { name: form.shipperName.trim(), city: form.shipperCity.trim(), state: form.shipperState.trim().toUpperCase(), date: form.shipperDate || undefined, time: form.shipperTime || undefined },
      consignee: { name: form.consigneeName.trim(), city: form.consigneeCity.trim(), state: form.consigneeState.trim().toUpperCase(), date: form.consigneeDate || undefined, time: form.consigneeTime || undefined },
      commodity: form.commodity.trim() || undefined,
      weight: parseFloat(form.weight) || undefined,
      miles: parseFloat(form.miles) || undefined,
      rate: parseFloat(form.rate),
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editTarget) { await updateLoad(editTarget._id, payload); }
      else { await addLoad(payload); }
      setModal(false);
      load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (l: Load) => {
    Alert.alert('Delete Load', `Remove load #${l.loadNumber || l._id.slice(-6)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteLoad(l._id); setDetailLoad(null); load(); } },
    ]);
  };

  const cycleStatus = async (l: Load) => {
    const idx = STATUS_ORDER.indexOf(l.status);
    const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
    if (next === l.status) return;
    try {
      await updateLoadStatus(l._id, next);
      load();
      if (detailLoad?._id === l._id) setDetailLoad({ ...detailLoad, status: next });
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.value} style={[s.chip, filter === f.value && s.chipActive]} onPress={() => setFilter(f.value)}>
            <Text style={[s.chipText, filter === f.value && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={loads}
        keyExtractor={l => l._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
            <Text style={s.emptyText}>No loads yet</Text>
            <Text style={s.emptySub}>Tap + to add your first load</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status];
          return (
            <TouchableOpacity style={s.card} onPress={() => setDetailLoad(item)} activeOpacity={0.8}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardBroker}>{item.broker.name}</Text>
                  <Text style={s.cardRoute}>
                    {item.shipper.city}, {item.shipper.state} → {item.consignee.city}, {item.consignee.state}
                  </Text>
                  {item.loadNumber ? <Text style={s.cardNum}>#{item.loadNumber}</Text> : null}
                </View>
                <View style={s.cardRight}>
                  <Text style={s.cardRate}>${item.rate.toLocaleString()}</Text>
                  {item.miles ? <Text style={s.cardMiles}>{item.miles} mi</Text> : null}
                  {item.ratePerMile ? <Text style={s.cardRpm}>${item.ratePerMile.toFixed(2)}/mi</Text> : null}
                </View>
              </View>
              <View style={s.cardBottom}>
                <View style={[s.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
                  <Text style={[s.statusText, { color }]}>{STATUS_LABELS[item.status]}</Text>
                </View>
                {item.commodity ? <Text style={s.cardCommodity}>{item.commodity}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={!!detailLoad} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView>
            <View style={s.modalBox}>
              {detailLoad && (() => {
                const color = STATUS_COLORS[detailLoad.status];
                return (
                  <>
                    <View style={s.modalHeader}>
                      <Text style={s.modalTitle}>{detailLoad.broker.name}</Text>
                      <TouchableOpacity onPress={() => setDetailLoad(null)}>
                        <Ionicons name="close" size={24} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <View style={[s.statusBadge, { backgroundColor: color + '22', borderColor: color, alignSelf: 'flex-start', marginBottom: 16 }]}>
                      <Text style={[s.statusText, { color }]}>{STATUS_LABELS[detailLoad.status]}</Text>
                    </View>

                    {detailLoad.loadNumber ? <Text style={s.detailLabel}>Load # <Text style={s.detailValue}>{detailLoad.loadNumber}</Text></Text> : null}

                    <Text style={s.sectionHead}>Shipper</Text>
                    <Text style={s.detailValue}>{detailLoad.shipper.name}</Text>
                    <Text style={s.detailSub}>{detailLoad.shipper.city}, {detailLoad.shipper.state}</Text>
                    {detailLoad.shipper.date ? <Text style={s.detailSub}>{detailLoad.shipper.date}{detailLoad.shipper.time ? ` @ ${detailLoad.shipper.time}` : ''}</Text> : null}

                    <Text style={s.sectionHead}>Consignee</Text>
                    <Text style={s.detailValue}>{detailLoad.consignee.name}</Text>
                    <Text style={s.detailSub}>{detailLoad.consignee.city}, {detailLoad.consignee.state}</Text>
                    {detailLoad.consignee.date ? <Text style={s.detailSub}>{detailLoad.consignee.date}{detailLoad.consignee.time ? ` @ ${detailLoad.consignee.time}` : ''}</Text> : null}

                    <Text style={s.sectionHead}>Rate & Load</Text>
                    <Text style={s.cardRate}>${detailLoad.rate.toLocaleString()}</Text>
                    {detailLoad.miles ? <Text style={s.detailSub}>{detailLoad.miles} miles</Text> : null}
                    {detailLoad.commodity ? <Text style={s.detailSub}>{detailLoad.commodity}{detailLoad.weight ? ` · ${detailLoad.weight.toLocaleString()} lbs` : ''}</Text> : null}

                    {detailLoad.broker.phone || detailLoad.broker.email ? (
                      <>
                        <Text style={s.sectionHead}>Broker Contact</Text>
                        {detailLoad.broker.phone ? <Text style={s.detailSub}>{detailLoad.broker.phone}</Text> : null}
                        {detailLoad.broker.email ? <Text style={s.detailSub}>{detailLoad.broker.email}</Text> : null}
                        {detailLoad.broker.mc ? <Text style={s.detailSub}>MC# {detailLoad.broker.mc}</Text> : null}
                      </>
                    ) : null}

                    {detailLoad.notes ? (
                      <>
                        <Text style={s.sectionHead}>Notes</Text>
                        <Text style={s.detailSub}>{detailLoad.notes}</Text>
                      </>
                    ) : null}

                    <View style={s.modalBtns}>
                      <TouchableOpacity style={s.editBtn} onPress={() => openEdit(detailLoad)}>
                        <Ionicons name="pencil-outline" size={16} color={Colors.white} />
                        <Text style={s.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      {detailLoad.status !== 'paid' && (
                        <TouchableOpacity style={[s.nextBtn, { backgroundColor: color }]} onPress={() => cycleStatus(detailLoad)}>
                          <Ionicons name="arrow-forward-circle-outline" size={16} color={Colors.white} />
                          <Text style={s.nextBtnText}>
                            → {STATUS_LABELS[STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(detailLoad.status) + 1, STATUS_ORDER.length - 1)]]}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(detailLoad)}>
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Load' : 'Add Load'}</Text>

              <Text style={s.groupLabel}>BROKER</Text>
              {[
                { label: 'Broker Name *', key: 'brokerName' as const, ph: 'XPO, Echo, Coyote...' },
                { label: 'MC Number', key: 'brokerMc' as const, ph: 'MC123456' },
                { label: 'Phone', key: 'brokerPhone' as const, ph: '555-000-0000', kbd: 'phone-pad' as const },
                { label: 'Email', key: 'brokerEmail' as const, ph: 'broker@company.com', kbd: 'email-address' as const },
              ].map(({ label, key, ph, kbd }) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} value={form[key]} onChangeText={set(key)} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType={kbd ?? 'default'} autoCapitalize="none" />
                </View>
              ))}

              <Text style={s.groupLabel}>SHIPPER (PICKUP)</Text>
              {[
                { label: 'Company Name *', key: 'shipperName' as const, ph: 'Shipper Corp' },
                { label: 'City *', key: 'shipperCity' as const, ph: 'Houston' },
                { label: 'State *', key: 'shipperState' as const, ph: 'TX', upper: true },
                { label: 'Date', key: 'shipperDate' as const, ph: 'YYYY-MM-DD' },
                { label: 'Time', key: 'shipperTime' as const, ph: '08:00 AM' },
              ].map(({ label, key, ph, upper }) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} value={form[key]} onChangeText={set(key)} placeholder={ph} placeholderTextColor={Colors.textMuted} autoCapitalize={upper ? 'characters' : 'words'} />
                </View>
              ))}

              <Text style={s.groupLabel}>CONSIGNEE (DELIVERY)</Text>
              {[
                { label: 'Company Name *', key: 'consigneeName' as const, ph: 'Receiver Inc' },
                { label: 'City *', key: 'consigneeCity' as const, ph: 'Dallas' },
                { label: 'State *', key: 'consigneeState' as const, ph: 'TX', upper: true },
                { label: 'Date', key: 'consigneeDate' as const, ph: 'YYYY-MM-DD' },
                { label: 'Time', key: 'consigneeTime' as const, ph: '05:00 PM' },
              ].map(({ label, key, ph, upper }) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} value={form[key]} onChangeText={set(key)} placeholder={ph} placeholderTextColor={Colors.textMuted} autoCapitalize={upper ? 'characters' : 'words'} />
                </View>
              ))}

              <Text style={s.groupLabel}>LOAD DETAILS</Text>
              {[
                { label: 'Load Number', key: 'loadNumber' as const, ph: 'LD-0001' },
                { label: 'Commodity', key: 'commodity' as const, ph: 'Dry Van, Refrigerated...' },
                { label: 'Weight (lbs)', key: 'weight' as const, ph: '45000', kbd: 'decimal-pad' as const },
                { label: 'Miles', key: 'miles' as const, ph: '500', kbd: 'decimal-pad' as const },
                { label: 'Rate ($) *', key: 'rate' as const, ph: '2500.00', kbd: 'decimal-pad' as const },
                { label: 'Notes', key: 'notes' as const, ph: 'Any special instructions...' },
              ].map(({ label, key, ph, kbd }) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} value={form[key]} onChangeText={set(key)} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType={kbd ?? 'default'} autoCapitalize="none" />
                </View>
              ))}

              {form.miles && form.rate ? (
                <View style={s.previewBox}>
                  <Text style={s.previewText}>
                    ${(parseFloat(form.rate) / parseFloat(form.miles)).toFixed(2)}/mile
                  </Text>
                </View>
              ) : null}

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={s.saveText}>{editTarget ? 'Update' : 'Save'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  filterBar: { maxHeight: 52, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.textDark },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardBroker: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cardRoute: { color: Colors.textMuted, fontSize: 13 },
  cardNum: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  cardRate: { color: Colors.secondary, fontSize: 20, fontWeight: '900' },
  cardMiles: { color: Colors.textMuted, fontSize: 12 },
  cardRpm: { color: Colors.textMuted, fontSize: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardCommodity: { color: Colors.textMuted, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 13 },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  groupLabel: { color: Colors.secondary, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  inputLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.white, fontSize: 14, marginTop: 4 },
  previewBox: { backgroundColor: Colors.secondary + '22', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  previewText: { color: Colors.secondary, fontSize: 16, fontWeight: '800' },
  sectionHead: { color: Colors.secondary, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 4 },
  detailLabel: { color: Colors.textMuted, fontSize: 13 },
  detailValue: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  detailSub: { color: Colors.textMuted, fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: Colors.textDark, fontWeight: '800' },
  editBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.white, fontWeight: '700' },
  nextBtn: { flex: 2, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  nextBtnText: { color: Colors.white, fontWeight: '800' },
  deleteBtn: { width: 44, backgroundColor: Colors.danger + '22', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.danger },
});
