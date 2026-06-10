import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthStack';
import BlobBackground from '../../components/BlobBackground';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PasswordChanged'> };

function CheckCircle() {
  return (
    <View style={cc.outer}>
      <View style={cc.inner}>
        <View style={cc.checkLeft} />
        <View style={cc.checkRight} />
      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  outer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#E8F5E9',
    borderWidth: 2, borderColor: '#A5D6A7',
    alignItems: 'center', justifyContent: 'center',
  },
  inner: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  checkLeft: {
    position: 'absolute',
    width: 14, height: 3, borderRadius: 2,
    backgroundColor: '#2E7D32',
    transform: [{ rotate: '45deg' }, { translateX: -6 }, { translateY: 4 }],
  },
  checkRight: {
    position: 'absolute',
    width: 24, height: 3, borderRadius: 2,
    backgroundColor: '#2E7D32',
    transform: [{ rotate: '-50deg' }, { translateX: 5 }, { translateY: -2 }],
  },
});

export default function PasswordChangedScreen({ navigation }: Props) {
  const { t } = useTranslation();
  return (
    <BlobBackground style={{ flex: 1 }}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.inner}>
          <View style={s.content}>
            <CheckCircle />
            <Text style={s.title}>{t('auth.passwordChanged.title')}</Text>
            <Text style={s.subtitle}>{t('auth.passwordChanged.subtitle')}</Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{t('auth.passwordChanged.backBtn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  inner: {
    flex: 1, paddingHorizontal: 28, paddingVertical: 32,
    justifyContent: 'space-between',
  },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  title:   { fontSize: 28, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  subtitle:{ fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  primaryBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#021B3A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#021B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
