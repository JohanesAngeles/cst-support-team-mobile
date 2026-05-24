import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../../api/features';

interface Contact {
  _id: string;
  name: string;
  phone: string;
  relationship: string;
}

const RELATIONSHIPS = ['Spouse', 'Family', 'Dispatcher', 'Attorney', 'Friend', 'Other'];

const REL_COLORS: Record<string, string> = {
  Spouse: '#E74C3C', Family: '#E67E22', Dispatcher: '#3498DB',
  Attorney: '#9B59B6', Friend: '#2ECC71', Other: '#95A5A6',
};

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Spouse');

  const load = useCallback(async () => {
    try {
      const data = await getEmergencyContacts();
      setContacts(Array.isArray(data) ? data : []);
    } catch { Alert.alert('Error', 'Could not load contacts'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setName(''); setPhone(''); setRelationship('Spouse');
    setModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Error', 'Name and phone are required'); return; }
    setSaving(true);
    try {
      await addEmergencyContact({ name: name.trim(), phone: phone.trim(), relationship });
      setModal(false);
      load();
    } catch { Alert.alert('Error', 'Failed to save contact'); }
    finally { setSaving(false); }
  };

  const handleDelete = (contact: Contact) => {
    Alert.alert('Remove Contact', `Remove ${contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteEmergencyContact(contact._id); load(); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.danger} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={contacts}
        keyExtractor={c => c._id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
            <Text style={styles.infoText}>
              During an SOS, tap "Text Location" to instantly send your GPS coordinates to these contacts.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No emergency contacts</Text>
            <Text style={styles.emptySub}>
              Add contacts so you can text them your GPS location in one tap during an emergency.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = REL_COLORS[item.relationship] ?? '#95A5A6';
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item)} activeOpacity={0.85}>
              <View style={[styles.avatar, { backgroundColor: color + '22' }]}>
                <Text style={[styles.avatarText, { color }]}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardPhone}>{item.phone}</Text>
              </View>
              <View style={[styles.relBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                <Text style={[styles.relText, { color }]}>{item.relationship}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>

            <Text style={styles.modalLabel}>Full Name *</Text>
            <TextInput
              style={styles.input} value={name} onChangeText={setName}
              placeholder="e.g. Sarah Johnson" placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.modalLabel}>Relationship</Text>
            <View style={styles.relGrid}>
              {RELATIONSHIPS.map(r => {
                const rc = REL_COLORS[r] ?? '#95A5A6';
                const active = relationship === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.relChip, active && { backgroundColor: rc + '33', borderColor: rc }]}
                    onPress={() => setRelationship(r)}
                  >
                    <Text style={[styles.relChipText, active && { color: rc, fontWeight: '700' }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.hintText}>Long-press a contact to remove it</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveText}>Save Contact</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.secondary + '18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.secondary + '44', marginBottom: 16 },
  infoText: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900' },
  cardBody: { flex: 1, gap: 2 },
  cardName: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  cardPhone: { color: Colors.textMuted, fontSize: 13 },
  relBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  relText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.white, fontSize: 14 },
  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relChip: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  relChipText: { color: Colors.textMuted, fontSize: 12 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  hintText: { color: Colors.textMuted, fontSize: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Colors.danger, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '800' },
});
