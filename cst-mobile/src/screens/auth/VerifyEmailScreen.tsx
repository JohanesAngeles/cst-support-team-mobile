import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { Colors } from '../../constants/colors';

export default function VerifyEmailScreen() {
  const { user, logout, markVerified } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) { Alert.alert('Error', 'Enter the 6-digit code from your email'); return; }
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={64} color={Colors.secondary} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{user?.email}</Text>
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="— — — — — —"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.textDark} />
            : <Text style={styles.buttonText}>VERIFY EMAIL</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending}>
          {resending
            ? <ActivityIndicator size="small" color={Colors.secondary} />
            : <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendBold}>Resend Code</Text></Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.logoutText}>Use a different account</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 28, gap: 16 },
  iconWrap: { alignItems: 'center', marginBottom: 8 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  email: { color: Colors.secondary, fontWeight: '700' },
  inputWrapper: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.secondary,
    paddingVertical: 4,
  },
  input: { color: Colors.secondary, fontSize: 32, fontWeight: '900', letterSpacing: 8, paddingVertical: 16 },
  button: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: Colors.textDark, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  resendText: { color: Colors.textMuted, fontSize: 14 },
  resendBold: { color: Colors.secondary, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  logoutText: { color: Colors.textMuted, fontSize: 13 },
});
