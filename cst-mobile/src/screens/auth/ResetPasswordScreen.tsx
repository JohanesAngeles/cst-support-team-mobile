import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { authAPI } from '../../api/auth';
import { Colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !code.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required'); return;
    }
    if (code.trim().length !== 6) { Alert.alert('Error', 'Enter the 6-digit code'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      Alert.alert('Success', 'Your password has been reset. Please sign in.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
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

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the code from your email and your new password.</Text>

        {[
          { icon: 'mail-outline' as const, placeholder: 'Email address', value: email, set: setEmail, keyboard: 'email-address' as const },
        ].map(({ icon, placeholder, value, set, keyboard }) => (
          <View key={placeholder} style={styles.inputWrapper}>
            <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.icon} />
            <TextInput style={styles.input} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={Colors.textMuted} keyboardType={keyboard} autoCapitalize="none" />
          </View>
        ))}

        <View style={styles.inputWrapper}>
          <Ionicons name="keypad-outline" size={20} color={Colors.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input} value={code} onChangeText={setCode}
            placeholder="6-digit code" placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad" maxLength={6}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input} value={newPassword} onChangeText={setNewPassword}
            placeholder="New password (min 8 chars)" placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="Confirm new password" placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.textDark} />
            : <Text style={styles.buttonText}>RESET PASSWORD</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 28, gap: 14 },
  back: { position: 'absolute', top: 16, left: 28 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '800', marginTop: 40 },
  subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: Colors.white, fontSize: 15 },
  button: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: Colors.textDark, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
