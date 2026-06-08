import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../../navigation/AuthStack';

export const PREFERENCES_KEY = '@cst_preferences';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PostSignupPreferences'> };

type Pref = {
  key: string;
  icon: string;
  title: string;
  description: string;
};

const PREF_KEYS = [
  { key: 'pushNotifications', icon: 'notifications-outline', tk: 'pushNotifications' },
  { key: 'weeklyReport',      icon: 'bar-chart-outline',     tk: 'weeklyReport'      },
  { key: 'dailyAlerts',       icon: 'sunny-outline',         tk: 'dailyAlerts'       },
  { key: 'hosReminders',      icon: 'time-outline',          tk: 'hosReminders'      },
  { key: 'fuelUpdates',       icon: 'water-outline',         tk: 'fuelUpdates'       },
] as const;

export default function PostSignupPreferencesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    pushNotifications: true,
    weeklyReport:      true,
    dailyAlerts:       false,
    hosReminders:      true,
    fuelUpdates:       false,
  });
  const [loading, setLoading] = useState(false);

  const toggle = (key: string) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const handleContinue = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      // Non-blocking — preferences saved locally, can be changed in settings
    } finally {
      setLoading(false);
    }
    navigation.navigate('LanguageSelection');
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          bounces={false}
        >
          <View style={s.header}>
            <View style={s.emoji}><Text style={s.emojiText}>🎉</Text></View>
            <Text style={s.title}>{t('auth.preferences.title')}</Text>
            <Text style={s.subtitle}>{t('auth.preferences.subtitle')}</Text>
          </View>

          <View style={s.list}>
            {PREF_KEYS.map(pref => (
              <View key={pref.key} style={s.row}>
                <View style={s.rowIcon}>
                  <Ionicons name={pref.icon as any} size={22} color="#021B3A" />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowTitle}>{t(`auth.preferences.${pref.tk}`)}</Text>
                  <Text style={s.rowDesc}>{t(`auth.preferences.${pref.tk}Desc`)}</Text>
                </View>
                <Switch value={prefs[pref.key]} onValueChange={() => toggle(pref.key)} trackColor={{ false: '#E5E5EA', true: '#021B3A' }} thumbColor="#FFFFFF" />
              </View>
            ))}
          </View>

          <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleContinue} disabled={loading} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{t('auth.preferences.continueBtn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={() => navigation.navigate('LanguageSelection')} activeOpacity={0.8}>
            <Text style={s.skipText}>{t('common.skip')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 },

  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 12 },
  emoji:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 34 },
  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  list: { gap: 12, marginBottom: 28 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EBEBEF',
    gap: 14,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EEF3F8',
    alignItems: 'center', justifyContent: 'center',
  },
  rowText:  { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  rowDesc:  { fontSize: 12, color: '#8E8E93', lineHeight: 16 },

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

  skipBtn:  { alignItems: 'center', paddingVertical: 16 },
  skipText: { fontSize: 14, color: '#AEAEB2', fontWeight: '500' },
});
