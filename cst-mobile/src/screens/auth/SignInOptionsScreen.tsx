import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { googleAuth, appleAuth } from '../../api/socialAuth';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../../constants/googleAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';

WebBrowser.maybeCompleteAuthSession();

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

  const comingSoon = () => Alert.alert(t('common.comingSoon'), t('common.comingSoonMsg'));

  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    clientId:        GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { authentication } = googleResponse;
    if (!authentication?.accessToken) return;
    setSocialBusy('google');
    googleAuth(authentication.accessToken)
      .then(({ token, user }) => loginWithSocial(token, user))
      .catch(err => Alert.alert('Google Sign-In Failed', err?.response?.data?.message ?? err.message))
      .finally(() => setSocialBusy(null));
  }, [googleResponse]);

  const handleGoogle = () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert('Not Configured', 'Add your Google Client IDs first.');
      return;
    }
    googlePrompt();
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
    {
      key: 'facebook',
      label: t('auth.signInOptions.facebook'),
      icon: <Ionicons name="logo-facebook" size={22} color="#1877F2" />,
      onPress: comingSoon,
      available: true,
    },
    {
      key: 'github',
      label: t('auth.signInOptions.github'),
      icon: <Ionicons name="logo-github" size={22} color="#1A1A2E" />,
      onPress: comingSoon,
      available: true,
    },
    {
      key: 'microsoft',
      label: t('auth.signInOptions.microsoft'),
      icon: <Ionicons name="logo-windows" size={22} color="#00A4EF" />,
      onPress: comingSoon,
      available: true,
    },
    {
      key: 'linkedin',
      label: t('auth.signInOptions.linkedin'),
      icon: <Ionicons name="logo-linkedin" size={22} color="#0077B5" />,
      onPress: comingSoon,
      available: true,
    },
    {
      key: 'instagram',
      label: t('auth.signInOptions.instagram'),
      icon: <Ionicons name="logo-instagram" size={22} color="#E1306C" />,
      onPress: comingSoon,
      available: true,
    },
  ];

  return (
    <View style={s.root}>
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
