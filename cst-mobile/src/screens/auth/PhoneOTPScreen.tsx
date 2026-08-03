import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useColors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'PhoneOTP'>;
  route: RouteProp<AuthStackParamList, 'PhoneOTP'>;
};

function OtpInput({
  value,
  onChange,
  hasError,
  Colors,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  Colors: ReturnType<typeof useColors>;
}) {
  const inputRef = useRef<TextInput>(null);
  const otp = getOtpStyles(Colors);
  const LEN = 6;

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={otp.row}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={LEN}
        style={otp.hidden}
        autoFocus
      />
      {Array.from({ length: LEN }).map((_, i) => {
        const isCurrent = value.length === i;
        const isFilled  = value.length > i;
        return (
          <View key={i} style={[
            otp.box,
            isCurrent && otp.boxActive,
            isFilled  && otp.boxFilled,
            hasError  && otp.boxError,
          ]}>
            <Text style={[otp.digit, hasError && otp.digitError]}>{value[i] ?? ''}</Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
}

const getOtpStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  box: {
    width: 46, height: 56, borderRadius: 12,
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: Colors.primary, backgroundColor: Colors.background },
  boxFilled: { borderColor: Colors.primary, backgroundColor: Colors.background },
  boxError:  { borderColor: Colors.danger, backgroundColor: Colors.background },
  digit:     { fontSize: 22, fontWeight: '700', color: Colors.text },
  digitError:{ color: Colors.danger },
});

const RESEND_SECONDS = 30;

export default function PhoneOTPScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { loginWithSocial } = useAuth();
  const Colors = useColors();
  const s = getStyles(Colors);
  const phone = route.params.phone;

  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [hasError,  setHasError]  = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleCodeChange = (v: string) => {
    setCode(v);
    if (hasError) setHasError(false);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('auth.phoneOTP.invalidCode'), t('auth.phoneOTP.invalidCodeMsg'));
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await (authAPI as any).verifyPhoneOTP(phone, code);
      await loginWithSocial(token, user);
    } catch (err: any) {
      setHasError(true);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setHasError(false);
    setCode('');
    try {
      await (authAPI as any).sendPhoneOTP(phone);
      setCountdown(RESEND_SECONDS);
      Alert.alert('Code Sent', `A new code was sent to ${phone}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    : phone;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.inner}>

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>

            <View style={s.header}>
              <Text style={s.title}>{t('auth.phoneOTP.title')}</Text>
              <Text style={s.subtitle}>
                {t('auth.phoneOTP.subtitle')}{'\n'}
                <Text style={s.phoneText}>{maskedPhone}</Text>
              </Text>
            </View>

            <View style={s.otpSection}>
              <OtpInput value={code} onChange={handleCodeChange} hasError={hasError} Colors={Colors} />

              {hasError && (
                <Text style={s.errorText}>{t('auth.phoneOTP.wrongCode')}</Text>
              )}

              <TouchableOpacity
                style={[s.primaryBtn, loading && s.disabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={s.primaryBtnText}>{t('auth.phoneOTP.verifyBtn')}</Text>
                }
              </TouchableOpacity>
            </View>

            <View style={s.bottom}>
              {countdown > 0 ? (
                <Text style={s.countdownText}>
                  {t('auth.phoneOTP.resendCode')} in <Text style={s.countdownNum}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.8}>
                  {resending
                    ? <ActivityIndicator size="small" color={Colors.textMuted} />
                    : <Text style={s.resendText}>
                        {t('auth.phoneOTP.didntReceive')}{'  '}
                        <Text style={s.resendBold}>{t('auth.phoneOTP.resendCode')}</Text>
                      </Text>
                  }
                </TouchableOpacity>
              )}
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
  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },
  title:  { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: Colors.textMuted, marginTop: 6, lineHeight: 22 },
  phoneText: { color: Colors.secondary, fontWeight: '700' },
  otpSection: { gap: 24 },
  errorText:  { textAlign: 'center', fontSize: 13, color: Colors.danger, fontWeight: '500' },

  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },

  bottom:        { alignItems: 'center', marginTop: 24 },
  countdownText: { fontSize: 14, color: Colors.textMuted },
  countdownNum:  { color: Colors.secondary, fontWeight: '700' },
  resendText:    { fontSize: 14, color: Colors.textMuted },
  resendBold:    { color: Colors.secondary, fontWeight: '700' },
});
