import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Question {
  q: string;
  options: string[];
  answer: number;
  fact: string;
}

const QUESTIONS: Question[] = [
  {
    q: 'What is the max driving hours per day under federal HOS rules?',
    options: ['8 hours', '10 hours', '11 hours', '12 hours'],
    answer: 2,
    fact: 'Federal rules allow 11 hours of driving after 10 consecutive hours off duty.',
  },
  {
    q: 'What does "IFTA" stand for?',
    options: [
      'Interstate Fuel Transfer Agreement',
      'International Fuel Tax Agreement',
      'Interstate Freight Tracking Authority',
      'International Fleet Tax Account',
    ],
    answer: 1,
    fact: 'IFTA simplifies fuel tax reporting for carriers operating in multiple jurisdictions.',
  },
  {
    q: 'What is the maximum gross vehicle weight on most US interstates?',
    options: ['60,000 lbs', '70,000 lbs', '80,000 lbs', '90,000 lbs'],
    answer: 2,
    fact: '80,000 lbs is the federal limit — individual states may have lower limits.',
  },
  {
    q: 'What does "BOL" stand for in trucking?',
    options: ['Bill of Loading', 'Bill of Lading', 'Broker Order Listing', 'Back-Office Log'],
    answer: 1,
    fact: 'A Bill of Lading is a legal document between shipper and carrier detailing the shipment.',
  },
  {
    q: 'How many axles does a standard 18-wheeler have?',
    options: ['4', '5', '6', '7'],
    answer: 1,
    fact: 'A typical 18-wheeler has 5 axles: 1 steer, 2 drive, and 2 trailer axles.',
  },
  {
    q: 'What is the "70-hour rule" in HOS?',
    options: [
      'Max 70 hours driving in 7 days',
      'Max 70 hours on-duty in 8 days',
      'Max 70 mph on interstate',
      'Min 70 miles between stops',
    ],
    answer: 1,
    fact: 'You cannot drive after being on-duty 70 hours in 8 consecutive days. Reset requires 34 hrs off.',
  },
  {
    q: 'What does "OTR" mean?',
    options: ['Over-the-Road', 'On-Time Rate', 'Off-Track Route', 'Outbound Transport Request'],
    answer: 0,
    fact: 'OTR drivers travel long distances, often sleeping in the cab and being away from home for weeks.',
  },
  {
    q: 'What is a "reefer" in trucking?',
    options: [
      'A fuel efficiency metric',
      'A refrigerated trailer',
      'A rear-axle configuration',
      'A rest area near a highway',
    ],
    answer: 1,
    fact: 'Reefer loads (refrigerated trailers) typically pay higher rates due to temperature requirements.',
  },
  {
    q: 'How many points on a CDL can result in disqualification?',
    options: ['6 points', '8 points', '10 points', '12 points'],
    answer: 3,
    fact: 'Accumulating 12 or more points on a CDL in a 12-month period can trigger disqualification.',
  },
  {
    q: 'What does "deadhead" mean?',
    options: [
      'Driving without a trailer',
      'Driving over the speed limit',
      'Night driving over 500 miles',
      'A flat tire blowout',
    ],
    answer: 0,
    fact: 'Deadheading is driving an empty trailer. It costs money and should be minimized on the load board.',
  },
];

export default function TruckingTriviaScreen() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUESTIONS[questionIndex];
  const isAnswered = selected !== null;
  const isCorrect = selected === q.answer;

  const handleSelect = (i: number) => {
    if (isAnswered) return;
    setSelected(i);
    if (i === q.answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (questionIndex + 1 >= QUESTIONS.length) {
      setFinished(true);
    } else {
      setQuestionIndex(i => i + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setQuestionIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Ionicons
            name={pct >= 70 ? 'trophy' : 'ribbon-outline'}
            size={64}
            color={pct >= 70 ? '#FFD700' : Colors.secondary}
          />
          <Text style={styles.resultScore}>{score} / {QUESTIONS.length}</Text>
          <Text style={styles.resultPct}>{pct}%</Text>
          <Text style={styles.resultMsg}>
            {pct >= 90 ? 'Elite driver! You know your stuff.' :
             pct >= 70 ? 'Solid knowledge. Keep rolling!' :
             pct >= 50 ? 'Not bad — hit the books a bit more.' :
             'Time to study up, driver!'}
          </Text>
          <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color={Colors.white} />
            <Text style={styles.restartBtnText}>Play Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Question {questionIndex + 1} of {QUESTIONS.length}</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }]} />
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.q}</Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {q.options.map((opt, i) => {
            let bg = Colors.surface;
            let borderColor = Colors.border;
            let textColor = Colors.white;

            if (isAnswered) {
              if (i === q.answer) { bg = '#2ECC7122'; borderColor = '#2ECC71'; textColor = '#2ECC71'; }
              else if (i === selected) { bg = '#E74C3C22'; borderColor = '#E74C3C'; textColor = '#E74C3C'; }
            }

            return (
              <TouchableOpacity
                key={i}
                style={[styles.option, { backgroundColor: bg, borderColor }]}
                onPress={() => handleSelect(i)}
                activeOpacity={isAnswered ? 1 : 0.7}
              >
                <View style={[styles.optionLetter, { borderColor }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>
                    {['A', 'B', 'C', 'D'][i]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {isAnswered && i === q.answer && (
                  <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                )}
                {isAnswered && i === selected && i !== q.answer && (
                  <Ionicons name="close-circle" size={20} color="#E74C3C" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fact */}
        {isAnswered && (
          <View style={[styles.factCard, { borderColor: isCorrect ? '#2ECC71' : '#E74C3C' }]}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
            <Text style={styles.factText}>{q.fact}</Text>
          </View>
        )}

        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {questionIndex + 1 >= QUESTIONS.length ? 'See Results' : 'Next Question'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { color: Colors.textMuted, fontSize: 13 },
  scoreText: { color: Colors.secondary, fontWeight: '800', fontSize: 13 },
  progressBar: { height: 4, backgroundColor: Colors.surface, borderRadius: 2, marginBottom: 24 },
  progressFill: { height: 4, backgroundColor: Colors.secondary, borderRadius: 2 },
  questionCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  questionText: { color: Colors.white, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  options: { gap: 10, marginBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  optionLetter: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  optionLetterText: { fontWeight: '800', fontSize: 13 },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600' },
  factCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, marginBottom: 20,
  },
  factText: { color: Colors.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: Colors.secondary,
  },
  nextBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  // Results
  resultContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  resultScore: { color: Colors.white, fontSize: 52, fontWeight: '900' },
  resultPct: { color: Colors.secondary, fontSize: 28, fontWeight: '800' },
  resultMsg: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  restartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.secondary, marginTop: 8,
  },
  restartBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
});
