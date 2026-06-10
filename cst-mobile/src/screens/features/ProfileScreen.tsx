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
import { LinearGradient } from 'expo-linear-gradient';
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
              client.get('/triplog?limit=1000'),
              client.get('/expenses?limit=1000'),
              client.get('/fuellog?limit=1000'),
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

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.84)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.92)';

  const ACCOUNT_ITEMS = [
    { icon: 'bus-outline',         label: t('profile.myTruck'),        onPress: () => navigation.navigate('TruckProfile') },
    { icon: 'card-outline',        label: t('profile.subscription'),   onPress: () => navigation.navigate('Subscription'),
      right: isPro ? <View style={s.proBadge}><Text style={s.proBadgeText}>PRO</Text></View> : undefined },
    { icon: 'person-outline',      label: t('profile.editProfile'),    onPress: openEdit },
    { icon: 'lock-closed-outline', label: t('profile.changePassword'), onPress: () => setPwModal(true) },
  ];

  const APP_ITEMS = [
    { icon: 'notifications-outline', label: t('profile.notifications'), onPress: () => navigation.navigate('Notifications') },
    { icon: 'language-outline',      label: t('profile.language'),      onPress: () => navigation.navigate('LanguageSelection') },
    { icon: 'star-outline',          label: t('profile.rateApp'),       onPress: handleRateApp },
    { icon: 'share-social-outline',  label: t('profile.shareApp'),      onPress: handleShareApp },
    {
      icon: 'help-circle-outline',
      label: t('profile.helpSupport'),
      onPress: () => Linking.openURL('mailto:support@commercialsupporttech.com?subject=CST%20App%20Support'),
    },
  ];

  const LEGAL_ITEMS = [
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

  const renderMenuGroup = (
    title: string,
    icon: string,
    items: { icon: string; label: string; onPress: () => void; right?: React.ReactNode }[],
    extra?: React.ReactNode,
  ) => (
    <View style={[s.groupCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={s.groupHeader}>
        <Ionicons name={icon as any} size={15} color={muted} />
        <Text style={[s.groupTitle, { color: muted }]}>{title}</Text>
      </View>
      {extra}
      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.label}
          style={[s.menuRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
            idx === items.length - 1 && { borderBottomWidth: 0 }]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={[s.menuIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name={item.icon as any} size={17} color={isDark ? 'rgba(255,255,255,0.75)' : '#374151'} />
          </View>
          <Text style={[s.menuLabel, { color: text }]}>{item.label}</Text>
          {item.right ?? <Ionicons name="chevron-forward" size={15} color={muted} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Header banner ──────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#021B3A', '#0A2A5C', '#0D3270']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.header}
        >
          {/* Edit button top-right */}
          <TouchableOpacity style={s.editBtn} onPress={openEdit} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={14} color="#FFFFFF" />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>

          {/* Avatar + info row */}
          <View style={s.headerBody}>
            <TouchableOpacity style={s.avatarWrap} onPress={handleAvatarPress} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.avatarRing}
              >
                {avatarLoading ? (
                  <View style={[s.avatar, { backgroundColor: '#021B3A' }]}>
                    <ActivityIndicator color="#F97316" />
                  </View>
                ) : user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, { backgroundColor: '#021B3A' }]}>
                    <Text style={[s.avatarText, { color: '#F97316' }]}>{initials}</Text>
                  </View>
                )}
              </LinearGradient>
              <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)']} style={s.cameraBtn}>
                <Ionicons name="camera" size={11} color="#021B3A" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.headerInfo}>
              <Text style={s.name} numberOfLines={1}>{user?.name}</Text>
              <Text style={s.email} numberOfLines={1}>{user?.email}</Text>
              {user?.phone ? <Text style={s.phone} numberOfLines={1}>{user.phone}</Text> : null}

              {/* Subscription badge */}
              <View style={[s.badge,
                { backgroundColor: isPro ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.15)',
                  borderColor:      isPro ? '#F97316'               : 'rgba(255,255,255,0.3)' }]}>
                {isPro && <Ionicons name="star" size={10} color="#F97316" style={{ marginRight: 3 }} />}
                <Text style={[s.badgeText, { color: isPro ? '#F97316' : 'rgba(255,255,255,0.75)' }]}>
                  {isPro ? `CST PRO` : t('profile.freePlan')}
                </Text>
              </View>
            </View>
          </View>

          {/* Verification status */}
          {user?.isVerified ? (
            <View style={s.verifiedRow}>
              <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
              <Text style={[s.verifiedText, { color: '#4ADE80' }]}>{t('profile.emailVerified')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.verifyBanner, { backgroundColor: 'rgba(230,126,34,0.2)', borderColor: '#E67E22' }]}
              onPress={handleResendVerification}
              disabled={resending}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={13} color="#E67E22" />
              <Text style={s.verifyBannerText}>{t('profile.emailNotVerified')}</Text>
              {resending
                ? <ActivityIndicator size="small" color="#E67E22" style={{ marginLeft: 6 }} />
                : <Text style={s.verifyAction}>{t('profile.tapToVerify')}</Text>
              }
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <View style={[s.groupCard, { backgroundColor: cardBg, borderColor: cardBorder, marginTop: 16 }]}>
          <View style={s.groupHeader}>
            <Ionicons name="color-palette-outline" size={15} color={muted} />
            <Text style={[s.groupTitle, { color: muted }]}>{t('profile.appearance')}</Text>
          </View>
          <View style={s.themeRow}>
            {([
              { id: 'light',  icon: 'sunny-outline',          label: t('profile.themeLight')  },
              { id: 'dark',   icon: 'moon-outline',           label: t('profile.themeDark')   },
              { id: 'system', icon: 'phone-portrait-outline', label: t('profile.themeSystem') },
            ] as { id: ColorMode; icon: string; label: string }[]).map(opt => {
              const active = mode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.themeBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
                    active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setMode(opt.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={opt.icon as any} size={16} color={active ? '#FFFFFF' : muted} />
                  <Text style={[s.themeBtnTxt, { color: active ? '#FFFFFF' : muted }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Security (biometric) ────────────────────────────────────────── */}
        {biometricAvailable && (
          <View style={[s.groupCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={s.groupHeader}>
              <Ionicons name="shield-checkmark-outline" size={15} color={muted} />
              <Text style={[s.groupTitle, { color: muted }]}>{t('profile.security')}</Text>
            </View>
            <View style={[s.menuRow, { borderBottomWidth: 0, borderBottomColor: 'transparent' }]}>
              <View style={[s.menuIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name="finger-print-outline" size={17} color={isDark ? 'rgba(255,255,255,0.75)' : '#374151'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.menuLabel, { color: text }]}>{t('profile.biometricLock')}</Text>
                <Text style={[s.menuSub, { color: muted }]}>{t('profile.biometricSub')}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB', true: gold }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}

        {/* ── Account ─────────────────────────────────────────────────────── */}
        {renderMenuGroup('Account', 'person-circle-outline', ACCOUNT_ITEMS)}

        {/* ── App ─────────────────────────────────────────────────────────── */}
        {renderMenuGroup('App', 'grid-outline', APP_ITEMS)}

        {/* ── Legal ───────────────────────────────────────────────────────── */}
        {renderMenuGroup('Legal & About', 'information-circle-outline', LEGAL_ITEMS)}

        {/* ── Sign Out ────────────────────────────────────────────────────── */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={s.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* ── Delete Account ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => { setDeletePw(''); setDeleteModal(true); }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={s.deleteBtnText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={[s.versionText, { color: muted }]}>
            {t('profile.version')} {APP_VERSION} ({BUILD_NUMBER})
          </Text>
          <Text style={[s.copyrightText, { color: muted }]}>
            © CST Driver · Commercial Support Tech
          </Text>
        </View>

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

  // ── Header ──────────────────────────────────────────────────────────────────
  header:       { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 20 },
  editBtn:      {
    position: 'absolute', top: 14, right: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText:  { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  headerBody:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  avatarWrap:   { position: 'relative' },
  avatarRing:   { width: 80, height: 80, borderRadius: 40, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatar:       { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText:   { fontSize: 24, fontWeight: '900' },
  cameraBtn:    { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerInfo:   { flex: 1, gap: 2 },
  name:         { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  email:        { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  phone:        { fontSize: 12, color: 'rgba(255,255,255,0.50)' },
  badge:        { flexDirection: 'row', alignItems: 'center', marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  verifiedRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  verifiedText:   { fontSize: 11, fontWeight: '600' },
  verifyBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  verifyBannerText: { color: '#E67E22', fontSize: 11, fontWeight: '600' },
  verifyAction:   { color: '#E67E22', fontSize: 11, fontWeight: '800', marginLeft: 4 },

  // ── Group cards ─────────────────────────────────────────────────────────────
  groupCard:    { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  groupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  groupTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

  // ── Appearance ──────────────────────────────────────────────────────────────
  themeRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  themeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  themeBtnTxt: { fontSize: 12, fontWeight: '700' },

  // ── Menu rows ───────────────────────────────────────────────────────────────
  menuRow:      { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIconBox:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel:    { flex: 1, fontSize: 15, fontWeight: '500' },
  menuSub:      { fontSize: 11, marginTop: 1 },
  proBadge:     { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  proBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // ── Sign Out ─────────────────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1.5, borderColor: '#DC2626',
  },
  signOutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },

  // ── Delete Account ────────────────────────────────────────────────────────────
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 20, borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: '#CC0000',
  },
  deleteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center', marginTop: 4, marginBottom: 8, gap: 2,
  },
  versionText:    { fontSize: 12, textAlign: 'center' },
  copyrightText:  { fontSize: 11, textAlign: 'center' },

  // ── Delete warning ───────────────────────────────────────────────────────────
  deleteWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  deleteWarningText:   { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  exportBox:       { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  exportBoxText:   { flex: 1, fontSize: 12, lineHeight: 17 },
  exportDataBtn:   { backgroundColor: '#2C6EBD', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportDataBtnTxt:{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  modalDivider:    { height: 1, marginVertical: 6 },

  // ── Modals ───────────────────────────────────────────────────────────────────
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
