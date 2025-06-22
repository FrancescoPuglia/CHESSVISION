import { Chess, Move, Square } from 'chess.js';
import { ChessMove, ChessPosition, ChessTurn, ValidationResult } from './types';

/**
 * Type-safe wrapper around chess.js
 * Provides a clean API for chess game logic
 */
export class ChessGame {
  private game: Chess;  // ← CAMBIATO: Chess invece di ChessInstance
  
  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  /**
   * Get current FEN position
   */
  getFen(): string {
    return this.game.fen();
  }

  /**
   * Get current turn
   */
  getTurn(): ChessTurn {
    return this.game.turn() === 'w' ? 'white' : 'black';
  }

  /**
   * Get board as 2D array
   */
  getBoard(): ChessPosition {
    return this.game.board();
  }

  /**
   * Check if a move is legal
   */
  isLegalMove(from: Square, to: Square): boolean {
    try {
      const move = this.game.move({ from, to, promotion: 'q' });
      if (move) {
        this.game.undo();
        return true;
      }
    } catch {
      // Move is illegal
    }
    return false;
  }

  /**
   * Make a move
   */
  makeMove(from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): ChessMove | null {
    try {
      const move = this.game.move({ from, to, promotion });
      if (move) {
        return {
          from: move.from,
          to: move.to,
          san: move.san,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          fen: this.game.fen()
        };
      }
    } catch {
      // Invalid move
    }
    return null;
  }

  /**
   * Make a move from SAN notation
   */
  makeMoveFromSan(san: string): ChessMove | null {
    try {
      const move = this.game.move(san);
      if (move) {
        return {
          from: move.from,
          to: move.to,
          san: move.san,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          fen: this.game.fen()
        };
      }
    } catch {
      // Invalid move
    }
    return null;
  }

  /**
   * Undo last move
   */
  undo(): Move | null {
    return this.game.undo();
  }

  /**
   * Reset to starting position
   */
  reset(): void {
    this.game.reset();
  }

  /**
   * Load position from FEN
   */
  loadFen(fen: string): ValidationResult {
    try {
      this.game.load(fen);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid FEN'
      };
    }
  }

  /**
   * Get all legal moves for current position
   */
  getLegalMoves(): string[] {
    return this.game.moves();
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  /**
   * Check if current position is checkmate
   */
  isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  /**
   * Check if current position is draw
   */
  isDraw(): boolean {
    return this.game.isDraw();
  }

  /**
   * Check if current position is stalemate
   */
  isStalemate(): boolean {
    return this.game.isStalemate();
  }

  /**
   * Check if current position is check
   */
  isCheck(): boolean {
    return this.game.isCheck();
  }

  /**
   * Get game history
   */
  getHistory(): string[] {
    return this.game.history();
  }

  /**
   * Get piece at square
   */
  getPieceAt(square: Square): { type: string; color: 'w' | 'b' } | null {
    return this.game.get(square);
  }

  /**
   * Load from PGN
   */
  loadPgn(pgn: string): boolean {
    try {
      this.game.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export to PGN
   */
  toPgn(): string {
    return this.game.pgn();
  }
}