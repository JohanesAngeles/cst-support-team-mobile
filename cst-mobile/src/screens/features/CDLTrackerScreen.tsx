import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

const DOC_TYPES = [
  'CDL Class A', 'CDL Class B', 'CDL Class C',
  'Medical Certificate', 'HAZMAT Endorsement', 'TWIC Card',
  'Tanker Endorsement', 'Doubles/Triples', 'Passport', 'Other',
];

interface CDLDoc {
  _id: string;
  docType: string;
  licenseNumber?: string;
  issuingState?: string;
  issueDate?: string;
  expirationDate: string;
  notes?: string;
}

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const statusFor = (days: number) => {
  if (days < 0)   return { label: 'EXPIRED',  color: '#E74C3C' };
  if (days <= 30) return { label: 'CRITICAL',  color: '#E74C3C' };
  if (days <= 90) return { label: 'EXPIRING',  color: '#F39C12' };
  return              { label: 'VALID',      color: '#2ECC71' };
};

const EMPTY_FORM = { docType: DOC_TYPES[0], licenseNumber: '', issuingState: '', issueDate: '', expirationDate: '', notes: '' };

export default function CDLTrackerScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryCard: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 10,
      alignItems: 'center', gap: 2, borderWidth: 1,
    },
    summaryCount: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 13,
    },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    docCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, gap: 8,
    },
    docTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    docInfo: { flex: 1 },
    docType: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    docSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: '800' },
    docMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    docMetaText: { color: Colors.textMuted, fontSize: 13 },
    docNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    docActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    editBtnText: { color: Colors.secondary, fontSize: 13, fontWeight: '600' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    deleteBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
    modal: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalBody: { padding: 20, paddingBottom: 40 },
    fieldLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
      borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14,
      paddingVertical: 12, fontSize: 14,
    },
    pickerBtn: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
      borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    },
    pickerBtnText: { color: Colors.text, fontSize: 14 },
    pickerList: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 14, overflow: 'hidden' },
    pickerItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    pickerItemText: { color: Colors.textMuted, fontSize: 14 },
    saveBtn: { backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  }), [Colors]);
  const [docs, setDocs] = useState<CDLDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CDLDoc | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    client.get('/cdl-docs').then(r => setDocs(r.data.docs)).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (doc: CDLDoc) => {
    setEditing(doc);
    setForm({
      docType: doc.docType,
      licenseNumber: doc.licenseNumber ?? '',
      issuingState: doc.issuingState ?? '',
      issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
      expirationDate: doc.expirationDate.split('T')[0],
      notes: doc.notes ?? '',
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.expirationDate) { Alert.alert('Required', 'Expiration date is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const r = await client.put(`/cdl-docs/${editing._id}`, form);
        setDocs(d => d.map(x => x._id === editing._id ? r.data.doc : x));
      } else {
        const r = await client.post('/cdl-docs', form);
        setDocs(d => [...d, r.data.doc].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()));
      }
      setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const remove = (doc: CDLDoc) => {
    Alert.alert('Delete', `Remove ${doc.docType}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await client.delete(`/cdl-docs/${doc._id}`);
        setDocs(d => d.filter(x => x._id !== doc._id));
      }},
    ]);
  };

  const expired  = docs.filter(d => daysUntil(d.expirationDate) < 0).length;
  const critical = docs.filter(d => { const x = daysUntil(d.expirationDate); return x >= 0 && x <= 30; }).length;
  const expiring = docs.filter(d => { const x = daysUntil(d.expirationDate); return x > 30 && x <= 90; }).length;


  const field = (label: string, value: string, onChange: (v: string) => void, placeholder = '', multiline = false) => (
    <View key={label} style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.textMuted} multiline={multiline}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Summary bar */}
        <View style={s.summaryRow}>
          {[
            { label: 'Expired',  count: expired,  color: '#E74C3C' },
            { label: 'Critical', count: critical, color: '#F39C12' },
            { label: 'Expiring', count: expiring, color: '#F1C40F' },
            { label: 'Valid',    count: docs.length - expired - critical - expiring, color: '#2ECC71' },
          ].map(item => (
            <View key={item.label} style={[s.summaryCard, { borderColor: item.color + '44' }]}>
              <Text style={[s.summaryCount, { color: item.color }]}>{item.count}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={s.addBtnText}>Add Document</Text>
        </TouchableOpacity>

        {loading
          ? <ActivityIndicator color={Colors.secondary} style={{ marginTop: 40 }} />
          : docs.length === 0
          ? (
            <View style={s.empty}>
              <Ionicons name="id-card-outline" size={56} color={Colors.border} />
              <Text style={s.emptyText}>No documents yet</Text>
              <Text style={s.emptySub}>Add your CDL, medical cert, and endorsements to track expiration dates</Text>
            </View>
          )
          : docs.map(doc => {
              const days = daysUntil(doc.expirationDate);
              const st = statusFor(days);
              return (
                <View key={doc._id} style={[s.docCard, { borderLeftColor: st.color }]}>
                  <View style={s.docTop}>
                    <View style={s.docInfo}>
                      <Text style={s.docType}>{doc.docType}</Text>
                      {doc.licenseNumber ? <Text style={s.docSub}>#{doc.licenseNumber}{doc.issuingState ? ` · ${doc.issuingState}` : ''}</Text> : null}
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: st.color + '22', borderColor: st.color }]}>
                      <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>

                  <View style={s.docMeta}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                    <Text style={s.docMetaText}>
                      Expires {new Date(doc.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {'  '}
                      <Text style={{ color: st.color, fontWeight: '700' }}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                      </Text>
                    </Text>
                  </View>

                  {doc.notes ? <Text style={s.docNotes}>{doc.notes}</Text> : null}

                  <View style={s.docActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(doc)}>
                      <Ionicons name="pencil-outline" size={14} color={Colors.secondary} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => remove(doc)}>
                      <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                      <Text style={s.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
        }
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editing ? 'Edit Document' : 'Add Document'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {/* Doc type picker */}
            <Text style={s.fieldLabel}>Document Type *</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setTypePickerOpen(o => !o)}>
              <Text style={s.pickerBtnText}>{form.docType}</Text>
              <Ionicons name={typePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {typePickerOpen && (
              <View style={s.pickerList}>
                {DOC_TYPES.map(t => (
                  <TouchableOpacity key={t} style={s.pickerItem} onPress={() => { setForm(f => ({ ...f, docType: t })); setTypePickerOpen(false); }}>
                    <Text style={[s.pickerItemText, form.docType === t && { color: Colors.secondary, fontWeight: '700' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {field('License / Doc Number', form.licenseNumber, v => setForm(f => ({ ...f, licenseNumber: v })), 'e.g. D12345678')}
            {field('Issuing State', form.issuingState, v => setForm(f => ({ ...f, issuingState: v })), 'e.g. TX')}
            {field('Issue Date', form.issueDate, v => setForm(f => ({ ...f, issueDate: v })), 'YYYY-MM-DD')}
            {field('Expiration Date *', form.expirationDate, v => setForm(f => ({ ...f, expirationDate: v })), 'YYYY-MM-DD')}
            {field('Notes', form.notes, v => setForm(f => ({ ...f, notes: v })), 'Optional notes', true)}

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.textDark} /> : <Text style={s.saveBtnText}>{editing ? 'Save Changes' : 'Add Document'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

