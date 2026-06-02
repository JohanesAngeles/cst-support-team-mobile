import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getRevenue, getExpenses, getTaxReport } from '../../api/features';

// IRS 2024 rates for self-employed truckers
const SE_TAX_RATE        = 0.1530;  // 15.3% self-employment tax
const SE_DEDUCTION       = 0.50;    // deduct half of SE tax from income
const INCOME_TAX_RATE    = 0.22;    // 22% bracket (rough estimate for owner-operators)
const PER_DIEM_RATE      = 69;      // IRS per diem for truckers (2024)
const PER_DIEM_PCT       = 0.80;    // 80% of per diem is deductible

const QUARTERS = [
  { q: 1, label: 'Q1',  months: 'Jan–Mar',  due: 'April 15'   },
  { q: 2, label: 'Q2',  months: 'Apr–Jun',  due: 'June 16'    },
  { q: 3, label: 'Q3',  months: 'Jul–Sep',  due: 'September 15' },
  { q: 4, label: 'Q4',  months: 'Oct–Dec',  due: 'January 15' },
];

const fmtMoney = (n: number) =>
  `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const currentQuarter = () => {
  const m = new Date().getMonth();
  if (m <= 2) return 1;
  if (m <= 5) return 2;
  if (m <= 8) return 3;
  return 4;
};

export default function QuarterlyTaxScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    scroll: { padding: 16, paddingBottom: 40, gap: 14 },
    qTabs: { flexDirection: 'row', gap: 8 },
    qTab: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
      backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    qTabActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    qTabLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    qTabLabelActive: { color: Colors.textDark },
    qTabDue: { color: Colors.textMuted, fontSize: 9, marginTop: 1 },
    qTabDueActive: { color: Colors.textDark + 'AA' },
    bigCard: {
      backgroundColor: Colors.surface, borderRadius: 16,
      borderWidth: 2, borderColor: Colors.secondary + '44', padding: 20, gap: 6,
    },
    bigLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    bigValue: { color: Colors.secondary, fontSize: 48, fontWeight: '900', letterSpacing: -1 },
    bigSub: { color: Colors.textMuted, fontSize: 13 },
    breakdownCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 0,
    },
    breakdownTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    rowLabel: { color: Colors.textMuted, fontSize: 13, flex: 1, paddingRight: 8 },
    rowValue: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    rowValueRed: { color: Colors.danger, fontSize: 14, fontWeight: '700' },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 12, marginTop: 4, borderTopWidth: 2, borderTopColor: Colors.secondary,
    },
    totalLabel: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    totalValue: { color: Colors.secondary, fontSize: 18, fontWeight: '900' },
    dueDateCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.secondary + '12', borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: Colors.secondary + '44',
    },
    dueDateText: { color: Colors.secondary, fontSize: 13, fontWeight: '600', flex: 1 },
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 15,
    },
    exportBtnText: { color: Colors.textDark, fontWeight: '900', fontSize: 15 },
    disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  }), [Colors]);

  const [selectedQ,     setSelectedQ]     = useState(currentQuarter());
  const [grossRevenue,  setGrossRevenue]  = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalMiles,    setTotalMiles]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [exporting,     setExporting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch YTD data — use Year period which gives full year
      const [revData, expData] = await Promise.all([
        getRevenue('Year'),
        getExpenses(),
      ]);
      setGrossRevenue(revData?.grossRevenue ?? 0);
      setTotalMiles(revData?.totalMiles ?? 0);

      // Sum all expenses
      const exps: { amount: number }[] = expData?.expenses ?? [];
      setTotalExpenses(exps.reduce((s: number, e: { amount: number }) => s + (e.amount ?? 0), 0));
    } catch { /* use zeros */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Scale revenue/expenses to the selected quarter (approximate ÷4)
  const qRevenue  = grossRevenue  / 4;
  const qExpenses = totalExpenses / 4;
  const qMiles    = totalMiles    / 4;

  // Deductions
  const perDiemDays       = Math.round(qMiles / 500);           // ~500 mi/day average
  const perDiemDeduction  = perDiemDays * PER_DIEM_RATE * PER_DIEM_PCT;
  const homeOffice        = 200;                                  // flat estimate
  const totalDeductions   = qExpenses + perDiemDeduction + homeOffice;

  // Tax calculations
  const netSelfEmploy     = Math.max(0, qRevenue - totalDeductions);
  const seTax             = netSelfEmploy * SE_TAX_RATE;
  const seDeduction       = seTax * SE_DEDUCTION;
  const taxableIncome     = Math.max(0, netSelfEmploy - seDeduction);
  const estimatedIncomeTax = taxableIncome * INCOME_TAX_RATE;
  const quarterlyPayment  = (seTax + estimatedIncomeTax) / 4;    // IRS form 1040-ES

  const qInfo = QUARTERS.find(q => q.q === selectedQ)!;

  const exportPDF = async () => {
    setExporting(true);
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 13px; }
  h1 { color: #2C6EBD; font-size: 22px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 28px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 14px; color: #2C6EBD; border-bottom: 2px solid #2C6EBD; padding-bottom: 4px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #eee; }
  .label { color: #555; }
  .val { font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #2C6EBD; margin-top: 8px; font-weight: bold; font-size: 15px; color: #2C6EBD; }
  .box { background: #EAF2FB; border-radius: 8px; padding: 16px; text-align: center; margin-top: 16px; }
  .box-amount { font-size: 36px; font-weight: 900; color: #2C6EBD; }
  .box-label { color: #666; font-size: 12px; margin-top: 4px; }
  .footer { margin-top: 32px; color: #aaa; font-size: 10px; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
  .disclaimer { background: #fff3cd; border-radius: 6px; padding: 10px; font-size: 11px; color: #856404; margin-top: 16px; }
</style></head><body>
<h1>Quarterly Tax Estimate — ${qInfo.label} ${new Date().getFullYear()}</h1>
<div class="meta">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · CST Driver App · Estimated quarterly payment due ${qInfo.due}</div>

<div class="section">
  <h2>Income & Revenue</h2>
  <div class="row"><span class="label">Gross Revenue (${qInfo.months})</span><span class="val">${fmtMoney(qRevenue)}</span></div>
  <div class="row"><span class="label">Miles Driven</span><span class="val">${Math.round(qMiles).toLocaleString()} mi</span></div>
</div>

<div class="section">
  <h2>Deductions</h2>
  <div class="row"><span class="label">Business Expenses (fuel, repairs, tolls, etc.)</span><span class="val">−${fmtMoney(qExpenses)}</span></div>
  <div class="row"><span class="label">Per Diem (est. ${perDiemDays} days × $${PER_DIEM_RATE} × 80%)</span><span class="val">−${fmtMoney(perDiemDeduction)}</span></div>
  <div class="row"><span class="label">Home Office (estimate)</span><span class="val">−${fmtMoney(homeOffice)}</span></div>
  <div class="total-row"><span>Total Deductions</span><span>−${fmtMoney(totalDeductions)}</span></div>
</div>

<div class="section">
  <h2>Tax Calculation</h2>
  <div class="row"><span class="label">Net Self-Employment Income</span><span class="val">${fmtMoney(netSelfEmploy)}</span></div>
  <div class="row"><span class="label">Self-Employment Tax (15.3%)</span><span class="val">${fmtMoney(seTax)}</span></div>
  <div class="row"><span class="label">SE Tax Deduction (50%)</span><span class="val">−${fmtMoney(seDeduction)}</span></div>
  <div class="row"><span class="label">Taxable Income</span><span class="val">${fmtMoney(taxableIncome)}</span></div>
  <div class="row"><span class="label">Estimated Income Tax (22% bracket)</span><span class="val">${fmtMoney(estimatedIncomeTax)}</span></div>
</div>

<div class="box">
  <div class="box-amount">${fmtMoney(quarterlyPayment)}</div>
  <div class="box-label">Estimated Quarterly Payment · IRS Form 1040-ES · Due ${qInfo.due}</div>
</div>

<div class="disclaimer">⚠️ This is an estimate only. Consult a licensed tax professional or CPA before filing. Actual tax liability may differ based on your complete financial situation, deductions, and applicable tax laws.</div>

<div class="footer">Generated by CST Driver Support App · Not a substitute for professional tax advice</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Q${selectedQ} Tax Estimate` });
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Quarter selector */}
        <View style={styles.qTabs}>
          {QUARTERS.map(q => (
            <TouchableOpacity
              key={q.q}
              style={[styles.qTab, selectedQ === q.q && styles.qTabActive]}
              onPress={() => setSelectedQ(q.q)}
            >
              <Text style={[styles.qTabLabel, selectedQ === q.q && styles.qTabLabelActive]}>{q.label}</Text>
              <Text style={[styles.qTabDue, selectedQ === q.q && styles.qTabDueActive]}>{q.months}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big payment card */}
        <View style={styles.bigCard}>
          <Text style={styles.bigLabel}>Estimated Quarterly Payment</Text>
          <Text style={styles.bigValue}>{fmtMoney(quarterlyPayment)}</Text>
          <Text style={styles.bigSub}>Due {qInfo.due} · IRS Form 1040-ES</Text>
        </View>

        {/* Due date reminder */}
        <View style={styles.dueDateCard}>
          <Ionicons name="calendar-outline" size={22} color={Colors.secondary} />
          <Text style={styles.dueDateText}>
            {qInfo.label} ({qInfo.months}) payment is due {qInfo.due}. Pay at IRS.gov or through EFTPS.
          </Text>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Calculation Breakdown ({qInfo.months})</Text>

          {[
            { label: 'Gross Revenue',             value: fmtMoney(qRevenue),           color: Colors.text },
            { label: 'Business Expenses',          value: `−${fmtMoney(qExpenses)}`,    color: Colors.danger },
            { label: `Per Diem (~${perDiemDays}d)`, value: `−${fmtMoney(perDiemDeduction)}`, color: Colors.danger },
            { label: 'Home Office (est.)',         value: `−${fmtMoney(homeOffice)}`,   color: Colors.danger },
            { label: 'Net Self-Employ. Income',   value: fmtMoney(netSelfEmploy),       color: Colors.text },
            { label: 'SE Tax (15.3%)',             value: fmtMoney(seTax),              color: Colors.danger },
            { label: 'SE Deduction (50%)',         value: `−${fmtMoney(seDeduction)}`,  color: '#27AE60' },
            { label: 'Taxable Income',            value: fmtMoney(taxableIncome),       color: Colors.text },
            { label: 'Income Tax (22%)',          value: fmtMoney(estimatedIncomeTax),  color: Colors.danger },
          ].map(r => (
            <View key={r.label} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={[styles.rowValue, { color: r.color }]}>{r.value}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Quarterly Payment</Text>
            <Text style={styles.totalValue}>{fmtMoney(quarterlyPayment)}</Text>
          </View>
        </View>

        {/* Export */}
        <TouchableOpacity style={[styles.exportBtn, exporting && { opacity: 0.6 }]} onPress={exportPDF} disabled={exporting}>
          {exporting
            ? <ActivityIndicator size="small" color={Colors.textDark} />
            : <><Ionicons name="document-text-outline" size={18} color={Colors.textDark} /><Text style={styles.exportBtnText}>Export for Accountant (PDF)</Text></>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Estimated using your logged revenue and expenses. Tax rates: 15.3% SE tax + 22% income tax bracket. Per diem based on IRS rate of $69/day for transportation workers. Consult a CPA for accurate filing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
