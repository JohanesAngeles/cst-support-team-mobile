import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage, LanguageCode } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'LanguageSelection'> };

export default function LanguageSelectionScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user, completePendingSetup } = useAuth();
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<LanguageCode>(i18n.language as LanguageCode);
  const [saving,   setSaving]   = useState(false);

  const filtered = SUPPORTED_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await changeLanguage(selected);
      authAPI.updatePreferences({ preferredLanguage: selected }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Failed to save language preference.');
    } finally {
      setSaving(false);
    }
    if (!user) {
      // End of post-signup flow — set user state and hand off to onboarding
      await completePendingSetup();
    } else {
      // Accessed from Profile settings while already logged in — just go back
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.title}>{t('auth.language.title')}</Text>
            <Text style={s.subtitle}>{t('auth.language.subtitle')}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#AEAEB2" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={t('auth.language.search')}
            placeholderTextColor="#AEAEB2"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="#AEAEB2" />
            </TouchableOpacity>
          )}
        </View>

        {/* Language list */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isSelected = selected === item.code;
            return (
              <TouchableOpacity
                style={[s.row, isSelected && s.rowSelected]}
                onPress={() => setSelected(item.code)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: `https://flagcdn.com/w40/${item.countryCode}.png` }}
                  style={s.flag}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={s.rowText}>
                  <Text style={[s.langName, isSelected && s.langNameSelected]}>{item.name}</Text>
                  <Text style={s.nativeName}>{item.nativeName}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color="#021B3A" />
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Save button */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.primaryBtn, saving && s.disabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>{t('auth.language.saveBtn')}</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12, gap: 12,
  },
  backBtn:    { padding: 4, paddingTop: 2 },
  headerText: { flex: 1 },
  title:      { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  subtitle:   { fontSize: 14, color: '#8E8E93', marginTop: 3 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 28, marginBottom: 12,
    backgroundColor: '#F2F2F7', borderRadius: 14,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },

  list: { paddingHorizontal: 28, paddingBottom: 16, gap: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    gap: 14,
  },
  rowSelected: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },

  flag:     { width: 40, height: 27, borderRadius: 4 },
  rowText:  { flex: 1 },
  langName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  langNameSelected: { color: '#021B3A' },
  nativeName: { fontSize: 13, color: '#8E8E93', marginTop: 1 },

  footer: { paddingHorizontal: 28, paddingBottom: 16, paddingTop: 8 },
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
  disabled: { opacity: 0.55 },
});
