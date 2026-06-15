import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useColors } from '../../constants/colors';

interface BOLForm {
  bolNumber: string;
  date: string;
  // Shipper
  shipperName: string;
  shipperAddress: string;
  shipperCity: string;
  shipperPhone: string;
  // Consignee
  consigneeName: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneePhone: string;
  // Carrier
  carrierName: string;
  proNumber: string;
  trailerNumber: string;
  // Freight
  commodity: string;
  pieces: string;
  weight: string;
  freightClass: string;
  hazmat: boolean;
  specialInstructions: string;
  // Rates
  rate: string;
  fuelSurcharge: string;
  accessorials: string;
}

const EMPTY: BOLForm = {
  bolNumber: `BOL-${Date.now().toString().slice(-6)}`,
  date: new Date().toISOString().split('T')[0],
  shipperName: '', shipperAddress: '', shipperCity: '', shipperPhone: '',
  consigneeName: '', consigneeAddress: '', consigneeCity: '', consigneePhone: '',
  carrierName: '', proNumber: '', trailerNumber: '',
  commodity: '', pieces: '', weight: '', freightClass: '', hazmat: false,
  specialInstructions: '', rate: '', fuelSurcharge: '', accessorials: '',
};

const FREIGHT_CLASSES = ['50','55','60','65','70','77.5','85','92.5','100','110','125','150','175','200','250','300','400','500'];

function buildBOLHtml(f: BOLForm, total: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #2C6EBD;padding-bottom:12px;margin-bottom:16px}
  .meta{font-size:11px;color:#666}
  .section{margin-bottom:16px}
  .section-title{background:#1A3A5C;color:#2C6EBD;padding:4px 10px;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse}
  td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}
  .label{color:#666;font-size:10px;text-transform:uppercase}
  .val{font-weight:bold}
  .total-row{background:#1A3A5C;color:#2C6EBD;font-weight:bold;font-size:14px}
  .hazmat{background:#E74C3C;color:#fff;padding:4px 10px;font-weight:bold;display:inline-block;border-radius:4px}
  .sig-box{border:1px solid #ccc;height:60px;margin-top:4px}
  .footer{margin-top:24px;font-size:10px;color:#999;text-align:center}
</style></head><body>
<div class="header">
  <div><h1>BILL OF LADING</h1><div class="meta">NOT NEGOTIABLE — STRAIGHT BILL OF LADING</div></div>
  <div style="text-align:right">
    <div><b>BOL #:</b> ${f.bolNumber}</div>
    <div><b>Date:</b> ${f.date}</div>
    ${f.proNumber ? `<div><b>PRO #:</b> ${f.proNumber}</div>` : ''}
  </div>
</div>
<div class="section"><div class="section-title">Shipper (Origin)</div>
  <table><tr>
    <td><div class="label">Company</div><div class="val">${f.shipperName || '—'}</div></td>
    <td><div class="label">Address</div><div class="val">${f.shipperAddress || '—'}</div></td>
    <td><div class="label">City/State/ZIP</div><div class="val">${f.shipperCity || '—'}</div></td>
    <td><div class="label">Phone</div><div class="val">${f.shipperPhone || '—'}</div></td>
  </tr></table></div>
<div class="section"><div class="section-title">Consignee (Destination)</div>
  <table><tr>
    <td><div class="label">Company</div><div class="val">${f.consigneeName || '—'}</div></td>
    <td><div class="label">Address</div><div class="val">${f.consigneeAddress || '—'}</div></td>
    <td><div class="label">City/State/ZIP</div><div class="val">${f.consigneeCity || '—'}</div></td>
    <td><div class="label">Phone</div><div class="val">${f.consigneePhone || '—'}</div></td>
  </tr></table></div>
<div class="section"><div class="section-title">Carrier</div>
  <table><tr>
    <td><div class="label">Carrier Name</div><div class="val">${f.carrierName || '—'}</div></td>
    <td><div class="label">Trailer #</div><div class="val">${f.trailerNumber || '—'}</div></td>
  </tr></table></div>
<div class="section"><div class="section-title">Freight Description</div>
  ${f.hazmat ? '<div class="hazmat">⚠ HAZARDOUS MATERIAL</div><br>' : ''}
  <table>
    <tr style="background:#f5f5f5"><td><b>Pieces</b></td><td><b>Weight (lbs)</b></td><td><b>Class</b></td><td><b>Description</b></td></tr>
    <tr><td>${f.pieces || '—'}</td><td>${f.weight || '—'}</td><td>${f.freightClass || '—'}</td><td>${f.commodity || '—'}</td></tr>
  </table>
  ${f.specialInstructions ? `<p><b>Special Instructions:</b> ${f.specialInstructions}</p>` : ''}</div>
<div class="section"><div class="section-title">Charges</div>
  <table>
    <tr><td class="label">Freight Rate</td><td class="val" style="text-align:right">$${f.rate || '0.00'}</td></tr>
    <tr><td class="label">Fuel Surcharge</td><td class="val" style="text-align:right">$${f.fuelSurcharge || '0.00'}</td></tr>
    <tr><td class="label">Accessorials</td><td class="val" style="text-align:right">$${f.accessorials || '0.00'}</td></tr>
    <tr class="total-row"><td>TOTAL CHARGES</td><td style="text-align:right">$${total}</td></tr>
  </table></div>
<table style="margin-top:20px"><tr>
  <td style="width:50%"><div class="label">Shipper Signature</div><div class="sig-box"></div><div class="meta">Date: ___________</div></td>
  <td style="width:50%"><div class="label">Driver / Carrier Signature</div><div class="sig-box"></div><div class="meta">Date: ___________</div></td>
</tr></table>
<div class="footer">Generated by Road Ready Network · ${new Date().toLocaleDateString()} · Not a negotiable instrument unless marked otherwise.</div>
</body></html>`;
}

export default function BillOfLadingScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    row: { flexDirection: 'row', marginHorizontal: -4 },
    fieldLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    pickerBtnText: { color: Colors.text, fontSize: 14 },
    classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    classItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    classItemActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    classItemText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
    hazmatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
    hazmatText: { color: Colors.textMuted, fontWeight: '600', fontSize: 14 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.secondary + '18', borderRadius: 10, padding: 14, marginTop: 4 },
    totalLabel: { color: Colors.text, fontWeight: '700', fontSize: 14 },
    totalValue: { color: Colors.secondary, fontWeight: '900', fontSize: 20 },
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 16 },
    generateBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 16 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
    resetBtnText: { color: Colors.textMuted, fontSize: 13 },
  }), [Colors]);
  const [form, setForm] = useState<BOLForm>(EMPTY);
  const [generating, setGenerating] = useState(false);
  const [classOpen, setClassOpen] = useState(false);

  const set = (key: keyof BOLForm, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  const totalCharges = () => {
    const r = parseFloat(form.rate) || 0;
    const fsc = parseFloat(form.fuelSurcharge) || 0;
    const acc = parseFloat(form.accessorials) || 0;
    return (r + fsc + acc).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const html = buildBOLHtml(form, totalCharges());
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `BOL ${form.bolNumber}` });
    } catch {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => setForm({ ...EMPTY, bolNumber: `BOL-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().split('T')[0] });

  const fld = (label: string, value: string, onChange: (v: string) => void, placeholder = '', multiline = false, half = false, numeric = false) => (
    <View key={label} style={[{ marginBottom: 12 }, half && { flex: 1, marginHorizontal: 4 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.textMuted} multiline={multiline}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );


  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Header info */}
        <View style={s.row}>
          {fld('BOL Number', form.bolNumber, v => set('bolNumber', v), 'BOL-123456', false, true)}
          {fld('Date', form.date, v => set('date', v), 'YYYY-MM-DD', false, true)}
        </View>

        {/* Shipper */}
        <Section title="Shipper (Origin)" icon="business-outline" color="#3498DB">
          {fld('Company Name', form.shipperName, v => set('shipperName', v), 'Shipper Co.')}
          {fld('Address', form.shipperAddress, v => set('shipperAddress', v), '123 Main St')}
          {fld('City, State ZIP', form.shipperCity, v => set('shipperCity', v), 'Dallas, TX 75001')}
          {fld('Phone', form.shipperPhone, v => set('shipperPhone', v), '(214) 555-0100')}
        </Section>

        {/* Consignee */}
        <Section title="Consignee (Destination)" icon="location-outline" color="#2ECC71">
          {fld('Company Name', form.consigneeName, v => set('consigneeName', v), 'Receiver Co.')}
          {fld('Address', form.consigneeAddress, v => set('consigneeAddress', v), '456 Oak Ave')}
          {fld('City, State ZIP', form.consigneeCity, v => set('consigneeCity', v), 'Houston, TX 77001')}
          {fld('Phone', form.consigneePhone, v => set('consigneePhone', v), '(713) 555-0200')}
        </Section>

        {/* Carrier */}
        <Section title="Carrier Info" icon="truck-outline" color={Colors.secondary}>
          {fld('Carrier Name', form.carrierName, v => set('carrierName', v), 'Your company name')}
          <View style={s.row}>
            {fld('PRO Number', form.proNumber, v => set('proNumber', v), 'PRO-001', false, true)}
            {fld('Trailer #', form.trailerNumber, v => set('trailerNumber', v), 'T-1234', false, true)}
          </View>
        </Section>

        {/* Freight */}
        <Section title="Freight Description" icon="cube-outline" color="#9B59B6">
          {fld('Commodity Description', form.commodity, v => set('commodity', v), 'General merchandise', true)}
          <View style={s.row}>
            {fld('Pieces', form.pieces, v => set('pieces', v), '0', false, true, true)}
            {fld('Weight (lbs)', form.weight, v => set('weight', v), '0', false, true, true)}
          </View>

          <Text style={s.fieldLabel}>Freight Class</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setClassOpen(o => !o)}>
            <Text style={s.pickerBtnText}>{form.freightClass || 'Select class'}</Text>
            <Ionicons name={classOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {classOpen && (
            <View style={s.classGrid}>
              {FREIGHT_CLASSES.map(fc => (
                <TouchableOpacity
                  key={fc}
                  style={[s.classItem, form.freightClass === fc && s.classItemActive]}
                  onPress={() => { set('freightClass', fc); setClassOpen(false); }}
                >
                  <Text style={[s.classItemText, form.freightClass === fc && { color: Colors.textDark }]}>{fc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={s.hazmatRow} onPress={() => set('hazmat', !form.hazmat)}>
            <View style={[s.checkbox, form.hazmat && s.checkboxChecked]}>
              {form.hazmat && <Ionicons name="checkmark" size={14} color={Colors.textDark} />}
            </View>
            <Text style={[s.hazmatText, form.hazmat && { color: '#E74C3C' }]}>
              HAZMAT — Hazardous Materials
            </Text>
          </TouchableOpacity>

          {fld('Special Instructions', form.specialInstructions, v => set('specialInstructions', v), 'Temperature control, fragile, etc.', true)}
        </Section>

        {/* Charges */}
        <Section title="Charges" icon="cash-outline" color="#F39C12">
          <View style={s.row}>
            {fld('Freight Rate ($)', form.rate, v => set('rate', v), '0.00', false, true, true)}
            {fld('Fuel Surcharge ($)', form.fuelSurcharge, v => set('fuelSurcharge', v), '0.00', false, true, true)}
          </View>
          {fld('Accessorials ($)', form.accessorials, v => set('accessorials', v), '0.00', false, false, true)}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Charges</Text>
            <Text style={s.totalValue}>${totalCharges()}</Text>
          </View>
        </Section>

        {/* Action buttons */}
        <TouchableOpacity style={[s.generateBtn, generating && { opacity: 0.6 }]} onPress={generatePDF} disabled={generating}>
          {generating
            ? <ActivityIndicator color={Colors.textDark} />
            : <><Ionicons name="document-text-outline" size={20} color={Colors.textDark} /><Text style={s.generateBtnText}>Generate & Share PDF</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn} onPress={reset}>
          <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
          <Text style={s.resetBtnText}>Start New BOL</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  const Colors = useColors();
  const ss = useMemo(() => StyleSheet.create({
    section: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, padding: 14 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontWeight: '800', fontSize: 14 },
  }), [Colors]);

  return (
    <View style={[ss.section, { borderLeftColor: color }]}>
      <View style={ss.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={[ss.sectionTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

