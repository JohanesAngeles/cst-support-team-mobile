import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authAPI } from '../../api/auth';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const [email,   setEmail]   = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Required', 'Enter your email address.'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <View style={s.inner}>

          {/* Back */}
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: isDark ? theme.surface : theme.surfaceLight, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          {/* Icon + heading */}
          <View style={s.top}>
            <View style={[s.iconCircle, { backgroundColor: theme.secondary + '1A', borderColor: theme.secondary + '40' }]}>
              <Ionicons name="lock-open-outline" size={38} color={theme.secondary} />
            </View>
            <Text style={[s.title, { color: theme.text }]}>Forgot Password?</Text>
            <Text style={[s.subtitle, { color: theme.textMuted }]}>
              Enter your email and we'll send you a 6-digit reset code.
            </Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <View style={[
              s.inputBox,
              { backgroundColor: isDark ? theme.inputBg : '#F0F4F8', borderColor: focused ? theme.secondary : theme.border, borderWidth: focused ? 1.5 : 1 },
            ]}>
              <Ionicons name="mail-outline" size={18} color={focused ? theme.secondary : theme.textMuted} style={s.icon} />
              <TextInput
                style={[s.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: theme.secondary }, loading && s.disabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading
                ? <ActivityIndicator color="#021B3A" />
                : <Text style={s.btnText}>Send Reset Code</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => navigation.navigate('ResetPassword', { email: '' })}
            >
              <Text style={[s.linkText, { color: theme.textMuted }]}>
                Already have a code?{'  '}
                <Text style={[s.linkBold, { color: theme.secondary }]}>Enter it here</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  kav:  { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 32, justifyContent: 'space-between' },

  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },

  top: { alignItems: 'center', gap: 12, paddingTop: 12 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title:    { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280 },

  form: { gap: 14 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 14, height: 54,
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },

  btn: {
    height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText:  { color: '#021B3A', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.6 },

  linkBtn:  { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '700' },
});
