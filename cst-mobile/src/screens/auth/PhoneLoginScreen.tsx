import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import BlobBackground from '../../components/BlobBackground';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PhoneLogin'> };

const COUNTRIES = [
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46',  flag: '🇸🇪', name: 'Sweden' },
];

function SparkleCluster() {
  return (
    <View style={sp.wrap}>
      <View style={[sp.diamond, { width: 60, height: 60, left: 0, top: 16, borderRadius: 7 }]} />
      <View style={[sp.diamond, { width: 42, height: 42, left: 38, top: 8, borderRadius: 5 }]} />
      <View style={[sp.diamond, { width: 26, height: 26, left: 68, top: 2, borderRadius: 3 }]} />
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: { width: 102, height: 80 },
  diamond: { position: 'absolute', backgroundColor: '#EEF3F8', borderWidth: 1.5, borderColor: '#C0D0E0', transform: [{ rotate: '45deg' }] },
});

export default function PhoneLoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [country,      setCountry]      = useState(COUNTRIES[0]);
  const [phone,        setPhone]        = useState('');
  const [focused,      setFocused]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const [countrySearch,setCountrySearch]= useState('');

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  );

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      Alert.alert(t('auth.phoneLogin.invalidPhone'), t('auth.phoneLogin.invalidPhoneMsg'));
      return;
    }
    const fullPhone = `${country.code}${digits}`;
    setLoading(true);
    try {
      await (authAPI as any).sendPhoneOTP(fullPhone);
      navigation.navigate('PhoneOTP', { phone: fullPhone });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlobBackground style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.inner}>

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
            </TouchableOpacity>

            <View style={s.header}>
              <SparkleCluster />
              <Text style={s.title}>{t('auth.phoneLogin.title')}</Text>
              <Text style={s.subtitle}>{t('auth.phoneLogin.subtitle')}</Text>
            </View>

            <View style={s.form}>
              <Text style={s.label}>{t('auth.phoneLogin.phoneLabel')}</Text>
              <View style={[s.phoneRow, focused && s.phoneRowFocused]}>
                {/* Country picker trigger */}
                <TouchableOpacity style={s.countryBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                  <Text style={s.countryFlag}>{country.flag}</Text>
                  <Text style={s.countryCode}>{country.code}</Text>
                  <Ionicons name="chevron-down" size={14} color="#8E8E93" />
                </TouchableOpacity>
                <View style={s.divider} />
                <TextInput
                  style={s.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor="#AEAEB2"
                  keyboardType="phone-pad"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, loading && s.disabled]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.primaryBtnText}>{t('auth.phoneLogin.sendBtn')}</Text>
                }
              </TouchableOpacity>
            </View>

            <View style={s.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                <Text style={s.footerText}>
                  {t('auth.phoneLogin.signInEmail')}{'  '}
                  <Text style={s.footerBold}>→</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={m.root} edges={['top', 'bottom']}>
          <View style={m.header}>
            <Text style={m.title}>{t('auth.phoneLogin.selectCountry')}</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setCountrySearch(''); }}>
              <Ionicons name="close" size={24} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          <View style={m.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#AEAEB2" style={{ marginRight: 8 }} />
            <TextInput
              style={m.searchInput}
              placeholder={t('auth.phoneLogin.searchCountry')}
              placeholderTextColor="#AEAEB2"
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item, i) => `${item.code}-${item.name}-${i}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[m.row, country.name === item.name && m.rowSelected]}
                onPress={() => { setCountry(item); setShowPicker(false); setCountrySearch(''); }}
                activeOpacity={0.8}
              >
                <Text style={m.flag}>{item.flag}</Text>
                <Text style={m.countryName}>{item.name}</Text>
                <Text style={m.countryCode}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </BlobBackground>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#FFFFFF' },
  kav:   { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 },

  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },

  header:   { paddingTop: 10, paddingBottom: 4, flex: 1 },
  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginTop: 10 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 6, lineHeight: 22 },

  form:  { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent', height: 54,
  },
  phoneRowFocused: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },

  countryBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 4,
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  divider:     { width: 1, height: 28, backgroundColor: '#E5E5EA', marginHorizontal: 4 },
  phoneInput:  { flex: 1, fontSize: 15, color: '#1A1A2E', paddingHorizontal: 10 },

  primaryBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#021B3A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#021B3A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },

  footer:    { alignItems: 'center', marginTop: 24 },
  footerText:{ fontSize: 14, color: '#8E8E93' },
  footerBold:{ color: '#021B3A', fontWeight: '700' },
});

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 20, backgroundColor: '#F2F2F7',
    borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, gap: 12,
  },
  rowSelected: { backgroundColor: '#EEF3F8' },
  flag:        { fontSize: 24 },
  countryName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  countryCode: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
});
