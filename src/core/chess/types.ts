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
  type: 'move' | 'comment' | 'variation';
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
