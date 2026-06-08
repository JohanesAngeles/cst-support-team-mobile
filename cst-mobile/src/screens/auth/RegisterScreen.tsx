import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthStack';
import SparkleCluster from '../../components/auth/SparkleCluster';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const Colors = useColors();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert(t('auth.register.missingFields'), t('auth.register.missingFieldsMsg')); return;
    }
    if (password !== confirmPassword) { Alert.alert(t('auth.register.passwordMismatch'), t('auth.register.passwordMismatchMsg')); return; }
    if (password.length < 8) { Alert.alert(t('auth.register.weakPassword'), t('auth.register.weakPasswordMsg')); return; }
    try {
      setLoading(true);
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || undefined);
      navigation.navigate('PostSignupPreferences');
    } catch (err: any) {
      Alert.alert(t('auth.register.registrationFailed'), err.message);
    } finally { setLoading(false); }
  };

  const inputBoxStyle = (field: string) => [
    s.inputBox,
    { backgroundColor: Colors.inputBg, borderColor: 'transparent' },
    focused === field && { borderColor: Colors.primary, backgroundColor: Colors.background },
  ];

  return (
    <View style={[s.root, { backgroundColor: Colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            <View style={s.topRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <View style={s.logoPill}>
                <Image source={require('../../../assets/logo/cst_logo_white.png')} style={s.logoImg} resizeMode="contain" />
              </View>
            </View>

            <View style={s.header}>
              <SparkleCluster size="sm" />
              <Text style={[s.title, { color: Colors.text }]}>{t('auth.register.title')}</Text>
              <Text style={[s.subtitle, { color: Colors.textMuted }]}>{t('auth.register.subtitle')}</Text>
            </View>

            <View style={s.form}>
              {[
                { key: 'name',     label: t('auth.register.nameLabel'),            placeholder: t('auth.register.namePlaceholder'),            value: name,            set: setName,            keyboard: 'default' as const,       cap: 'words' as const  },
                { key: 'email',    label: t('auth.register.emailLabel'),           placeholder: t('auth.register.emailPlaceholder'),           value: email,           set: setEmail,           keyboard: 'email-address' as const, cap: 'none' as const   },
                { key: 'phone',    label: t('auth.register.phoneLabel'),           placeholder: t('auth.register.phonePlaceholder'),           value: phone,           set: setPhone,           keyboard: 'phone-pad' as const,     cap: 'none' as const   },
              ].map(f => (
                <View key={f.key} style={s.fieldGroup}>
                  <Text style={[s.label, { color: Colors.text }]}>{f.label}{f.key === 'phone' ? <Text style={{ color: Colors.textMuted, fontWeight: '400' }}> {t('auth.register.phoneOptional')}</Text> : null}</Text>
                  <View style={inputBoxStyle(f.key)}>
                    <TextInput style={[s.input, { color: Colors.text }]} placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} value={f.value} onChangeText={f.set} keyboardType={f.keyboard} autoCapitalize={f.cap} autoCorrect={false} onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)} />
                  </View>
                </View>
              ))}

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.register.passwordLabel')}</Text>
                <View style={inputBoxStyle('password')}>
                  <TextInput style={[s.input, { flex: 1, color: Colors.text }]} placeholder={t('auth.register.passwordPlaceholder')} placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPwd} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.register.confirmPasswordLabel')}</Text>
                <View style={inputBoxStyle('confirm')}>
                  <TextInput style={[s.input, { color: Colors.text }]} placeholder={t('auth.register.confirmPasswordPlaceholder')} placeholderTextColor={Colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPwd} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)} />
                </View>
              </View>

              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.register.createBtn')}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                <Text style={[s.footerText, { color: Colors.textMuted }]}>{t('auth.register.alreadyHaveAccount')}{'  '}<Text style={s.footerBold}>{t('auth.register.signIn')}</Text></Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 8 },
  backBtn: { padding: 4 },
  logoPill: { backgroundColor: '#021B3A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  logoImg: { width: 90, height: 30 },
  header: { paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 10 },
  subtitle: { fontSize: 15, marginTop: 5 },
  form: { gap: 14, marginTop: 22 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, height: 54, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: { height: 56, borderRadius: 28, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center', marginTop: 6, shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  footer: { alignItems: 'center', gap: 16, marginTop: 28 },
  footerText: { fontSize: 14 },
  footerBold: { color: '#021B3A', fontWeight: '700' },
  legal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11 },
});
