import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, Switch, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { useTheme, ColorMode } from '../../context/ThemeContext';
import { BIOMETRIC_STORAGE_KEY } from '../../components/BiometricLock';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const PLAN_LABEL: Record<string, string> = {
  active:    'PRO',
  free:      'FREE',
  cancelled: 'CANCELLED',
  past_due:  'PAST DUE',
};

export default function ProfileScreen() {
  const { user, logout, updateUser, resetOnboarding } = useAuth();
  const { theme, mode, setMode, isDark } = useTheme();
  const navigation = useNavigation<Nav>();

  const [editModal,      setEditModal]      = useState(false);
  const [pwModal,        setPwModal]        = useState(false);
  const [deleteModal,    setDeleteModal]    = useState(false);
  const [name,           setName]           = useState('');
  const [phone,          setPhone]          = useState('');
  const [editSaving,     setEditSaving]     = useState(false);
  const [currentPw,      setCurrentPw]      = useState('');
  const [newPw,          setNewPw]          = useState('');
  const [confirmPw,      setConfirmPw]      = useState('');
  const [showPw,         setShowPw]         = useState(false);
  const [pwSaving,       setPwSaving]       = useState(false);
  const [deletePw,       setDeletePw]       = useState('');
  const [showDeletePw,   setShowDeletePw]   = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [resending,      setResending]      = useState(false);

  // Biometric
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled,   setBiometricEnabled]   = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(has => {
      if (!has) return;
      LocalAuthentication.isEnrolledAsync().then(enrolled => setBiometricAvailable(enrolled));
    });
    AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY).then(v => setBiometricEnabled(v === 'true'));
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to enable biometric lock',
        cancelLabel: 'Cancel',
      });
      if (!result.success) return;
    }
    await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, String(value));
    setBiometricEnabled(value);
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Camera',          onPress: () => pickImage('camera') },
      { text: 'Photo Library',   onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const permFn = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please enable access in Settings.');
      return;
    }

    const launchFn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarLoading(true);
    try {
      const res = await authAPI.uploadAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      updateUser(res.data.user);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Could not upload photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  // ── Edit profile ───────────────────────────────────────────────────────────
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

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error', 'All fields are required'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPw.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
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

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePw) { Alert.alert('Error', 'Enter your password to confirm deletion'); return; }
    setDeleting(true);
    try {
      await authAPI.deleteAccount(deletePw);
      setDeleteModal(false);
      await logout();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  // ── Resend verification email ──────────────────────────────────────────────
  const handleResendVerification = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification();
      Alert.alert('Email sent', 'Check your inbox for the 6-digit verification code.',
        [{ text: 'Verify Now', onPress: () => navigation.navigate('VerifyEmail') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not send verification email');
    } finally {
      setResending(false);
    }
  };

  // ── Theme + styles ─────────────────────────────────────────────────────────
  const bg     = theme.background;
  const surf   = theme.surface;
  const surfL  = theme.surfaceLight;
  const border = theme.border;
  const text   = theme.text;
  const muted  = theme.textMuted;
  const gold   = theme.secondary;

  const subStatus = user?.subscriptionStatus ?? 'free';
  const isPro     = subStatus === 'active';
  const planLabel = PLAN_LABEL[subStatus] ?? 'FREE';

  const menuItems = [
    { icon: 'bus-outline',           label: 'My Truck',         onPress: () => navigation.navigate('TruckProfile') },
    { icon: 'card-outline',          label: 'Subscription',     onPress: () => navigation.navigate('Subscription') },
    { icon: 'person-outline',        label: 'Edit Profile',     onPress: openEdit },
    { icon: 'lock-closed-outline',   label: 'Change Password',  onPress: () => setPwModal(true) },
    { icon: 'notifications-outline', label: 'Notifications',    onPress: () => navigation.navigate('Notifications') },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => Linking.openURL('mailto:support@commercialsupporttech.com?subject=CST%20App%20Support'),
    },
    { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => navigation.navigate('Terms') },
    { icon: 'shield-outline',        label: 'Privacy Policy',   onPress: () => navigation.navigate('Privacy') },
    {
      icon: 'play-circle-outline',
      label: 'Replay App Tour',
      onPress: () => Alert.alert('Replay Tour?', 'This will show the onboarding tour again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: resetOnboarding },
      ]),
    },
  ];

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[s.header, { backgroundColor: isDark ? '#011628' : '#EEF3F8' }]}>

          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={handleAvatarPress} activeOpacity={0.8}>
            {avatarLoading ? (
              <View style={[s.avatar, { backgroundColor: theme.primary, borderColor: gold }]}>
                <ActivityIndicator color={gold} />
              </View>
            ) : user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={[s.avatar, { borderColor: gold }]} />
            ) : (
              <View style={[s.avatar, { backgroundColor: theme.primary, borderColor: gold }]}>
                <Text style={[s.avatarText, { color: gold }]}>{initials}</Text>
              </View>
            )}
            <View style={[s.cameraBtn, { backgroundColor: gold }]}>
              <Ionicons name="camera" size={12} color="#021B3A" />
            </View>
          </TouchableOpacity>

          <Text style={[s.name, { color: text }]}>{user?.name}</Text>
          <Text style={[s.email, { color: muted }]}>{user?.email}</Text>
          {user?.phone ? <Text style={[s.phone, { color: muted }]}>{user.phone}</Text> : null}

          {/* Subscription badge */}
          <View style={[s.badge,
            { backgroundColor: isPro ? gold + '22' : surfL, borderColor: isPro ? gold : border }]}>
            {isPro && <Ionicons name="star" size={11} color={gold} style={{ marginRight: 4 }} />}
            <Text style={[s.badgeText, { color: isPro ? gold : muted }]}>
              {isPro ? `CST PRO · ${user?.subscriptionPlan === 'annual' ? 'Annual' : 'Monthly'}` : 'FREE PLAN'}
            </Text>
          </View>

          {/* Verification status */}
          {user?.isVerified ? (
            <View style={s.verifiedRow}>
              <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
              <Text style={[s.verifiedText, { color: '#2ECC71' }]}>Email verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.verifyBanner, { backgroundColor: '#E67E2218', borderColor: '#E67E22' }]}
              onPress={handleResendVerification}
              disabled={resending}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={14} color="#E67E22" />
              <Text style={s.verifyBannerText}>Email not verified</Text>
              {resending
                ? <ActivityIndicator size="small" color="#E67E22" style={{ marginLeft: 8 }} />
                : <Text style={s.verifyAction}>Tap to verify →</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surf, borderColor: border }]}>
          <Text style={[s.sectionLabel, { color: text }]}>Appearance</Text>
          <View style={s.themeRow}>
            {([
              { id: 'light',  icon: 'sunny-outline',          label: 'Light'  },
              { id: 'dark',   icon: 'moon-outline',           label: 'Dark'   },
              { id: 'system', icon: 'phone-portrait-outline', label: 'System' },
            ] as { id: ColorMode; icon: string; label: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.themeBtn, { backgroundColor: surfL, borderColor: border },
                  mode === opt.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setMode(opt.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={opt.icon as any} size={16} color={mode === opt.id ? '#FFFFFF' : muted} />
                <Text style={[s.themeBtnTxt, { color: mode === opt.id ? '#FFFFFF' : muted }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Security ───────────────────────────────────────────────────── */}
        {biometricAvailable && (
          <View style={[s.card, { backgroundColor: surf, borderColor: border }]}>
            <Text style={[s.sectionLabel, { color: text }]}>Security</Text>
            <View style={[s.settingRow, { borderColor: border }]}>
              <View style={[s.settingIcon, { backgroundColor: gold + '1A' }]}>
                <Ionicons name="finger-print-outline" size={20} color={gold} />
              </View>
              <View style={s.settingBody}>
                <Text style={[s.settingLabel, { color: text }]}>Biometric Lock</Text>
                <Text style={[s.settingSub, { color: muted }]}>Require Face ID / fingerprint on return</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: border, true: gold }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}

        {/* ── Menu ───────────────────────────────────────────────────────── */}
        <View style={[s.menuSection, { backgroundColor: surf, borderColor: border }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, { borderBottomColor: border },
                idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon as any} size={20} color={gold} />
              <Text style={[s.menuLabel, { color: text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ─────────────────────────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#CC0000" />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* ── Delete Account ──────────────────────────────────────────────── */}
        <TouchableOpacity style={s.deleteBtn} onPress={() => { setDeletePw(''); setDeleteModal(true); }}>
          <Ionicons name="trash-outline" size={16} color={muted} />
          <Text style={[s.deleteBtnText, { color: muted }]}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────────────────── */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: surf }]}>
            <Text style={[s.modalTitle, { color: text }]}>Edit Profile</Text>
            <Text style={[s.modalLabel, { color: muted }]}>Full Name *</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: surfL, color: text, borderColor: border }]}
              value={name} onChangeText={setName}
              placeholder="Your name" placeholderTextColor={muted}
            />
            <Text style={[s.modalLabel, { color: muted }]}>Phone Number</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: surfL, color: text, borderColor: border }]}
              value={phone} onChangeText={setPhone}
              placeholder="Optional" placeholderTextColor={muted} keyboardType="phone-pad"
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: surfL }]} onPress={() => setEditModal(false)}>
                <Text style={[s.cancelText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: gold }, editSaving && { opacity: 0.6 }]}
                onPress={handleSaveProfile} disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator size="small" color="#021B3A" />
                  : <Text style={s.confirmText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Modal ────────────────────────────────────────── */}
      <Modal visible={deleteModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: surf }]}>
            <View style={s.deleteWarningHeader}>
              <Ionicons name="warning-outline" size={28} color="#CC0000" />
              <Text style={[s.modalTitle, { color: '#CC0000', marginBottom: 0 }]}>Delete Account</Text>
            </View>
            <Text style={[s.deleteWarningText, { color: muted }]}>
              This will permanently delete your account and all associated data — trips, expenses, documents, and everything else. This cannot be undone.
            </Text>
            <Text style={[s.modalLabel, { color: muted }]}>Enter your password to confirm</Text>
            <View style={[s.modalInput, { backgroundColor: surfL, borderColor: '#CC000055', flexDirection: 'row', alignItems: 'center', paddingRight: 8 }]}>
              <TextInput
                style={{ flex: 1, color: text, fontSize: 15 }}
                value={deletePw}
                onChangeText={setDeletePw}
                placeholder="Your password"
                placeholderTextColor={muted}
                secureTextEntry={!showDeletePw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowDeletePw(v => !v)}>
                <Ionicons name={showDeletePw ? 'eye-outline' : 'eye-off-outline'} size={18} color={muted} />
              </TouchableOpacity>
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { backgroundColor: surfL }]}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={[s.cancelText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: '#CC0000' }, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={[s.confirmText, { color: '#FFFFFF' }]}>Delete Forever</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Change Password Modal ───────────────────────────────────────── */}
      <Modal visible={pwModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: surf }]}>
            <Text style={[s.modalTitle, { color: text }]}>Change Password</Text>
            {[
              { label: 'Current Password',           val: currentPw, set: setCurrentPw },
              { label: 'New Password (min 8 chars)', val: newPw,      set: setNewPw      },
              { label: 'Confirm New Password',       val: confirmPw,  set: setConfirmPw  },
            ].map(({ label, val, set }) => (
              <View key={label}>
                <Text style={[s.modalLabel, { color: muted }]}>{label}</Text>
                <TextInput
                  style={[s.modalInput, { backgroundColor: surfL, color: text, borderColor: border }]}
                  value={val} onChangeText={set}
                  placeholder="••••••••" placeholderTextColor={muted}
                  secureTextEntry={!showPw}
                />
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.showPwBtn}>
              <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={16} color={muted} />
              <Text style={[s.showPwTxt, { color: muted }]}>{showPw ? 'Hide' : 'Show'} passwords</Text>
            </TouchableOpacity>
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { backgroundColor: surfL }]}
                onPress={() => { setPwModal(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
              >
                <Text style={[s.cancelText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: gold }, pwSaving && { opacity: 0.6 }]}
                onPress={handleChangePassword} disabled={pwSaving}
              >
                {pwSaving
                  ? <ActivityIndicator size="small" color="#021B3A" />
                  : <Text style={s.confirmText}>Change</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header:      { alignItems: 'center', padding: 28, paddingBottom: 24 },
  avatarWrap:  { position: 'relative', marginBottom: 12 },
  avatar:      { width: 88, height: 88, borderRadius: 44, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { fontSize: 30, fontWeight: '900' },
  cameraBtn:   { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#021B3A' },
  name:        { fontSize: 22, fontWeight: '800' },
  email:       { fontSize: 14, marginTop: 4 },
  phone:       { fontSize: 13, marginTop: 2 },
  badge:       { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  verifiedRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  verifiedText:   { fontSize: 12, fontWeight: '600' },
  verifyBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  verifyBannerText: { color: '#E67E22', fontSize: 12, fontWeight: '600' },
  verifyAction:   { color: '#E67E22', fontSize: 12, fontWeight: '800', marginLeft: 4 },

  // Cards
  card:        { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel:{ fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // Appearance
  themeRow:    { flexDirection: 'row', gap: 8 },
  themeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  themeBtnTxt: { fontSize: 12, fontWeight: '700' },

  // Security
  settingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon:  { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  settingBody:  { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingSub:   { fontSize: 11, marginTop: 2, lineHeight: 16 },

  // Menu
  menuSection:  { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuRow:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1 },
  menuLabel:    { flex: 1, fontSize: 15 },

  // Logout + Delete
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 4 },
  logoutText:      { color: '#CC0000', fontSize: 15, fontWeight: '700' },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 36 },
  deleteBtnText:   { fontSize: 13 },
  deleteWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  deleteWarningText:   { fontSize: 13, lineHeight: 20, marginBottom: 8 },

  // Modals
  overlay:     { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle:  { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel:  { fontSize: 13, marginTop: 10, marginBottom: 5 },
  modalInput:  { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1 },
  showPwBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  showPwTxt:   { fontSize: 12 },
  modalBtns:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:   { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText:  { fontWeight: '700' },
  confirmBtn:  { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: '#021B3A', fontWeight: '800' },
});
