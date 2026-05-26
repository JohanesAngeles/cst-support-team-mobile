import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getIFTA, addIFTAEntry, deleteIFTAEntry } from '../../api/features';

interface IFTAEntry {
  _id: string;
  state: string;
  miles: number;
  gallons: number;
  taxAmount: number;
  quarter: number;
  year: number;
}

const QUARTER_DEADLINES: Record<number, string> = {
  1: 'Due Apr 30',
  2: 'Due Jul 31',
  3: 'Due Oct 31',
  4: 'Due Jan 31',
};

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IFTATrackerScreen() {
  const [entries, setEntries] = useState<IFTAEntry[]>([]);
  const [quarter, setQuarter] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalMiles, setTotalMiles] = useState(0);
  const [totalGallons, setTotalGallons] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [state, setStateVal] = useState('');
  const [miles, setMiles] = useState('');
  const [gallons, setGallons] = useState('');
  const [taxAmount, setTaxAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getIFTA();
      setEntries(data.entries ?? []);
      setQuarter(data.quarter ?? 1);
      setYear(data.year ?? new Date().getFullYear());
      setTotalMiles(data.totalMiles ?? 0);
      setTotalGallons(data.totalGallons ?? 0);
      setTotalTax(data.totalTax ?? 0);
    } catch { Alert.alert('Error', 'Could not load IFTA data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setStateVal(''); setMiles(''); setGallons(''); setTaxAmount('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!state.trim() || state.trim().length !== 2) {
      Alert.alert('Error', 'Enter a valid 2-letter state abbreviation'); return;
    }
    if (!miles) { Alert.alert('Error', 'Miles are required'); return; }
    setSaving(true);
    try {
      await addIFTAEntry({
        state: state.trim().toUpperCase(),
        miles: parseFloat(miles) || 0,
        gallons: parseFloat(gallons) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
      });
      setModal(false);
      load();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (e: IFTAEntry) => {
    Alert.alert('Delete Entry', `Remove ${e.state} entry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteIFTAEntry(e._id); load(); } },
    ]);
  };

  const mpg = totalGallons > 0 ? (totalMiles / totalGallons).toFixed(2) : '—';

  const exportPDF = async () => {
    if (entries.length === 0) { Alert.alert('No Data', 'Add some state entries first.'); return; }
    const rows = entries.map(e => {
      const eMpg = e.gallons > 0 ? (e.miles / e.gallons).toFixed(2) : '—';
      return `
        <tr>
          <td><strong>${e.state}</strong></td>
          <td>${fmt(e.miles)}</td>
          <td>${fmt(e.gallons)}</td>
          <td>${eMpg}</td>
          <td>${e.taxAmount > 0 ? fmtMoney(e.taxAmount) : '—'}</td>
        </tr>`;
    }).join('');

    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a2e; }
        h1 { color: #f5a623; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat { background: #f4f4f8; border-radius: 8px; padding: 12px 18px; text-align: center; }
        .stat-value { font-size: 22px; font-weight: 900; color: #1a1a2e; }
        .stat-label { font-size: 11px; color: #888; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f5a623; color: white; padding: 10px 12px; text-align: left; }
        td { padding: 9px 12px; border-bottom: 1px solid #e8e8e8; }
        tr:nth-child(even) td { background: #fafafa; }
        .total-row td { font-weight: 900; background: #fff3e0; border-top: 2px solid #f5a623; }
        .footer { margin-top: 28px; font-size: 11px; color: #999; }
        .deadline { color: #e67e22; font-weight: bold; }
      </style></head><body>
      <h1>IFTA Quarterly Report</h1>
      <div class="subtitle">Q${quarter} ${year} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &nbsp;·&nbsp; CST Driver App</div>
      <div class="summary">
        <div class="stat"><div class="stat-value">${fmt(totalMiles)}</div><div class="stat-label">Total Miles</div></div>
        <div class="stat"><div class="stat-value">${fmt(totalGallons)}</div><div class="stat-label">Total Gallons</div></div>
        <div class="stat"><div class="stat-value">${mpg}</div><div class="stat-label">Fleet MPG</div></div>
        <div class="stat"><div class="stat-value">${totalTax > 0 ? fmtMoney(totalTax) : '—'}</div><div class="stat-label">Tax Owed</div></div>
      </div>
      <table>
        <thead><tr><th>State</th><th>Miles</th><th>Gallons</th><th>MPG</th><th>Tax Amount</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td>TOTAL</td>
            <td>${fmt(totalMiles)}</td>
            <td>${fmt(totalGallons)}</td>
            <td>${mpg}</td>
            <td>${totalTax > 0 ? fmtMoney(totalTax) : '—'}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p>Filing deadline for Q${quarter}: <span class="deadline">${{ 1: 'April 30', 2: 'July 31', 3: 'October 31', 4: 'January 31' }[quarter as 1|2|3|4]}</span></p>
        <p>File through your base jurisdiction's IFTA office. Keep this report for your records.</p>
        <p style="margin-top:16px;color:#bbb;">Generated by CST Driver Support App</p>
      </div>
      </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `IFTA Q${quarter} ${year} Report` });
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={entries}
        keyExtractor={e => e._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            {/* Quarter header */}
            <View style={styles.quarterCard}>
              <View style={styles.quarterLeft}>
                <Text style={styles.quarterBadge}>Q{quarter} {year}</Text>
                <Text style={styles.quarterDeadline}>{QUARTER_DEADLINES[quarter]}</Text>
              </View>
              <TouchableOpacity style={styles.exportBtn} onPress={exportPDF}>
                <Ionicons name="download-outline" size={16} color={Colors.textDark} />
                <Text style={styles.exportText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Summary stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total Miles', value: fmt(totalMiles), icon: 'speedometer-outline', color: '#3498DB' },
                { label: 'Total Gallons', value: fmt(totalGallons), icon: 'water-outline', color: '#1ABC9C' },
                { label: 'Fleet MPG', value: mpg, icon: 'leaf-outline', color: Colors.success },
                { label: 'Tax Owed', value: totalTax > 0 ? fmtMoney(totalTax) : '—', icon: 'cash-outline', color: Colors.danger },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={styles.statCard}>
                  <Ionicons name={icon as any} size={16} color={color} />
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Info tip */}
            <View style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
              <Text style={styles.tipText}>
                Log miles and gallons per state. Backend automatically adds to current quarter. New entries accumulate — each state shows running totals.
              </Text>
            </View>

            {entries.length > 0 && (
              <Text style={styles.tableHeader}>State Breakdown</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No IFTA entries for Q{quarter} {year}</Text>
            <Text style={styles.emptySub}>Tap + to log miles by state</Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemMpg = item.gallons > 0 ? (item.miles / item.gallons).toFixed(1) : null;
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item)} activeOpacity={0.8}>
              <View style={styles.stateBadge}>
                <Text style={styles.stateText}>{item.state}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{fmt(item.miles)}</Text>
                    <Text style={styles.cardStatLabel}>miles</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{fmt(item.gallons)}</Text>
                    <Text style={styles.cardStatLabel}>gallons</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatValue, { color: itemMpg ? Colors.success : Colors.textMuted }]}>
                      {itemMpg ?? '—'}
                    </Text>
                    <Text style={styles.cardStatLabel}>MPG</Text>
                  </View>
                  {item.taxAmount > 0 && (
                    <>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardStat}>
                        <Text style={[styles.cardStatValue, { color: Colors.danger }]}>{fmtMoney(item.taxAmount)}</Text>
                        <Text style={styles.cardStatLabel}>tax</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          entries.length > 0 ? (
            <View style={styles.filingCard}>
              <Text style={styles.filingTitle}>IFTA Filing Deadlines</Text>
              {[
                { q: 'Q1 (Jan–Mar)', due: 'April 30' },
                { q: 'Q2 (Apr–Jun)', due: 'July 31' },
                { q: 'Q3 (Jul–Sep)', due: 'October 31' },
                { q: 'Q4 (Oct–Dec)', due: 'January 31' },
              ].map(({ q, due }) => (
                <View key={q} style={styles.filingRow}>
                  <Text style={styles.filingQ}>{q}</Text>
                  <Text style={styles.filingDue}>{due}</Text>
                </View>
              ))}
              <View style={styles.disclaimer}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.disclaimerText}>File through your base jurisdiction. Late filing incurs a $50 penalty or 10% of net tax, whichever is greater.</Text>
              </View>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color={Colors.textDark} />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Log State Miles</Text>
              <Text style={styles.modalSub}>Adding to Q{quarter} {year}</Text>

              <Text style={styles.modalLabel}>State (2-letter) *</Text>
              <TextInput
                style={styles.modalInput} value={state} onChangeText={setStateVal}
                placeholder="TX" placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters" maxLength={2}
              />

              <Text style={styles.modalLabel}>Miles Driven *</Text>
              <TextInput
                style={styles.modalInput} value={miles} onChangeText={setMiles}
                placeholder="0" placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.modalLabel}>Gallons Purchased</Text>
              <TextInput
                style={styles.modalInput} value={gallons} onChangeText={setGallons}
                placeholder="0.000" placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.modalLabel}>Tax Amount ($)</Text>
              <TextInput
                style={styles.modalInput} value={taxAmount} onChangeText={setTaxAmount}
                placeholder="0.00" placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />

              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.secondary} />
                <Text style={styles.noteText}>Entries for the same state in the same quarter are added together (accumulated totals).</Text>
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100 },
  quarterCard: { backgroundColor: Colors.secondary + '1A', borderRadius: 14, borderWidth: 1, borderColor: Colors.secondary + '44', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quarterLeft: { gap: 4 },
  quarterBadge: { color: Colors.secondary, fontSize: 26, fontWeight: '900' },
  quarterDeadline: { color: Colors.secondary, fontSize: 12, opacity: 0.8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  exportText: { color: Colors.textDark, fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 10, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.secondary + '12', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.secondary + '30', marginBottom: 14 },
  tipText: { color: Colors.secondary, fontSize: 12, flex: 1, lineHeight: 18 },
  tableHeader: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stateBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.secondary + '22', borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  stateText: { color: Colors.secondary, fontSize: 15, fontWeight: '900' },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatValue: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  cardStatLabel: { color: Colors.textMuted, fontSize: 10 },
  cardDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 13 },
  filingCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8, marginTop: 14 },
  filingTitle: { color: Colors.white, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  filingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.border },
  filingQ: { color: Colors.textMuted, fontSize: 13 },
  filingDue: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  disclaimerText: { color: Colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4 },
  modalTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  modalSub: { color: Colors.secondary, fontSize: 13, marginBottom: 4 },
  modalLabel: { color: Colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 4 },
  modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.white, fontSize: 14 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.secondary + '15', borderRadius: 10, padding: 12, marginTop: 12 },
  noteText: { color: Colors.secondary, fontSize: 12, flex: 1, lineHeight: 17 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: Colors.textDark, fontWeight: '800' },
});
