import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';
import { CDL_LESSONS, CDLLesson } from '../../data/cdlQuestions';
import { completeLesson } from '../../api/roadReady';

type ScreenView = 'lessons' | 'quiz' | 'results';

export default function StudentDriverScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    header: { color: Colors.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
    sub: { color: Colors.textMuted, fontSize: 13, marginBottom: 4 },
    lessonCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: Colors.border,
    },
    lessonIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    lessonInfo: { flex: 1 },
    lessonTitle: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    lessonMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    quizWrap: { flex: 1 },
    quizTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    quizProgress: { color: Colors.text, fontWeight: '700', fontSize: 15 },
    quizScore: { color: '#2ECC71', fontWeight: '700', fontSize: 15 },
    progressBar: { height: 4, backgroundColor: Colors.surfaceLight, marginHorizontal: 16 },
    progressFill: { height: '100%' },
    quizContent: { padding: 20, gap: 12 },
    question: { color: Colors.text, fontSize: 17, fontWeight: '700', lineHeight: 26, marginBottom: 8 },
    option: { borderRadius: 12, padding: 14, borderWidth: 2 },
    optNeutral: { backgroundColor: Colors.surface, borderColor: Colors.border },
    optCorrect: { backgroundColor: '#2ECC7122', borderColor: '#2ECC71' },
    optWrong: { backgroundColor: '#E74C3C22', borderColor: '#E74C3C' },
    optText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
    explanation: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: Colors.secondary + '44', marginTop: 4,
    },
    explanationText: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
    nextBtn: { margin: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
    nextBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
    results: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    resultsTitle: { color: Colors.text, fontSize: 22, fontWeight: '900' },
    resultsPct: { fontSize: 64, fontWeight: '900' },
    resultsSub: { color: Colors.textMuted, fontSize: 14 },
    pointsEarned: { color: '#2ECC71', fontSize: 16, fontWeight: '800', marginTop: 4 },
    backBtn: {
      marginTop: 16, backgroundColor: Colors.surface, borderRadius: 12,
      paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border,
    },
    backBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
    retryBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  }), [Colors]);
  const [view, setView] = useState<ScreenView>('lessons');
  const [activeLesson, setActiveLesson] = useState<CDLLesson | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [saving, setSaving] = useState(false);

  const startLesson = (lesson: CDLLesson) => {
    setActiveLesson(lesson);
    setQIdx(0);
    setSelected(null);
    setCorrect(0);
    setView('quiz');
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === activeLesson!.questions[qIdx].answer) {
      setCorrect(c => c + 1);
    }
  };

  const next = async () => {
    const qs = activeLesson!.questions;
    if (qIdx + 1 < qs.length) {
      setQIdx(i => i + 1);
      setSelected(null);
    } else {
      setSaving(true);
      const gained = Math.round((correct / qs.length) * 10);
      try { await completeLesson(activeLesson!.id, gained); } catch (_) {}
      setSaving(false);
      setView('results');
    }
  };

  // ── Lesson select ──────────────────────────────────────────────────────────
  if (view === 'lessons') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>Select a Lesson</Text>
          <Text style={styles.sub}>Complete lessons to earn Education score points</Text>
          {CDL_LESSONS.map(lesson => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => startLesson(lesson)}
              activeOpacity={0.8}
            >
              <View style={[styles.lessonIcon, { backgroundColor: lesson.color + '22' }]}>
                <Ionicons name={lesson.icon as any} size={28} color={lesson.color} />
              </View>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonMeta}>{lesson.questions.length} questions • Up to 10 pts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  if (view === 'quiz' && activeLesson) {
    const q = activeLesson.questions[qIdx];
    const answered = selected !== null;
    const total = activeLesson.questions.length;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.quizWrap}>
          <View style={styles.quizTop}>
            <TouchableOpacity onPress={() => setView('lessons')}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.quizProgress}>{qIdx + 1} / {total}</Text>
            <Text style={styles.quizScore}>✓ {correct}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${((qIdx + 1) / total) * 100}%`, backgroundColor: activeLesson.color },
            ]} />
          </View>

          <ScrollView contentContainerStyle={styles.quizContent}>
            <Text style={styles.question}>{q.q}</Text>
            {q.options.map((opt, idx) => {
              let st = styles.optNeutral;
              if (answered) {
                if (idx === q.answer) st = styles.optCorrect;
                else if (idx === selected) st = styles.optWrong;
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.option, st]}
                  onPress={() => handleAnswer(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optText,
                    answered && idx === q.answer && { color: '#2ECC71' },
                    answered && idx === selected && idx !== q.answer && { color: '#E74C3C' },
                  ]}>
                    {String.fromCharCode(65 + idx)}. {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {answered && (
              <View style={styles.explanation}>
                <Ionicons name="bulb-outline" size={16} color={Colors.secondary} />
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            )}
          </ScrollView>

          {answered && (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: activeLesson.color }]}
              onPress={next}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.nextBtnText}>
                    {qIdx + 1 < activeLesson.questions.length ? 'Next Question →' : 'Finish Lesson'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const total = activeLesson?.questions.length ?? 1;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 70;
  const gained = Math.round((correct / total) * 10);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.results}>
        <Ionicons
          name={passed ? 'checkmark-circle' : 'close-circle'}
          size={80}
          color={passed ? '#2ECC71' : '#E74C3C'}
        />
        <Text style={styles.resultsTitle}>{passed ? 'Lesson Complete!' : 'Keep Studying'}</Text>
        <Text style={[styles.resultsPct, { color: passed ? '#2ECC71' : '#E74C3C' }]}>{pct}%</Text>
        <Text style={styles.resultsSub}>{correct} / {total} correct</Text>
        {passed && <Text style={styles.pointsEarned}>+{gained} Education points earned</Text>}
        <TouchableOpacity style={styles.backBtn} onPress={() => setView('lessons')}>
          <Text style={styles.backBtnText}>Back to Lessons</Text>
        </TouchableOpacity>
        {!passed && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: activeLesson?.color ?? Colors.secondary }]}
            onPress={() => startLesson(activeLesson!)}
          >
            <Text style={styles.nextBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
