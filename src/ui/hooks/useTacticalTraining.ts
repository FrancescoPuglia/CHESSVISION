// src/ui/hooks/useTacticalTraining.ts
import { useState, useCallback, useRef } from 'react';
import { TacticalCollection, TacticalProblem, TacticalSession, TacticalAttempt, TacticalConfig, TacticalStats } from '@core/chess/types';
import { FnsParser } from '@core/fns/FnsParser';

export interface TacticalTrainingState {
  currentCollection: TacticalCollection | null;
  currentProblemIndex: number;
  currentProblem: TacticalProblem | null;
  config: TacticalConfig;
  stats: TacticalStats;
  sessions: TacticalSession[];
  isActive: boolean;
  isPaused: boolean;
}

export interface TacticalTrainingActions {
  loadCollection: (collection: TacticalCollection) => void;
  loadFnsFile: (content: string, fileName: string) => void;
  startTraining: () => void;
  pauseTraining: () => void;
  resumeTraining: () => void;
  stopTraining: () => void;
  nextProblem: () => void;
  previousProblem: () => void;
  goToProblem: (index: number) => void;
  submitSolution: (attempts: TacticalAttempt[], timeMs: number, solved: boolean) => void;
  updateConfig: (newConfig: Partial<TacticalConfig>) => void;
  resetStats: () => void;
  getCurrentProblem: () => TacticalProblem | null;
  getProgress: () => { current: number; total: number; percent: number };
  filterProblemsByTheme: (theme: string) => TacticalProblem[];
  filterProblemsByDifficulty: (minDiff: number, maxDiff: number) => TacticalProblem[];
}

const DEFAULT_CONFIG: TacticalConfig = {
  timeLimit: 300, // 5 minutes per problem
  maxHints: 3,
  showDescription: true,
  playSounds: true,
  autoAdvance: false,
  difficultyRange: [1, 5],
  preferredThemes: [],
  reinforcementMode: true
};

const DEFAULT_STATS: TacticalStats = {
  totalProblems: 0,
  solvedProblems: 0,
  failedProblems: 0,
  skippedProblems: 0,
  averageTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  difficultyStats: {
    1: { attempted: 0, solved: 0, averageTime: 0 },
    2: { attempted: 0, solved: 0, averageTime: 0 },
    3: { attempted: 0, solved: 0, averageTime: 0 },
    4: { attempted: 0, solved: 0, averageTime: 0 },
    5: { attempted: 0, solved: 0, averageTime: 0 }
  },
  themeStats: {
    mate: { attempted: 0, solved: 0, averageTime: 0 },
    pin: { attempted: 0, solved: 0, averageTime: 0 },
    fork: { attempted: 0, solved: 0, averageTime: 0 },
    skewer: { attempted: 0, solved: 0, averageTime: 0 },
    discovery: { attempted: 0, solved: 0, averageTime: 0 },
    deflection: { attempted: 0, solved: 0, averageTime: 0 },
    decoy: { attempted: 0, solved: 0, averageTime: 0 },
    sacrifice: { attempted: 0, solved: 0, averageTime: 0 },
    combination: { attempted: 0, solved: 0, averageTime: 0 },
    endgame: { attempted: 0, solved: 0, averageTime: 0 },
    opening: { attempted: 0, solved: 0, averageTime: 0 },
    tactics: { attempted: 0, solved: 0, averageTime: 0 },
    middlegame: { attempted: 0, solved: 0, averageTime: 0 },
    puzzle: { attempted: 0, solved: 0, averageTime: 0 },
    study: { attempted: 0, solved: 0, averageTime: 0 }
  },
  recentSessions: [],
  lastPlayedDate: null
};

export const useTacticalTraining = (): [TacticalTrainingState, TacticalTrainingActions] => {
  // Load saved state from localStorage
  const loadSavedState = (): TacticalTrainingState => {
    try {
      const saved = localStorage.getItem('chessvision-tactical-training');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isActive: false,
          isPaused: false,
          config: { ...DEFAULT_CONFIG, ...parsed.config }
        };
      }
    } catch (error) {
      console.error('Error loading tactical training state:', error);
    }
    
    return {
      currentCollection: null,
      currentProblemIndex: 0,
      currentProblem: null,
      config: DEFAULT_CONFIG,
      stats: DEFAULT_STATS,
      sessions: [],
      isActive: false,
      isPaused: false
    };
  };

  const [state, setState] = useState<TacticalTrainingState>(loadSavedState);
  const currentSessionRef = useRef<TacticalSession | null>(null);

  // Save state to localStorage
  const saveState = useCallback((newState: TacticalTrainingState) => {
    try {
      const stateToSave = {
        ...newState,
        isActive: false,
        isPaused: false
      };
      localStorage.setItem('chessvision-tactical-training', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving tactical training state:', error);
    }
  }, []);

  const loadCollection = useCallback((collection: TacticalCollection) => {
    setState(prev => {
      const newState = {
        ...prev,
        currentCollection: collection,
        currentProblemIndex: 0,
        currentProblem: collection.problems.length > 0 ? collection.problems[0] : null,
        isActive: false,
        isPaused: false
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const loadFnsFile = useCallback((content: string, fileName: string) => {
    try {
      const collection = FnsParser.parseFnsFile(content, fileName);
      loadCollection(collection);
    } catch (error) {
      console.error('Error parsing FNS file:', error);
      throw new Error('Failed to parse FNS file. Please check the file format.');
    }
  }, [loadCollection]);

  const startTraining = useCallback(() => {
    if (!state.currentCollection || !state.currentProblem) return;

    const session: TacticalSession = {
      id: `session_${Date.now()}`,
      collectionName: state.currentCollection.name,
      problemId: state.currentProblem.id,
      startTime: Date.now(),
      attempts: [],
      completed: false,
      hintsUsed: 0,
      finalResult: 'failed'
    };

    currentSessionRef.current = session;

    setState(prev => ({
      ...prev,
      isActive: true,
      isPaused: false
    }));
  }, [state.currentCollection, state.currentProblem]);

  const pauseTraining = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  const resumeTraining = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const stopTraining = useCallback(() => {
    if (currentSessionRef.current && !currentSessionRef.current.completed) {
      currentSessionRef.current.endTime = Date.now();
      currentSessionRef.current.finalResult = 'skipped';
    }

    setState(prev => {
      const newState = {
        ...prev,
        isActive: false,
        isPaused: false
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const nextProblem = useCallback(() => {
    setState(prev => {
      if (!prev.currentCollection) return prev;
      
      const nextIndex = Math.min(prev.currentProblemIndex + 1, prev.currentCollection.problems.length - 1);
      const newState = {
        ...prev,
        currentProblemIndex: nextIndex,
        currentProblem: prev.currentCollection.problems[nextIndex],
        isActive: false,
        isPaused: false
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const previousProblem = useCallback(() => {
    setState(prev => {
      if (!prev.currentCollection) return prev;
      
      const prevIndex = Math.max(prev.currentProblemIndex - 1, 0);
      const newState = {
        ...prev,
        currentProblemIndex: prevIndex,
        currentProblem: prev.currentCollection.problems[prevIndex],
        isActive: false,
        isPaused: false
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const goToProblem = useCallback((index: number) => {
    setState(prev => {
      if (!prev.currentCollection || index < 0 || index >= prev.currentCollection.problems.length) {
        return prev;
      }
      
      const newState = {
        ...prev,
        currentProblemIndex: index,
        currentProblem: prev.currentCollection.problems[index],
        isActive: false,
        isPaused: false
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const submitSolution = useCallback((attempts: TacticalAttempt[], timeMs: number, solved: boolean) => {
    if (!currentSessionRef.current || !state.currentProblem) return;

    // Complete the session
    currentSessionRef.current.endTime = Date.now();
    currentSessionRef.current.attempts = attempts;
    currentSessionRef.current.completed = true;
    currentSessionRef.current.finalResult = solved ? 'solved' : 'failed';

    setState(prev => {
      // Update stats
      const newStats = { ...prev.stats };
      
      // Update totals
      newStats.totalProblems++;
      if (solved) {
        newStats.solvedProblems++;
        newStats.currentStreak++;
        newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
      } else {
        newStats.failedProblems++;
        newStats.currentStreak = 0;
      }

      // Update average time
      const totalTime = newStats.averageTime * (newStats.totalProblems - 1) + timeMs;
      newStats.averageTime = totalTime / newStats.totalProblems;

      // Update difficulty stats
      const difficulty = state.currentProblem?.difficulty;
      if (difficulty && difficulty >= 1 && difficulty <= 5) {
        const diffStats = newStats.difficultyStats[difficulty];
        diffStats.attempted++;
        if (solved) diffStats.solved++;
        diffStats.averageTime = ((diffStats.averageTime * (diffStats.attempted - 1)) + timeMs) / diffStats.attempted;
      }

      // Update theme stats
      const theme = state.currentProblem?.theme;
      if (theme && theme in newStats.themeStats) {
        const themeStats = newStats.themeStats[theme];
        themeStats.attempted++;
        if (solved) themeStats.solved++;
        themeStats.averageTime = ((themeStats.averageTime * (themeStats.attempted - 1)) + timeMs) / themeStats.attempted;
      }

      newStats.lastPlayedDate = new Date().toISOString();

      // Add session to recent sessions (keep last 50)
      const newSessions = [currentSessionRef.current!, ...prev.sessions].slice(0, 50);
      newStats.recentSessions = newSessions.slice(0, 10);

      const newState = {
        ...prev,
        stats: newStats,
        sessions: newSessions,
        isActive: false
      };

      saveState(newState);
      return newState;
    });

    // Auto-advance if configured
    if (state.config.autoAdvance && solved) {
      setTimeout(() => nextProblem(), 2000);
    }
  }, [state.currentProblem, state.config.autoAdvance, nextProblem, saveState]);

  const updateConfig = useCallback((newConfig: Partial<TacticalConfig>) => {
    setState(prev => {
      const updatedConfig = { ...prev.config, ...newConfig };
      const newState = {
        ...prev,
        config: updatedConfig
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const resetStats = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        stats: DEFAULT_STATS,
        sessions: []
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const getCurrentProblem = useCallback((): TacticalProblem | null => {
    return state.currentProblem;
  }, [state.currentProblem]);

  const getProgress = useCallback(() => {
    if (!state.currentCollection) {
      return { current: 0, total: 0, percent: 0 };
    }

    const current = state.currentProblemIndex + 1;
    const total = state.currentCollection.problems.length;
    const percent = total > 0 ? (current / total) * 100 : 0;

    return { current, total, percent };
  }, [state.currentCollection, state.currentProblemIndex]);

  const filterProblemsByTheme = useCallback((theme: string) => {
    if (!state.currentCollection) return [];
    return state.currentCollection.problems.filter(p => p.theme === theme);
  }, [state.currentCollection]);

  const filterProblemsByDifficulty = useCallback((minDiff: number, maxDiff: number) => {
    if (!state.currentCollection) return [];
    return state.currentCollection.problems.filter(p => 
      p.difficulty && p.difficulty >= minDiff && p.difficulty <= maxDiff
    );
  }, [state.currentCollection]);

  return [
    state,
    {
      loadCollection,
      loadFnsFile,
      startTraining,
      pauseTraining,
      resumeTraining,
      stopTraining,
      nextProblem,
      previousProblem,
      goToProblem,
      submitSolution,
      updateConfig,
      resetStats,
      getCurrentProblem,
      getProgress,
      filterProblemsByTheme,
      filterProblemsByDifficulty
    }
  ];
};