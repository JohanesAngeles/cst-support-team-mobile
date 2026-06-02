import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface ClueEntry {
  clue: string;
  answer: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

interface Cell {
  letter: string;
  filled: boolean; // black cell
  number?: number;
  acrossClue?: number;
  downClue?: number;
}

const PUZZLES: { title: string; clues: ClueEntry[] }[] = [
  {
    title: 'Trucking Basics',
    clues: [
      // Across
      { number: 1,  direction: 'across', clue: 'Hours of Service (abbr)',         answer: 'HOS',   row: 0, col: 0 },
      { number: 4,  direction: 'across', clue: 'Electronic Logging Device (abbr)', answer: 'ELD',   row: 2, col: 0 },
      { number: 6,  direction: 'across', clue: 'Miles Per Gallon (abbr)',          answer: 'MPG',   row: 4, col: 0 },
      { number: 7,  direction: 'across', clue: 'Bill of Lading (abbr)',            answer: 'BOL',   row: 6, col: 0 },
      // Down
      { number: 1,  direction: 'down',   clue: 'Hazardous Materials (abbr)',       answer: 'HAZ',   row: 0, col: 0 },
      { number: 2,  direction: 'down',   clue: 'Over-the-Road (abbr)',             answer: 'OTR',   row: 0, col: 1 },
      { number: 3,  direction: 'down',   clue: 'Stopping device on a trailer',     answer: 'SDB',   row: 0, col: 2 },
    ],
  },
  {
    title: 'Road Life',
    clues: [
      { number: 1,  direction: 'across', clue: 'Weigh station order: pull ___ scale', answer: 'INTO',  row: 0, col: 0 },
      { number: 3,  direction: 'across', clue: 'Fuel tax filing: ___ report',          answer: 'IFTA',  row: 2, col: 0 },
      { number: 5,  direction: 'across', clue: 'Cargo delivery proof (abbr)',           answer: 'POD',   row: 4, col: 0 },
      { number: 1,  direction: 'down',   clue: 'Interstate highway prefix',             answer: 'INT',   row: 0, col: 0 },
      { number: 2,  direction: 'down',   clue: 'Night driving necessity',               answer: 'NIGHT', row: 0, col: 2 },
    ],
  },
];

function buildGrid(clues: ClueEntry[], size = 9): Cell[][] {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: '', filled: true }))
  );

  clues.forEach((c) => {
    for (let i = 0; i < c.answer.length; i++) {
      const r = c.direction === 'across' ? c.row : c.row + i;
      const col = c.direction === 'across' ? c.col + i : c.col;
      if (r < size && col < size) {
        grid[r][col].filled = false;
        if (i === 0 && c.number) {
          grid[r][col].number = c.number;
          if (c.direction === 'across') grid[r][col].acrossClue = c.number;
          else grid[r][col].downClue = c.number;
        } else {
          if (c.direction === 'across') grid[r][col].acrossClue = c.number;
          else grid[r][col].downClue = c.number;
        }
      }
    }
  });

  return grid;
}

function buildAnswerMap(clues: ClueEntry[], size = 9): Record<string, string> {
  const map: Record<string, string> = {};
  clues.forEach((c) => {
    for (let i = 0; i < c.answer.length; i++) {
      const r = c.direction === 'across' ? c.row : c.row + i;
      const col = c.direction === 'across' ? c.col + i : c.col;
      if (r < size && col < size) {
        map[`${r},${col}`] = c.answer[i];
      }
    }
  });
  return map;
}

export default function TruckerCrosswordScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    puzzleTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
    clueBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clueBtnText: { color: Colors.secondary, fontWeight: '700' },
    solvedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#2ECC7122', borderRadius: 10, padding: 12, marginBottom: 12,
      borderWidth: 1, borderColor: '#2ECC71',
    },
    solvedText: { color: '#2ECC71', fontWeight: '800', fontSize: 15 },
    gridWrapper: { alignSelf: 'center', borderWidth: 2, borderColor: Colors.border, marginBottom: 20 },
    gridRow: { flexDirection: 'row' },
    cell: {
      borderWidth: 0.5, borderColor: Colors.border,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: Colors.surface,
    },
    filledCell: { backgroundColor: '#0a1520' },
    selectedCell: { backgroundColor: Colors.secondary + '44', borderColor: Colors.secondary },
    correctCell: { backgroundColor: '#2ECC7133' },
    wrongCell: { backgroundColor: '#E74C3C33' },
    cellNumber: { position: 'absolute', top: 1, left: 2, fontSize: 7, color: Colors.textMuted },
    cellLetter: { color: Colors.text, fontWeight: '800', fontSize: 16 },
    keyboard: { marginBottom: 16, gap: 6 },
    keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
    key: {
      backgroundColor: Colors.surface, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10,
      borderWidth: 1, borderColor: Colors.border, minWidth: 30, alignItems: 'center',
    },
    keyWide: { paddingHorizontal: 18 },
    keyText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
    nextBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: Colors.primary, borderRadius: 12, padding: 14, gap: 8,
      borderWidth: 1, borderColor: Colors.secondary,
    },
    nextBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, maxHeight: '70%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
    clueSection: { color: Colors.secondary, fontWeight: '900', fontSize: 13, marginTop: 12, marginBottom: 6, letterSpacing: 1 },
    clueItem: { color: Colors.textMuted, fontSize: 13, marginBottom: 6, lineHeight: 18 },
    clueNum: { color: Colors.text, fontWeight: '700' },
  }), [Colors]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = PUZZLES[puzzleIndex];
  const GRID_SIZE = 9;

  const grid = buildGrid(puzzle.clues, GRID_SIZE);
  const answerMap = buildAnswerMap(puzzle.clues, GRID_SIZE);

  const [userInput, setUserInput] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [solved, setSolved] = useState(false);
  const [clueModal, setClueModal] = useState(false);

  const handleCellPress = (r: number, c: number) => {
    if (grid[r][c].filled) return;
    setSelected({ row: r, col: c });
  };

  const handleLetter = (letter: string) => {
    if (!selected) return;
    const key = `${selected.row},${selected.col}`;
    const next = { ...userInput, [key]: letter.toUpperCase() };
    setUserInput(next);
    // check win
    const allCorrect = Object.entries(answerMap).every(([k, v]) => next[k] === v);
    if (allCorrect) setSolved(true);
    // auto-advance
    advanceSelection(selected.row, selected.col, next);
  };

  const advanceSelection = (r: number, c: number, input: Record<string, string>) => {
    // try right, then down
    for (let dc = 1; dc < GRID_SIZE - c; dc++) {
      if (!grid[r][c + dc].filled && !input[`${r},${c + dc}`]) {
        setSelected({ row: r, col: c + dc });
        return;
      }
    }
    for (let dr = 1; dr < GRID_SIZE - r; dr++) {
      if (!grid[r + dr][c].filled && !input[`${r + dr},${c}`]) {
        setSelected({ row: r + dr, col: c });
        return;
      }
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    const key = `${selected.row},${selected.col}`;
    const next = { ...userInput };
    if (next[key]) {
      delete next[key];
      setUserInput(next);
    } else {
      // back up
      for (let dc = selected.col - 1; dc >= 0; dc--) {
        if (!grid[selected.row][dc].filled) {
          const k = `${selected.row},${dc}`;
          delete next[k];
          setUserInput(next);
          setSelected({ row: selected.row, col: dc });
          return;
        }
      }
    }
  };

  const handleReset = () => {
    setUserInput({});
    setSolved(false);
    setSelected(null);
  };

  const nextPuzzle = () => {
    setPuzzleIndex((puzzleIndex + 1) % PUZZLES.length);
    setUserInput({});
    setSolved(false);
    setSelected(null);
  };

  const CELL = 36;

  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.puzzleTitle}>{puzzle.title}</Text>
          <TouchableOpacity onPress={() => setClueModal(true)} style={styles.clueBtn}>
            <Ionicons name="list-outline" size={18} color={Colors.secondary} />
            <Text style={styles.clueBtnText}>Clues</Text>
          </TouchableOpacity>
        </View>

        {solved && (
          <View style={styles.solvedBanner}>
            <Ionicons name="trophy" size={22} color="#FFD700" />
            <Text style={styles.solvedText}>Solved! Great work, driver!</Text>
          </View>
        )}

        {/* Grid */}
        <View style={styles.gridWrapper}>
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((cell, c) => {
                const key = `${r},${c}`;
                const isSelected = selected?.row === r && selected?.col === c;
                const isCorrect = userInput[key] && userInput[key] === answerMap[key];
                const isWrong = userInput[key] && userInput[key] !== answerMap[key];

                if (cell.filled) {
                  return <View key={c} style={[styles.cell, styles.filledCell, { width: CELL, height: CELL }]} />;
                }
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => handleCellPress(r, c)}
                    style={[
                      styles.cell,
                      { width: CELL, height: CELL },
                      isSelected && styles.selectedCell,
                      isCorrect && styles.correctCell,
                      isWrong && styles.wrongCell,
                    ]}
                  >
                    {cell.number ? <Text style={styles.cellNumber}>{cell.number}</Text> : null}
                    <Text style={styles.cellLetter}>{userInput[key] ?? ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Keyboard */}
        {selected && (
          <View style={styles.keyboard}>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce<string[][]>((rows, l, i) => {
              const ri = Math.floor(i / 9);
              if (!rows[ri]) rows[ri] = [];
              rows[ri].push(l);
              return rows;
            }, []).map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((l) => (
                  <TouchableOpacity key={l} style={styles.key} onPress={() => handleLetter(l)}>
                    <Text style={styles.keyText}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={styles.keyRow}>
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={handleDelete}>
                <Ionicons name="backspace-outline" size={18} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={handleReset}>
                <Text style={styles.keyText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={nextPuzzle}>
          <Text style={styles.nextBtnText}>Next Puzzle</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.white} />
        </TouchableOpacity>
      </ScrollView>

      {/* Clues modal */}
      <Modal visible={clueModal} transparent animationType="slide" onRequestClose={() => setClueModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clues — {puzzle.title}</Text>
              <TouchableOpacity onPress={() => setClueModal(false)}>
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.clueSection}>ACROSS</Text>
              {acrossClues.map(c => (
                <Text key={`a${c.number}`} style={styles.clueItem}><Text style={styles.clueNum}>{c.number}. </Text>{c.clue}</Text>
              ))}
              <Text style={styles.clueSection}>DOWN</Text>
              {downClues.map(c => (
                <Text key={`d${c.number}`} style={styles.clueItem}><Text style={styles.clueNum}>{c.number}. </Text>{c.clue}</Text>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
