import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useColors } from '../../constants/colors';
import { uploadDocument } from '../../api/features';

const VIOLATIONS = [
  'Speeding', 'Logbook Violation', 'Overweight', 'Hours of Service',
  'Equipment Defect', 'Lane Violation', 'Failure to Obey Traffic Control',
  'Unsafe Driving', 'Other',
];

export default function TicketDisputeScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    banner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.secondary + '18', borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: Colors.secondary + '44',
    },
    bannerTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    bannerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    cardSub: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: -4 },
    field: { gap: 6 },
    fieldLabel: { color: Colors.textMuted, fontSize: 13 },
    input: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10,
      borderWidth: 1, borderColor: Colors.border,
      paddingHorizontal: 12, height: 46, color: Colors.text, fontSize: 14,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    chipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: Colors.textDark },
    textArea: {
      backgroundColor: Colors.surfaceLight, borderRadius: 10,
      borderWidth: 1, borderColor: Colors.border,
      padding: 12, color: Colors.text, fontSize: 14, minHeight: 130,
    },
    generateBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, height: 52,
    },
    generateText: { color: Colors.textDark, fontSize: 16, fontWeight: '800' },
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [vaultSaving, setVaultSaving] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [cdl, setCdl] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [ticketNum, setTicketNum] = useState('');
  const [location, setLocation] = useState('');
  const [officer, setOfficer] = useState('');
  const [violation, setViolation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [letterModal, setLetterModal] = useState(false);

  const generateLetter = () => {
    if (!driverName || !ticketDate || !violation || !explanation) {
      Alert.alert('Missing Info', 'Please fill in Driver Name, Ticket Date, Violation Type, and your Explanation.');
      return;
    }
    setLetterModal(true);
  };

  const letter = `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

To Whom It May Concern,
Traffic Violations Bureau / Hearing Officer

Re: Formal Dispute of Citation
Driver: ${driverName}
CDL Number: ${cdl || '[CDL #]'}
Ticket / Citation Number: ${ticketNum || '[Ticket #]'}
Date of Incident: ${ticketDate}
Location: ${location || '[Location]'}
Issuing Officer: ${officer || '[Officer Name/Badge #]'}
Alleged Violation: ${violation}

Dear Hearing Officer,

I am writing to formally dispute the above-referenced citation issued on ${ticketDate}. I respectfully request a hearing to present my case and contest this violation.

STATEMENT OF FACTS:

${explanation}

GROUNDS FOR DISPUTE:

As a professional commercial driver, I take my safety record and compliance obligations extremely seriously. I operate under Federal Motor Carrier Safety Administration (FMCSA) regulations and maintain strict adherence to all applicable traffic laws and Hours of Service requirements.

The circumstances described above demonstrate that the citation as issued does not accurately reflect the facts of the incident. I respectfully submit that the violation should be dismissed based on the foregoing.

REQUESTED RELIEF:

I respectfully request that this citation be dismissed in its entirety, or in the alternative, that the charge be reduced. A conviction on this matter would negatively impact my commercial driver's license (CDL), my safety record, my CSA score, and my livelihood as a professional driver.

I am prepared to provide any additional documentation, witness statements, or evidence in support of my dispute. Please contact me at your earliest convenience to schedule a hearing.

Respectfully submitted,

${driverName}
Commercial Driver
CDL: ${cdl || '[CDL #]'}

---
Note: This letter was generated as a template. Review and customize before submitting.`;

  const copyLetter = async () => {
    await Clipboard.setStringAsync(letter);
    Alert.alert('Copied', 'Dispute letter copied to clipboard.');
  };

  const buildLetterHTML = () => `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;margin:48px;color:#1a1a1a;font-size:13px;line-height:1.7;}
  .header{border-bottom:2px solid #1A3A5C;padding-bottom:16px;margin-bottom:24px;}
  .title{font-size:18px;font-weight:bold;color:#1A3A5C;margin-bottom:4px;}
  .meta{font-size:12px;color:#666;}
  pre{font-family:inherit;white-space:pre-wrap;word-wrap:break-word;}
  .footer{margin-top:32px;border-top:1px solid #ccc;padding-top:12px;font-size:10px;color:#999;text-align:center;}
</style></head><body>
<div class="header">
  <div class="title">Formal Traffic Violation Dispute</div>
  <div class="meta">Generated by CST Driver App · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>
<pre>${letter.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<div class="footer">This document was generated as a template. Review and customize before submitting. CST Driver App — Commercial Support Technologies</div>
</body></html>`;

  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildLetterHTML(), base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Dispute Letter' });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message ?? 'Could not generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const saveToVault = async () => {
    setVaultSaving(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildLetterHTML(), base64: false });
      const label = `Ticket Dispute — ${violation || 'Violation'} ${ticketDate ? `(${ticketDate})` : ''}`.trim();
      await uploadDocument(label, { uri, type: 'application/pdf', name: 'Ticket_Dispute.pdf' });
      Alert.alert('Saved!', 'Dispute letter saved to your Document Vault.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save to vault.');
    } finally {
      setVaultSaving(false);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.banner}>
            <Ionicons name="hammer-outline" size={24} color={Colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Ticket Dispute Generator</Text>
              <Text style={styles.bannerSub}>Fill in your ticket details and generate a formal dispute letter.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver Information</Text>
            {[
              { label: 'Full Name *', value: driverName, set: setDriverName, placeholder: 'Your legal name' },
              { label: 'CDL Number', value: cdl, set: setCdl, placeholder: 'Commercial license number' },
            ].map(({ label, value, set, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput style={styles.input} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={Colors.textMuted} />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ticket Details</Text>
            {[
              { label: 'Ticket / Citation Number', value: ticketNum, set: setTicketNum, placeholder: 'From the citation' },
              { label: 'Date of Incident *', value: ticketDate, set: setTicketDate, placeholder: 'MM/DD/YYYY' },
              { label: 'Location (City, State, Highway)', value: location, set: setLocation, placeholder: 'Where it happened' },
              { label: 'Officer Name / Badge #', value: officer, set: setOfficer, placeholder: 'From the citation' },
            ].map(({ label, value, set, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput style={styles.input} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={Colors.textMuted} />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Violation Type *</Text>
              <View style={styles.chipGrid}>
                {VIOLATIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, violation === v && styles.chipActive]}
                    onPress={() => setViolation(v)}
                  >
                    <Text style={[styles.chipText, violation === v && styles.chipTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Explanation *</Text>
            <Text style={styles.cardSub}>Describe what actually happened. Be specific — dates, times, road conditions, why you believe the citation is incorrect.</Text>
            <TextInput
              style={styles.textArea}
              value={explanation}
              onChangeText={setExplanation}
              placeholder="Example: At approximately 2:15 PM on I-40 eastbound near mile marker 120, I was cited for speeding at 72 mph in a 70 mph zone. My ELD and GPS data both show my actual speed was 69 mph at that location and time..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={generateLetter}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textDark} />
            <Text style={styles.generateText}>Generate Dispute Letter</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={letterModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispute Letter</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.copyBtn} onPress={copyLetter}>
                <Ionicons name="copy-outline" size={18} color={Colors.textDark} />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: '#2ECC71' }]}
                onPress={exportPDF}
                disabled={pdfLoading}
              >
                {pdfLoading
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <><Ionicons name="document-outline" size={18} color={Colors.textDark} /><Text style={styles.copyText}>PDF</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: '#3498DB' }]}
                onPress={saveToVault}
                disabled={vaultSaving}
              >
                {vaultSaving
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <><Ionicons name="cloud-upload-outline" size={18} color={Colors.textDark} /><Text style={styles.copyText}>Vault</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLetterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.letterContent}>
            <Text style={styles.letterText}>{letter}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
