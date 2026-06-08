import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getDocuments, uploadDocument, deleteDocument } from '../../api/features';

interface Doc {
  _id: string;
  name: string;
  icon: string;
  status: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  expiryDate?: string;
}

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

const expiryBadge = (doc: Doc): { label: string; color: string } | null => {
  if (!doc.expiryDate) return null;
  const days = daysUntil(doc.expiryDate);
  if (days < 0) return { label: 'EXPIRED', color: '#E74C3C' };
  if (days <= 30) return { label: `${days}d left`, color: '#E67E22' };
  return null;
};

const DOC_CATEGORIES = [
  { icon: 'shield-outline',           label: 'Insurance',     color: '#27AE60' },
  { icon: 'card-outline',             label: 'License',       color: '#3498DB' },
  { icon: 'document-text-outline',    label: 'Registration',  color: '#9B59B6' },
  { icon: 'reader-outline',           label: 'Permit',        color: '#E67E22' },
  { icon: 'checkmark-circle-outline', label: 'BOL',           color: '#1ABC9C' },
  { icon: 'folder-outline',           label: 'Other',         color: '#7F8C8D' },
];

const catMeta = (icon: string) =>
  DOC_CATEGORIES.find(c => c.icon === icon) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1];

const fmtSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fileLabel = (type: string) => {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('png')) return 'PNG';
  if (type.includes('jpg') || type.includes('jpeg')) return 'JPG';
  if (type.includes('webp')) return 'WEBP';
  return 'FILE';
};

export default function DocumentVaultScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    list: { padding: 16, paddingBottom: 100 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: 'center', gap: 4 },
    summaryValue: { color: Colors.text, fontSize: 18, fontWeight: '900' },
    summaryLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    docIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardBody: { flex: 1, gap: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    docName: { color: Colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
    fileTypeBadge: { backgroundColor: Colors.secondary + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.secondary },
    fileTypeText: { color: Colors.secondary, fontSize: 9, fontWeight: '900' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: Colors.textMuted, fontSize: 11 },
    metaDot: { color: Colors.textMuted, fontSize: 11 },
    openBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.secondary + '1A', borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 14 },
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    filePicker: { backgroundColor: Colors.surfaceLight, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
    filePickerEmpty: { alignItems: 'center', gap: 6, padding: 24 },
    filePickerText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
    filePickerSub: { color: Colors.textMuted, fontSize: 12 },
    filePickedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    filePickedName: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    filePickedType: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 6 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catOption: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
    catLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    uploadBtn: { flex: 2, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    uploadText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
  }), [Colors]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [docName, setDocName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('document-text-outline');
  const [expiryDate, setExpiryDate] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; type: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDocuments();
      setDocs(Array.isArray(data) ? data : []);
    } catch { Alert.alert('Error', 'Failed to load documents'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setPickedFile({
        uri: asset.uri,
        type: asset.mimeType ?? 'application/octet-stream',
        name: asset.name ?? 'document',
      });
      if (!docName.trim()) {
        setDocName(asset.name?.replace(/\.[^.]+$/, '') ?? '');
      }
    } catch { Alert.alert('Error', 'Could not open file picker'); }
  };

  const openModal = (icon?: string) => {
    setDocName(''); setSelectedIcon(icon ?? 'document-text-outline'); setExpiryDate(''); setPickedFile(null);
    setModal(true);
  };

  const handleUpload = async () => {
    if (!docName.trim()) { Alert.alert('Error', 'Document name is required'); return; }
    if (!pickedFile) { Alert.alert('Error', 'Please pick a file to upload'); return; }
    setUploading(true);
    try {
      await uploadDocument(docName.trim(), pickedFile, expiryDate.trim() || undefined);
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.response?.data?.message ?? err.message ?? 'Unknown error');
    } finally { setUploading(false); }
  };

  const handleOpen = async (doc: Doc) => {
    if (!doc.fileUrl) { Alert.alert('No File', 'This document has no file attached.'); return; }
    try { await Linking.openURL(doc.fileUrl); }
    catch { Alert.alert('Error', 'Could not open document'); }
  };

  const handleDelete = (doc: Doc) => {
    Alert.alert('Delete Document', `Remove "${doc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteDocument(doc._id); load(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={docs}
        keyExtractor={d => d._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View>
            {/* Page header */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '900' }}>Document Vault</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 3 }}>
                Keep your trucking docs safe & accessible
              </Text>
            </View>

            {/* Stats row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Ionicons name="folder-outline" size={18} color={Colors.secondary} />
                <Text style={styles.summaryValue}>{docs.length}</Text>
                <Text style={styles.summaryLabel}>Documents</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="cloud-done-outline" size={18} color={Colors.success} />
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  {docs.filter(d => d.fileUrl).length}
                </Text>
                <Text style={styles.summaryLabel}>Uploaded</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="shield-checkmark-outline" size={18} color='#3498DB' />
                <Text style={[styles.summaryValue, { color: '#3498DB' }]}>
                  {docs.filter(d => d.status === 'Active').length}
                </Text>
                <Text style={styles.summaryLabel}>Active</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 8 }}>
            {/* Category quick-add grid */}
            <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 }}>
              Start by adding a document
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {DOC_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.icon}
                  style={{
                    width: '47%',
                    backgroundColor: Colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    gap: 10,
                  }}
                  onPress={() => { setSelectedIcon(c.icon); openModal(); }}
                  activeOpacity={0.75}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={c.icon as any} size={22} color={c.color} />
                  </View>
                  <View>
                    <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '700' }}>{c.label}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {c.label === 'Insurance'    ? 'Policy, card, proof'    :
                       c.label === 'License'      ? 'CDL, medical card'      :
                       c.label === 'Registration' ? 'Truck & trailer reg'    :
                       c.label === 'Permit'       ? 'IFTA, oversize, fuel'   :
                       c.label === 'BOL'          ? 'Bills of lading, PODs'  :
                       'Contracts, receipts, etc'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="add-circle-outline" size={14} color={c.color} />
                    <Text style={{ color: c.color, fontSize: 12, fontWeight: '700' }}>Add</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Why store docs tip */}
            <View style={{ backgroundColor: '#EEF6FF', borderRadius: 14, padding: 16, marginTop: 20, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#C8DEFF' }}>
              <Ionicons name="information-circle-outline" size={22} color='#3498DB' style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1A3A6E', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                  Why store docs here?
                </Text>
                <Text style={{ color: '#4A6FA0', fontSize: 12, lineHeight: 18 }}>
                  Access your CDL, insurance, and permits instantly during roadside inspections — even offline.
                  Set expiry dates and get alerts before they lapse.
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = catMeta(item.icon);
          const hasFile = !!item.fileUrl;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleOpen(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.docIcon, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={item.icon as any} size={24} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
                  {hasFile && (
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>{fileLabel(item.fileType)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{fmtDate(item.createdAt)}</Text>
                  {item.fileSize > 0 && (
                    <><Text style={styles.metaDot}>·</Text><Text style={styles.metaText}>{fmtSize(item.fileSize)}</Text></>
                  )}
                  {(() => { const b = expiryBadge(item); return b ? (
                    <><Text style={styles.metaDot}>·</Text>
                    <Text style={[styles.metaText, { color: b.color, fontWeight: '700' }]}>{b.label}</Text></>
                  ) : null; })()}
                </View>
              </View>
              {hasFile ? (
                <View style={styles.openBtn}>
                  <Ionicons name="open-outline" size={16} color={Colors.secondary} />
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={docs.length > 0 ? (
          <Text style={styles.hint}>Tap to open · Long-press to delete</Text>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Upload Document</Text>

            {/* File picker */}
            <TouchableOpacity style={styles.filePicker} onPress={openPicker}>
              {pickedFile ? (
                <View style={styles.filePickedRow}>
                  <Ionicons name="document-attach-outline" size={22} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filePickedName} numberOfLines={1}>{pickedFile.name}</Text>
                    <Text style={styles.filePickedType}>{fileLabel(pickedFile.type)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPickedFile(null)}>
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filePickerEmpty}>
                  <Ionicons name="cloud-upload-outline" size={32} color={Colors.secondary} />
                  <Text style={styles.filePickerText}>Tap to pick a PDF or image</Text>
                  <Text style={styles.filePickerSub}>Max 15 MB</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Document Name *</Text>
            <TextInput
              style={styles.modalInput} value={docName} onChangeText={setDocName}
              placeholder="e.g. CDL License, Insurance Card..." placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>Expiry Date (optional)</Text>
            <TextInput
              style={styles.modalInput} value={expiryDate} onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catGrid}>
              {DOC_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.icon}
                  style={[styles.catOption, selectedIcon === c.icon && { backgroundColor: c.color + '33', borderColor: c.color }]}
                  onPress={() => setSelectedIcon(c.icon)}
                >
                  <Ionicons name={c.icon as any} size={18} color={selectedIcon === c.icon ? c.color : Colors.textMuted} />
                  <Text style={[styles.catLabel, selectedIcon === c.icon && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBtn, (uploading || !pickedFile) && { opacity: 0.5 }]}
                onPress={handleUpload}
                disabled={uploading || !pickedFile}
              >
                {uploading
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <><Ionicons name="cloud-upload-outline" size={16} color={Colors.textDark} /><Text style={styles.uploadText}>Upload</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
