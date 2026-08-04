import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, AppStateStatus, ActivityIndicator, Image,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { googleAuth, appleAuth } from '../api/socialAuth';

const BIOMETRIC_KEY   = '@rrn_biometric_enabled';
const BG_TIME_KEY     = '@rrn_bg_time';
const LOCK_AFTER_MS   = 10_000;

export const BIOMETRIC_STORAGE_KEY = BIOMETRIC_KEY;

interface Props { children: React.ReactNode }

export default function BiometricLock({ children }: Props) {
  const { user, login, loginWithSocial } = useAuth();
  const [locked,     setLocked]     = useState(false);
  const [error,      setError]      = useState('');
  const [checking,   setChecking]   = useState(false);
  const [bioLabel,   setBioLabel]   = useState('Biometrics');
  const [showPwForm, setShowPwForm] = useState(false);
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [pwLoading,  setPwLoading]  = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);
  const appState = useRef(AppState.currentState);

  // Label the primary button with whatever the device actually offers —
  // "Face ID" reads a lot more trustworthy than a generic "Biometrics".
  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then(types => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBioLabel('Face ID');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBioLabel(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    checkLockOnForeground();
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!user) return;

      if (appState.current === 'active' && next === 'background') {
        AsyncStorage.setItem(BG_TIME_KEY, String(Date.now()));
      }

      if ((appState.current === 'background' || appState.current === 'inactive') && next === 'active') {
        checkLockOnForeground();
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);

  const checkLockOnForeground = async () => {
    const [enabled, bgTimeRaw] = await Promise.all([
      AsyncStorage.getItem(BIOMETRIC_KEY),
      AsyncStorage.getItem(BG_TIME_KEY),
    ]);
    if (enabled !== 'true') return;

    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !isEnrolled) return;

    const bgTime = bgTimeRaw ? parseInt(bgTimeRaw, 10) : 0;
    const elapsed = Date.now() - bgTime;
    if (bgTime > 0 && elapsed < LOCK_AFTER_MS) return;

    setLocked(true);
    setError('');
    setShowPwForm(false);
    setPassword('');
  };

  const unlockSuccess = async () => {
    await AsyncStorage.setItem(BG_TIME_KEY, String(Date.now()));
    setLocked(false);
    setShowPwForm(false);
    setPassword('');
    setError('');
  };

  const authenticate = async () => {
    setChecking(true);
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Road Ready Network',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) await unlockSuccess();
      else setError('Authentication failed. Try again, or unlock another way below.');
    } catch {
      setError('Biometrics unavailable right now. Unlock another way below.');
    } finally {
      setChecking(false);
    }
  };

  // ── Fallbacks — for whenever the sensor won't cooperate ──────────────────
  const handlePasswordUnlock = async () => {
    if (!user?.email || !password) return;
    setPwLoading(true);
    setError('');
    try {
      await login(user.email, password);
      await unlockSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Incorrect password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleGoogleUnlock = async () => {
    try {
      setSocialBusy('google');
      setError('');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return; // user cancelled
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const { token, user: u } = await googleAuth(idToken);
      await loginWithSocial(token, u);
      await unlockSuccess();
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) setError(err?.response?.data?.message ?? err.message ?? 'Google sign-in failed.');
    } finally {
      setSocialBusy(null);
    }
  };

  const handleAppleUnlock = async () => {
    try {
      setSocialBusy('apple');
      setError('');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      const { token, user: u } = await appleAuth(credential.identityToken!, fullName);
      await loginWithSocial(token, u);
      await unlockSuccess();
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') setError(err?.response?.data?.message ?? err.message ?? 'Apple sign-in failed.');
    } finally {
      setSocialBusy(null);
    }
  };

  if (!locked) return <>{children}</>;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}>
      <LinearGradient colors={['#000000', '#050B16', '#0A1830']} style={StyleSheet.absoluteFillObject} />
      <View style={s.glow} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.container}>

            <View style={s.logoWrap}>
              <Image
                source={require('../../assets/logo/road_ready_app_logo.png')}
                style={s.logo}
                resizeMode="contain"
              />
            </View>

            <View style={s.textBlock}>
              <Text style={s.heading}>App Locked</Text>
              <Text style={s.subtitle}>
                {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : "Verify it's you to continue"}
              </Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#F87171" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {!showPwForm ? (
              <>
                <TouchableOpacity
                  style={[s.primaryBtnWrap, checking && s.disabled]}
                  onPress={authenticate}
                  disabled={checking}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#0A0A0C', '#3A3B40', '#9A9DA3', '#1C1D20']}
                    locations={[0, 0.38, 0.68, 1]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.primaryBtn}
                  >
                    {checking
                      ? <ActivityIndicator color="#FFFFFF" />
                      : <>
                          <Ionicons name="finger-print-outline" size={22} color="#FFFFFF" />
                          <Text style={s.primaryBtnText}>Unlock with {bioLabel}</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.divRow}>
                  <View style={s.divLine} />
                  <Text style={s.divLabel}>or unlock another way</Text>
                  <View style={s.divLine} />
                </View>

                <View style={s.altRow}>
                  <TouchableOpacity style={s.altBtn} onPress={() => setShowPwForm(true)} activeOpacity={0.85}>
                    <Ionicons name="key-outline" size={18} color="#E5E7EB" />
                    <Text style={s.altBtnText}>Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.altBtn, socialBusy === 'google' && s.disabled]}
                    onPress={handleGoogleUnlock}
                    disabled={!!socialBusy}
                    activeOpacity={0.85}
                  >
                    {socialBusy === 'google'
                      ? <ActivityIndicator size="small" color="#4285F4" />
                      : <><Text style={s.googleG}>G</Text><Text style={s.altBtnText}>Google</Text></>
                    }
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[s.altBtn, socialBusy === 'apple' && s.disabled]}
                      onPress={handleAppleUnlock}
                      disabled={!!socialBusy}
                      activeOpacity={0.85}
                    >
                      {socialBusy === 'apple'
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <><Ionicons name="logo-apple" size={18} color="#FFFFFF" /><Text style={s.altBtnText}>Apple</Text></>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={s.pwCard}>
                <Text style={s.pwEmail}>{user?.email}</Text>
                <View style={s.pwInputBox}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    style={s.pwInput}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    autoFocus
                    onSubmitEditing={handlePasswordUnlock}
                  />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={17} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>
                <View style={s.pwBtnRow}>
                  <TouchableOpacity
                    style={s.pwCancelBtn}
                    onPress={() => { setShowPwForm(false); setPassword(''); setError(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.pwCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.pwConfirmBtn, (pwLoading || !password) && s.disabled]}
                    onPress={handlePasswordUnlock}
                    disabled={pwLoading || !password}
                    activeOpacity={0.85}
                  >
                    {pwLoading ? <ActivityIndicator color="#0A0A0C" size="small" /> : <Text style={s.pwConfirmText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  glow: {
    position: 'absolute', top: '16%', alignSelf: 'center',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 22,
  },
  logoWrap: { alignSelf: 'center', marginBottom: 4 },
  logo: {
    width: 112, height: 112, borderRadius: 26,
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 14,
  },
  textBlock: { gap: 6, alignItems: 'center' },
  heading:  { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, borderColor: 'rgba(248,113,113,0.35)',
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#F87171', fontSize: 12.5, flex: 1 },

  primaryBtnWrap: {
    borderRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  primaryBtn: {
    height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },

  divRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  divLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  altRow: { flexDirection: 'row', gap: 10 },
  altBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 50, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  altBtnText: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  googleG:    { fontSize: 14, fontWeight: '900', color: '#4285F4' },

  pwCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)', padding: 18, gap: 12,
  },
  pwEmail: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: '600' },
  pwInputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, height: 50,
  },
  pwInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  pwBtnRow: { flexDirection: 'row', gap: 10 },
  pwCancelBtn:  { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  pwCancelText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '600' },
  pwConfirmBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  pwConfirmText:{ color: '#0A0A0C', fontSize: 14, fontWeight: '700' },
});
