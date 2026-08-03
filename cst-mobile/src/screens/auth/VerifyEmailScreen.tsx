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
import { useColors } from '../../constants/colors';

function SparkleCluster({ Colors }: { Colors: ReturnType<typeof useColors> }) {
  const sp = getSparkleStyles(Colors);
  return (
    <View style={sp.wrap}>
      <View style={[sp.diamond, { width: 60, height: 60, left: 0, top: 16, borderRadius: 7 }]} />
      <View style={[sp.diamond, { width: 42, height: 42, left: 38, top: 8, borderRadius: 5 }]} />
      <View style={[sp.diamond, { width: 26, height: 26, left: 68, top: 2, borderRadius: 3 }]} />
    </View>
  );
}
const getSparkleStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  wrap: { width: 102, height: 80 },
  diamond: { position: 'absolute', backgroundColor: Colors.surfaceLight, borderWidth: 1.5, borderColor: Colors.border, transform: [{ rotate: '45deg' }] },
});

function OtpInput({ value, onChange, Colors }: { value: string; onChange: (v: string) => void; Colors: ReturnType<typeof useColors> }) {
  const inputRef = useRef<TextInput>(null);
  const otp = getOtpStyles(Colors);
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
const getOtpStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  box:    { width: 46, height: 56, borderRadius: 12, backgroundColor: Colors.inputBg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: Colors.primary, backgroundColor: Colors.background },
  boxFilled: { borderColor: Colors.primary, backgroundColor: Colors.background },
  digit: { fontSize: 22, fontWeight: '700', color: Colors.text },
});

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { user, logout, markVerified } = useAuth();
  const Colors = useColors();
  const s = getStyles(Colors);
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
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.inner}>
            <View style={s.header}>
              <SparkleCluster Colors={Colors} />
              <Text style={s.title}>{t('auth.verifyEmail.title')}</Text>
              <Text style={s.subtitle}>
                {t('auth.verifyEmail.subtitle')}{'\n'}
                <Text style={s.emailHighlight}>{user?.email}</Text>
              </Text>
            </View>

            <View style={s.otpSection}>
              <OtpInput value={code} onChange={setCode} Colors={Colors} />
              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryBtnText}>{t('auth.verifyEmail.verifyBtn')}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.bottom}>
              <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.8}>
                {resending
                  ? <ActivityIndicator size="small" color={Colors.textMuted} />
                  : <Text style={s.resendText}>
                      {t('auth.verifyEmail.didntReceive')}{'  '}
                      <Text style={s.resendBold}>{t('auth.verifyEmail.resendCode')}</Text>
                    </Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={15} color={Colors.textMuted} />
                <Text style={s.logoutText}>{t('auth.verifyEmail.differentAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },
  kav:   { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingVertical: 32, justifyContent: 'space-between' },
  header: { alignItems: 'flex-start', gap: 4 },
  title:  { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: Colors.textMuted, marginTop: 6, lineHeight: 22 },
  emailHighlight: { color: Colors.secondary, fontWeight: '700' },
  otpSection: { gap: 24 },
  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  bottom:     { alignItems: 'center', gap: 16 },
  resendText: { fontSize: 14, color: Colors.textMuted },
  resendBold: { color: Colors.secondary, fontWeight: '700' },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { fontSize: 13, color: Colors.textMuted },
});
