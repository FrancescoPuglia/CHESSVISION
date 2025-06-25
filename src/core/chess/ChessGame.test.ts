// src/core/chess/ChessGame.test.ts
import { describe, it, expect } from 'vitest';
import { ChessGame } from './ChessGame';

describe('ChessGame', () => {
  it('should initialize with starting position', () => {
    const game = new ChessGame();
    expect(game.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('should validate legal moves', () => {
    const game = new ChessGame();
    expect(game.isLegalMove('e2', 'e4')).toBe(true);
    expect(game.isLegalMove('e7', 'e5')).toBe(false); // Not black's turn
  });

  it('should make valid moves', () => {
    const game = new ChessGame();
    const result = game.makeMove('e2', 'e4');
    expect(result).not.toBeNull();
    expect(result?.san).toBe('e4');
  });

  it('should make moves from SAN notation', () => {
    const game = new ChessGame();
    const result = game.makeMoveFromSan('e4');
    expect(result).not.toBeNull();
    expect(result?.san).toBe('e4');
  });
});