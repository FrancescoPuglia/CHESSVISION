// src/core/chess/ChessGame.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ChessGame } from './ChessGame';

describe('ChessGame', () => {
  let game: ChessGame;

  beforeEach(() => {
    game = new ChessGame();
  });

  describe('initialization', () => {
    it('should initialize with starting position', () => {
      expect(game.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(game.getTurn()).toBe('white');
    });

    it('should initialize with custom FEN', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const customGame = new ChessGame(customFen);
      expect(customGame.getFen()).toBe(customFen);
      expect(customGame.getTurn()).toBe('black');
    });
  });

  describe('move validation', () => {
    it('should validate legal moves', () => {
      expect(game.isLegalMove('e2', 'e4')).toBe(true);
      expect(game.isLegalMove('e2', 'e5')).toBe(false);
      expect(game.isLegalMove('g1', 'f3')).toBe(true);
      expect(game.isLegalMove('g1', 'e2')).toBe(false);
    });

    it('should not modify position when checking legality', () => {
      const fenBefore = game.getFen();
      game.isLegalMove('e2', 'e4');
      expect(game.getFen()).toBe(fenBefore);
    });
  });

  describe('making moves', () => {
    it('should make moves and update position', () => {
      const move = game.makeMove('e2', 'e4');
      expect(move).not.toBeNull();
      expect(move?.san).toBe('e4');
      expect(move?.from).toBe('e2');
      expect(move?.to).toBe('e4');
      expect(game.getTurn()).toBe('black');
    });

    it('should make moves from SAN notation', () => {
      const move = game.makeMoveFromSan('Nf3');
      expect(move).not.toBeNull();
      expect(move?.san).toBe('Nf3');
      expect(move?.piece).toBe('n');
    });

    it('should return null for illegal moves', () => {
      const move = game.makeMove('e2', 'e5');
      expect(move).toBeNull();
      expect(game.getTurn()).toBe('white'); // Turn should not change
    });

    it('should handle captures', () => {
      game.makeMoveFromSan('e4');
      game.makeMoveFromSan('d5');
      const capture = game.makeMoveFromSan('exd5');
      expect(capture?.captured).toBe('p');
    });

    it('should handle promotions', () => {
      const promotionFen = '8/P7/8/8/8/8/8/8 w - - 0 1';
      const promotionGame = new ChessGame(promotionFen);
      const move = promotionGame.makeMove('a7', 'a8', 'q');
      expect(move?.promotion).toBe('q');
    });
  });

  describe('undo functionality', () => {
    it('should undo moves', () => {
      const initialFen = game.getFen();
      game.makeMove('e2', 'e4');
      expect(game.getFen()).not.toBe(initialFen);
      
      const undone = game.undo();
      expect(undone).not.toBeNull();
      expect(game.getFen()).toBe(initialFen);
    });

    it('should return null when no moves to undo', () => {
      expect(game.undo()).toBeNull();
    });
  });

  describe('FEN handling', () => {
    it('should validate correct FEN', () => {
      const result = game.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid FEN', () => {
      const result = game.loadFen('invalid fen string');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('game state checks', () => {
    it('should detect checkmate', () => {
      const checkmateFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      game.loadFen(checkmateFen);
      expect(game.isCheckmate()).toBe(true);
      expect(game.isGameOver()).toBe(true);
    });

    it('should detect stalemate', () => {
      const stalemateFen = '8/8/8/8/8/8/8/k1K5 w - - 0 1';
      game.loadFen(stalemateFen);
      game.makeMoveFromSan('Kb2');
      expect(game.isStalemate()).toBe(true);
      expect(game.isDraw()).toBe(true);
    });

    it('should detect check', () => {
      game.makeMoveFromSan('e4');
      game.makeMoveFromSan('e5');
      game.makeMoveFromSan('Qh5');
      game.makeMoveFromSan('Nc6');
      game.makeMoveFromSan('Qxf7+');
      expect(game.isCheck()).toBe(true);
    });
  });

  describe('legal moves', () => {
    it('should return all legal moves in starting position', () => {
      const moves = game.getLegalMoves();
      expect(moves).toHaveLength(20); // 16 pawn moves + 4 knight moves
      expect(moves).toContain('e4');
      expect(moves).toContain('Nf3');
    });
  });

  describe('PGN handling', () => {
    it('should load PGN', () => {
      const pgn = '1. e4 e5 2. Nf3 Nc6';
      const loaded = game.loadPgn(pgn);
      expect(loaded).toBe(true);
      expect(game.getHistory()).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    });

    it('should export PGN', () => {
      game.makeMoveFromSan('e4');
      game.makeMoveFromSan('e5');
      const pgn = game.toPgn();
      expect(pgn).toContain('1. e4 e5');
    });
  });

  describe('piece queries', () => {
    it('should get piece at square', () => {
      const piece = game.getPieceAt('e2');
      expect(piece).toEqual({ type: 'p', color: 'w' });
      
      const empty = game.getPieceAt('e4');
      expect(empty).toBeNull();
    });
  });

  describe('history', () => {
    it('should track game history', () => {
      expect(game.getHistory()).toHaveLength(0);
      
      game.makeMoveFromSan('e4');
      game.makeMoveFromSan('e5');
      game.makeMoveFromSan('Nf3');
      
      expect(game.getHistory()).toEqual(['e4', 'e5', 'Nf3']);
    });
  });
});
