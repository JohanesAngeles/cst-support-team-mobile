import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

const LIMITS = { steer: 12000, drive: 34000, trailer: 34000, gross: 80000 };

const statusFor = (actual: number, limit: number) => {
  if (actual > limit) return { color: '#CC0000', label: 'OVER LIMIT', icon: 'close-circle' as const };
  if (actual > limit * 0.95) return { color: '#E67E22', label: 'CLOSE', icon: 'warning' as const };
  return { color: '#27AE60', label: 'LEGAL', icon: 'checkmark-circle' as const };
};

const fmt = (n: number) => n.toLocaleString();

export default function AxleWeightScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    diagram: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 16,
    },
    truckRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
    truckCab: {
      width: 70, height: 44, backgroundColor: Colors.secondary + '22',
      borderRadius: 8, borderWidth: 1, borderColor: Colors.secondary,
      justifyContent: 'center', alignItems: 'center', gap: 2,
    },
    truckTrailer: {
      flex: 1, height: 44, backgroundColor: Colors.surfaceLight,
      borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    truckLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
    axleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
    axleMark: { alignItems: 'center' },
    axleMarkLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
    inputCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10 },
    inputTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    field: { gap: 6 },
    fieldLabel: { color: Colors.textMuted, fontSize: 13 },
    input: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 15 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
    clearText: { color: Colors.textMuted, fontSize: 13 },
    allClear: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.success + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.success + '44' },
    allClearText: { color: Colors.success, fontSize: 15, fontWeight: '800' },
    resultCard: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, padding: 14, gap: 8 },
    resultTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    resultIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    resultMeta: { flex: 1 },
    resultLabel: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    resultLimit: { color: Colors.textMuted, fontSize: 11 },
    resultRight: { alignItems: 'flex-end', gap: 4 },
    resultValue: { fontSize: 18, fontWeight: '900' },
    resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    resultBadgeText: { fontSize: 10, fontWeight: '700' },
    overRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.danger + '18', borderRadius: 8, padding: 8 },
    overText: { color: Colors.danger, fontSize: 12, flex: 1 },
    progressBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressPct: { color: Colors.textMuted, fontSize: 11, textAlign: 'right' },
    tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.secondary + '15', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.secondary + '33' },
    tipTitle: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    tipText: { color: Colors.secondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
    limitsCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8 },
    limitsTitle: { color: Colors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    limitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
    limitLabel: { color: Colors.textMuted, fontSize: 13 },
    limitValue: { color: Colors.text, fontSize: 13, fontWeight: '600' },
    disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
    disclaimerText: { color: Colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  }), [Colors]);
  const [steer, setSteer] = useState('');
  const [drive, setDrive] = useState('');
  const [trailer, setTrailer] = useState('');

  const steerW = parseFloat(steer) || 0;
  const driveW = parseFloat(drive) || 0;
  const trailerW = parseFloat(trailer) || 0;
  const gross = steerW + driveW + trailerW;

  const hasValues = steerW > 0 || driveW > 0 || trailerW > 0;

  const steerS = statusFor(steerW, LIMITS.steer);
  const driveS = statusFor(driveW, LIMITS.drive);
  const trailerS = statusFor(trailerW, LIMITS.trailer);
  const grossS = statusFor(gross, LIMITS.gross);

  const overSteer  = Math.max(0, steerW - LIMITS.steer);
  const overDrive  = Math.max(0, driveW - LIMITS.drive);
  const overTrailer = Math.max(0, trailerW - LIMITS.trailer);
  const overGross  = Math.max(0, gross - LIMITS.gross);

  const allLegal = hasValues && steerW <= LIMITS.steer && driveW <= LIMITS.drive && trailerW <= LIMITS.trailer && gross <= LIMITS.gross;

  // Slide calculator: approx 500 lbs per foot for trailer tandems
  const slideNeeded = overTrailer > 0 ? Math.ceil(overTrailer / 500) : (overDrive > 0 ? Math.ceil(overDrive / 500) : 0);

  const axles = [
    { label: 'Steer Axle', value: steerW, limit: LIMITS.steer, status: steerS, over: overSteer, icon: 'car-outline' },
    { label: 'Drive Tandems', value: driveW, limit: LIMITS.drive, status: driveS, over: overDrive, icon: 'bus-outline' },
    { label: 'Trailer Tandems', value: trailerW, limit: LIMITS.trailer, status: trailerS, over: overTrailer, icon: 'train-outline' },
    { label: 'Gross Vehicle Weight', value: gross, limit: LIMITS.gross, status: grossS, over: overGross, icon: 'scale-outline' },
  ];


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.diagram}>
            <View style={styles.truckRow}>
              <View style={styles.truckCab}>
                <Ionicons name="car-outline" size={20} color={Colors.secondary} />
                <Text style={styles.truckLabel}>CAB</Text>
              </View>
              <View style={styles.truckTrailer}>
                <Text style={styles.truckLabel}>TRAILER</Text>
              </View>
            </View>
            <View style={styles.axleRow}>
              <View style={styles.axleMark}><Text style={styles.axleMarkLabel}>STEER</Text></View>
              <View style={styles.axleMark}><Text style={styles.axleMarkLabel}>DRIVE</Text></View>
              <View style={styles.axleMark}><Text style={styles.axleMarkLabel}>TRAILER</Text></View>
            </View>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputTitle}>Enter Axle Weights (lbs)</Text>
            {[
              { label: 'Steer Axle (limit: 12,000 lbs)', value: steer, set: setSteer, placeholder: '0' },
              { label: 'Drive Tandems (limit: 34,000 lbs)', value: drive, set: setDrive, placeholder: '0' },
              { label: 'Trailer Tandems (limit: 34,000 lbs)', value: trailer, set: setTrailer, placeholder: '0' },
            ].map(({ label, value, set, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input} value={value} onChangeText={set}
                  keyboardType="number-pad" placeholder={placeholder}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setSteer(''); setDrive(''); setTrailer(''); }}>
              <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {hasValues && (
            <>
              {allLegal && (
                <View style={styles.allClear}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  <Text style={styles.allClearText}>All axles legal — Good to roll!</Text>
                </View>
              )}

              {axles.map(({ label, value, limit, status, over, icon }) => (
                value > 0 ? (
                  <View key={label} style={[styles.resultCard, { borderLeftColor: status.color }]}>
                    <View style={styles.resultTop}>
                      <View style={[styles.resultIcon, { backgroundColor: status.color + '22' }]}>
                        <Ionicons name={icon as any} size={18} color={status.color} />
                      </View>
                      <View style={styles.resultMeta}>
                        <Text style={styles.resultLabel}>{label}</Text>
                        <Text style={styles.resultLimit}>Limit: {fmt(limit)} lbs</Text>
                      </View>
                      <View style={styles.resultRight}>
                        <Text style={[styles.resultValue, { color: status.color }]}>{fmt(value)}</Text>
                        <View style={styles.resultBadge}>
                          <Ionicons name={status.icon} size={12} color={status.color} />
                          <Text style={[styles.resultBadgeText, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                    </View>
                    {over > 0 && (
                      <View style={styles.overRow}>
                        <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                        <Text style={styles.overText}>Over by {fmt(over)} lbs — reduce load or redistribute weight</Text>
                      </View>
                    )}
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {
                        width: `${Math.min(100, (value / limit) * 100)}%`,
                        backgroundColor: status.color,
                      }]} />
                    </View>
                    <Text style={styles.progressPct}>{Math.round((value / limit) * 100)}% of limit</Text>
                  </View>
                ) : null
              ))}

              {slideNeeded > 0 && (
                <View style={styles.tipCard}>
                  <Ionicons name="bulb-outline" size={18} color={Colors.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipTitle}>Slide Tandems Tip</Text>
                    <Text style={styles.tipText}>
                      Slide trailer tandems forward ~{slideNeeded} foot{slideNeeded > 1 ? 's' : ''} to shift approximately {fmt(slideNeeded * 500)} lbs from the {overTrailer > 0 ? 'trailer' : 'drive'} axle.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.limitsCard}>
            <Text style={styles.limitsTitle}>Federal Weight Limits (Interstate)</Text>
            {[
              { label: 'Steer Axle', limit: '12,000 lbs' },
              { label: 'Single Axle', limit: '20,000 lbs' },
              { label: 'Tandem Axle Group', limit: '34,000 lbs' },
              { label: 'Gross Vehicle Weight', limit: '80,000 lbs' },
              { label: 'Bridge Formula', limit: 'May further restrict axle weights' },
            ].map(({ label, limit }) => (
              <View key={label} style={styles.limitRow}>
                <Text style={styles.limitLabel}>{label}</Text>
                <Text style={styles.limitValue}>{limit}</Text>
              </View>
            ))}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.disclaimerText}>State limits may differ. Always verify with state DOT before operating.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
