import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { googleAuth, appleAuth } from '../../api/socialAuth';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../../constants/googleAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import SparkleCluster from '../../components/auth/SparkleCluster';
import BlobBackground from '../../components/BlobBackground';

WebBrowser.maybeCompleteAuthSession();

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

function GoogleG() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '900', color: '#4285F4' }}>G</Text>
    </View>
  );
}

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const Colors = useColors();
  const { login, loginWithSocial } = useAuth();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [focused,    setFocused]    = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);

  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID, scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { authentication } = googleResponse;
    if (!authentication?.accessToken) return;
    setSocialBusy('google');
    googleAuth(authentication.accessToken)
      .then(({ token, user }) => loginWithSocial(token, user))
      .catch(err => Alert.alert('Google Sign-In Failed', err?.response?.data?.message ?? err.message))
      .finally(() => setSocialBusy(null));
  }, [googleResponse]);

  const handleGoogleSignIn = () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert('Not Configured', 'Add your Google Client IDs to src/constants/googleAuth.ts first.'); return;
    }
    googlePrompt();
  };

  const handleAppleSignIn = async () => {
    try {
      setSocialBusy('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      const { token, user } = await appleAuth(credential.identityToken!, fullName);
      await loginWithSocial(token, user);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Sign-In Failed', err?.response?.data?.message ?? err.message);
    } finally { setSocialBusy(null); }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert(t('common.error'), t('auth.register.missingFieldsMsg')); return; }
    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) { Alert.alert('Sign In Failed', err.message); }
    finally { setLoading(false); }
  };

  const inputBoxStyle = (field: string) => [
    s.inputBox,
    { backgroundColor: Colors.inputBg, borderColor: 'transparent' },
    focused === field && { borderColor: Colors.primary, backgroundColor: Colors.background },
  ];

  return (
    <BlobBackground style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} bounces={false}>

            <View style={s.logoRow}>
              <View style={s.logoPill}>
                <Image source={require('../../../assets/logo/cst_logo_white.png')} style={s.logoImg} resizeMode="contain" />
              </View>
            </View>

            <View style={s.header}>
              <SparkleCluster size="lg" />
              <Text style={[s.greeting, { color: Colors.text }]}>{t('auth.login.greeting')}</Text>
              <Text style={[s.subtitle, { color: Colors.textMuted }]}>{t('auth.login.subtitle')}</Text>
            </View>

            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.login.emailLabel')}</Text>
                <View style={inputBoxStyle('email')}>
                  <TextInput style={[s.input, { color: Colors.text }]} placeholder={t('auth.login.emailPlaceholder')} placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                  <Text style={[s.label, { color: Colors.text }]}>{t('auth.login.passwordLabel')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={s.forgotLink}>{t('auth.login.forgotPassword')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={inputBoxStyle('password')}>
                  <TextInput style={[s.input, { flex: 1, color: Colors.text }]} placeholder={t('auth.login.passwordPlaceholder')} placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPwd} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[s.phoneBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => navigation.navigate('PhoneLogin')} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
                <Text style={[s.phoneBtnText, { color: Colors.primary }]}>{t('auth.signInOptions.phone')}</Text>
              </TouchableOpacity>

              <View style={s.divRow}>
                <View style={[s.divLine, { backgroundColor: Colors.border }]} />
                <Text style={[s.divLabel, { color: Colors.textMuted }]}>{t('auth.login.orContinueWith')}</Text>
                <View style={[s.divLine, { backgroundColor: Colors.border }]} />
              </View>

              <View style={s.socialRow}>
                <TouchableOpacity style={[s.socialBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }, socialBusy === 'google' && s.disabled]} onPress={handleGoogleSignIn} disabled={!!socialBusy || loading} activeOpacity={0.85}>
                  {socialBusy === 'google' ? <ActivityIndicator size="small" color="#4285F4" /> : <><GoogleG /><Text style={[s.socialText, { color: Colors.text }]}>{t('auth.login.google')}</Text></>}
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[s.socialBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }, socialBusy === 'apple' && s.disabled]} onPress={handleAppleSignIn} disabled={!!socialBusy || loading} activeOpacity={0.85}>
                    {socialBusy === 'apple' ? <ActivityIndicator size="small" color={Colors.text} /> : <><Ionicons name="logo-apple" size={18} color={Colors.text} /><Text style={[s.socialText, { color: Colors.text }]}>{t('auth.login.apple')}</Text></>}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
                <Text style={[s.footerText, { color: Colors.textMuted }]}>
                  {t('auth.login.noAccount')}{'  '}<Text style={s.footerBold}>{t('auth.login.signUp')}</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('SignInOptions')} activeOpacity={0.8}>
                <Text style={s.allOptionsText}>{t('auth.login.allOptions')} →</Text>
              </TouchableOpacity>
              <View style={s.legal}>
                <TouchableOpacity onPress={() => navigation.navigate('Terms')}><Text style={[s.legalLink, { color: Colors.textMuted }]}>{t('auth.login.terms')}</Text></TouchableOpacity>
                <Text style={[s.legalDot, { color: Colors.border }]}>·</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Privacy')}><Text style={[s.legalLink, { color: Colors.textMuted }]}>{t('auth.login.privacy')}</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 },
  logoRow: { alignItems: 'center', paddingTop: 20, paddingBottom: 4 },
  logoPill: { backgroundColor: '#021B3A', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  logoImg: { width: 120, height: 40 },
  header: { paddingTop: 20, paddingBottom: 4 },
  greeting: { fontSize: 30, fontWeight: '800', marginTop: 10 },
  subtitle: { fontSize: 15, marginTop: 5 },
  form: { gap: 16, marginTop: 26 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotLink: { fontSize: 13, color: '#021B3A', fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, height: 54, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: { height: 56, borderRadius: 28, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center', marginTop: 4, shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  phoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8, borderWidth: 1.5 },
  phoneBtnText: { fontSize: 15, fontWeight: '600' },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1 },
  divLabel: { fontSize: 13, fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, borderWidth: 1, gap: 8 },
  socialText: { fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center', gap: 16, marginTop: 28 },
  footerText: { fontSize: 14 },
  footerBold: { color: '#021B3A', fontWeight: '700' },
  allOptionsText: { fontSize: 13, color: '#021B3A', fontWeight: '600' },
  legal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11 },
});
