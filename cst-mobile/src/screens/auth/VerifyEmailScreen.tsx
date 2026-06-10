import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import BlobBackground from '../../components/BlobBackground';

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
      <TextInput ref={inputRef} value={value} onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={LEN} style={otp.hidden} autoFocus />
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

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { user, logout, markVerified } = useAuth();
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert(t('auth.verifyEmail.invalidCode'), t('auth.verifyEmail.invalidCodeMsg')); return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmail(code.trim());
      markVerified();
    } catch (err: any) {
      Alert.alert(t('auth.verifyEmail.verificationFailed'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification();
      Alert.alert(t('common.success'), t('auth.verifyEmail.resendCode'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <BlobBackground style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.inner}>
            <View style={s.header}>
              <SparkleCluster />
              <Text style={s.title}>{t('auth.verifyEmail.title')}</Text>
              <Text style={s.subtitle}>
                {t('auth.verifyEmail.subtitle')}{'\n'}
                <Text style={s.emailHighlight}>{user?.email}</Text>
              </Text>
            </View>

            <View style={s.otpSection}>
              <OtpInput value={code} onChange={setCode} />
              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.verifyEmail.verifyBtn')}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.bottom}>
              <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.8}>
                {resending
                  ? <ActivityIndicator size="small" color="#8E8E93" />
                  : <Text style={s.resendText}>
                      {t('auth.verifyEmail.didntReceive')}{'  '}
                      <Text style={s.resendBold}>{t('auth.verifyEmail.resendCode')}</Text>
                    </Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={15} color="#AEAEB2" />
                <Text style={s.logoutText}>{t('auth.verifyEmail.differentAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#FFFFFF' },
  kav:   { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingVertical: 32, justifyContent: 'space-between' },
  header: { alignItems: 'flex-start', gap: 4 },
  title:  { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 6, lineHeight: 22 },
  emailHighlight: { color: '#021B3A', fontWeight: '700' },
  otpSection: { gap: 24 },
  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#021B3A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  bottom:     { alignItems: 'center', gap: 16 },
  resendText: { fontSize: 14, color: '#8E8E93' },
  resendBold: { color: '#021B3A', fontWeight: '700' },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { fontSize: 13, color: '#AEAEB2' },
});
