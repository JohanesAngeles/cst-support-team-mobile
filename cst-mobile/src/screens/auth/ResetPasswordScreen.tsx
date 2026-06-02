import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { authAPI } from '../../api/auth';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const [email,           setEmail]           = useState(route.params?.email ?? '');
  const [code,            setCode]            = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [focused,         setFocused]         = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !code.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'All fields are required.'); return;
    }
    if (code.trim().length !== 6) { Alert.alert('Invalid Code', 'Enter the 6-digit code.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (newPassword.length < 8) { Alert.alert('Weak Password', 'Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      Alert.alert('Password Reset', 'Your password has been reset. Please sign in.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    s.inputBox,
    {
      backgroundColor: isDark ? theme.inputBg : '#F0F4F8',
      borderColor: focused === field ? theme.secondary : theme.border,
      borderWidth: focused === field ? 1.5 : 1,
    },
  ];

  const iconColor = (field: string) => focused === field ? theme.secondary : theme.textMuted;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
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
              <Ionicons name="key-outline" size={38} color={theme.secondary} />
            </View>
            <Text style={[s.title, { color: theme.text }]}>Reset Password</Text>
            <Text style={[s.subtitle, { color: theme.textMuted }]}>
              Enter the code from your email and set a new password.
            </Text>
          </View>

          {/* Fields */}
          <View style={s.fields}>
            <View style={inputStyle('email')}>
              <Ionicons name="mail-outline" size={18} color={iconColor('email')} style={s.icon} />
              <TextInput
                style={[s.input, { color: theme.text }]}
                value={email} onChangeText={setEmail}
                placeholder="Email address" placeholderTextColor={theme.textMuted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              />
            </View>

            <View style={inputStyle('code')}>
              <Ionicons name="keypad-outline" size={18} color={iconColor('code')} style={s.icon} />
              <TextInput
                style={[s.input, { color: theme.text }]}
                value={code} onChangeText={setCode}
                placeholder="6-digit reset code" placeholderTextColor={theme.textMuted}
                keyboardType="number-pad" maxLength={6}
                onFocus={() => setFocused('code')} onBlur={() => setFocused(null)}
              />
            </View>

            <View style={inputStyle('password')}>
              <Ionicons name="lock-closed-outline" size={18} color={iconColor('password')} style={s.icon} />
              <TextInput
                style={[s.input, { color: theme.text }]}
                value={newPassword} onChangeText={setNewPassword}
                placeholder="New password (min 8 chars)" placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPwd}
                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={inputStyle('confirm')}>
              <Ionicons name="lock-closed-outline" size={18} color={iconColor('confirm')} style={s.icon} />
              <TextInput
                style={[s.input, { color: theme.text }]}
                value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Confirm new password" placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPwd}
                onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
              />
            </View>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: theme.secondary }, loading && s.disabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading
                ? <ActivityIndicator color="#021B3A" />
                : <Text style={s.btnText}>Reset Password</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  kav:    { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 40, gap: 24 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },

  top: { alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title:    { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280 },

  fields: { gap: 12 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 14, height: 54,
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },

  btn: {
    height: 54, borderRadius: 14, marginTop: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText:  { color: '#021B3A', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.6 },
});
