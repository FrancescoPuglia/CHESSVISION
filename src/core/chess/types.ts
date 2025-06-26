// src/core/chess/types.ts
import { Square } from "chess.js";

export type ChessTurn = "white" | "black";

export type ChessPiece = "p" | "n" | "b" | "r" | "q" | "k";

export type ChessColor = "w" | "b";

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
export type PgnHeader = Record<string, string>;

export interface PgnGame {
  headers: PgnHeader;
  moves: PgnMove[];
  result: string;
}

export interface PgnMove {
  moveNumber: number;
  san: string;
  color: ChessTurn;
  comment?: string;
}

export interface PgnNode {
  type: "move" | "comment" | "variation";
  content: string;
  children?: PgnNode[];
}

// Study Engine Types
export interface StudyLine {
  moves: string[];
  evaluation?: number;
  comment?: string;
}

export interface StudyPosition {
  fen: string;
  correctMoves: string[];
  alternatives: string[];
  hint?: string;
}

// Stats Types
export interface MoveAttempt {
  san: string;
  correct: boolean;
  timeMs: number;
  hintsUsed: number;
}

export interface StudySession {
  id: string;
  date: string;
  studyId: string;
  moves: MoveAttempt[];
  completed: boolean;
  totalTimeMs: number;
}

export interface UserStats {
  version: number;
  sessions: StudySession[];
  aggregates: {
    totalMoves: number;
    correctMoves: number;
    totalTime: number;
    studiesCompleted: number;
    currentStreak: number;
    lastPlayedDate: string | null;
  };
}

// Tactical Training Types (Lucas Chess style)
export type ProblemDifficulty = 1 | 2 | 3 | 4 | 5;

export type TacticalTheme =
  | "mate"
  | "pin"
  | "fork"
  | "skewer"
  | "discovery"
  | "deflection"
  | "decoy"
  | "sacrifice"
  | "combination"
  | "endgame"
  | "opening"
  | "tactics"
  | "middlegame"
  | "puzzle"
  | "study";

export interface TacticalProblem {
  id: string;
  fen: string;
  description: string;
  solution: string[];
  fullPgn?: string;
  difficulty?: ProblemDifficulty;
  theme?: TacticalTheme;
  source?: string;
  author?: string;
  year?: number;
  rating?: number; // ELO-style rating for difficulty
}

export interface TacticalCollection {
  name: string;
  description: string;
  problems: TacticalProblem[];
  totalProblems: number;
  themes: TacticalTheme[];
  source: string;
  metadata?: {
    author?: string;
    version?: string;
    created?: string;
    modified?: string;
  };
}

export interface TacticalSession {
  id: string;
  collectionName: string;
  problemId: string;
  startTime: number;
  endTime?: number;
  attempts: TacticalAttempt[];
  completed: boolean;
  hintsUsed: number;
  finalResult: "solved" | "failed" | "skipped";
}

export interface TacticalAttempt {
  moveIndex: number; // Which move in the solution (0-based)
  userMove: string; // Move entered by user
  expectedMove: string; // Correct move from solution
  correct: boolean;
  timestamp: number;
  timeMs: number; // Time to make this move
}

export interface TacticalStats {
  totalProblems: number;
  solvedProblems: number;
  failedProblems: number;
  skippedProblems: number;
  averageTime: number;
  currentStreak: number;
  longestStreak: number;
  difficultyStats: Record<
    ProblemDifficulty,
    {
      attempted: number;
      solved: number;
      averageTime: number;
    }
  >;
  themeStats: Record<
    TacticalTheme,
    {
      attempted: number;
      solved: number;
      averageTime: number;
    }
  >;
  recentSessions: TacticalSession[];
  lastPlayedDate: string | null;
}

// Problem solving state management
export interface ProblemState {
  currentProblem: TacticalProblem | null;
  currentMoveIndex: number;
  position: ChessPosition;
  gameState: any; // ChessGame instance
  attempts: TacticalAttempt[];
  hintsUsed: number;
  startTime: number;
  timeRemaining?: number;
  status: "waiting" | "thinking" | "solved" | "failed" | "hint";
  message: string;
  messageType: "info" | "success" | "error" | "warning";
}

// Training configuration
export interface TacticalConfig {
  timeLimit: number; // seconds per problem
  maxHints: number;
  showDescription: boolean;
  playSounds: boolean;
  autoAdvance: boolean;
  difficultyRange: [ProblemDifficulty, ProblemDifficulty];
  preferredThemes: TacticalTheme[];
  reinforcementMode: boolean; // Repeat failed problems
}
