import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
  ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import {
  getDispatchContacts, addDispatchContact, updateDispatchContact,
  toggleContactFavorite, deleteDispatchContact,
} from '../../api/features';

type ContactRole = 'dispatcher' | 'broker' | 'shipper' | 'consignee' | 'other';

interface Contact {
  _id: string;
  name: string;
  company?: string;
  role: ContactRole;
  phone?: string;
  email?: string;
  mcNumber?: string;
  notes?: string;
  isFavorite: boolean;
}

const ROLE_LABELS: Record<ContactRole, string> = {
  dispatcher: 'Dispatcher', broker: 'Broker', shipper: 'Shipper', consignee: 'Consignee', other: 'Other',
};
const ROLE_COLORS: Record<ContactRole, string> = {
  dispatcher: '#3498DB', broker: '#E67E22', shipper: '#2ECC71', consignee: '#9B59B6', other: '#95A5A6',
};
const ROLES: ContactRole[] = ['dispatcher', 'broker', 'shipper', 'consignee', 'other'];

const blank = () => ({ name: '', company: '', role: 'dispatcher' as ContactRole, phone: '', email: '', mcNumber: '', notes: '' });

export default function DispatchContactsScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    list: { padding: 16, paddingBottom: 100 },
    countText: { color: Colors.textMuted, fontSize: 13, marginBottom: 12 },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '800' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    cardName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
    cardCompany: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
    roleText: { fontSize: 11, fontWeight: '800' },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondary + '22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.secondary },
    contactInfo: { paddingLeft: 56, gap: 2 },
    contactText: { color: Colors.textMuted, fontSize: 12 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', flex: 1, marginBottom: 4 },
    inputLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
    input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginTop: 4 },
    rolePick: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    rolePickActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    rolePickText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
    rolePickTextActive: { color: Colors.textDark },
    actionRow: { gap: 10, marginTop: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border },
    actionText: { color: Colors.text, fontSize: 14 },
    detailSub: { color: Colors.textMuted, fontSize: 13 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
    editBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border },
    editBtnText: { color: Colors.text, fontWeight: '700' },
    deleteBtn: { flex: 1, backgroundColor: Colors.danger + '22', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.danger },
  }), [Colors]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [form, setForm] = useState(blank());

  const load = useCallback(async () => {
    try {
      const data = await getDispatchContacts();
      setContacts(data.contacts ?? []);
    } catch { Alert.alert('Error', 'Could not load contacts'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof ReturnType<typeof blank>) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const openModal = () => { setEditTarget(null); setForm(blank()); setModal(true); };

  const openEdit = (c: Contact) => {
    setEditTarget(c);
    setForm({ name: c.name, company: c.company ?? '', role: c.role, phone: c.phone ?? '', email: c.email ?? '', mcNumber: c.mcNumber ?? '', notes: c.notes ?? '' });
    setDetail(null);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const payload = {
      name: form.name.trim(), company: form.company.trim() || undefined,
      role: form.role, phone: form.phone.trim() || undefined, email: form.email.trim() || undefined,
      mcNumber: form.mcNumber.trim() || undefined, notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editTarget) { await updateDispatchContact(editTarget._id, payload); }
      else { await addDispatchContact(payload); }
      setModal(false);
      load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleFavorite = async (c: Contact) => {
    try {
      await toggleContactFavorite(c._id);
      load();
      if (detail?._id === c._id) setDetail({ ...detail, isFavorite: !detail.isFavorite });
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const handleDelete = (c: Contact) => {
    Alert.alert('Delete Contact', `Remove ${c.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDispatchContact(c._id); setDetail(null); load(); } },
    ]);
  };

  const callContact = (phone: string) => Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  const emailContact = (email: string) => Linking.openURL(`mailto:${email}`);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <FlatList
        data={contacts}
        keyExtractor={c => c._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          contacts.length > 0 ? (
            <Text style={s.countText}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={s.emptyText}>No contacts yet</Text>
            <Text style={s.emptySub}>Tap + to add a dispatcher or broker</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = ROLE_COLORS[item.role];
          return (
            <TouchableOpacity style={s.card} onPress={() => setDetail(item)} activeOpacity={0.8}>
              <View style={s.cardRow}>
                <View style={[s.avatar, { backgroundColor: color + '22' }]}>
                  <Text style={[s.avatarText, { color }]}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.cardName}>{item.name}</Text>
                    {item.isFavorite && <Ionicons name="star" size={14} color="#F1C40F" />}
                  </View>
                  {item.company ? <Text style={s.cardCompany}>{item.company}</Text> : null}
                  <View style={[s.roleBadge, { backgroundColor: color + '22', borderColor: color }]}>
                    <Text style={[s.roleText, { color }]}>{ROLE_LABELS[item.role]}</Text>
                  </View>
                </View>
                {item.phone ? (
                  <TouchableOpacity style={s.callBtn} onPress={() => callContact(item.phone!)}>
                    <Ionicons name="call-outline" size={20} color={Colors.secondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {item.phone || item.email ? (
                <View style={s.contactInfo}>
                  {item.phone ? <Text style={s.contactText}>{item.phone}</Text> : null}
                  {item.email ? <Text style={s.contactText}>{item.email}</Text> : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            {detail && (() => {
              const color = ROLE_COLORS[detail.role];
              return (
                <>
                  <View style={s.modalHeader}>
                    <View style={s.nameRow}>
                      <Text style={s.modalTitle}>{detail.name}</Text>
                      <TouchableOpacity onPress={() => handleFavorite(detail)}>
                        <Ionicons name={detail.isFavorite ? 'star' : 'star-outline'} size={22} color="#F1C40F" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setDetail(null)}>
                      <Ionicons name="close" size={24} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={[s.roleBadge, { backgroundColor: color + '22', borderColor: color, alignSelf: 'flex-start', marginBottom: 16 }]}>
                    <Text style={[s.roleText, { color }]}>{ROLE_LABELS[detail.role]}</Text>
                  </View>

                  {detail.company ? <Text style={s.detailSub}>{detail.company}</Text> : null}
                  {detail.mcNumber ? <Text style={s.detailSub}>MC# {detail.mcNumber}</Text> : null}
                  {detail.notes ? <Text style={[s.detailSub, { marginTop: 8, fontStyle: 'italic' }]}>{detail.notes}</Text> : null}

                  <View style={s.actionRow}>
                    {detail.phone ? (
                      <TouchableOpacity style={s.actionBtn} onPress={() => callContact(detail.phone!)}>
                        <Ionicons name="call" size={22} color={Colors.secondary} />
                        <Text style={s.actionText}>{detail.phone}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {detail.email ? (
                      <TouchableOpacity style={s.actionBtn} onPress={() => emailContact(detail.email!)}>
                        <Ionicons name="mail" size={22} color={Colors.secondary} />
                        <Text style={s.actionText}>{detail.email}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(detail)}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.white} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(detail)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      <Text style={[s.editBtnText, { color: Colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Contact' : 'Add Contact'}</Text>

              {[
                { label: 'Name *', key: 'name' as const, ph: 'John Smith' },
                { label: 'Company', key: 'company' as const, ph: 'XPO Logistics' },
                { label: 'Phone', key: 'phone' as const, ph: '555-000-0000', kbd: 'phone-pad' as const },
                { label: 'Email', key: 'email' as const, ph: 'contact@company.com', kbd: 'email-address' as const },
                { label: 'MC Number', key: 'mcNumber' as const, ph: 'MC123456' },
                { label: 'Notes', key: 'notes' as const, ph: 'Any notes...' },
              ].map(({ label, key, ph, kbd }) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} value={form[key]} onChangeText={set(key)} placeholder={ph} placeholderTextColor={Colors.textMuted} keyboardType={kbd ?? 'default'} autoCapitalize="none" />
                </View>
              ))}

              <Text style={s.inputLabel}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ROLES.map(r => (
                    <TouchableOpacity key={r} style={[s.rolePick, form.role === r && s.rolePickActive]} onPress={() => setForm(f => ({ ...f, role: r }))}>
                      <Text style={[s.rolePickText, form.role === r && s.rolePickTextActive]}>{ROLE_LABELS[r]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

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
