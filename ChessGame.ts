// src/core/chess/ChessGame.ts
import { Chess, ChessInstance, Move, Square } from 'chess.js';
import { ChessMove, ChessPosition, ChessTurn, ValidationResult } from './types';

/**
 * Type-safe wrapper around chess.js
 * Provides a clean API for chess game logic
 */
export class ChessGame {
  private game: ChessInstance;
  
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
    const move = this.game.move({ from, to, promotion: 'q' });
    if (move) {
      this.game.undo();
      return true;
    }
    return false;
  }

  /**
   * Make a move
   */
  makeMove(from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): ChessMove | null {
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
    return null;
  }

  /**
   * Make a move from SAN notation
   */
  makeMoveFromSan(san: string): ChessMove | null {
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
    const result = this.game.validate_fen(fen);
    if (result.valid) {
      this.game.load(fen);
      return { valid: true };
    }
    return { 
      valid: false, 
      error: result.error 
    };
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
    return this.game.game_over();
  }

  /**
   * Check if current position is checkmate
   */
  isCheckmate(): boolean {
    return this.game.in_checkmate();
  }

  /**
   * Check if current position is draw
   */
  isDraw(): boolean {
    return this.game.in_draw();
  }

  /**
   * Check if current position is stalemate
   */
  isStalemate(): boolean {
    return this.game.in_stalemate();
  }

  /**
   * Check if current position is check
   */
  isCheck(): boolean {
    return this.game.in_check();
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
    return this.game.load_pgn(pgn);
  }

  /**
   * Export to PGN
   */
  toPgn(): string {
    return this.game.pgn();
  }
}
