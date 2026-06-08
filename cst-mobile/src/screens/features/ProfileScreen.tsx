import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, Switch, Image, Linking, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import client from '../../api/client';
import { useTheme, ColorMode } from '../../context/ThemeContext';
import { BIOMETRIC_STORAGE_KEY } from '../../components/BiometricLock';
import { MainStackParamList } from '../../navigation/MainStack';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';
const IOS_STORE_URL   = 'https://apps.apple.com/app/id000000000';
const ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=com.cst.driver`;

type Nav = NativeStackNavigationProp<MainStackParamList>;


export default function ProfileScreen() {
  const { t } = useTranslation();
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

  // ── Sign out with confirmation ────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  // ── Rate the app ──────────────────────────────────────────────────────────
  const handleRateApp = () => {
    const url = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
    Alert.alert(t('profile.rateAlertTitle'), t('profile.rateAlertMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: '⭐ Rate Now', onPress: () => Linking.openURL(url) },
    ]);
  };

  // ── Share app ─────────────────────────────────────────────────────────────
  const handleShareApp = async () => {
    const storeUrl = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
    try {
      await Share.share({ message: `${t('profile.shareMessage')}\n${storeUrl}` });
    } catch { /* user cancelled */ }
  };

  // ── Export user data ───────────────────────────────────────────────────────
  const handleExportData = async () => {
    Alert.alert(t('profile.exportTitle'), t('profile.exportingData'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Export PDF',
        onPress: async () => {
          try {
            const [trips, expenses, fuel] = await Promise.allSettled([
              client.get('/api/triplog?limit=1000'),
              client.get('/api/expenses?limit=1000'),
              client.get('/api/fuellog?limit=1000'),
            ]);

            const tripCount     = trips.status     === 'fulfilled' ? (trips.value.data?.length     ?? trips.value.data?.total     ?? 0) : 'N/A';
            const expenseCount  = expenses.status  === 'fulfilled' ? (expenses.value.data?.length  ?? expenses.value.data?.total  ?? 0) : 'N/A';
            const fuelCount     = fuel.status      === 'fulfilled' ? (fuel.value.data?.length      ?? fuel.value.data?.total      ?? 0) : 'N/A';

            const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const html = `
<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1A1A2E; }
  h1   { color: #021B3A; font-size: 26px; margin-bottom: 4px; }
  .sub { color: #8E8E93; font-size: 13px; margin-bottom: 32px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 16px; color: #021B3A; border-bottom: 2px solid #EEF3F8; padding-bottom: 6px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F2F2F7; font-size: 14px; }
  .label { color: #636366; }
  .value { font-weight: 700; }
  .badge { display: inline-block; background: #021B3A22; color: #021B3A; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  .footer { margin-top: 40px; color: #AEAEB2; font-size: 11px; text-align: center; }
</style>
</head><body>
  <h1>CST Driver — Data Export</h1>
  <p class="sub">Generated on ${now} · Version ${APP_VERSION}</p>

  <div class="section">
    <h2>Account</h2>
    <div class="row"><span class="label">Name</span><span class="value">${user?.name ?? '—'}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${user?.email ?? '—'}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${user?.phone ?? '—'}</span></div>
    <div class="row"><span class="label">Email Verified</span><span class="value">${user?.isVerified ? '✓ Yes' : '✗ No'}</span></div>
    <div class="row"><span class="label">Subscription</span><span class="value"><span class="badge">${(user?.subscriptionStatus ?? 'FREE').toUpperCase()}</span></span></div>
  </div>

  <div class="section">
    <h2>Data Summary</h2>
    <div class="row"><span class="label">Trip Log Entries</span><span class="value">${tripCount}</span></div>
    <div class="row"><span class="label">Expense Entries</span><span class="value">${expenseCount}</span></div>
    <div class="row"><span class="label">Fuel Log Entries</span><span class="value">${fuelCount}</span></div>
  </div>

  <div class="section">
    <h2>Per-Feature Exports</h2>
    <p style="font-size:13px;color:#636366;">To export detailed records for individual features, open each screen and use its built-in export/share button: Invoices, IFTA Tracker, Cargo Claims, Document Vault, Bill of Lading, Ticket Dispute.</p>
  </div>

  <div class="footer">CST Driver App · Commercial Support Technologies · Exported ${now}</div>
</body></html>`;

            const { uri } = await Print.printToFileAsync({ html, base64: false });
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share your CST data' });
            } else {
              Alert.alert('Saved', `PDF saved to: ${uri}`);
            }
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not export data.');
          }
        },
      },
    ]);
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

  const menuItems = [
    { icon: 'bus-outline',           label: t('profile.myTruck'),        onPress: () => navigation.navigate('TruckProfile') },
    { icon: 'card-outline',          label: t('profile.subscription'),   onPress: () => navigation.navigate('Subscription') },
    { icon: 'person-outline',        label: t('profile.editProfile'),    onPress: openEdit },
    { icon: 'lock-closed-outline',   label: t('profile.changePassword'), onPress: () => setPwModal(true) },
    { icon: 'notifications-outline', label: t('profile.notifications'),  onPress: () => navigation.navigate('Notifications') },
    { icon: 'language-outline',      label: t('profile.language'),       onPress: () => navigation.navigate('LanguageSelection') },
    { icon: 'star-outline',          label: t('profile.rateApp'),        onPress: handleRateApp },
    { icon: 'share-social-outline',  label: t('profile.shareApp'),       onPress: handleShareApp },
    {
      icon: 'help-circle-outline',
      label: t('profile.helpSupport'),
      onPress: () => Linking.openURL('mailto:support@commercialsupporttech.com?subject=CST%20App%20Support'),
    },
    { icon: 'document-text-outline', label: t('profile.terms'),   onPress: () => navigation.navigate('Terms') },
    { icon: 'shield-outline',        label: t('profile.privacy'), onPress: () => navigation.navigate('Privacy') },
    {
      icon: 'play-circle-outline',
      label: t('profile.replayTour'),
      onPress: () => Alert.alert(t('profile.replayConfirmTitle'), t('profile.replayConfirmMsg'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.yes'), onPress: resetOnboarding },
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
              {isPro ? `CST PRO · ${user?.subscriptionPlan === 'annual' ? 'Annual' : 'Monthly'}` : t('profile.freePlan')}
            </Text>
          </View>

          {/* Verification status */}
          {user?.isVerified ? (
            <View style={s.verifiedRow}>
              <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
              <Text style={[s.verifiedText, { color: '#2ECC71' }]}>{t('profile.emailVerified')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.verifyBanner, { backgroundColor: '#E67E2218', borderColor: '#E67E22' }]}
              onPress={handleResendVerification}
              disabled={resending}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={14} color="#E67E22" />
              <Text style={s.verifyBannerText}>{t('profile.emailNotVerified')}</Text>
              {resending
                ? <ActivityIndicator size="small" color="#E67E22" style={{ marginLeft: 8 }} />
                : <Text style={s.verifyAction}>{t('profile.tapToVerify')}</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surf, borderColor: border }]}>
          <Text style={[s.sectionLabel, { color: text }]}>{t('profile.appearance')}</Text>
          <View style={s.themeRow}>
            {([
              { id: 'light',  icon: 'sunny-outline',          label: t('profile.themeLight')  },
              { id: 'dark',   icon: 'moon-outline',           label: t('profile.themeDark')   },
              { id: 'system', icon: 'phone-portrait-outline', label: t('profile.themeSystem') },
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
            <Text style={[s.sectionLabel, { color: text }]}>{t('profile.security')}</Text>
            <View style={[s.settingRow, { borderColor: border }]}>
              <View style={[s.settingIcon, { backgroundColor: gold + '1A' }]}>
                <Ionicons name="finger-print-outline" size={20} color={gold} />
              </View>
              <View style={s.settingBody}>
                <Text style={[s.settingLabel, { color: text }]}>{t('profile.biometricLock')}</Text>
                <Text style={[s.settingSub, { color: muted }]}>{t('profile.biometricSub')}</Text>
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

        {/* ── Sign Out button ─────────────────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={s.logoutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* ── Delete Account button ───────────────────────────────────────── */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => { setDeletePw(''); setDeleteModal(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={16} color="#CC0000" />
          <Text style={s.deleteBtnText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>

        {/* ── App version ─────────────────────────────────────────────────── */}
        <Text style={[s.versionText, { color: muted }]}>
          {t('profile.version')} {APP_VERSION} ({BUILD_NUMBER})
        </Text>

      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────────────────── */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: surf }]}>
            <Text style={[s.modalTitle, { color: text }]}>{t('profile.editProfileTitle')}</Text>
            <Text style={[s.modalLabel, { color: muted }]}>{t('profile.fullName')}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: surfL, color: text, borderColor: border }]}
              value={name} onChangeText={setName}
              placeholder={t('auth.register.namePlaceholder')} placeholderTextColor={muted}
            />
            <Text style={[s.modalLabel, { color: muted }]}>{t('profile.phoneNumber')}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: surfL, color: text, borderColor: border }]}
              value={phone} onChangeText={setPhone}
              placeholder={t('auth.register.phoneOptional')} placeholderTextColor={muted} keyboardType="phone-pad"
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: surfL }]} onPress={() => setEditModal(false)}>
                <Text style={[s.cancelText, { color: muted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: gold }, editSaving && { opacity: 0.6 }]}
                onPress={handleSaveProfile} disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator size="small" color="#021B3A" />
                  : <Text style={s.confirmText}>{t('common.save')}</Text>
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
              <Text style={[s.modalTitle, { color: '#CC0000', marginBottom: 0 }]}>{t('profile.deleteTitle')}</Text>
            </View>
            <Text style={[s.deleteWarningText, { color: muted }]}>{t('profile.deleteWarning')}</Text>

            {/* Download data prompt */}
            <View style={[s.exportBox, { backgroundColor: '#2C6EBD11', borderColor: '#2C6EBD44' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#2C6EBD" style={{ marginTop: 1 }} />
              <Text style={[s.exportBoxText, { color: muted }]}>{t('profile.downloadDataWarning')}</Text>
            </View>
            <TouchableOpacity
              style={s.exportDataBtn}
              onPress={handleExportData}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
              <Text style={s.exportDataBtnTxt}>{t('profile.downloadDataBtn')}</Text>
            </TouchableOpacity>
            <View style={[s.modalDivider, { backgroundColor: border }]} />

            <Text style={[s.modalLabel, { color: muted }]}>{t('profile.enterPwToConfirm')}</Text>
            <View style={[s.modalInput, { backgroundColor: surfL, borderColor: '#CC000055', flexDirection: 'row', alignItems: 'center', paddingRight: 8 }]}>
              <TextInput
                style={{ flex: 1, color: text, fontSize: 15 }}
                value={deletePw}
                onChangeText={setDeletePw}
                placeholder={t('profile.passwordPlaceholder')}
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
                <Text style={[s.cancelText, { color: muted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: '#CC0000' }, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={[s.confirmText, { color: '#FFFFFF' }]}>{t('profile.deleteForever')}</Text>
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
            <Text style={[s.modalTitle, { color: text }]}>{t('profile.changePwTitle')}</Text>
            {[
              { label: t('profile.currentPw'),  val: currentPw, set: setCurrentPw },
              { label: t('profile.newPw'),       val: newPw,      set: setNewPw      },
              { label: t('profile.confirmNewPw'),val: confirmPw,  set: setConfirmPw  },
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
              <Text style={[s.showPwTxt, { color: muted }]}>{showPw ? t('profile.hidePasswords') : t('profile.showPasswords')}</Text>
            </TouchableOpacity>
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { backgroundColor: surfL }]}
                onPress={() => { setPwModal(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
              >
                <Text style={[s.cancelText, { color: muted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: gold }, pwSaving && { opacity: 0.6 }]}
                onPress={handleChangePassword} disabled={pwSaving}
              >
                {pwSaving
                  ? <ActivityIndicator size="small" color="#021B3A" />
                  : <Text style={s.confirmText}>{t('profile.change')}</Text>
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
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 10,
    backgroundColor: '#CC0000', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#CC0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  logoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#CC000055', borderRadius: 14, paddingVertical: 14,
  },
  deleteBtnText: { color: '#CC0000', fontSize: 14, fontWeight: '700' },
  versionText: { textAlign: 'center', fontSize: 12, marginBottom: 36, opacity: 0.5 },
  deleteWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  deleteWarningText:   { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  exportBox:       { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  exportBoxText:   { flex: 1, fontSize: 12, lineHeight: 17 },
  exportDataBtn:   { backgroundColor: '#2C6EBD', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportDataBtnTxt:{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  modalDivider:    { height: 1, marginVertical: 6 },

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
