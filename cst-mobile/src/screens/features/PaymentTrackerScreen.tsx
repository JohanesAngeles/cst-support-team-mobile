import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getInvoices, updateInvoiceStatus } from '../../api/features';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  billTo: { name: string };
  total: number;
  status: 'draft' | 'sent' | 'paid';
  loadRef?: string;
}

type Filter = 'all' | 'overdue' | 'due_soon' | 'paid';

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function daysUntilDue(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate + 'T12:00:00');
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function classifyInvoice(inv: Invoice): 'overdue' | 'due_soon' | 'upcoming' | 'paid' | 'draft' {
  if (inv.status === 'paid')  return 'paid';
  if (inv.status === 'draft') return 'draft';
  const days = daysUntilDue(inv.dueDate);
  if (days < 0)    return 'overdue';
  if (days <= 7)   return 'due_soon';
  return 'upcoming';
}

export default function PaymentTrackerScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    // Summary strip
    summaryRow: { flexDirection: 'row', padding: 16, gap: 10 },
    sumCard: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
      borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 3,
    },
    sumValue: { fontSize: 18, fontWeight: '900' },
    sumLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
    // Filter tabs
    tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
    tab: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
      backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    tabActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '18' },
    tabText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: Colors.secondary },
    // List
    list: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 40 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8,
      borderLeftWidth: 4,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    invNum: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    broker: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    total: { fontSize: 20, fontWeight: '900' },
    daysBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    daysText: { fontSize: 12, fontWeight: '800' },
    metaRow: { flexDirection: 'row', gap: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: Colors.textMuted, fontSize: 12 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, borderRadius: 8, paddingVertical: 8, borderWidth: 1,
    },
    actionText: { fontSize: 12, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
  }), [Colors]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      const data = await getInvoices();
      setInvoices(data.invoices ?? []);
    } catch { Alert.alert('Error', 'Could not load invoices'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markPaid = (inv: Invoice) => {
    Alert.alert('Mark as Paid', `Mark ${inv.invoiceNumber} ($${inv.total.toFixed(2)}) as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => {
        try {
          await updateInvoiceStatus(inv._id, 'paid');
          setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'paid' } : i));
        } catch { Alert.alert('Error', 'Could not update invoice'); }
      }},
    ]);
  };

  // Computed stats
  const sent     = invoices.filter(i => i.status === 'sent');
  const overdue  = sent.filter(i => daysUntilDue(i.dueDate) < 0);
  const dueSoon  = sent.filter(i => { const d = daysUntilDue(i.dueDate); return d >= 0 && d <= 7; });
  const paid     = invoices.filter(i => i.status === 'paid');

  const totalOwed    = sent.reduce((s, i) => s + i.total, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.total, 0);
  const totalPaid    = paid.reduce((s, i) => s + i.total, 0);

  const filtered = invoices.filter(inv => {
    if (filter === 'overdue')  return classifyInvoice(inv) === 'overdue';
    if (filter === 'due_soon') return classifyInvoice(inv) === 'due_soon';
    if (filter === 'paid')     return inv.status === 'paid';
    return true;
  }).sort((a, b) => {
    // Sort: overdue first, then due_soon, then upcoming, then paid/draft
    const order = { overdue: 0, due_soon: 1, upcoming: 2, draft: 3, paid: 4 };
    return (order[classifyInvoice(a)] ?? 5) - (order[classifyInvoice(b)] ?? 5);
  });

  const renderItem = ({ item }: { item: Invoice }) => {
    const cls  = classifyInvoice(item);
    const days = daysUntilDue(item.dueDate);

    const leftColor =
      cls === 'overdue'  ? Colors.danger :
      cls === 'due_soon' ? '#E67E22' :
      cls === 'paid'     ? '#27AE60' :
      Colors.border;

    const daysLabel =
      cls === 'paid'     ? 'PAID' :
      cls === 'draft'    ? 'DRAFT' :
      cls === 'overdue'  ? `${Math.abs(days)}d OVERDUE` :
      cls === 'due_soon' ? `${days}d LEFT` :
      `Due in ${days}d`;

    const daysColor =
      cls === 'overdue'  ? Colors.danger :
      cls === 'due_soon' ? '#E67E22' :
      cls === 'paid'     ? '#27AE60' :
      Colors.textMuted;

    return (
      <View style={[styles.card, { borderLeftColor: leftColor }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invNum}>{item.invoiceNumber}</Text>
            <Text style={styles.broker}>{item.billTo?.name ?? 'Unknown'}</Text>
            {item.loadRef ? <Text style={styles.broker}>Load: {item.loadRef}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={[styles.total, { color: leftColor }]}>{fmtMoney(item.total)}</Text>
            <View style={[styles.daysBadge, { backgroundColor: daysColor + '18', borderColor: daysColor + '55' }]}>
              <Text style={[styles.daysText, { color: daysColor }]}>{daysLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>Issued {new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>Due {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>

        {item.status !== 'paid' && item.status !== 'draft' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: '#27AE60' + '55', backgroundColor: '#27AE60' + '18' }]}
              onPress={() => markPaid(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#27AE60" />
              <Text style={[styles.actionText, { color: '#27AE60' }]}>Mark Paid</Text>
            </TouchableOpacity>
            {cls === 'overdue' && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: Colors.danger + '55' }]}
                onPress={() => Alert.alert('Follow Up', `Call or email ${item.billTo?.name ?? 'the broker'} about invoice ${item.invoiceNumber} — ${Math.abs(days)} days overdue.`)}
              >
                <Ionicons name="call-outline" size={14} color={Colors.danger} />
                <Text style={[styles.actionText, { color: Colors.danger }]}>Follow Up</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { borderColor: Colors.danger + '55' }]}>
          <Text style={[styles.sumValue, { color: Colors.danger }]}>{fmtMoney(totalOverdue)}</Text>
          <Text style={styles.sumLabel}>OVERDUE</Text>
        </View>
        <View style={[styles.sumCard, { borderColor: Colors.secondary + '55' }]}>
          <Text style={[styles.sumValue, { color: Colors.secondary }]}>{fmtMoney(totalOwed)}</Text>
          <Text style={styles.sumLabel}>TOTAL OWED</Text>
        </View>
        <View style={[styles.sumCard, { borderColor: '#27AE60' + '55' }]}>
          <Text style={[styles.sumValue, { color: '#27AE60' }]}>{fmtMoney(totalPaid)}</Text>
          <Text style={styles.sumLabel}>COLLECTED</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'all',      label: `All (${invoices.length})` },
          { key: 'overdue',  label: `Overdue (${overdue.length})` },
          { key: 'due_soon', label: `Due Soon (${dueSoon.length})` },
          { key: 'paid',     label: `Paid (${paid.length})` },
        ] as { key: Filter; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No invoices in this category</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
