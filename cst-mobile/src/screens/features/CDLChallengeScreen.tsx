import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import {
  SKILL_CHALLENGES, CDL_LESSONS,
  HOS_MATH_PROBLEMS, AXLE_PROBLEMS, ROAD_SIGN_QUESTIONS,
} from '../../data/cdlQuestions';
import { submitChallengeScore, getRoadReadyProfile } from '../../api/roadReady';

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

function buildQuestions(challengeId: string): QuizQuestion[] {
  switch (challengeId) {
    case 'pretrip-speed': {
      const lesson = CDL_LESSONS.find(l => l.id === 'vehicle-inspection')!;
      return lesson.questions.map(q => ({ q: q.q, options: q.options as string[], answer: q.answer }));
    }
    case 'hos-math': {
      return HOS_MATH_PROBLEMS.map(p => {
        const ans = p.answer;
        const wrongs = [ans + 1, ans - 1, ans + 2].map(n => Math.max(0, n));
        const opts = [String(ans), ...wrongs.map(String)].sort(() => Math.random() - 0.5);
        return { q: p.q, options: opts, answer: opts.indexOf(String(ans)) };
      });
    }
    case 'axle-weight': {
      return AXLE_PROBLEMS.map(p => {
        const opts = p.options as string[];
        const idx = opts.findIndex(o => p.answer.startsWith(o) || o === p.answer);
        return { q: p.q, options: opts, answer: Math.max(0, idx) };
      });
    }
    case 'road-signs': {
      return ROAD_SIGN_QUESTIONS.map(q => ({ q: q.q, options: q.options as string[], answer: q.answer }));
    }
    default:
      return [];
  }
}

type ScreenView = 'select' | 'playing' | 'results';

export default function CDLChallengeScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    header: { color: Colors.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
    sub: { color: Colors.textMuted, fontSize: 13, marginBottom: 4 },
    challengeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: Colors.border,
    },
    challengeIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    challengeInfo: { flex: 1, gap: 3 },
    challengeTitle: { color: Colors.text, fontWeight: '800', fontSize: 15 },
    challengeDesc: { color: Colors.textMuted, fontSize: 12 },
    challengeTimer: { fontSize: 12, fontWeight: '700' },
    playWrap: { flex: 1 },
    playTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    timerText: { fontSize: 32, fontWeight: '900' },
    scoreText: { color: Colors.secondary, fontWeight: '800', fontSize: 16 },
    timerBar: { height: 5, backgroundColor: Colors.surfaceLight, marginHorizontal: 16 },
    timerFill: { height: '100%', borderRadius: 3 },
    playProgress: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 },
    playContent: { padding: 20, gap: 12 },
    playQ: { color: Colors.text, fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 8 },
    opt: { borderRadius: 12, padding: 14, borderWidth: 2 },
    optNeutral: { backgroundColor: Colors.surface, borderColor: Colors.border },
    optCorrect: { backgroundColor: '#2ECC7122', borderColor: '#2ECC71' },
    optWrong: { backgroundColor: '#E74C3C22', borderColor: '#E74C3C' },
    optText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
    results: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    resultsTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
    resultsBig: { color: Colors.secondary, fontSize: 64, fontWeight: '900' },
    resultsSub: { color: Colors.textMuted, fontSize: 14 },
    retryBtn: { marginTop: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
    retryText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
    backBtn: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
    backText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  }), [Colors]);
  const [view, setView] = useState<ScreenView>('select');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [saving, setSaving] = useState(false);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => {
    getRoadReadyProfile()
      .then(d => setBestScores((d.profile.challengesBestScores as Record<string, number>) ?? {}))
      .catch(() => {});
  }, []));

  const challengeIdRef = useRef('');
  const timeLimitRef = useRef(60);
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const [scoreDisplay, setScoreDisplay] = useState(0);

  const startChallenge = (id: string, timeLimit: number) => {
    challengeIdRef.current = id;
    timeLimitRef.current = timeLimit;
    scoreRef.current = 0;
    finishedRef.current = false;
    setQuestions(buildQuestions(id));
    setQIdx(0);
    setSelected(null);
    setTimeLeft(timeLimit);
    setScoreDisplay(0);
    setView('playing');
  };

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setSaving(true);
    try {
      const updated = await submitChallengeScore(challengeIdRef.current, scoreRef.current);
      setBestScores((updated.profile.challengesBestScores as Record<string, number>) ?? {});
    } catch (_) {}
    setSaving(false);
    setView('results');
  };

  useEffect(() => {
    if (view !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, challengeIdRef.current]);

  const handleAnswer = (idx: number) => {
    if (selected !== null || finishedRef.current) return;
    setSelected(idx);
    if (idx === questions[qIdx].answer) {
      scoreRef.current += 10;
      setScoreDisplay(scoreRef.current);
    }
    setTimeout(() => {
      if (qIdx + 1 < questions.length) {
        setQIdx(i => i + 1);
        setSelected(null);
      } else {
        finish();
      }
    }, 700);
  };

  // ── Select challenge ───────────────────────────────────────────────────────
  if (view === 'select') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>CDL Skill Challenges</Text>
          <Text style={styles.sub}>Beat the clock — earn Skill score points for high scores</Text>
          {SKILL_CHALLENGES.map(c => {
            const best = bestScores[c.id] ?? 0;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.challengeCard, best > 0 && { borderColor: c.color, borderWidth: 1.5 }]}
                onPress={() => startChallenge(c.id, c.timeLimit)}
                activeOpacity={0.8}
              >
                <View style={[styles.challengeIcon, { backgroundColor: c.color + '22' }]}>
                  <Ionicons name={c.icon as any} size={28} color={c.color} />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{c.title}</Text>
                  <Text style={styles.challengeDesc}>{c.desc}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <Text style={[styles.challengeTimer, { color: c.color }]}>⏱ {c.timeLimit}s</Text>
                    {best > 0 && (
                      <Text style={{ color: '#2ECC71', fontSize: 12, fontWeight: '700' }}>
                        🏆 Best: {best} pts
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="play-circle-outline" size={32} color={c.color} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  if (view === 'playing' && questions.length > 0) {
    const challenge = SKILL_CHALLENGES.find(c => c.id === challengeIdRef.current)!;
    const q = questions[qIdx];
    const timerPct = timeLeft / timeLimitRef.current;
    const timerColor = timerPct > 0.5 ? '#2ECC71' : timerPct > 0.25 ? Colors.secondary : '#E74C3C';
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.playWrap}>
          <View style={styles.playTop}>
            <TouchableOpacity onPress={() => { if (timerRef.current) clearInterval(timerRef.current); setView('select'); }}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
            <Text style={styles.scoreText}>{scoreDisplay} pts</Text>
          </View>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${timerPct * 100}%`, backgroundColor: timerColor }]} />
          </View>
          <Text style={styles.playProgress}>{qIdx + 1} / {questions.length}</Text>

          <ScrollView contentContainerStyle={styles.playContent}>
            <Text style={styles.playQ}>{q.q}</Text>
            {q.options.map((opt, idx) => {
              let st = styles.optNeutral;
              if (selected !== null) {
                if (idx === q.answer) st = styles.optCorrect;
                else if (idx === selected) st = styles.optWrong;
              }
              return (
                <TouchableOpacity key={idx} style={[styles.opt, st]} onPress={() => handleAnswer(idx)} activeOpacity={0.8}>
                  <Text style={styles.optText}>{String.fromCharCode(65 + idx)}. {opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const challenge = SKILL_CHALLENGES.find(c => c.id === challengeIdRef.current);
  const maxScore = questions.length * 10;
  const pct = maxScore > 0 ? Math.round((scoreRef.current / maxScore) * 100) : 0;
  const prevBest = bestScores[challengeIdRef.current] ?? 0;
  const isNewBest = scoreRef.current > prevBest;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.results}>
        {saving
          ? <ActivityIndicator size="large" color={Colors.secondary} />
          : <>
              <Ionicons name={isNewBest ? 'trophy' : 'trophy-outline'} size={80} color={isNewBest ? '#F1C40F' : Colors.secondary} />
              <Text style={styles.resultsTitle}>{challenge?.title ?? 'Challenge'}</Text>
              <Text style={styles.resultsBig}>{scoreRef.current}</Text>
              <Text style={styles.resultsSub}>points  •  {pct}%</Text>
              {isNewBest
                ? <Text style={{ color: '#F1C40F', fontWeight: '800', fontSize: 14 }}>🎉 New Personal Best!</Text>
                : prevBest > 0
                  ? <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Personal best: {prevBest} pts</Text>
                  : null
              }
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => startChallenge(challengeIdRef.current, challenge?.timeLimit ?? 60)}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setView('select')}>
                <Text style={styles.backText}>All Challenges</Text>
              </TouchableOpacity>
            </>
        }
      </View>
    </SafeAreaView>
  );
}
