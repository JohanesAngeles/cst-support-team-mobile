import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../constants/colors';
import { uploadDocument } from '../../api/features';

const CHECKLIST_KEY = 'cst_pretrip_checks';

type Tab = 'bol' | 'checklist' | 'loadconf';

export default function SmartFormsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
    tabBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, backgroundColor: Colors.surface, borderRadius: 10,
      paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
    },
    tabBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    tabLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
    tabLabelActive: { color: Colors.textDark },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    field: { gap: 6 },
    fieldLabel: { color: Colors.textMuted, fontSize: 13 },
    input: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10,
      borderWidth: 1, borderColor: Colors.border,
      paddingHorizontal: 12, height: 46, color: Colors.text, fontSize: 14,
    },
    textArea: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10,
      borderWidth: 1, borderColor: Colors.border,
      padding: 12, color: Colors.text, fontSize: 14, minHeight: 80,
    },
    generateBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, height: 52,
    },
    generateText: { color: Colors.textDark, fontSize: 16, fontWeight: '800' },
    progressCard: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    progressCount: { color: Colors.secondary, fontSize: 14, fontWeight: '800' },
    progressBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
    progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
    allClearBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    allClearText: { color: Colors.success, fontSize: 13, fontWeight: '700' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
    checkLabel: { color: Colors.text, fontSize: 13, flex: 1 },
    checkLabelDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    resetBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14,
    },
    resetText: { color: Colors.textMuted, fontSize: 14 },
    modalContainer: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
    modalActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    copyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    },
    copyText: { color: Colors.textDark, fontSize: 13, fontWeight: '700' },
    letterContent: { padding: 20, paddingBottom: 40 },
    letterText: { color: Colors.text, fontSize: 13, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  }), [Colors]);
  const [tab, setTab] = useState<Tab>('bol');
  const [preview, setPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [vaultSaving, setVaultSaving] = useState(false);

  // BOL fields
  const [shipper, setShipper] = useState('');
  const [shipperAddr, setShipperAddr] = useState('');
  const [consignee, setConsignee] = useState('');
  const [consigneeAddr, setConsigneeAddr] = useState('');
  const [commodity, setCommodity] = useState('');
  const [weight, setWeight] = useState('');
  const [pieces, setPieces] = useState('');
  const [poNum, setPoNum] = useState('');
  const [proNum, setProNum] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Load Confirmation fields
  const [broker, setBroker] = useState('');
  const [brokerMc, setBrokerMc] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [carrierMc, setCarrierMc] = useState('');
  const [loadNum, setLoadNum] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loadDate, setLoadDate] = useState('');
  const [delivDate, setDelivDate] = useState('');
  const [rate, setRate] = useState('');
  const [lumper, setLumper] = useState('');
  const [detention, setDetention] = useState('');

  // Checklist
  const PRE_TRIP = [
    'Engine oil level checked',
    'Coolant level checked',
    'Power steering fluid checked',
    'Windshield washer fluid checked',
    'Fuel level adequate for trip',
    'Tires inspected — pressure, tread, sidewalls',
    'All lights working (headlights, brake, turn signals, markers)',
    'Mirrors adjusted and clean',
    'Windshield clean and free of cracks',
    'Horn works',
    'Wipers in good condition',
    'Brakes tested (air pressure, slack adjusters)',
    'Emergency equipment present (triangles, fire extinguisher)',
    'Coupling devices secure (kingpin, fifth wheel, landing gear)',
    'Cargo secured and weight distributed properly',
    'Logbook / ELD up to date',
    'Registration, insurance, and permits in cab',
    'CDL in possession and valid',
  ];
  const [checks, setChecks] = useState<boolean[]>(PRE_TRIP.map(() => false));

  // Load saved checklist on mount
  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY).then(raw => {
      if (raw) {
        try {
          const saved: boolean[] = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length === PRE_TRIP.length) {
            setChecks(saved);
          }
        } catch { /* ignore corrupt data */ }
      }
    });
  }, []);

  const toggleCheck = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
    AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };
  const resetChecklist = () => {
    const empty = PRE_TRIP.map(() => false);
    setChecks(empty);
    AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(empty));
  };
  const completedChecks = checks.filter(Boolean).length;

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const generateBOL = () => {
    if (!shipper || !consignee || !commodity) {
      Alert.alert('Missing Info', 'Please fill in Shipper, Consignee, and Commodity.');
      return;
    }
    const text = `BILL OF LADING
Generated: ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRO / TRACKING #: ${proNum || '[Pro #]'}
PO NUMBER: ${poNum || '[PO #]'}

SHIPPER:
${shipper}
${shipperAddr || '[Shipper Address]'}

CONSIGNEE:
${consignee}
${consigneeAddr || '[Consignee Address]'}

SHIPMENT DETAILS:
Commodity: ${commodity}
Weight: ${weight || '[Weight]'} lbs
Pieces / Units: ${pieces || '[Pieces]'}
Pickup Date: ${pickupDate || '[Pickup Date]'}
Delivery Date: ${deliveryDate || '[Delivery Date]'}

${specialInstructions ? `SPECIAL INSTRUCTIONS:\n${specialInstructions}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECEIVED in apparent good order and condition except as noted.

Shipper Signature: _________________  Date: _______

Driver Signature: _________________  Date: _______

Carrier: _________________________ MC #: _______

Note: This is a template. Verify all details before use.`;
    setPreviewText(text);
    setPreview(true);
  };

  const generateLoadConf = () => {
    if (!broker || !origin || !destination || !rate) {
      Alert.alert('Missing Info', 'Please fill in Broker, Origin, Destination, and Rate.');
      return;
    }
    const text = `LOAD CONFIRMATION
Generated: ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOAD NUMBER: ${loadNum || '[Load #]'}

BROKER:
${broker}
MC #: ${brokerMc || '[MC #]'}

CARRIER:
${carrierName || '[Carrier Name]'}
MC #: ${carrierMc || '[MC #]'}

LOAD DETAILS:
Origin: ${origin}
Destination: ${destination}
Pickup Date: ${loadDate || '[Pickup Date]'}
Delivery Date: ${delivDate || '[Delivery Date]'}

RATE BREAKDOWN:
Line Haul Rate: $${rate}
${lumper ? `Lumper Allowance: $${lumper}` : ''}
${detention ? `Detention Rate: $${detention}/hr` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS: Payment net 30 days from delivery and receipt of
all required paperwork (POD, BOL, invoice).

Carrier agrees to all terms by accepting this load.

Broker Representative: _________________ Date: _______

Carrier / Driver: _________________ Date: _______

Note: This is a template. Verify all details before use.`;
    setPreviewText(text);
    setPreview(true);
  };

  const copyText = async () => {
    await Clipboard.setStringAsync(previewText);
    Alert.alert('Copied', 'Form copied to clipboard.');
  };

  const saveToVault = async () => {
    setVaultSaving(true);
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;margin:48px;color:#1a1a1a;font-size:13px;line-height:1.8;white-space:pre-wrap;word-wrap:break-word;}
.header{border-bottom:2px solid #1A3A5C;padding-bottom:14px;margin-bottom:24px;}
.title{font-size:18px;font-weight:bold;color:#1A3A5C;}
.footer{margin-top:32px;border-top:1px solid #ccc;padding-top:12px;font-size:10px;color:#999;text-align:center;}
</style></head><body>
<div class="header"><div class="title">${tab === 'bol' ? 'Bill of Lading' : 'Load Confirmation'}</div></div>
<pre>${previewText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<div class="footer">Generated by CST Driver App · ${new Date().toLocaleDateString()}</div>
</body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const docName = tab === 'bol' ? 'Bill of Lading' : 'Load Confirmation';
      await uploadDocument(docName, { uri, type: 'application/pdf', name: `${docName.replace(/ /g, '_')}.pdf` });
      Alert.alert('Saved!', `${docName} saved to your Document Vault.`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save to vault.');
    } finally {
      setVaultSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'bol',       label: 'Bill of Lading', icon: 'document-outline' },
    { key: 'checklist', label: 'Pre-Trip',        icon: 'checkbox-outline' },
    { key: 'loadconf',  label: 'Load Confirm',    icon: 'receipt-outline' },
  ];

  const field = (label: string, value: string, set: (v: string) => void, placeholder = '', multiline = false) => (
    <View key={label} style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={multiline ? styles.textArea : styles.input}
        value={value}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={15} color={tab === t.key ? Colors.textDark : Colors.textMuted} />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {tab === 'bol' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Shipper</Text>
                {field('Company Name *', shipper, setShipper, 'Shipping company')}
                {field('Address', shipperAddr, setShipperAddr, 'Street, City, State, ZIP')}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Consignee (Receiver)</Text>
                {field('Company Name *', consignee, setConsignee, 'Receiving company')}
                {field('Address', consigneeAddr, setConsigneeAddr, 'Street, City, State, ZIP')}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Shipment Details</Text>
                {field('Commodity / Description *', commodity, setCommodity, 'What is being shipped')}
                {field('Weight (lbs)', weight, setWeight, '0')}
                {field('Pieces / Units', pieces, setPieces, '0')}
                {field('PO Number', poNum, setPoNum, 'Optional')}
                {field('PRO / Tracking Number', proNum, setProNum, 'Optional')}
                {field('Pickup Date', pickupDate, setPickupDate, 'MM/DD/YYYY')}
                {field('Delivery Date', deliveryDate, setDeliveryDate, 'MM/DD/YYYY')}
                {field('Special Instructions', specialInstructions, setSpecialInstructions, 'Hazmat, temp control, etc.', true)}
              </View>
              <TouchableOpacity style={styles.generateBtn} onPress={generateBOL}>
                <Ionicons name="document-text-outline" size={20} color={Colors.textDark} />
                <Text style={styles.generateText}>Generate Bill of Lading</Text>
              </TouchableOpacity>
            </>
          )}

          {tab === 'checklist' && (
            <>
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Pre-Trip Inspection</Text>
                  <Text style={styles.progressCount}>{completedChecks}/{PRE_TRIP.length}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(completedChecks / PRE_TRIP.length) * 100}%` }]} />
                </View>
                {completedChecks === PRE_TRIP.length && (
                  <View style={styles.allClearBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.allClearText}>All Clear — Ready to Roll!</Text>
                  </View>
                )}
              </View>
              <View style={styles.card}>
                {PRE_TRIP.map((item, i) => (
                  <TouchableOpacity key={item} style={styles.checkRow} onPress={() => toggleCheck(i)} activeOpacity={0.7}>
                    <Ionicons
                      name={checks[i] ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={checks[i] ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.checkLabel, checks[i] && styles.checkLabelDone]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.resetBtn} onPress={resetChecklist}>
                <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
                <Text style={styles.resetText}>Reset Checklist</Text>
              </TouchableOpacity>
            </>
          )}

          {tab === 'loadconf' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Broker</Text>
                {field('Broker / Company Name *', broker, setBroker, 'Brokerage name')}
                {field('MC Number', brokerMc, setBrokerMc, 'MC-XXXXXX')}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Carrier</Text>
                {field('Carrier / Your Company Name', carrierName, setCarrierName, 'Your trucking company')}
                {field('Your MC Number', carrierMc, setCarrierMc, 'MC-XXXXXX')}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Load Details</Text>
                {field('Load Number', loadNum, setLoadNum, 'From broker')}
                {field('Origin (City, State) *', origin, setOrigin, 'Pickup location')}
                {field('Destination (City, State) *', destination, setDestination, 'Delivery location')}
                {field('Pickup Date', loadDate, setLoadDate, 'MM/DD/YYYY')}
                {field('Delivery Date', delivDate, setDelivDate, 'MM/DD/YYYY')}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rate</Text>
                {field('Line Haul Rate ($) *', rate, setRate, '0.00')}
                {field('Lumper Allowance ($)', lumper, setLumper, 'If applicable')}
                {field('Detention Rate ($/hr)', detention, setDetention, 'If applicable')}
              </View>
              <TouchableOpacity style={styles.generateBtn} onPress={generateLoadConf}>
                <Ionicons name="receipt-outline" size={20} color={Colors.textDark} />
                <Text style={styles.generateText}>Generate Load Confirmation</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={preview} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tab === 'bol' ? 'Bill of Lading' : 'Load Confirmation'}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.copyBtn} onPress={copyText}>
                <Ionicons name="copy-outline" size={18} color={Colors.textDark} />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: '#2ECC71' }]}
                onPress={saveToVault}
                disabled={vaultSaving}
              >
                {vaultSaving
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <><Ionicons name="cloud-upload-outline" size={18} color={Colors.textDark} /><Text style={styles.copyText}>Vault</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPreview(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.letterContent}>
            <Text style={styles.letterText}>{previewText}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
