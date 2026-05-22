import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getDocuments, addDocument, deleteDocument } from '../../api/features';

interface Doc {
  _id: string;
  name: string;
  icon: string;
  status: string;
}

const ICON_OPTIONS = [
  { icon: 'shield-outline', label: 'Insurance' },
  { icon: 'card-outline', label: 'License' },
  { icon: 'document-outline', label: 'Document' },
  { icon: 'reader-outline', label: 'Registration' },
  { icon: 'checkmark-circle-outline', label: 'Confirmation' },
  { icon: 'folder-outline', label: 'Folder' },
];

export default function DocumentVaultScreen() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('document-outline');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocs(data);
    } catch {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Document name is required'); return; }
    setSaving(true);
    try {
      await addDocument({ name: name.trim(), icon: selectedIcon });
      setName(''); setSelectedIcon('document-outline');
      setModalVisible(false);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to add document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, docName: string) => {
    Alert.alert('Delete Document', `Remove "${docName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteDocument(id); await load(); } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Document Vault</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      {docs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No documents stored yet</Text>
          <Text style={styles.emptySubText}>Add your CDL, insurance, permits, and more</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>Add First Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.docCard} onLongPress={() => handleDelete(item._id, item.name)}>
              <View style={styles.docIcon}>
                <Ionicons name={item.icon as any} size={24} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docStatus}>{item.status}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {docs.length > 0 && <Text style={styles.hint}>Long-press to delete a document</Text>}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Document</Text>

            <Text style={styles.modalLabel}>Document Name *</Text>
            <TextInput
              style={styles.modalInput} value={name} onChangeText={setName}
              placeholder="e.g. Insurance Card" placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(({ icon, label }) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, selectedIcon === icon && styles.iconOptionActive]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons name={icon as any} size={22} color={selectedIcon === icon ? Colors.textDark : Colors.secondary} />
                  <Text style={[styles.iconLabel, selectedIcon === icon && { color: Colors.textDark }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Add</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  addBtn: { backgroundColor: Colors.secondary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, gap: 10 },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  docIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  docName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  docStatus: { color: Colors.success, fontSize: 12, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: Colors.textDark, fontWeight: '700' },
  hint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', paddingBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 6 },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4, width: '30%', borderWidth: 1, borderColor: Colors.border },
  iconOptionActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  iconLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: Colors.textDark, fontWeight: '800' },
});
