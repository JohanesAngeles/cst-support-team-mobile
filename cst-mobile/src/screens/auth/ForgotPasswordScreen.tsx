import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authAPI } from '../../api/auth';
import { Colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Enter your email address'); return; }
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={56} color={Colors.secondary} />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a 6-digit reset code.</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.textDark} />
            : <Text style={styles.buttonText}>SEND RESET CODE</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword', { email: '' })} style={styles.link}>
          <Text style={styles.linkText}>Already have a code? <Text style={styles.linkBold}>Enter it here</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 28, gap: 16 },
  back: { position: 'absolute', top: 16, left: 28 },
  iconWrap: { alignItems: 'center', marginBottom: 8 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 21 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: Colors.white, fontSize: 15 },
  button: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: Colors.textDark, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  link: { alignItems: 'center' },
  linkText: { color: Colors.textMuted, fontSize: 14 },
  linkBold: { color: Colors.secondary, fontWeight: '700' },
});
