import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { googleAuth, appleAuth } from '../../api/socialAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'SignInOptions'> };

type Provider = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  available: boolean;
};

function SparkleCluster() {
  return (
    <View style={sp.wrap}>
      <View style={[sp.diamond, { width: 54, height: 54, left: 0, top: 14, borderRadius: 6 }]} />
      <View style={[sp.diamond, { width: 38, height: 38, left: 34, top: 8, borderRadius: 5 }]} />
      <View style={[sp.diamond, { width: 24, height: 24, left: 62, top: 2, borderRadius: 3 }]} />
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: { width: 94, height: 70 },
  diamond: {
    position: 'absolute',
    backgroundColor: '#EEF3F8',
    borderWidth: 1.5,
    borderColor: '#C0D0E0',
    transform: [{ rotate: '45deg' }],
  },
});

function GoogleIcon() {
  return (
    <View style={ic.circle}>
      <Text style={{ fontSize: 14, fontWeight: '900', color: '#4285F4' }}>G</Text>
    </View>
  );
}

const ic = StyleSheet.create({
  circle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
});


export default function SignInOptionsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { loginWithSocial } = useAuth();
  const [socialBusy, setSocialBusy] = useState<string | null>(null);

  const handleGoogle = async () => {
    try {
      setSocialBusy('google');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return; // user cancelled
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const { token, user } = await googleAuth(idToken);
      await loginWithSocial(token, user);
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In Failed', err?.response?.data?.message ?? err.message);
      }
    } finally {
      setSocialBusy(null);
    }
  };

  const handleApple = async () => {
    try {
      setSocialBusy('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ') || undefined;
      const { token, user } = await appleAuth(credential.identityToken!, fullName);
      await loginWithSocial(token, user);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Failed', err?.response?.data?.message ?? err.message);
      }
    } finally {
      setSocialBusy(null);
    }
  };

  const providers: Provider[] = [
    {
      key: 'email',
      label: t('auth.signInOptions.email'),
      icon: <Ionicons name="mail-outline" size={22} color="#1A1A2E" />,
      onPress: () => navigation.navigate('Login'),
      available: true,
    },
    {
      key: 'phone',
      label: t('auth.signInOptions.phone'),
      icon: <Ionicons name="call-outline" size={22} color="#1A1A2E" />,
      onPress: () => navigation.navigate('PhoneLogin'),
      available: true,
    },
    {
      key: 'google',
      label: t('auth.signInOptions.google'),
      icon: <GoogleIcon />,
      onPress: handleGoogle,
      available: true,
    },
    {
      key: 'apple',
      label: t('auth.signInOptions.apple'),
      icon: <Ionicons name="logo-apple" size={22} color="#1A1A2E" />,
      onPress: handleApple,
      available: Platform.OS === 'ios',
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          bounces={false}
        >
          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
          </TouchableOpacity>

          {/* Header */}
          <View style={s.header}>
            <SparkleCluster />
            <Text style={s.title}>{t('auth.signInOptions.greeting')}</Text>
            <Text style={s.subtitle}>{t('auth.signInOptions.subtitle')}</Text>
          </View>

          {/* Provider list */}
          <View style={s.list}>
            {providers.filter(p => p.available).map(p => (
              <TouchableOpacity
                key={p.key}
                style={[s.row, socialBusy === p.key && s.disabled]}
                onPress={p.onPress}
                disabled={!!socialBusy}
                activeOpacity={0.8}
              >
                <View style={s.iconWrap}>
                  {socialBusy === p.key
                    ? <ActivityIndicator size="small" color="#1A1A2E" />
                    : p.icon
                  }
                </View>
                <Text style={s.rowLabel}>{p.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
              <Text style={s.footerText}>
                {t('auth.signInOptions.noAccount')}{'  '}
                <Text style={s.footerBold}>{t('auth.signInOptions.signUp')}</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 },

  backBtn: { padding: 4, alignSelf: 'flex-start', paddingTop: 16, marginBottom: 8 },

  header:   { paddingTop: 8, paddingBottom: 4 },
  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginTop: 10 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 5, marginBottom: 8 },

  list: { gap: 10, marginTop: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 16, paddingHorizontal: 18, height: 60,
    borderWidth: 1, borderColor: '#EBEBEF',
    gap: 14,
  },
  iconWrap: { width: 26, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  disabled: { opacity: 0.55 },

  footer:    { alignItems: 'center', marginTop: 28 },
  footerText:{ fontSize: 14, color: '#8E8E93' },
  footerBold:{ color: '#021B3A', fontWeight: '700' },
});
