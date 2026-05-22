import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();

  const [editModal, setEditModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);

  // Edit profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const openEdit = () => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setEditSaving(true);
    try {
      const res = await authAPI.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(res.data.user);
      setEditModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error', 'All fields are required'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPw.length < 8) { Alert.alert('Error', 'New password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwModal(false);
      Alert.alert('Success', 'Password changed successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile',     onPress: openEdit },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => setPwModal(true) },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => Alert.alert('Coming Soon', 'Push notifications are coming in a future update.') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Support', 'Email us at support@cst-app.com') },
    { icon: 'document-text-outline', label: 'Terms & Privacy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ROAD READY NETWORK</Text>
          </View>
          {user?.isVerified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Ionicons name="alert-circle" size={14} color="#E67E22" />
              <Text style={styles.unverifiedText}>Email not verified</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
              <Ionicons name={item.icon as any} size={22} color={Colors.secondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.modalLabel}>Full Name *</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput style={styles.modalInput} value={phone} onChangeText={setPhone} placeholder="Optional" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, editSaving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={editSaving}>
                {editSaving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Password</Text>

            {[
              { label: 'Current Password', val: currentPw, set: setCurrentPw },
              { label: 'New Password (min 8 chars)', val: newPw, set: setNewPw },
              { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw },
            ].map(({ label, val, set }) => (
              <View key={label}>
                <Text style={styles.modalLabel}>{label}</Text>
                <View style={styles.pwInputWrap}>
                  <TextInput
                    style={styles.pwInput} value={val} onChangeText={set}
                    placeholder="••••••••" placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPw}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.showPwBtn}>
              <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={16} color={Colors.textMuted} />
              <Text style={styles.showPwText}>{showPw ? 'Hide' : 'Show'} passwords</Text>
            </TouchableOpacity>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPwModal(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, pwSaving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.confirmText}>Change</Text>}
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
  header: { alignItems: 'center', padding: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, borderWidth: 3, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.secondary, fontSize: 32, fontWeight: '900' },
  name: { color: Colors.white, fontSize: 22, fontWeight: '800', marginTop: 12 },
  email: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  phone: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  badge: { marginTop: 10, backgroundColor: Colors.secondary + '22', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: Colors.secondary },
  badgeText: { color: Colors.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  verifiedText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
  unverifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  unverifiedText: { color: '#E67E22', fontSize: 12, fontWeight: '600' },
  menu: { paddingHorizontal: 20, gap: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  menuLabel: { flex: 1, color: Colors.white, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, marginBottom: 32 },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  pwInputWrap: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  pwInput: { padding: 12, color: Colors.white, fontSize: 15 },
  showPwBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  showPwText: { color: Colors.textMuted, fontSize: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: Colors.textDark, fontWeight: '800' },
});
