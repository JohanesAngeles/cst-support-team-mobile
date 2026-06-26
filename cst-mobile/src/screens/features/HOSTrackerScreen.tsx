import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { getHOSEntries, logHOSEntry, deleteHOSEntry } from '../../api/features';

type Cycle = '70' | '60';

interface HOSEntry {
  _id: string;
  date: string;
  drivingHours: number;
  onDutyHours: number;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const statusColor = (driving: number, onDuty: number) => {
  if (driving >= 10 || onDuty >= 13) return '#CC0000';
  if (driving >= 8 || onDuty >= 11) return '#E67E22';
  return '#27AE60';
};

export default function HOSTrackerScreen() {
  const Colors = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    cycleRow: { flexDirection: 'row', gap: 10 },
    cycleBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 12,
      backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
      alignItems: 'center',
    },
    cycleBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    cycleBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    cycleBtnTextActive: { color: Colors.textDark },
    summaryCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    summaryLabel: { color: Colors.textMuted, fontSize: 12 },
    summaryValue: { fontSize: 38, fontWeight: '900' },
    summaryUsed: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    progressBar: { height: 8, backgroundColor: Colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    warningBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: Colors.danger + '18', borderRadius: 8, padding: 8,
      borderWidth: 1, borderColor: Colors.danger + '44',
    },
    warningText: { color: Colors.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    todayCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16,
    },
    todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    todayTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    logBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    },
    logBtnText: { color: Colors.textDark, fontSize: 13, fontWeight: '700' },
    todayStats: { flexDirection: 'row', alignItems: 'center' },
    todayStat: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
    todayStatLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
    todayStatValue: { fontSize: 22, fontWeight: '900' },
    todayStatUnit: { color: Colors.textMuted, fontSize: 10 },
    rulesCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10,
    },
    rulesTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
    ruleLabel: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    ruleValue: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
    historyCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 2,
    },
    historyTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8 },
    historyRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    historyLeft: { flex: 1 },
    historyDate: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    historyNotes: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    historyRight: { alignItems: 'flex-end' },
    historyHours: { fontSize: 13 },
    historySlash: { color: Colors.textMuted },
    longPressHint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    modalDate: { color: Colors.secondary, fontSize: 13, marginBottom: 4 },
    modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10 },
    modalInput: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1,
      borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 15, marginTop: 4,
    },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [cycle, setCycle] = useState<Cycle>('70');
  const [entries, setEntries] = useState<HOSEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<HOSEntry | null>(null);

  const [drivingHours, setDrivingHours] = useState('');
  const [onDutyHours, setOnDutyHours] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getHOSEntries();
      setEntries(data.entries ?? []);
    } catch {
      Alert.alert(t('common.error'), t('hos.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const cycleLimit = cycle === '70' ? 70 : 60;
  const cycleDays  = cycle === '70' ? 8 : 7;

  // Rolling cycle total — sum on-duty hours for last N days
  const cycleTotal = entries.slice(0, cycleDays).reduce((sum, e) => sum + e.onDutyHours, 0);
  const cycleRemaining = Math.max(0, cycleLimit - cycleTotal);
  const cyclePct = Math.min(1, cycleTotal / cycleLimit);

  // Today's entry
  const todayEntry = entries.find(e => e.date === todayStr());

  const openModal = () => {
    setEditEntry(null);
    setDrivingHours(todayEntry ? String(todayEntry.drivingHours) : '');
    setOnDutyHours(todayEntry ? String(todayEntry.onDutyHours) : '');
    setNotes(todayEntry?.notes ?? '');
    setModal(true);
  };

  const openEditModal = (entry: HOSEntry) => {
    setEditEntry(entry);
    setDrivingHours(String(entry.drivingHours));
    setOnDutyHours(String(entry.onDutyHours));
    setNotes(entry.notes ?? '');
    setModal(true);
  };

  const handleSave = async () => {
    const d = parseFloat(drivingHours);
    const o = parseFloat(onDutyHours);
    if (isNaN(d) || isNaN(o)) { Alert.alert(t('common.error'), t('hos.validHoursError')); return; }
    if (d > 11) { Alert.alert(t('common.error'), t('hos.drivingExceedsError')); return; }
    if (o > 14) { Alert.alert(t('common.error'), t('hos.onDutyExceedsError')); return; }
    if (d > o)  { Alert.alert(t('common.error'), t('hos.drivingExceedsOnDuty')); return; }

    // 34-hr restart enforcement: block if cycle is already exhausted
    const existingToday = editEntry ? entries.filter(e => e._id !== editEntry._id) : entries;
    const otherDays = existingToday.slice(0, cycleDays - 1);
    const projectedCycle = otherDays.reduce((sum, e) => sum + e.onDutyHours, 0) + o;
    if (projectedCycle > cycleLimit) {
      Alert.alert(
        t('hos.restartRequiredTitle'),
        `Adding ${o} on-duty hours would put your ${cycle}-hour cycle at ${projectedCycle.toFixed(1)} hrs — over the limit.\n\nYou must take a 34-consecutive-hour restart before logging more on-duty time.`,
        [{ text: t('common.ok') }]
      );
      return;
    }
    // Warn (but allow) when within 10 hrs of the limit
    if (projectedCycle > cycleLimit - 10 && projectedCycle <= cycleLimit) {
      await new Promise<void>(resolve =>
        Alert.alert(
          t('hos.lowCycleTitle'),
          `You will have only ${(cycleLimit - projectedCycle).toFixed(1)} hrs remaining in your ${cycle}-hr cycle after this entry.`,
          [{ text: t('common.continue'), onPress: () => resolve() }, { text: t('common.cancel'), style: 'cancel', onPress: () => { setSaving(false); } }]
        )
      );
    }
    setSaving(true);
    try {
      const date = editEntry ? editEntry.date : todayStr();
      await logHOSEntry({ date, drivingHours: d, onDutyHours: o, notes });
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: HOSEntry) => {
    Alert.alert(t('hos.deleteEntryTitle'), `Remove ${fmtDate(entry.date)}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteHOSEntry(entry._id);
            load();
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message ?? t('hos.deleteError'));
          }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.secondary} />
    </View>
  );

  const hosRules = [
    { icon: 'car-outline',     label: t('hos.rule11Label'), value: t('hos.rule11Desc') },
    { icon: 'time-outline',    label: t('hos.rule14Label'), value: t('hos.rule14Desc') },
    { icon: 'bed-outline',     label: t('hos.rule10Label'), value: t('hos.rule10Desc') },
    { icon: 'cafe-outline',    label: t('hos.rule30Label'), value: t('hos.rule30Desc') },
    { icon: 'refresh-outline', label: t('hos.rule34Label'), value: t('hos.rule34Desc') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* Cycle toggle */}
        <View style={styles.cycleRow}>
          {(['70', '60'] as Cycle[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.cycleBtn, cycle === c && styles.cycleBtnActive]}
              onPress={() => setCycle(c)}
            >
              <Text style={[styles.cycleBtnText, cycle === c && styles.cycleBtnTextActive]}>
                {c === '70' ? t('hos.cycle70') : t('hos.cycle60')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cycle summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>{t('hos.hoursRemaining')}</Text>
              <Text style={[styles.summaryValue, { color: cycleRemaining < 10 ? Colors.danger : Colors.secondary }]}>
                {cycleRemaining.toFixed(1)} hrs
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>{t('hos.usedLabel', { days: cycleDays })}</Text>
              <Text style={styles.summaryUsed}>{cycleTotal.toFixed(1)} / {cycleLimit} hrs</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${cyclePct * 100}%`, backgroundColor: cyclePct > 0.85 ? Colors.danger : cyclePct > 0.65 ? '#E67E22' : Colors.secondary }
            ]} />
          </View>
          {cycleRemaining < 10 && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning-outline" size={14} color={Colors.danger} />
              <Text style={styles.warningText}>
                {cycleRemaining <= 0
                  ? t('hos.cycleLimitReached')
                  : t('hos.hrsLeftInCycle', { hrs: cycleRemaining.toFixed(1) })}
              </Text>
            </View>
          )}
        </View>

        {/* Today's status */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>{t('hos.today')}</Text>
            <TouchableOpacity style={styles.logBtn} onPress={openModal}>
              <Ionicons name={todayEntry ? 'pencil-outline' : 'add'} size={16} color={Colors.textDark} />
              <Text style={styles.logBtnText}>{todayEntry ? t('hos.edit') : t('hos.logHours')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <Text style={styles.todayStatLabel}>{t('hos.driving')}</Text>
              <Text style={[styles.todayStatValue, { color: statusColor(todayEntry?.drivingHours ?? 0, todayEntry?.onDutyHours ?? 0) }]}>
                {todayEntry ? `${todayEntry.drivingHours}` : '—'} / 11
              </Text>
              <Text style={styles.todayStatUnit}>{t('hos.hours')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayStatLabel}>{t('hos.onDutyWindow')}</Text>
              <Text style={[styles.todayStatValue, { color: statusColor(todayEntry?.drivingHours ?? 0, todayEntry?.onDutyHours ?? 0) }]}>
                {todayEntry ? `${todayEntry.onDutyHours}` : '—'} / 14
              </Text>
              <Text style={styles.todayStatUnit}>{t('hos.hours')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayStatLabel}>{t('hos.offDutyReq')}</Text>
              <Text style={styles.todayStatValue}>10</Text>
              <Text style={styles.todayStatUnit}>{t('hos.hoursMin')}</Text>
            </View>
          </View>
        </View>

        {/* HOS rules reminder */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>{t('hos.federalRules')}</Text>
          {hosRules.map(({ icon, label, value }) => (
            <View key={label} style={styles.ruleRow}>
              <Ionicons name={icon as any} size={18} color={Colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleLabel}>{label}</Text>
                <Text style={styles.ruleValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Log history */}
        {entries.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{t('hos.recentLog', { days: cycleDays })}</Text>
            {entries.slice(0, cycleDays).map((entry) => (
              <TouchableOpacity key={entry._id} style={styles.historyRow} onPress={() => openEditModal(entry)} onLongPress={() => handleDelete(entry)}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{fmtDate(entry.date)}</Text>
                  {entry.notes ? <Text style={styles.historyNotes}>{entry.notes}</Text> : null}
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyHours}>
                    <Text style={{ color: Colors.secondary }}>{entry.drivingHours}h</Text>
                    <Text style={styles.historySlash}> drive · </Text>
                    <Text style={{ color: Colors.text }}>{entry.onDutyHours}h</Text>
                    <Text style={styles.historySlash}> duty</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.longPressHint}>{t('hos.tapToEdit')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{editEntry ? t('hos.editHoursTitle') : t('hos.logTodayTitle')}</Text>
              <Text style={styles.modalDate}>{editEntry ? fmtDate(editEntry.date) : fmtDate(todayStr())}</Text>

              <Text style={styles.modalLabel}>{t('hos.drivingHoursLabel')}</Text>
              <TextInput
                style={styles.modalInput} value={drivingHours} onChangeText={setDrivingHours}
                keyboardType="decimal-pad" placeholder="0–11" placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.modalLabel}>{t('hos.onDutyHoursLabel')}</Text>
              <TextInput
                style={styles.modalInput} value={onDutyHours} onChangeText={setOnDutyHours}
                keyboardType="decimal-pad" placeholder="0–14" placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.modalLabel}>{t('hos.notesOptional')}</Text>
              <TextInput
                style={styles.modalInput} value={notes} onChangeText={setNotes}
                placeholder="Rest area, weather, etc." placeholderTextColor={Colors.textMuted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color={Colors.textDark} />
                    : <Text style={styles.saveText}>{editEntry ? t('tripLog.update') : t('common.save')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
