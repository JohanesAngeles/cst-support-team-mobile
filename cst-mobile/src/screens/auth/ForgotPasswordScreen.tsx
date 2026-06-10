import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import SparkleCluster from '../../components/auth/SparkleCluster';
import BlobBackground from '../../components/BlobBackground';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const Colors = useColors();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert(t('common.error'), t('auth.forgotPassword.emailPlaceholder')); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err: any) { Alert.alert(t('common.error'), err.message); }
    finally { setLoading(false); }
  };

  return (
    <BlobBackground style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.inner}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <View style={s.header}>
              <SparkleCluster size="md" />
              <Text style={[s.title, { color: Colors.text }]}>{t('auth.forgotPassword.title')}</Text>
              <Text style={[s.subtitle, { color: Colors.textMuted }]}>{t('auth.forgotPassword.subtitle')}</Text>
            </View>
            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={[s.label, { color: Colors.text }]}>{t('auth.forgotPassword.emailLabel')}</Text>
                <View style={[s.inputBox, { backgroundColor: Colors.inputBg, borderColor: focused ? Colors.primary : 'transparent' }, focused && { backgroundColor: Colors.background }]}>
                  <TextInput style={[s.input, { color: Colors.text }]} value={email} onChangeText={setEmail} placeholder={t('auth.forgotPassword.emailPlaceholder')} placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
                </View>
              </View>
              <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleSend} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>{t('auth.forgotPassword.sendBtn')}</Text>}
              </TouchableOpacity>
            </View>
            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('ResetPassword', { email: '' })} activeOpacity={0.8}>
                <Text style={[s.footerText, { color: Colors.textMuted }]}>{t('auth.forgotPassword.haveCode')}{'  '}<Text style={s.footerBold}>{t('auth.forgotPassword.enterHere')}</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 },
  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },
  header: { paddingTop: 10, paddingBottom: 4, flex: 1 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 10 },
  subtitle: { fontSize: 15, marginTop: 6, lineHeight: 22 },
  form: { gap: 16 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, height: 54, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: { height: 56, borderRadius: 28, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center', shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerBold: { color: '#021B3A', fontWeight: '700' },
});
