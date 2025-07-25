import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

// Calculate responsive sizes
const keyboardWidth = windowWidth * 0.75; // 95% of screen width
const keySize = Math.min(keyboardWidth / 11, 45); // Standard key size

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

import { WORD_LIST } from '@/constants/WordList';

type GuessState = {
  letter: string;
  state: 'correct' | 'present' | 'absent' | 'empty';
};

export default function WordleScreen() {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<GuessState[][]>(
    Array(MAX_ATTEMPTS).fill([]).map(() => 
      Array(WORD_LENGTH).fill({ letter: '', state: 'empty' })
    )
  );
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    newGame();
  }, []);

  const newGame = useCallback(() => {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setTargetWord(word);
    setCurrentAttempt(0);
    setCurrentGuess([]);
    setGuesses(Array(MAX_ATTEMPTS).fill([]).map(() => 
      Array(WORD_LENGTH).fill({ letter: '', state: 'empty' })
    ));
  }, []);

  const onKeyPress = useCallback((key: string) => {
    Haptics.selectionAsync();
    
    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        Alert.alert('Not enough letters');
        return;
      }

      const guess = currentGuess.join('');
      
      // Validate if the guess is a real word
      if (!WORD_LIST.includes(guess)) {
        Alert.alert('Not in word list');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const newGuesses = [...guesses];
      const evaluation = evaluateGuess(guess);
      
      newGuesses[currentAttempt] = evaluation;
      setGuesses(newGuesses);
      setCurrentGuess([]);
      
      if (guess === targetWord) {
        Alert.alert('Congratulations!', 'You won! Play again?', [
          { text: 'Play Again', onPress: newGame }
        ]);
        return;
      }
      
      if (currentAttempt === MAX_ATTEMPTS - 1) {
        Alert.alert('Game Over', `The word was ${targetWord}. Try again?`, [
          { text: 'Play Again', onPress: newGame }
        ]);
        return;
      }
      
      setCurrentAttempt(prev => prev + 1);
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH) {
      setCurrentGuess(prev => [...prev, key]);
    }
  }, [currentGuess, currentAttempt, guesses, targetWord]);

  const evaluateGuess = (guess: string): GuessState[] => {
    const result: GuessState[] = Array(WORD_LENGTH).fill(null).map(() => ({ 
      letter: '', 
      state: 'absent' 
    }));
    const targetLetters = targetWord.split('');
    const guessLetters = guess.split('');
    const usedTargetIndices = new Set<number>();
    
    // First pass: mark correct letters
    for (let i = 0; i < guessLetters.length; i++) {
      result[i].letter = guessLetters[i];
      if (guessLetters[i] === targetLetters[i]) {
        result[i].state = 'correct';
        usedTargetIndices.add(i);
      }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < guessLetters.length; i++) {
      if (result[i].state === 'correct') continue;
      
      for (let j = 0; j < targetLetters.length; j++) {
        if (!usedTargetIndices.has(j) && guessLetters[i] === targetLetters[j]) {
          result[i].state = 'present';
          usedTargetIndices.add(j);
          break;
        }
      }
    }
    
    return result;
  };

  const getKeyboardLetterState = (letter: string): 'correct' | 'present' | 'absent' | 'unused' => {
    let state: 'correct' | 'present' | 'absent' | 'unused' = 'unused';
    
    for (let i = 0; i <= currentAttempt; i++) {
      const row = guesses[i];
      const letterGuess = row.find(g => g.letter === letter);
      if (letterGuess) {
        if (letterGuess.state === 'correct') return 'correct';
        if (letterGuess.state === 'present') state = 'present';
        else if (letterGuess.state === 'absent' && state !== 'present') state = 'absent';
      }
    }
    
    return state;
  };

  const renderTile = (letter: string, state: GuessState['state']) => {
    const tileStyle = [
      styles.tile,
      state === 'correct' && { backgroundColor: '#538d4e' },
      state === 'present' && { backgroundColor: '#b59f3b' },
      state === 'absent' && { backgroundColor: '#3a3a3c' },
    ];

    return (
      <View style={tileStyle}>
        <ThemedText style={styles.tileLetter}>{letter}</ThemedText>
      </View>
    );
  };

  const renderKey = (letter: string) => {
    const state = getKeyboardLetterState(letter);
    const keyStyle = [
      styles.key,
      state === 'correct' && { backgroundColor: '#538d4e' },
      state === 'present' && { backgroundColor: '#b59f3b' },
      state === 'absent' && { backgroundColor: '#3a3a3c' },
    ];

    return (
      <Pressable
        key={letter}
        style={keyStyle}
        onPress={() => onKeyPress(letter)}>
        <ThemedText style={styles.keyLetter}>{letter}</ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>WORDLE</ThemedText>
      
      <View style={styles.grid}>
        {guesses.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((tile, tileIndex) => {
              const letter = rowIndex === currentAttempt ? 
                currentGuess[tileIndex] || '' : 
                tile.letter;
              const state = rowIndex === currentAttempt ? 
                'empty' : 
                tile.state;
              return (
                <View key={tileIndex}>
                  {renderTile(letter, state)}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.keyboard}>
        <View style={styles.keyboardRow}>
          {'QWERTYUIOP'.split('').map(letter => renderKey(letter))}
        </View>
        <View style={styles.keyboardRow}>
          {'ASDFGHJKL'.split('').map(letter => renderKey(letter))}
        </View>
        <View style={styles.keyboardRow}>
          <Pressable
            style={[styles.key, styles.wideKey]}
            onPress={() => onKeyPress('BACKSPACE')}>
            <ThemedText style={styles.keyLetter}>⌫</ThemedText>
          </Pressable>
          {'ZXCVBNM'.split('').map(letter => renderKey(letter))}
          <Pressable
            style={[styles.key, styles.wideKey]}
            onPress={() => onKeyPress('ENTER')}>
            <ThemedText style={styles.keyLetter}>ENTER</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Math.max(windowHeight * 0.08, 80), // Reduced to prevent title cutoff
    marginTop: 50, // Added extra margin at the top
  },
  title: {
    fontSize: Math.min(windowWidth * 0.08, 32),
    fontWeight: 'bold',
    marginBottom: Math.max(windowHeight * 0.06, 40),
    marginTop: 20, // Added margin to ensure visibility
  },
  grid: {
    marginBottom: windowHeight * 0.04, // 4% of screen height
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  tile: {
    width: Math.min(windowWidth * 0.13, 65), // 13% of screen width up to 65px
    height: Math.min(windowWidth * 0.13, 65), // Square tiles
    borderWidth: 2,
    borderColor: '#3a3a3c',
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLetter: {
    fontSize: Math.min(windowWidth * 0.06, 28), // 6% of screen width up to 28px
    fontWeight: 'bold',
  },
  keyboard: {
    width: keyboardWidth,
    marginTop: 'auto',
    marginBottom: Math.max(windowHeight * 0.03, 20), // 3% of screen height or minimum 20px
    gap: Math.min(windowHeight * 0.01, 8), // 1% of screen height up to 8px
    alignItems: 'center',
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Math.min(windowWidth * 0.01, 6), // 1% of screen width up to 6px
  },
  key: {
    backgroundColor: '#818384',
    borderRadius: 6,
    padding: Math.min(windowWidth * 0.02, 10), // Increased padding
    width: keySize,
    height: keySize * 1.6, // Made keys taller
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  wideKey: {
    width: keySize * 2, // Made wide keys wider
  },
  keyLetter: {
    fontSize: Math.min(keySize * 0.45, 18), // Increased font size
    fontWeight: 'bold',
  },
});
