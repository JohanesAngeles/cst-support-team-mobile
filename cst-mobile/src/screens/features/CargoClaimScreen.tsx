import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

const ISSUE_TYPES = ['Damage', 'Shortage', 'Overage', 'Contamination', 'Theft', 'Late Delivery', 'Other'];
const STATUSES    = ['Draft', 'Filed', 'Under Review', 'Approved', 'Denied', 'Settled'] as const;
type ClaimStatus = typeof STATUSES[number];

interface Claim {
  _id: string;
  claimNumber: string;
  loadNumber?: string;
  incidentDate: string;
  shipper?: string;
  receiver?: string;
  issueType: string;
  description: string;
  estimatedLoss?: number;
  status: ClaimStatus;
  notes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  Draft: '#757575' as string,
  Filed: '#3498DB',
  'Under Review': '#F39C12',
  Approved: '#2ECC71',
  Denied: '#E74C3C',
  Settled: '#9B59B6',
};

const EMPTY_FORM = {
  loadNumber: '', incidentDate: new Date().toISOString().split('T')[0],
  shipper: '', receiver: '', issueType: ISSUE_TYPES[0],
  description: '', estimatedLoss: '', notes: '',
};

export default function CargoClaimScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    chip: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, alignItems: 'center', minWidth: 70 },
    chipCount: { fontSize: 18, fontWeight: '900' },
    chipLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 13 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    claimCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
    claimTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    claimNum: { color: Colors.text, fontWeight: '800', fontSize: 16 },
    claimLoad: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    statusPicker: { backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    statusPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusPickerText: { color: Colors.textMuted, fontSize: 13 },
    claimMeta: { flexDirection: 'row', gap: 16 },
    claimMetaItem: { gap: 2 },
    claimMetaLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    claimMetaVal: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    claimDesc: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
    claimActions: { flexDirection: 'row', gap: 4, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    modal: { flex: 1, backgroundColor: Colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalBody: { padding: 20, paddingBottom: 40 },
    fieldLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
    pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
    pickerBtnText: { color: Colors.text, fontSize: 14 },
    pickerList: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 14, overflow: 'hidden' },
    pickerItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    pickerItemText: { color: Colors.textMuted, fontSize: 14 },
    saveBtn: { backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  }), [Colors]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [issuePickerOpen, setIssuePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    client.get('/cargo-claims').then(r => setClaims(r.data.claims)).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (c: Claim) => {
    setEditing(c);
    setForm({
      loadNumber: c.loadNumber ?? '',
      incidentDate: c.incidentDate.split('T')[0],
      shipper: c.shipper ?? '', receiver: c.receiver ?? '',
      issueType: c.issueType, description: c.description,
      estimatedLoss: c.estimatedLoss?.toString() ?? '', notes: c.notes ?? '',
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.description.trim()) { Alert.alert('Required', 'Description is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, estimatedLoss: form.estimatedLoss ? parseFloat(form.estimatedLoss) : undefined };
      if (editing) {
        const r = await client.put(`/cargo-claims/${editing._id}`, payload);
        setClaims(cs => cs.map(c => c._id === editing._id ? r.data.claim : c));
      } else {
        const r = await client.post('/cargo-claims', payload);
        setClaims(cs => [r.data.claim, ...cs]);
      }
      setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (claim: Claim, status: ClaimStatus) => {
    try {
      const r = await client.put(`/cargo-claims/${claim._id}`, { status });
      setClaims(cs => cs.map(c => c._id === claim._id ? r.data.claim : c));
    } catch (e: any) { Alert.alert('Error', e.message); }
    setStatusPickerOpen(null);
  };

  const remove = (claim: Claim) => {
    Alert.alert('Delete Claim', `Delete ${claim.claimNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await client.delete(`/cargo-claims/${claim._id}`);
        setClaims(cs => cs.filter(c => c._id !== claim._id));
      }},
    ]);
  };

  const exportPDF = async (claim: Claim) => {
    try {
      const html = `
        <html><head><meta charset="utf-8"></head>
        <body style="font-family:Arial;padding:32px;max-width:700px;margin:auto;">
          <h1 style="color:#1A3A5C;border-bottom:3px solid #2C6EBD;padding-bottom:8px">
            CARGO CLAIM REPORT
          </h1>
          <table style="width:100%;margin-bottom:20px">
            <tr><td><b>Claim #:</b> ${claim.claimNumber}</td><td><b>Status:</b> ${claim.status}</td></tr>
            <tr><td><b>Load #:</b> ${claim.loadNumber || 'N/A'}</td><td><b>Incident Date:</b> ${new Date(claim.incidentDate).toLocaleDateString()}</td></tr>
            <tr><td><b>Issue Type:</b> ${claim.issueType}</td><td><b>Est. Loss:</b> ${claim.estimatedLoss ? '$' + claim.estimatedLoss.toLocaleString() : 'N/A'}</td></tr>
          </table>
          <p><b>Shipper:</b> ${claim.shipper || 'N/A'}</p>
          <p><b>Receiver/Consignee:</b> ${claim.receiver || 'N/A'}</p>
          <h3>Description</h3>
          <p style="background:#f5f5f5;padding:12px;border-radius:6px">${claim.description}</p>
          ${claim.notes ? `<h3>Notes</h3><p style="background:#f5f5f5;padding:12px;border-radius:6px">${claim.notes}</p>` : ''}
          <p style="margin-top:40px;color:#999;font-size:12px">
            Generated by Road Ready Network · ${new Date().toLocaleDateString()}
          </p>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Claim ${claim.claimNumber}` });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message ?? 'Could not generate PDF');
    }
  };


  const fld = (label: string, value: string, onChange: (v: string) => void, placeholder = '', multiline = false) => (
    <View key={label} style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.textMuted} multiline={multiline}
        keyboardType={label.includes('$') ? 'decimal-pad' : 'default'}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Summary chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {STATUSES.map(st => {
            const count = claims.filter(c => c.status === st).length;
            return (
              <View key={st} style={[s.chip, { borderColor: STATUS_COLORS[st] + '66' }]}>
                <Text style={[s.chipCount, { color: STATUS_COLORS[st] }]}>{count}</Text>
                <Text style={s.chipLabel}>{st}</Text>
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={s.addBtnText}>New Claim</Text>
        </TouchableOpacity>

        {loading
          ? <ActivityIndicator color={Colors.secondary} style={{ marginTop: 40 }} />
          : claims.length === 0
          ? (
            <View style={s.empty}>
              <Ionicons name="shield-checkmark-outline" size={56} color={Colors.border} />
              <Text style={s.emptyText}>No claims filed</Text>
              <Text style={s.emptySub}>Document cargo damage, shortages, or losses to protect your business</Text>
            </View>
          )
          : claims.map(claim => (
            <View key={claim._id} style={s.claimCard}>
              <View style={s.claimTop}>
                <View>
                  <Text style={s.claimNum}>{claim.claimNumber}</Text>
                  {claim.loadNumber ? <Text style={s.claimLoad}>Load #{claim.loadNumber}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[s.statusBadge, { backgroundColor: STATUS_COLORS[claim.status] + '22', borderColor: STATUS_COLORS[claim.status] }]}
                  onPress={() => setStatusPickerOpen(statusPickerOpen === claim._id ? null : claim._id)}
                >
                  <Text style={[s.statusText, { color: STATUS_COLORS[claim.status] }]}>{claim.status}</Text>
                  <Ionicons name="chevron-down" size={10} color={STATUS_COLORS[claim.status]} />
                </TouchableOpacity>
              </View>

              {/* Inline status picker */}
              {statusPickerOpen === claim._id && (
                <View style={s.statusPicker}>
                  {STATUSES.map(st => (
                    <TouchableOpacity key={st} style={s.statusPickerItem} onPress={() => updateStatus(claim, st)}>
                      <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[st] }]} />
                      <Text style={[s.statusPickerText, claim.status === st && { color: Colors.text, fontWeight: '700' }]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={s.claimMeta}>
                <View style={s.claimMetaItem}>
                  <Text style={s.claimMetaLabel}>Type</Text>
                  <Text style={s.claimMetaVal}>{claim.issueType}</Text>
                </View>
                <View style={s.claimMetaItem}>
                  <Text style={s.claimMetaLabel}>Date</Text>
                  <Text style={s.claimMetaVal}>{new Date(claim.incidentDate).toLocaleDateString()}</Text>
                </View>
                {claim.estimatedLoss ? (
                  <View style={s.claimMetaItem}>
                    <Text style={s.claimMetaLabel}>Est. Loss</Text>
                    <Text style={[s.claimMetaVal, { color: '#E74C3C' }]}>${claim.estimatedLoss.toLocaleString()}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={s.claimDesc} numberOfLines={2}>{claim.description}</Text>

              <View style={s.claimActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(claim)}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.secondary} />
                  <Text style={[s.actionBtnText, { color: Colors.secondary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => exportPDF(claim)}>
                  <Ionicons name="document-outline" size={14} color='#3498DB' />
                  <Text style={[s.actionBtnText, { color: '#3498DB' }]}>Export PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => remove(claim)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={[s.actionBtnText, { color: Colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        }
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editing ? 'Edit Claim' : 'New Cargo Claim'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            {fld('Load Number', form.loadNumber, v => setForm(f => ({ ...f, loadNumber: v })), 'e.g. 12345')}
            {fld('Incident Date *', form.incidentDate, v => setForm(f => ({ ...f, incidentDate: v })), 'YYYY-MM-DD')}
            {fld('Shipper', form.shipper, v => setForm(f => ({ ...f, shipper: v })), 'Company name')}
            {fld('Receiver / Consignee', form.receiver, v => setForm(f => ({ ...f, receiver: v })), 'Company name')}

            <Text style={s.fieldLabel}>Issue Type *</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setIssuePickerOpen(o => !o)}>
              <Text style={s.pickerBtnText}>{form.issueType}</Text>
              <Ionicons name={issuePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {issuePickerOpen && (
              <View style={s.pickerList}>
                {ISSUE_TYPES.map(t => (
                  <TouchableOpacity key={t} style={s.pickerItem} onPress={() => { setForm(f => ({ ...f, issueType: t })); setIssuePickerOpen(false); }}>
                    <Text style={[s.pickerItemText, form.issueType === t && { color: Colors.secondary, fontWeight: '700' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {fld('Description *', form.description, v => setForm(f => ({ ...f, description: v })), 'Describe what happened in detail...', true)}
            {fld('Estimated Loss ($)', form.estimatedLoss, v => setForm(f => ({ ...f, estimatedLoss: v })), '0.00')}
            {fld('Notes', form.notes, v => setForm(f => ({ ...f, notes: v })), 'Additional notes...', true)}

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.textDark} /> : <Text style={s.saveBtnText}>{editing ? 'Save Changes' : 'File Claim'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

