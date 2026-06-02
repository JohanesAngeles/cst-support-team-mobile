import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getInvoices, addInvoice, updateInvoiceStatus, emailInvoice, deleteInvoice } from '../../api/features';

interface ServiceLine { description: string; quantity: string; rate: string }
interface Invoice {
  _id: string; invoiceNumber: string; date: string; dueDate: string;
  billTo: { name: string; address?: string; email?: string; phone?: string };
  services: { description: string; quantity: number; rate: number; amount: number }[];
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  status: 'draft' | 'sent' | 'paid'; paidAt?: string; loadRef?: string; notes?: string;
}

const STATUS_COLOR: Record<string, string> = { draft: '#8FA3B1', sent: '#3498DB', paid: '#2ECC71', overdue: '#E74C3C' };
const isOverdue = (inv: Invoice) => inv.status !== 'paid' && new Date(inv.dueDate) < new Date();
const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const dueDateStr = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; };
const nextInvNum = () => `INV-${Date.now().toString().slice(-6)}`;

export default function InvoiceScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    invCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invNum: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    invBillTo: { color: Colors.textMuted, fontSize: 13 },
    invDate: { color: Colors.textMuted, fontSize: 12 },
    invTotal: { color: Colors.secondary, fontSize: 22, fontWeight: '900' },
    invActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: Colors.secondary + '44' },
    actionText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginTop: 12, marginBottom: 6 },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 3 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14, marginBottom: 6 },
    rowInputs: { flexDirection: 'row', gap: 8 },
    serviceRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
    addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
    addLineText: { color: Colors.secondary, fontSize: 13, fontWeight: '600' },
    totalsBox: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, marginTop: 8, gap: 3 },
    totalLine: { color: Colors.textMuted, fontSize: 13 },
    totalBig: { color: Colors.secondary, fontSize: 18, fontWeight: '900', marginTop: 4 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(dueDateStr());
  const [loadRef, setLoadRef] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [services, setServices] = useState<ServiceLine[]>([{ description: 'Freight Services', quantity: '1', rate: '' }]);

  const load = useCallback(async () => {
    try {
      const data = await getInvoices();
      setInvoices(data.invoices ?? []);
    } catch {
      Alert.alert('Error', 'Could not load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addServiceLine = () => setServices(prev => [...prev, { description: '', quantity: '1', rate: '' }]);
  const removeServiceLine = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof ServiceLine, val: string) =>
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const calcTotals = () => {
    const sub = services.reduce((sum, s) => {
      const q = parseFloat(s.quantity) || 0;
      const r = parseFloat(s.rate) || 0;
      return sum + q * r;
    }, 0);
    const taxAmt = sub * ((parseFloat(taxRate) || 0) / 100);
    return { subtotal: sub, taxAmount: taxAmt, total: sub + taxAmt };
  };

  const handleSave = async () => {
    if (!billToName.trim()) { Alert.alert('Error', 'Bill-to name is required'); return; }
    if (services.some(s => !s.description || !s.rate)) { Alert.alert('Error', 'All service lines need a description and rate'); return; }
    setSaving(true);
    try {
      const { subtotal, taxAmount, total } = calcTotals();
      const tr = parseFloat(taxRate) || 0;
      await addInvoice({
        invoiceNumber: nextInvNum(), date: invoiceDate, dueDate,
        billTo: { name: billToName, address: billToAddress, email: billToEmail },
        services: services.map(s => ({
          description: s.description,
          quantity: parseFloat(s.quantity) || 1,
          rate: parseFloat(s.rate) || 0,
          amount: (parseFloat(s.quantity) || 1) * (parseFloat(s.rate) || 0),
        })),
        subtotal, taxRate: tr, taxAmount, total,
        loadRef: loadRef || undefined, notes: notes || undefined,
      });
      setModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmail = async (inv: Invoice) => {
    const to = inv.billTo.email;
    if (!to) {
      Alert.alert('No Email', 'This invoice has no email address. Edit the invoice to add one.');
      return;
    }
    Alert.alert('Send Invoice', `Email ${inv.invoiceNumber} to ${to}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          try {
            await emailInvoice(inv._id);
            Alert.alert('Sent', `Invoice emailed to ${to}`);
            load();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to send email');
          }
        },
      },
    ]);
  };

  const handlePrint = async (inv: Invoice) => {
    setPrinting(inv._id);
    try {
      const rows = inv.services.map(s =>
        `<tr><td>${s.description}</td><td style="text-align:center">${s.quantity}</td><td style="text-align:right">${fmtMoney(s.rate)}</td><td style="text-align:right">${fmtMoney(s.amount)}</td></tr>`
      ).join('');
      const html = `<html><body style="font-family:Arial;padding:30px;max-width:700px;margin:0 auto">
        <h1 style="color:#1A3A5C">INVOICE</h1>
        <p><strong>${inv.invoiceNumber}</strong> | Date: ${inv.date} | Due: ${inv.dueDate}</p>
        <hr/><p><strong>Bill To:</strong><br/>${inv.billTo.name}<br/>${inv.billTo.address || ''}</p>
        ${inv.loadRef ? `<p>Load Ref: ${inv.loadRef}</p>` : ''}
        <table width="100%" border="1" cellpadding="8" style="border-collapse:collapse;margin-top:20px">
          <thead style="background:#1A3A5C;color:white">
            <tr><th style="text-align:left">Description</th><th>Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>
          </thead><tbody>${rows}</tbody>
        </table>
        <div style="text-align:right;margin-top:20px">
          <p>Subtotal: ${fmtMoney(inv.subtotal)}</p>
          ${inv.taxRate ? `<p>Tax (${inv.taxRate}%): ${fmtMoney(inv.taxAmount)}</p>` : ''}
          <h2>Total: ${fmtMoney(inv.total)}</h2>
        </div>
        ${inv.notes ? `<p><em>${inv.notes}</em></p>` : ''}
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setPrinting(null);
    }
  };

  const handleStatusCycle = async (inv: Invoice) => {
    const next = inv.status === 'draft' ? 'sent' : inv.status === 'sent' ? 'paid' : 'draft';
    try {
      await updateInvoiceStatus(inv._id, next);
      load();
    } catch { Alert.alert('Error', 'Could not update status'); }
  };

  const handleDelete = (inv: Invoice) => {
    Alert.alert('Delete Invoice', `Remove ${inv.invoiceNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteInvoice(inv._id); load(); } },
    ]);
  };

  const { subtotal, taxAmount, total } = calcTotals();

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.textDark} />
          <Text style={styles.addBtnText}>New Invoice</Text>
        </TouchableOpacity>

        {invoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No invoices yet</Text>
          </View>
        ) : (
          invoices.map(inv => (
            <View key={inv._id} style={styles.invCard}>
              <View style={styles.invHeader}>
                <Text style={styles.invNum}>{inv.invoiceNumber}</Text>
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: (isOverdue(inv) ? STATUS_COLOR.overdue : STATUS_COLOR[inv.status]) + '22' }]}
                  onPress={() => handleStatusCycle(inv)}
                >
                  <Text style={[styles.statusText, { color: isOverdue(inv) ? STATUS_COLOR.overdue : STATUS_COLOR[inv.status] }]}>
                    {isOverdue(inv) ? 'OVERDUE' : inv.status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.invBillTo}>{inv.billTo.name}</Text>
              <Text style={[styles.invDate, isOverdue(inv) && { color: STATUS_COLOR.overdue }]}>
                Due: {inv.dueDate}{inv.paidAt ? `  ·  Paid: ${inv.paidAt}` : ''}
              </Text>
              <Text style={styles.invTotal}>{fmtMoney(inv.total)}</Text>
              <View style={styles.invActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrint(inv)} disabled={printing === inv._id}>
                  {printing === inv._id
                    ? <ActivityIndicator size="small" color={Colors.secondary} />
                    : <><Ionicons name="share-outline" size={15} color={Colors.secondary} /><Text style={styles.actionText}>Export PDF</Text></>
                  }
                </TouchableOpacity>
                {inv.billTo.email ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEmail(inv)}>
                    <Ionicons name="mail-outline" size={15} color={Colors.secondary} />
                    <Text style={styles.actionText}>Email</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.danger + '44' }]} onPress={() => handleDelete(inv)}>
                  <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Invoice</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <TextInput style={styles.modalInput} value={billToName} onChangeText={setBillToName} placeholder="Company / broker name *" placeholderTextColor={Colors.textMuted} />
              <TextInput style={styles.modalInput} value={billToAddress} onChangeText={setBillToAddress} placeholder="Address (optional)" placeholderTextColor={Colors.textMuted} />
              <TextInput style={styles.modalInput} value={billToEmail} onChangeText={setBillToEmail} placeholder="Email (optional)" placeholderTextColor={Colors.textMuted} keyboardType="email-address" />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Invoice Date</Text>
                  <TextInput style={styles.modalInput} value={invoiceDate} onChangeText={setInvoiceDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Due Date</Text>
                  <TextInput style={styles.modalInput} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Services</Text>
              {services.map((s, i) => (
                <View key={i} style={styles.serviceRow}>
                  <TextInput style={[styles.modalInput, { flex: 2 }]} value={s.description} onChangeText={v => updateService(i, 'description', v)} placeholder="Description" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={[styles.modalInput, { flex: 0.7 }]} value={s.quantity} onChangeText={v => updateService(i, 'quantity', v)} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={[styles.modalInput, { flex: 1 }]} value={s.rate} onChangeText={v => updateService(i, 'rate', v)} keyboardType="decimal-pad" placeholder="Rate $" placeholderTextColor={Colors.textMuted} />
                  {services.length > 1 && (
                    <TouchableOpacity onPress={() => removeServiceLine(i)}>
                      <Ionicons name="close-circle" size={20} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addLineBtn} onPress={addServiceLine}>
                <Ionicons name="add" size={16} color={Colors.secondary} />
                <Text style={styles.addLineText}>Add Line</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Tax Rate (%)</Text>
              <TextInput style={styles.modalInput} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.modalLabel}>Load Reference (optional)</Text>
              <TextInput style={styles.modalInput} value={loadRef} onChangeText={setLoadRef} placeholder="Load # or BOL" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput style={[styles.modalInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline placeholder="Payment terms, thank you message..." placeholderTextColor={Colors.textMuted} />

              <View style={styles.totalsBox}>
                <Text style={styles.totalLine}>Subtotal: {fmtMoney(subtotal)}</Text>
                {parseFloat(taxRate) > 0 && <Text style={styles.totalLine}>Tax ({taxRate}%): {fmtMoney(taxAmount)}</Text>}
                <Text style={styles.totalBig}>Total: {fmtMoney(total)}</Text>
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Create Invoice</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
