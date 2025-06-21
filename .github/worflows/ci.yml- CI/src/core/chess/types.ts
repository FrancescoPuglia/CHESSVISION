// src/core/chess/types.ts
import { Square } from 'chess.js';

export type ChessTurn = 'white' | 'black';
export type ChessPiece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type ChessColor = 'w' | 'b';

export interface ChessMove {
  from: Square;
  to: Square;
  san: string;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: ChessPiece;
  fen: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type ChessPosition = ({
  type: ChessPiece;
  color: ChessColor;
} | null)[][];

// PGN Parser Types
export interface PgnGame {
  id: string;
  headers: PgnHeaders;
  moves: PgnMove[];
  result: GameResult;
  initialPosition?: string;
}

export interface PgnHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: string;
  ECO?: string;
  Opening?: string;
  Variation?: string;
  FEN?: string;
  SetUp?: string;
  [key: string]: string | undefined;
}

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export interface PgnMove {
  move: string;
  moveNumber?: number;
  comments: string[];
  nag: number[]; // Numeric Annotation Glyphs ($1, $2, etc.)
  variations: PgnMove[][];
  fen: string;
  previous?: string;
}

export interface PgnNode {
  type: 'move' | 'comment' | 'variation' | 'nag';
  content: string;
  children?: PgnNode[];
}

// Study Engine Types
export interface Study {
  id: string;
  title: string;
  description?: string;
  pgn: string;
  tags: string[];
  difficulty: StudyDifficulty;
  lines: StudyLine[];
  createdAt: string;
  lastPlayedAt?: string;
  timesCompleted: number;
  bestTime?: number;
}

export type StudyDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface StudyLine {
  moves: string[];
  evaluation?: number;
  comment?: string;
  critical: boolean; // Is this the main line?
}

export interface StudyPosition {
  fen: string;
  correctMoves: string[];
  alternatives: string[];
  hint?: string;
  explanation?: string;
}

export interface StudyProgress {
  studyId: string;
  currentMoveIndex: number;
  mistakes: number;
  hintsUsed: number;
  startTime: number;
  completed: boolean;
}

// Stats Types
export interface MoveAttempt {
  san: string;
  correct: boolean;
  timeMs: number;
  hintsUsed: number;
  position: string; // FEN
}

export interface StudySession {
  id: string;
  date: string;
  studyId: string;
  studyTitle: string;
  moves: MoveAttempt[];
  completed: boolean;
  totalTimeMs: number;
  accuracy: number;
  rating: number;
}

export interface UserStats {
  version: number;
  userId?: string;
  sessions: StudySession[];
  aggregates: AggregateStats;
  achievements: Achievement[];
  preferences: UserPreferences;
}

export interface AggregateStats {
  totalMoves: number;
  correctMoves: number;
  totalTime: number;
  studiesCompleted: number;
  studiesStarted: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  favoriteOpening?: string;
  averageAccuracy: number;
  rating: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: string;
  progress: number;
  target: number;
}

export interface UserPreferences {
  language: 'it' | 'en';
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  voiceEnabled: boolean;
  autoNext: boolean;
  blindfoldByDefault: boolean;
  moveNotation: 'san' | 'uci';
  boardOrientation: 'white' | 'black' | 'auto';
}

// Voice/Speech Types
export interface VoiceCommand {
  command: string;
  aliases: string[];
  action: () => void;
  description: string;
}

export interface SpeechSettings {
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
}

// Timer Types
export interface TimerConfig {
  duration: number; // milliseconds
  warningTime: number; // when to show warning
  criticalTime: number; // when to show critical warning
  showMilliseconds: boolean;
  countdown: boolean;
  autoStart: boolean;
}

export interface TimerState {
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
}

// Error Types
export class ChessVisionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ChessVisionError';
  }
}

export class ParseError extends ChessVisionError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

export class ValidationError extends ChessVisionError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
