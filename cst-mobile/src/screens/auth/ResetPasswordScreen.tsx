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
import { useColors } from '../../constants/colors';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import SparkleCluster from '../../components/auth/SparkleCluster';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

function OtpInput({
  value, onChange, Colors,
}: { value: string; onChange: (v: string) => void; Colors: ReturnType<typeof useColors> }) {
  const inputRef = useRef<TextInput>(null);
  const LEN = 6;
  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={otp.row}>
      <TextInput ref={inputRef} value={value} onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={LEN} style={otp.hidden} />
      {Array.from({ length: LEN }).map((_, i) => (
        <View
          key={i}
          style={[
            otp.box,
            { backgroundColor: Colors.inputBg, borderColor: 'transparent' },
            value.length === i && { borderColor: Colors.primary, backgroundColor: Colors.background },
            value.length > i && { borderColor: Colors.primary, backgroundColor: Colors.background },
          ]}
        >
          <Text style={[otp.digit, { color: Colors.text }]}>{value[i] ?? ''}</Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}
const otp = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  box:    { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  digit:  { fontSize: 22, fontWeight: '700' },
});

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const Colors = useColors();
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

  const inputBoxStyle = (field: string) => [
    s.inputBox,
    { backgroundColor: Colors.inputBg, borderColor: 'transparent' },
    focused === field && { borderColor: Colors.primary, backgroundColor: Colors.background },
  ];

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>

            <View style={s.header}>
              <SparkleCluster size="md" />
              <Text style={[s.title, { color: Colors.text }]}>{t('auth.resetPassword.title')}</Text>
              <Text style={[s.subtitle, { color: Colors.textMuted }]}>{t('auth.resetPassword.subtitle')}</Text>
            </View>

            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.resetPassword.emailLabel')}</Text>
                <View style={inputBoxStyle('email')}>
                  <TextInput style={[s.input, { color: Colors.text }]} value={email} onChangeText={setEmail} placeholder={t('auth.resetPassword.emailPlaceholder')} placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.resetPassword.codeLabel')}</Text>
                <OtpInput value={code} onChange={setCode} Colors={Colors} />
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.resetPassword.newPasswordLabel')}</Text>
                <View style={inputBoxStyle('password')}>
                  <TextInput style={[s.input, { flex: 1, color: Colors.text }]} value={newPassword} onChangeText={setNewPassword} placeholder={t('auth.resetPassword.newPasswordPlaceholder')} placeholderTextColor={Colors.textMuted} secureTextEntry={!showPwd} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.resetPassword.confirmPasswordLabel')}</Text>
                <View style={inputBoxStyle('confirm')}>
                  <TextInput style={[s.input, { color: Colors.text }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')} placeholderTextColor={Colors.textMuted} secureTextEntry={!showPwd} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.resetPassword.resetBtn')}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                <Text style={[s.footerText, { color: Colors.textMuted }]}>
                  {t('auth.resetPassword.rememberIt')}{'  '}
                  <Text style={s.footerBold}>{t('auth.resetPassword.backToLogin')}</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },
  header:   { paddingTop: 10, paddingBottom: 4 },
  title:    { fontSize: 28, fontWeight: '800', marginTop: 10 },
  subtitle: { fontSize: 15, marginTop: 6, lineHeight: 22 },
  form:       { gap: 16, marginTop: 24 },
  fieldGroup: { gap: 7 },
  label:      { fontSize: 14, fontWeight: '600' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 16, height: 54, borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#021B3A',
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
    shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  footer:    { alignItems: 'center', marginTop: 24 },
  footerText:{ fontSize: 14 },
  footerBold:{ color: '#021B3A', fontWeight: '700' },
});
