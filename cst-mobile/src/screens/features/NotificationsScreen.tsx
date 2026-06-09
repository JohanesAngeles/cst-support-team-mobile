import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Switch, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { getUpcomingAlerts, UpcomingAlert } from '../../utils/notifications';
import {
  getNotifications, markAllRead, clearNotifications,
  StoredNotification,
} from '../../utils/notificationHistory';

type Tab = 'upcoming' | 'history' | 'settings';

const urgencyColor = (days: number) => {
  if (days <= 0)  return '#CC0000';
  if (days <= 3)  return '#E74C3C';
  if (days <= 7)  return '#E67E22';
  if (days <= 14) return '#F5A623';
  return '#27AE60';
};

const PREF_ITEMS = [
  { key: 'pushNotifications', icon: 'notifications-outline',  label: 'Push Notifications',   sub: 'Receive alerts on your device'        },
  { key: 'hosReminders',      icon: 'timer-outline',           label: 'HOS Reminders',         sub: 'Driving-hour limit warnings'          },
  { key: 'dailyAlerts',       icon: 'sunny-outline',           label: 'Daily Briefing',        sub: 'Morning summary of your day'          },
  { key: 'weeklyReport',      icon: 'bar-chart-outline',       label: 'Weekly Report',         sub: 'Performance & earnings recap'         },
  { key: 'fuelUpdates',       icon: 'flame-outline',           label: 'Fuel Price Alerts',     sub: 'Notify when prices change near you'   },
] as const;

type PrefKey = typeof PREF_ITEMS[number]['key'];

type Prefs = Record<PrefKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  pushNotifications: true,
  hosReminders:      true,
  dailyAlerts:       false,
  weeklyReport:      true,
  fuelUpdates:       false,
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const [alerts,  setAlerts]  = useState<UpcomingAlert[]>([]);
  const [history, setHistory] = useState<StoredNotification[]>([]);
  const [tab,     setTab]     = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const storedPrefs = user?.notificationPreferences;
  const [prefs, setPrefs] = useState<Prefs>({
    pushNotifications: storedPrefs?.pushNotifications ?? DEFAULT_PREFS.pushNotifications,
    hosReminders:      storedPrefs?.hosReminders      ?? DEFAULT_PREFS.hosReminders,
    dailyAlerts:       storedPrefs?.dailyAlerts       ?? DEFAULT_PREFS.dailyAlerts,
    weeklyReport:      storedPrefs?.weeklyReport      ?? DEFAULT_PREFS.weeklyReport,
    fuelUpdates:       storedPrefs?.fuelUpdates       ?? DEFAULT_PREFS.fuelUpdates,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([getUpcomingAlerts(), getNotifications()])
      .then(([al, hi]) => {
        if (!active) return;
        setAlerts(al);
        setHistory(hi);
        markAllRead();
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []));

  const togglePref = async (key: PrefKey, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefsSaving(true);
    try {
      const res = await authAPI.updatePreferences({ notificationPreferences: next });
      updateUser(res.data.user);
    } catch {
      setPrefs(prefs);
      Alert.alert('Error', 'Could not save preference. Try again.');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(t('notifications.clearHistory'), t('notifications.clearHistoryMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('notifications.clearHistory'), style: 'destructive', onPress: async () => {
          await clearNotifications();
          setHistory([]);
        }},
    ]);
  };

  const renderAlert = ({ item }: { item: UpcomingAlert }) => {
    const color = urgencyColor(item.daysAway);
    return (
      <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: color }]}>
        <View style={[s.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name="time-outline" size={20} color={color} />
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[s.cardSub, { color: theme.textMuted }]}>
            {item.daysAway <= 0
              ? t('notifications.dueToday')
              : item.daysAway === 1
              ? t('notifications.dueTomorrow')
              : t('notifications.dueInDays', { count: item.daysAway })}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: color + '22' }]}>
          <Text style={[s.badgeTxt, { color }]}>
            {item.daysAway <= 0 ? 'TODAY' : `${item.daysAway}d`}
          </Text>
        </View>
      </View>
    );
  };

  const renderHistory = ({ item }: { item: StoredNotification }) => (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.secondary, opacity: item.read ? 0.7 : 1 }]}>
      <View style={[s.iconWrap, { backgroundColor: theme.secondary + '1A' }]}>
        <Ionicons name="notifications-outline" size={20} color={theme.secondary} />
      </View>
      <View style={s.cardBody}>
        <Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[s.cardSub, { color: theme.textMuted }]}>{item.body}</Text>
        <Text style={[s.cardTime, { color: theme.textMuted }]}>
          {new Date(item.receivedAt).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.read && <View style={[s.unreadDot, { backgroundColor: theme.secondary }]} />}
    </View>
  );

  const isEmpty = tab === 'upcoming' ? alerts.length === 0 : history.length === 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={['bottom']}>

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {(['upcoming', 'history', 'settings'] as Tab[]).map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            style={[s.tab, tab === tabKey && { borderBottomColor: theme.secondary }]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[s.tabTxt, { color: tab === tabKey ? theme.secondary : theme.textMuted }]}>
              {tabKey === 'upcoming' ? t('notifications.upcoming')
                : tabKey === 'history' ? t('notifications.history')
                : 'Settings'}
            </Text>
          </TouchableOpacity>
        ))}

        {tab === 'history' && history.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {tab === 'settings' ? (
        <ScrollView contentContainerStyle={s.settingsWrap} showsVerticalScrollIndicator={false}>
          <Text style={[s.settingsHeading, { color: theme.textMuted }]}>
            Control which notifications you receive. Changes save instantly.
          </Text>
          {prefsSaving && (
            <View style={s.savingRow}>
              <ActivityIndicator size="small" color={theme.secondary} />
              <Text style={[s.savingTxt, { color: theme.textMuted }]}>Saving…</Text>
            </View>
          )}
          {PREF_ITEMS.map((item, idx) => (
            <View
              key={item.key}
              style={[
                s.prefRow,
                { backgroundColor: theme.surface, borderColor: theme.border },
                idx === 0 && s.prefFirst,
                idx === PREF_ITEMS.length - 1 && s.prefLast,
              ]}
            >
              <View style={[s.prefIcon, { backgroundColor: theme.secondary + '1A' }]}>
                <Ionicons name={item.icon as any} size={20} color={theme.secondary} />
              </View>
              <View style={s.prefBody}>
                <Text style={[s.prefLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[s.prefSub, { color: theme.textMuted }]}>{item.sub}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v: boolean) => togglePref(item.key, v)}
                trackColor={{ false: theme.border, true: theme.secondary }}
                thumbColor="#FFFFFF"
                disabled={prefsSaving}
              />
            </View>
          ))}
        </ScrollView>
      ) : loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.secondary} />
        </View>
      ) : isEmpty ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.border} />
          <Text style={[s.emptyTxt, { color: theme.textMuted }]}>
            {tab === 'upcoming' ? t('notifications.noUpcoming') : t('notifications.noHistory')}
          </Text>
        </View>
      ) : tab === 'upcoming' ? (
        <FlatList
          data={alerts}
          keyExtractor={(_: UpcomingAlert, i: number) => String(i)}
          renderItem={renderAlert}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item: StoredNotification) => item.id}
          renderItem={renderHistory}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  tabs:    { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center' },
  tab:     { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:  { fontSize: 13, fontWeight: '700' },
  clearBtn:{ padding: 14 },

  list:    { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderLeftWidth: 4,
  },
  iconWrap:  { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub:   { fontSize: 12 },
  cardTime:  { fontSize: 11, marginTop: 2 },
  badge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTxt:  { fontSize: 11, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },

  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14 },

  settingsWrap:    { padding: 16, paddingBottom: 40 },
  settingsHeading: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  savingRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  savingTxt:       { fontSize: 13 },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderTopWidth: 0,
    padding: 16,
  },
  prefFirst: { borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  prefLast:  { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  prefIcon:  { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  prefBody:  { flex: 1 },
  prefLabel: { fontSize: 14, fontWeight: '600' },
  prefSub:   { fontSize: 12, marginTop: 2 },
});
