import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { CDL_LESSONS, CDLQuestion } from '../../data/cdlQuestions';
import { MainStackParamList } from '../../navigation/MainStack';

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'national' | 'safety' | 'skill' | 'business' | 'fleet' | 'rising';
type Nav = NativeStackNavigationProp<MainStackParamList>;
type GameMode = 'idle' | 'playing' | 'done';

interface LeaderEntry {
  rank: number; name: string; score: number; totalScore: number;
  badges: string[]; isMe: boolean;
}
interface LeaderboardData {
  category: Category; top: LeaderEntry[]; myRank: number | null;
  myScore: number; myTotalScore: number; totalDrivers: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUESTION_COUNT = 10;
const QUESTION_SECS  = 15;
const BEST_STORE_KEY = '@att_weekly_best';
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const CATEGORIES: { id: Category; label: string; icon: string; color: string; desc: string; maxScore: number }[] = [
  { id: 'national',  label: 'National Top Trucker',  icon: 'trophy-outline',           color: '#FFD700', desc: 'Overall Road Ready Score',        maxScore: 1000 },
  { id: 'safety',    label: 'Cleanest Driver',        icon: 'shield-checkmark-outline',  color: '#2ECC71', desc: 'Fewest violations & damage',       maxScore: 300  },
  { id: 'skill',     label: 'Local Yard Champion',    icon: 'stopwatch-outline',         color: '#3498DB', desc: 'Backing, docking & CDL skills',   maxScore: 200  },
  { id: 'business',  label: 'Best Owner-Operator',    icon: 'trending-up-outline',       color: '#F39C12', desc: 'Highest business score & profit',  maxScore: 150  },
  { id: 'fleet',     label: 'Best Fleet Builder',     icon: 'people-outline',            color: '#E74C3C', desc: 'Fleet profit + safety compliance', maxScore: 250  },
  { id: 'rising',    label: 'Rising Star',            icon: 'star-outline',              color: '#9B59B6', desc: 'Education & reputation combined',  maxScore: 150  },
];

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const BADGE_LABELS: Record<string, string> = {
  'freight-veteran': '🚛', 'rate-master': '💰', 'oo-survivor': '🔧',
  'oo-profitable': '📈', 'safety-pro': '🛡️', 'hos-champion': '⏱️',
};

const COMPETE: Record<Category, { label: string; icon: string; screen: string; pts: string }[]> = {
  national: [
    { label: 'Log HOS',   icon: 'time-outline',    screen: 'HOSTracker',   pts: 'Safety pts'   },
    { label: 'CDL Skill', icon: 'school-outline',   screen: 'CDLChallenge', pts: 'Skill pts'    },
    { label: 'Log Trip',  icon: 'map-outline',      screen: 'TripLog',      pts: 'Business pts' },
  ],
  safety: [
    { label: 'Log HOS',     icon: 'time-outline',          screen: 'HOSTracker', pts: '+Safety pts'  },
    { label: 'CDL Tracker', icon: 'document-text-outline',  screen: 'CDLTracker', pts: '+Compliance'  },
  ],
  skill: [
    { label: 'CDL Skill',   icon: 'school-outline',        screen: 'CDLChallenge', pts: '+Skill pts'  },
    { label: 'CDL Tracker', icon: 'document-text-outline',  screen: 'CDLTracker',   pts: '+Compliance' },
  ],
  business: [
    { label: 'Log Trip', icon: 'map-outline',  screen: 'TripLog',    pts: '+Business' },
    { label: 'P&L',      icon: 'cash-outline', screen: 'ProfitLoss', pts: '+Business' },
  ],
  fleet: [
    { label: 'Log HOS',  icon: 'time-outline', screen: 'HOSTracker', pts: '+Fleet score' },
    { label: 'Log Trip', icon: 'map-outline',  screen: 'TripLog',    pts: '+Fleet score' },
  ],
  rising: [
    { label: 'CDL Skill', icon: 'school-outline',  screen: 'CDLChallenge', pts: '+Education'  },
    { label: 'Find Help', icon: 'location-outline', screen: 'FindHelp',     pts: '+Reputation' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentWeekKey(): string {
  const d  = new Date();
  const wn = Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
  return `${d.getFullYear()}_W${String(wn).padStart(2, '0')}`;
}

function pickQuestions(): CDLQuestion[] {
  const all = CDL_LESSONS.flatMap(l => l.questions);
  return shuffled(all).slice(0, Math.min(QUESTION_COUNT, all.length));
}

function seasonInfo() {
  const now = new Date();
  const day = now.getDay();
  const wn  = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
  return { weekNum: wn, daysLeft: day === 0 ? 7 : 7 - day };
}

function resultLabel(score: number): string {
  if (score >= 9) return 'Perfect! True road master! 🔥';
  if (score >= 7) return 'Excellent trucker knowledge!';
  if (score >= 5) return 'Good — keep sharpening!';
  return 'Keep studying the roads!';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AmericasTopTruckerScreen() {
  const Colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { user }   = useAuth();
  const navigation = useNavigation<Nav>();
  const [cat, setCat]           = useState<Category>('national');
  const [data, setData]         = useState<LeaderboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const { weekNum, daysLeft } = seasonInfo();
  const activeCat = CATEGORIES.find(c => c.id === cat)!;
  const wKey      = useMemo(() => currentWeekKey(), []);

  // ── Game state ───────────────────────────────────────────────────────────────
  const [gameMode,    setGameMode]    = useState<GameMode>('idle');
  const [questions,   setQuestions]   = useState<CDLQuestion[]>([]);
  const [qIndex,      setQIndex]      = useState(0);
  const [picked,      setPicked]      = useState<number | null>(null);
  const [revealed,    setRevealed]    = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(QUESTION_SECS);
  const [submitting,  setSubmitting]  = useState(false);
  const [finalScore,  setFinalScore]  = useState(0);
  const [ptsEarned,   setPtsEarned]   = useState(0);
  const [weekBest,    setWeekBest]    = useState(-1);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const picksRef    = useRef<(number | null)[]>([]);
  const questionsRef = useRef<CDLQuestion[]>([]);
  const qIndexRef   = useRef(0);

  // Load weekly best score
  useEffect(() => {
    AsyncStorage.getItem(BEST_STORE_KEY).then(raw => {
      if (!raw) return;
      try {
        const map: Record<string, number> = JSON.parse(raw);
        setWeekBest(map[wKey] ?? -1);
      } catch {}
    });
  }, [wKey]);

  // ── Leaderboard ───────────────────────────────────────────────────────────────
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: d } = await client.get(`/leaderboard?category=${cat}`);
      setData(d);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [cat]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Game engine ───────────────────────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startTimer = (idx: number) => {
    stopTimer();
    qIndexRef.current = idx;
    setQIndex(idx);
    setPicked(null);
    setRevealed(false);
    setTimeLeft(QUESTION_SECS);

    let t = QUESTION_SECS;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        stopTimer();
        picksRef.current[qIndexRef.current] = null; // timed out = wrong
        setRevealed(true);
      }
    }, 1000);
  };

  const doFinalize = useCallback(async (qs: CDLQuestion[], picks: (number | null)[]) => {
    const score = picks.filter((p, i) => p !== null && p === qs[i]?.answer).length;
    setFinalScore(score);
    setGameMode('done');
    setSubmitting(true);
    try {
      const { data: res } = await client.post('/leaderboard/challenge', {
        score, total: qs.length, weekKey: wKey,
      });
      setPtsEarned(res.pointsEarned ?? 0);
      // Persist local best
      const raw = await AsyncStorage.getItem(BEST_STORE_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      if (score > (map[wKey] ?? -1)) {
        map[wKey] = score;
        await AsyncStorage.setItem(BEST_STORE_KEY, JSON.stringify(map));
        setWeekBest(score);
      }
    } catch {}
    finally { setSubmitting(false); }
  }, [wKey]);

  // After reveal: wait 1.2s then advance or finalize
  useEffect(() => {
    if (gameMode !== 'playing' || !revealed) return;
    const t = setTimeout(() => {
      const next = qIndexRef.current + 1;
      if (next >= questionsRef.current.length) {
        doFinalize(questionsRef.current, [...picksRef.current]);
      } else {
        startTimer(next);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [revealed, gameMode, doFinalize]);

  const handlePick = (optionIdx: number) => {
    if (revealed) return;
    stopTimer();
    picksRef.current[qIndexRef.current] = optionIdx;
    setPicked(optionIdx);
    setRevealed(true);
  };

  const startGame = () => {
    const qs = pickQuestions();
    questionsRef.current = qs;
    picksRef.current     = new Array(qs.length).fill(null);
    qIndexRef.current    = 0;
    setQuestions(qs);
    setFinalScore(0);
    setPtsEarned(0);
    setGameMode('playing');
    startTimer(0);
  };

  const closeGame = () => {
    stopTimer();
    setGameMode('idle');
    if (ptsEarned > 0) load(); // refresh rank if points were earned
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  const currentQ  = questions[qIndex];
  const timerPct  = (timeLeft / QUESTION_SECS) * 100;
  const timerColor = timeLeft > 8 ? '#27AE60' : timeLeft > 4 ? '#F39C12' : '#FF3B30';
  const shortcuts  = COMPETE[cat];

  const renderEntry = ({ item }: { item: LeaderEntry }) => {
    const rankIcon = RANK_ICONS[item.rank];
    const isTop3   = item.rank <= 3;
    return (
      <View style={[s.entry, item.isMe && { borderColor: activeCat.color, borderWidth: 2, backgroundColor: activeCat.color + '11' }]}>
        <View style={s.entryRank}>
          {rankIcon
            ? <Text style={s.medal}>{rankIcon}</Text>
            : <Text style={[s.rankNum, { color: isTop3 ? activeCat.color : Colors.textMuted }]}>#{item.rank}</Text>
          }
        </View>
        <View style={s.entryBody}>
          <View style={s.entryNameRow}>
            <Text style={[s.entryName, { color: item.isMe ? activeCat.color : Colors.text }]}>
              {item.name}{item.isMe ? ' (You)' : ''}
            </Text>
            <View style={s.entryBadges}>
              {item.badges.slice(0, 2).map(b => (
                <Text key={b} style={s.entryBadgeIcon}>{BADGE_LABELS[b] ?? '🏅'}</Text>
              ))}
            </View>
          </View>
          <View style={s.entryBar}>
            <View style={[s.entryBarFill, {
              width: `${Math.min(100, (item.score / activeCat.maxScore) * 100)}%` as any,
              backgroundColor: item.isMe ? activeCat.color : activeCat.color + '88',
            }]} />
          </View>
        </View>
        <Text style={[s.entryScore, { color: item.isMe ? activeCat.color : Colors.text }]}>
          {item.score}
        </Text>
      </View>
    );
  };

  const ListHeader = (
    <View style={s.listHeader}>
      <Text style={[s.sectionLabel, { color: Colors.textMuted }]}>COMPETE NOW</Text>
      <View style={s.competeRow}>
        {shortcuts.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={[s.competeBtn, { borderColor: Colors.border }]}
            onPress={() => navigation.navigate(item.screen as any)}
            activeOpacity={0.8}
          >
            <View style={[s.competeBtnIcon, { backgroundColor: activeCat.color + '1A' }]}>
              <Ionicons name={item.icon as any} size={20} color={activeCat.color} />
            </View>
            <Text style={[s.competeBtnLabel, { color: Colors.text }]}>{item.label}</Text>
            <Text style={[s.competeBtnPts, { color: activeCat.color }]}>{item.pts}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[s.sectionLabel, { color: Colors.textMuted, marginTop: 6 }]}>TOP 10 RANKINGS</Text>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: Colors.background }]} edges={['bottom']}>

      {/* ── Gold header ────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>America's Top Trucker</Text>
            <Text style={s.headerSub}>National Competition — Season {new Date().getFullYear()}</Text>
          </View>
          <View style={s.weekChip}>
            <Text style={s.weekChipTxt}>Week {weekNum}</Text>
            <Text style={s.weekChipSub}>{daysLeft}d left</Text>
          </View>
        </View>

        {data && (
          <View style={s.myRankCard}>
            <View style={s.myRankLeft}>
              <Text style={s.myRankLabel}>YOUR RANK</Text>
              <Text style={s.myRankValue}>{data.myRank ? `#${data.myRank}` : 'Unranked'}</Text>
              <Text style={s.myRankSub}>of {data.totalDrivers} drivers</Text>
            </View>
            <View style={s.myRankDivider} />
            <View style={s.myRankRight}>
              <Text style={s.myRankLabel}>{activeCat.label.split(' ').slice(0, 2).join(' ').toUpperCase()}</Text>
              <Text style={[s.myRankValue, { color: activeCat.color }]}>{data.myScore}</Text>
              <Text style={s.myRankSub}>/ {activeCat.maxScore} pts</Text>
            </View>
            <View style={s.myRankDivider} />
            <View style={s.myRankRight}>
              <Text style={s.myRankLabel}>ROAD READY</Text>
              <Text style={[s.myRankValue, { color: Colors.secondary }]}>{data.myTotalScore}</Text>
              <Text style={s.myRankSub}>/ 1,000 pts</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Category tabs ──────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catRow}
        style={[s.catBar, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.catChip, cat === c.id && { backgroundColor: c.color + '22', borderColor: c.color }]}
            onPress={() => setCat(c.id)}
            activeOpacity={0.8}
          >
            <Ionicons name={c.icon as any} size={14} color={cat === c.id ? c.color : Colors.textMuted} />
            <Text style={[s.catChipTxt, { color: cat === c.id ? c.color : Colors.textMuted }]}>
              {c.label.split(' ').slice(0, 2).join(' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Category description ────────────────────────────────────────── */}
      <View style={[s.catHeader, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
        <Ionicons name={activeCat.icon as any} size={18} color={activeCat.color} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.catHeaderTitle, { color: Colors.text }]}>{activeCat.label}</Text>
          <Text style={[s.catHeaderDesc, { color: Colors.textMuted }]}>{activeCat.desc}</Text>
        </View>
      </View>

      {/* ── Weekly Challenge banner ─────────────────────────────────────── */}
      <View style={s.challengeBanner}>
        <View style={s.challengeLeft}>
          <Text style={s.challengeEmoji}>⚡</Text>
          <View>
            <Text style={s.challengeTitle}>Weekly Trucker Challenge</Text>
            <Text style={s.challengeSub}>
              {weekBest >= 0
                ? `Your best this week: ${weekBest}/${QUESTION_COUNT}`
                : `${QUESTION_COUNT} questions · ${QUESTION_SECS}s each · earn pts`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.challengePlayBtn, { backgroundColor: activeCat.color }]}
          onPress={startGame}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={14} color="#FFFFFF" />
          <Text style={s.challengePlayBtnTxt}>{weekBest >= 0 ? 'Play Again' : 'Play Now'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={[s.loadingTxt, { color: Colors.textMuted }]}>Loading leaderboard…</Text>
        </View>
      ) : !data || data.top.length === 0 ? (
        <>
          {ListHeader}
          <View style={s.center}>
            <Text style={{ fontSize: 48 }}>🏁</Text>
            <Text style={[s.emptyTitle, { color: Colors.text }]}>No rankings yet</Text>
            <Text style={[s.emptyDesc, { color: Colors.textMuted }]}>
              Be the first! Play the Weekly Challenge, log HOS, and run freight to earn your score.
            </Text>
          </View>
        </>
      ) : (
        <FlatList
          data={data.top}
          keyExtractor={item => String(item.rank)}
          renderItem={renderEntry}
          contentContainerStyle={s.list}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.secondary} />
          }
          ListFooterComponent={
            data.totalDrivers > 10 ? (
              <Text style={[s.footerNote, { color: Colors.textMuted }]}>
                Showing top 10 of {data.totalDrivers} ranked drivers.
                {data.myRank && data.myRank > 10 ? ` You are ranked #${data.myRank}.` : ' Keep competing to climb the ranks!'}
              </Text>
            ) : null
          }
        />
      )}

      {/* ── Game Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={gameMode !== 'idle'}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeGame}
      >
        <View style={[s.gameContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>

          {/* ── Playing ──────────────────────────────────────────────── */}
          {gameMode === 'playing' && currentQ ? (
            <>
              {/* Header: counter + timer + close */}
              <View style={s.gameHeader}>
                <Text style={s.gameCounter}>Q {qIndex + 1}<Text style={s.gameCounterOf}> / {questions.length}</Text></Text>
                <View style={s.timerBarWrap}>
                  <View style={[s.timerBarFill, { width: `${timerPct}%` as any, backgroundColor: timerColor }]} />
                </View>
                <Text style={[s.timerNum, { color: timerColor }]}>{timeLeft}s</Text>
                <TouchableOpacity onPress={closeGame} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#FFFFFF66" />
                </TouchableOpacity>
              </View>

              {/* Question */}
              <View style={s.questionCard}>
                <Text style={s.questionText}>{currentQ.q}</Text>
              </View>

              {/* Options */}
              <View style={s.optionsWrap}>
                {currentQ.options.map((opt, i) => {
                  const isCorrect    = i === currentQ.answer;
                  const isPickedWrong = revealed && picked === i && !isCorrect;
                  const showGreen    = revealed && isCorrect;
                  const bg     = showGreen ? '#1B4332' : isPickedWrong ? '#4A1B1B' : '#1A2B4A';
                  const border = showGreen ? '#27AE60' : isPickedWrong ? '#FF3B30' : '#2C3E5A';
                  const txtCol = showGreen ? '#27AE60' : isPickedWrong ? '#FF3B30' : '#FFFFFF';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.option, { backgroundColor: bg, borderColor: border }]}
                      onPress={() => handlePick(i)}
                      disabled={revealed}
                      activeOpacity={0.8}
                    >
                      <View style={[s.optionBadge, { backgroundColor: border + '40' }]}>
                        <Text style={[s.optionBadgeTxt, { color: txtCol }]}>{OPTION_LETTERS[i]}</Text>
                      </View>
                      <Text style={[s.optionText, { color: txtCol }]} numberOfLines={3}>{opt}</Text>
                      {showGreen    && <Ionicons name="checkmark-circle" size={20} color="#27AE60" />}
                      {isPickedWrong && <Ionicons name="close-circle"    size={20} color="#FF3B30" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Explanation after reveal */}
              {revealed && (
                <View style={s.explanationBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#FFFFFF88" style={{ marginTop: 1 }} />
                  <Text style={s.explanationText}>{currentQ.explanation}</Text>
                </View>
              )}
            </>
          ) : gameMode === 'done' ? (

            /* ── Results ──────────────────────────────────────────────── */
            <View style={s.resultsWrap}>
              <Text style={s.resultsTrophy}>🏆</Text>
              <Text style={s.resultsTitle}>Challenge Complete!</Text>

              {/* Big score */}
              <Text style={s.resultsScore}>
                {finalScore}
                <Text style={s.resultsDenom}>/{QUESTION_COUNT}</Text>
              </Text>
              <Text style={s.resultsLabel}>{resultLabel(finalScore)}</Text>

              {/* Points badge */}
              {submitting ? (
                <ActivityIndicator size="small" color="#FFD700" style={{ marginTop: 16 }} />
              ) : (
                <View style={s.ptsBadge}>
                  <Ionicons name="star" size={15} color="#FFD700" />
                  <Text style={s.ptsBadgeTxt}>
                    {ptsEarned > 0
                      ? `+${ptsEarned} skill pts earned!`
                      : weekBest > finalScore
                        ? `Your best is still ${weekBest}/${QUESTION_COUNT}`
                        : 'No new pts — beat your best to earn more'}
                  </Text>
                </View>
              )}

              {/* Per-question dot row */}
              <View style={s.dotRow}>
                {picksRef.current.map((pick, i) => {
                  const correct = pick !== null && pick === questionsRef.current[i]?.answer;
                  const color   = correct ? '#27AE60' : pick === null ? '#555566' : '#FF3B30';
                  return <View key={i} style={[s.dot, { backgroundColor: color }]} />;
                })}
              </View>
              <Text style={s.dotLegend}>
                <Text style={{ color: '#27AE60' }}>●</Text> correct{'  '}
                <Text style={{ color: '#FF3B30' }}>●</Text> wrong{'  '}
                <Text style={{ color: '#555566' }}>●</Text> timeout
              </Text>

              {/* CTAs */}
              <TouchableOpacity style={s.playAgainBtn} onPress={startGame} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color="#021B3A" />
                <Text style={s.playAgainTxt}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.seeRankBtn} onPress={closeGame} activeOpacity={0.8}>
                <Text style={s.seeRankTxt}>See Rankings</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(Colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },

    // ── Header ──────────────────────────────────────────────────────────────
    header:      { backgroundColor: '#021B3A', padding: 16, paddingBottom: 12 },
    headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
    headerSub:   { color: '#FFFFFF88', fontSize: 12, marginTop: 2 },
    weekChip:    { backgroundColor: '#FFD70022', borderRadius: 10, borderWidth: 1, borderColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
    weekChipTxt: { color: '#FFD700', fontSize: 12, fontWeight: '800' },
    weekChipSub: { color: '#FFD700AA', fontSize: 10, fontWeight: '600' },

    myRankCard:    { backgroundColor: '#FFFFFF12', borderRadius: 14, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 4 },
    myRankLeft:    { flex: 1, alignItems: 'center' },
    myRankRight:   { flex: 1, alignItems: 'center' },
    myRankDivider: { width: 1, height: 44, backgroundColor: '#FFFFFF22' },
    myRankLabel:   { color: '#FFFFFF66', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
    myRankValue:   { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    myRankSub:     { color: '#FFFFFF66', fontSize: 10, marginTop: 1 },

    // ── Category tabs ────────────────────────────────────────────────────────
    catBar:        { borderBottomWidth: 1, maxHeight: 60 },
    catRow:        { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    catChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight ?? Colors.surface },
    catChipTxt:    { fontSize: 12, fontWeight: '700' },
    catHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    catHeaderTitle: { fontSize: 14, fontWeight: '800' },
    catHeaderDesc:  { fontSize: 11, marginTop: 1 },

    // ── Weekly challenge banner ───────────────────────────────────────────────
    challengeBanner:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#021B3A', borderBottomWidth: 1, borderBottomColor: '#FFFFFF18' },
    challengeLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    challengeEmoji:     { fontSize: 24 },
    challengeTitle:     { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    challengeSub:       { color: '#FFFFFF66', fontSize: 11, marginTop: 2 },
    challengePlayBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
    challengePlayBtnTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

    // ── List header (compete + label) ────────────────────────────────────────
    listHeader:      { paddingHorizontal: 12, paddingTop: 12 },
    sectionLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
    competeRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
    competeBtn:      { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1 },
    competeBtnIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    competeBtnLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: Colors.text },
    competeBtnPts:   { fontSize: 10, fontWeight: '600' },

    // ── Leaderboard list ─────────────────────────────────────────────────────
    list:          { padding: 12, paddingBottom: 40, gap: 8 },
    entry:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12 },
    entryRank:     { width: 36, alignItems: 'center' },
    medal:         { fontSize: 22 },
    rankNum:       { fontSize: 15, fontWeight: '900' },
    entryBody:     { flex: 1, gap: 6 },
    entryNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    entryName:     { fontSize: 14, fontWeight: '700', flex: 1 },
    entryBadges:   { flexDirection: 'row', gap: 2 },
    entryBadgeIcon: { fontSize: 14 },
    entryBar:      { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
    entryBarFill:  { height: '100%', borderRadius: 2 },
    entryScore:    { fontSize: 18, fontWeight: '900', minWidth: 44, textAlign: 'right' },

    // ── States ───────────────────────────────────────────────────────────────
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    loadingTxt: { fontSize: 14, marginTop: 8 },
    emptyTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyDesc:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    footerNote: { fontSize: 12, textAlign: 'center', padding: 16, fontStyle: 'italic' },

    // ── Game modal ───────────────────────────────────────────────────────────
    gameContainer: { flex: 1, backgroundColor: '#021B3A', paddingHorizontal: 16 },

    gameHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    gameCounter:   { color: '#FFFFFF', fontSize: 15, fontWeight: '900', minWidth: 50 },
    gameCounterOf: { color: '#FFFFFF66', fontWeight: '600' },
    timerBarWrap:  { flex: 1, height: 6, backgroundColor: '#FFFFFF22', borderRadius: 3, overflow: 'hidden' },
    timerBarFill:  { height: '100%', borderRadius: 3 },
    timerNum:      { fontSize: 13, fontWeight: '800', minWidth: 28, textAlign: 'right' },

    questionCard: { backgroundColor: Colors.surfaceLight ?? Colors.surface, borderRadius: 20, padding: 20, marginBottom: 20, minHeight: 100, justifyContent: 'center' },
    questionText: { color: Colors.text, fontSize: 17, fontWeight: '800', lineHeight: 25 },

    optionsWrap:  { gap: 10, flex: 1 },
    option:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12 },
    optionBadge:  { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    optionBadgeTxt: { fontSize: 13, fontWeight: '900' },
    optionText:   { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

    explanationBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, backgroundColor: '#FFFFFF12', borderRadius: 12, padding: 12 },
    explanationText: { flex: 1, color: '#FFFFFFCC', fontSize: 13, lineHeight: 19 },

    // ── Results ──────────────────────────────────────────────────────────────
    resultsWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    resultsTrophy: { fontSize: 64 },
    resultsTitle:  { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    resultsScore:  { color: '#FFD700', fontSize: 80, fontWeight: '900', lineHeight: 88 },
    resultsDenom:  { color: '#FFD70088', fontSize: 40, fontWeight: '700' },
    resultsLabel:  { color: '#FFFFFF99', fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: -4 },
    ptsBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD70018', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: '#FFD70044' },
    ptsBadgeTxt:   { color: '#FFD700', fontSize: 13, fontWeight: '700' },
    dotRow:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
    dot:           { width: 13, height: 13, borderRadius: 7 },
    dotLegend:     { color: '#FFFFFF44', fontSize: 11, textAlign: 'center' },
    playAgainBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFD700', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 15, marginTop: 8 },
    playAgainTxt:  { color: '#021B3A', fontSize: 16, fontWeight: '900' },
    seeRankBtn:    { paddingVertical: 12 },
    seeRankTxt:    { color: '#FFFFFF55', fontSize: 14, fontWeight: '600' },
  });
}
