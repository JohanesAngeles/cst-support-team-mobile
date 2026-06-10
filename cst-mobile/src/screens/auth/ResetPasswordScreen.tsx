import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import BlobBackground from '../../components/BlobBackground';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

function SparkleCluster() {
  return (
    <View style={sp.wrap}>
      <View style={[sp.diamond, { width: 60, height: 60, left: 0, top: 16, borderRadius: 7 }]} />
      <View style={[sp.diamond, { width: 42, height: 42, left: 38, top: 8, borderRadius: 5 }]} />
      <View style={[sp.diamond, { width: 26, height: 26, left: 68, top: 2, borderRadius: 3 }]} />
    </View>
  );
}
const sp = StyleSheet.create({
  wrap: { width: 102, height: 80 },
  diamond: { position: 'absolute', backgroundColor: '#EEF3F8', borderWidth: 1.5, borderColor: '#C0D0E0', transform: [{ rotate: '45deg' }] },
});

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const LEN = 6;
  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={otp.row}>
      <TextInput ref={inputRef} value={value} onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={LEN} style={otp.hidden} />
      {Array.from({ length: LEN }).map((_, i) => (
        <View key={i} style={[otp.box, value.length === i && otp.boxActive, value.length > i && otp.boxFilled]}>
          <Text style={otp.digit}>{value[i] ?? ''}</Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}
const otp = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  box:    { width: 46, height: 56, borderRadius: 12, backgroundColor: '#F2F2F7', borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },
  boxFilled: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },
  digit: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
});

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [email,           setEmail]           = useState(route.params?.email ?? '');
  const [code,            setCode]            = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [focused,         setFocused]         = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !code.trim() || !newPassword || !confirmPassword) {
      Alert.alert(t('auth.register.missingFields'), 'All fields are required.'); return;
    }
    if (code.trim().length !== 6) { Alert.alert(t('common.error'), 'Enter the 6-digit code.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert(t('auth.register.passwordMismatch'), t('auth.register.passwordMismatchMsg')); return; }
    if (newPassword.length < 8) { Alert.alert(t('auth.register.weakPassword'), t('auth.register.weakPasswordMsg')); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      navigation.navigate('PasswordChanged');
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBox = (field: string) => [s.inputBox, focused === field && s.inputFocused];

  return (
    <BlobBackground style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
            </TouchableOpacity>

            <View style={s.header}>
              <SparkleCluster />
              <Text style={s.title}>{t('auth.resetPassword.title')}</Text>
              <Text style={s.subtitle}>{t('auth.resetPassword.subtitle')}</Text>
            </View>

            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={s.label}>{t('auth.resetPassword.emailLabel')}</Text>
                <View style={inputBox('email')}>
                  <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder={t('auth.resetPassword.emailPlaceholder')} placeholderTextColor="#AEAEB2" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>{t('auth.resetPassword.codeLabel')}</Text>
                <OtpInput value={code} onChange={setCode} />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>{t('auth.resetPassword.newPasswordLabel')}</Text>
                <View style={inputBox('password')}>
                  <TextInput style={[s.input, { flex: 1 }]} value={newPassword} onChangeText={setNewPassword} placeholder={t('auth.resetPassword.newPasswordPlaceholder')} placeholderTextColor="#AEAEB2" secureTextEntry={!showPwd} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color="#AEAEB2" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.label}>{t('auth.resetPassword.confirmPasswordLabel')}</Text>
                <View style={inputBox('confirm')}>
                  <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')} placeholderTextColor="#AEAEB2" secureTextEntry={!showPwd} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.resetPassword.resetBtn')}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                <Text style={s.footerText}>
                  {t('auth.resetPassword.rememberIt')}{'  '}
                  <Text style={s.footerBold}>{t('auth.resetPassword.backToLogin')}</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },
  header:   { paddingTop: 10, paddingBottom: 4 },
  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginTop: 10 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 6, lineHeight: 22 },
  form:       { gap: 16, marginTop: 24 },
  fieldGroup: { gap: 7 },
  label:      { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14,
    paddingHorizontal: 16, height: 54,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputFocused: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#021B3A',
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
    shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  footer:    { alignItems: 'center', marginTop: 24 },
  footerText:{ fontSize: 14, color: '#8E8E93' },
  footerBold:{ color: '#021B3A', fontWeight: '700' },
});
