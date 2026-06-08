import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { getUpcomingAlerts, UpcomingAlert } from '../../utils/notifications';
import {
  getNotifications, markAllRead, clearNotifications,
  StoredNotification,
} from '../../utils/notificationHistory';

type Item =
  | { kind: 'alert';  data: UpcomingAlert }
  | { kind: 'history'; data: StoredNotification };

const urgencyColor = (days: number) => {
  if (days <= 0)  return '#CC0000';
  if (days <= 3)  return '#E74C3C';
  if (days <= 7)  return '#E67E22';
  if (days <= 14) return '#F5A623';
  return '#27AE60';
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [alerts,  setAlerts]  = useState<UpcomingAlert[]>([]);
  const [history, setHistory] = useState<StoredNotification[]>([]);
  const [tab,     setTab]     = useState<'upcoming' | 'history'>('upcoming');
  const [loading, setLoading] = useState(true);

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
        {(['upcoming', 'history'] as const).map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            style={[s.tab, tab === tabKey && { borderBottomColor: theme.secondary }]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[s.tabTxt, { color: tab === tabKey ? theme.secondary : theme.textMuted }]}>
              {tabKey === 'upcoming' ? t('notifications.upcoming') : t('notifications.history')}
            </Text>
          </TouchableOpacity>
        ))}

        {tab === 'history' && history.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
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
          keyExtractor={(_, i) => String(i)}
          renderItem={renderAlert}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
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
  tabTxt:  { fontSize: 14, fontWeight: '700' },
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
});
