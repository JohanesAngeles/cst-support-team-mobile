import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Image, ScrollView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

const GRADIENT = ['#FFFFFF', '#8AAEC8', '#1A4A70', '#021B3A'] as const;
const GRADIENT_LOCS: [number, number, number, number] = [0, 0.30, 0.55, 1.0];

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [focused,         setFocused]         = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
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

  const inputBox = (field: string) => [
    s.inputBox,
    focused === field && s.inputFocused,
  ];

  const iconColor = (field: string) =>
    focused === field ? '#FFFFFF' : 'rgba(255,255,255,0.65)';

  return (
    <LinearGradient
      colors={GRADIENT}
      locations={GRADIENT_LOCS}
      style={s.gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kav}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scroll}
            >

              {/* Back */}
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#021B3A" />
              </TouchableOpacity>

              {/* Logo */}
              <Image
                source={require('../../../assets/logo/cst_logo_white.png')}
                style={s.logo}
                resizeMode="contain"
              />

              {/* Heading */}
              <Text style={s.title}>Create Account</Text>
              <Text style={s.subtitle}>Join the CST Driver Network</Text>

              {/* Fields */}
              <View style={s.fields}>

                {/* Full Name */}
                <View style={inputBox('name')}>
                  <Ionicons name="person-outline" size={18} color={iconColor('name')} style={s.icon} />
                  <TextInput
                    style={s.input}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    value={name} onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Email */}
                <View style={inputBox('email')}>
                  <Ionicons name="mail-outline" size={18} color={iconColor('email')} style={s.icon} />
                  <TextInput
                    style={s.input}
                    placeholder="Email Address"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    value={email} onChangeText={setEmail}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Phone */}
                <View style={inputBox('phone')}>
                  <Ionicons name="call-outline" size={18} color={iconColor('phone')} style={s.icon} />
                  <TextInput
                    style={s.input}
                    placeholder="Phone Number (optional)"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    value={phone} onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Password */}
                <View style={inputBox('password')}>
                  <Ionicons name="lock-closed-outline" size={18} color={iconColor('password')} style={s.icon} />
                  <TextInput
                    style={s.input}
                    placeholder="Password (min 8 characters)"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPwd}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color="rgba(255,255,255,0.65)" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={inputBox('confirm')}>
                  <Ionicons name="lock-closed-outline" size={18} color={iconColor('confirm')} style={s.icon} />
                  <TextInput
                    style={s.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    value={confirmPassword} onChangeText={setConfirmPassword}
                    secureTextEntry={!showPwd}
                    onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Create Account */}
                <TouchableOpacity
                  style={[s.createBtn, loading && s.disabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.87}
                >
                  {loading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={s.createBtnText}>Create Account</Text>
                  }
                </TouchableOpacity>

                {/* Sign in link */}
                <TouchableOpacity
                  style={s.signInRow}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={s.signInText}>
                    Already have an account?{'  '}
                    <Text style={s.signInBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>

              </View>

              {/* Legal */}
              <View style={s.legal}>
                <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                  <Text style={s.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={s.legalDot}>·</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
                  <Text style={s.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  safe:     { flex: 1 },
  kav:      { flex: 1 },
  scroll:   { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },

  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },

  logo: { width: 200, height: 72, alignSelf: 'center', marginBottom: 20 },

  title:    { fontSize: 28, fontWeight: '800', color: '#021B3A' },
  subtitle: { fontSize: 15, color: '#757575', marginTop: 4, marginBottom: 24 },

  fields: { gap: 12 },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2,27,58,0.55)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 14,
    height: 54,
  },
  inputFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(2,27,58,0.75)',
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF' },

  createBtn: {
    height: 54, borderRadius: 14, marginTop: 4,
    backgroundColor: '#021B3A',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  disabled: { opacity: 0.6 },

  signInRow: { alignItems: 'center', paddingVertical: 4 },
  signInText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  signInBold: { color: '#FFFFFF', fontWeight: '700' },

  legal:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 28 },
  legalLink:{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'underline' },
  legalDot: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
});

