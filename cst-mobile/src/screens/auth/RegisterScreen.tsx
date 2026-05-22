import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    try {
      setLoading(true);
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || undefined);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const Field = (
    icon: React.ComponentProps<typeof Ionicons>['name'],
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { secure?: boolean; keyboard?: any; toggle?: () => void }
  ) => (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        secureTextEntry={opts?.secure && !showPassword}
        keyboardType={opts?.keyboard ?? 'default'}
        autoCapitalize={opts?.keyboard === 'email-address' ? 'none' : 'words'}
      />
      {opts?.toggle && (
        <TouchableOpacity onPress={opts.toggle}>
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Road Ready Network</Text>
          </View>

          <View style={styles.form}>
            {Field('person-outline', 'Full Name *', name, setName)}
            {Field('mail-outline', 'Email Address *', email, setEmail, { keyboard: 'email-address' })}
            {Field('call-outline', 'Phone Number (optional)', phone, setPhone, { keyboard: 'phone-pad' })}
            {Field('lock-closed-outline', 'Password * (min 8 chars)', password, setPassword, {
              secure: true, toggle: () => setShowPassword(!showPassword),
            })}
            {Field('lock-closed-outline', 'Confirm Password *', confirmPassword, setConfirmPassword, { secure: true })}

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={Colors.textDark} />
                : <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 24 },
  headerSection: { marginBottom: 28 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.white, fontSize: 15 },
  button: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: Colors.textDark, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: Colors.textMuted, fontSize: 14 },
  linkBold: { color: Colors.secondary, fontWeight: '700' },
});
