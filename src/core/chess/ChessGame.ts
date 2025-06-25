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
   * Undo last move (alias for compatibility)
   */
  undoMove(): Move | null {
    return this.undo();
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
  return this.game.get(square) || null;
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

  /**
   * Get valid moves from a specific square
   */
  getValidMovesFrom(square: Square): Array<{ from: string; to: string; san: string }> {
    try {
      const moves = this.game.moves({ square, verbose: true });
      return moves.map(move => ({
        from: move.from,
        to: move.to,
        san: move.san
      }));
    } catch {
      return [];
    }
  }

  /**
   * Check if a square has valid moves
   */
  hasValidMovesFrom(square: Square): boolean {
    try {
      const moves = this.game.moves({ square });
      return moves.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate and return move details if valid
   */
  isValidMove(from: Square, to: Square): { san: string; from: string; to: string } | null {
    try {
      // Try the move without actually making it
      const moves = this.game.moves({ verbose: true });
      const validMove = moves.find(move => move.from === from && move.to === to);
      
      if (validMove) {
        return {
          san: validMove.san,
          from: validMove.from,
          to: validMove.to
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all valid moves in current position
   */
  getValidMoves(): Array<{ from: string; to: string; san: string }> {
    try {
      const moves = this.game.moves({ verbose: true });
      return moves.map(move => ({
        from: move.from,
        to: move.to,
        san: move.san
      }));
    } catch {
      return [];
    }
  }

  /**
   * Make a move by coordinates (for interactive board)
   */
  makeMoveByCoords(from: Square, to: Square, promotion?: string): ChessMove | null {
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
      return null;
    } catch (error) {
      console.error('Move error:', error);
      return null;
    }
  }

  /**
   * Clone the current game state
   */
  clone(): ChessGame {
    return new ChessGame(this.getFen());
  }
}