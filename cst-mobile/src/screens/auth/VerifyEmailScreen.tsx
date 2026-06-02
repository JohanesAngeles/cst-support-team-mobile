import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { useTheme } from '../../context/ThemeContext';

export default function VerifyEmailScreen() {
  const { user, logout, markVerified } = useAuth();
  const { theme, isDark } = useTheme();
  const [code,      setCode]      = useState('');
  const [focused,   setFocused]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmail(code.trim());
      markVerified();
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification();
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <View style={s.inner}>

          {/* Icon + heading */}
          <View style={s.top}>
            <View style={[s.iconCircle, { backgroundColor: theme.secondary + '1A', borderColor: theme.secondary + '40' }]}>
              <Ionicons name="mail-open-outline" size={42} color={theme.secondary} />
            </View>
            <Text style={[s.title, { color: theme.text }]}>Verify Your Email</Text>
            <Text style={[s.subtitle, { color: theme.textMuted }]}>
              We sent a 6-digit code to{'\n'}
              <Text style={[s.emailText, { color: theme.secondary }]}>{user?.email}</Text>
            </Text>
          </View>

          {/* Code input */}
          <View style={s.codeSection}>
            <View style={[
              s.codeBox,
              {
                backgroundColor: isDark ? theme.inputBg : '#F0F4F8',
                borderColor: focused ? theme.secondary : theme.border,
                borderWidth: focused ? 2 : 1.5,
              },
            ]}>
              <TextInput
                style={[s.codeInput, { color: theme.text }]}
                value={code}
                onChangeText={setCode}
                placeholder="— — — — — —"
                placeholderTextColor={theme.border}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: theme.secondary }, loading && s.disabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading
                ? <ActivityIndicator color="#021B3A" />
                : <Text style={s.btnText}>Verify Email</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Bottom actions */}
          <View style={s.bottom}>
            <TouchableOpacity style={s.resendBtn} onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color={theme.textMuted} />
                : <Text style={[s.resendText, { color: theme.textMuted }]}>
                    Didn't receive it?{'  '}
                    <Text style={[s.resendBold, { color: theme.secondary }]}>Resend Code</Text>
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={15} color={theme.textMuted} />
              <Text style={[s.logoutText, { color: theme.textMuted }]}>Use a different account</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1 },
  kav:   { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 26, paddingVertical: 28, justifyContent: 'space-between' },

  top: { alignItems: 'center', gap: 14, paddingTop: 12 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title:     { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle:  { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emailText: { fontWeight: '700' },

  codeSection: { gap: 16 },
  codeBox: {
    borderRadius: 16,
    paddingVertical: 6,
  },
  codeInput: {
    fontSize: 34, fontWeight: '900',
    letterSpacing: 10, paddingVertical: 16,
  },

  btn: {
    height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText:  { color: '#021B3A', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.6 },

  bottom:     { alignItems: 'center', gap: 14 },
  resendBtn:  { paddingVertical: 4 },
  resendText: { fontSize: 14 },
  resendBold: { fontWeight: '700' },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { fontSize: 13 },
});
