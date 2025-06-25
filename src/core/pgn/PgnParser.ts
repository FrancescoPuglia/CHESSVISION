// src/core/pgn/PgnParser.ts
import { PgnGame, PgnMove, PgnHeader } from '../chess/types';

export class PgnParser {
  /**
   * Parse a PGN string into a structured game object
   */
  static parse(pgnText: string): PgnGame {
    const lines = pgnText.trim().split('\n');
    const headers: PgnHeader = {};
    const moves: PgnMove[] = [];
    
    let headerSection = true;
    let movesText = '';

    // Parse headers and separate moves text
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        if (headerSection) {
          headerSection = false;
        }
        continue;
      }

      if (headerSection && trimmedLine.startsWith('[')) {
        // Parse header: [Key "Value"]
        const headerMatch = trimmedLine.match(/\[(\w+)\s+"(.*)"\]/);
        if (headerMatch) {
          headers[headerMatch[1]] = headerMatch[2];
        }
      } else if (!headerSection) {
        movesText += trimmedLine + ' ';
      }
    }

    // Parse moves
    if (movesText.trim()) {
      const parsedMoves = this.parseMoves(movesText.trim());
      moves.push(...parsedMoves);
    }

    return {
      headers,
      moves,
      result: headers.Result || '*'
    };
  }

  /**
   * Parse moves text into structured moves
   */
  private static parseMoves(movesText: string): PgnMove[] {
    const moves: PgnMove[] = [];
    
    // Remove game result and comments for basic parsing
    let cleanText = movesText
      .replace(/\{[^}]*\}/g, '') // Remove comments
      .replace(/\([^)]*\)/g, '') // Remove variations (basic)
      .replace(/[012\/\-½\*]+\s*$/, '') // Remove result
      .trim();

    // Split by move numbers and extract moves
    const movePattern = /(\d+)\.\s*([^\s]+)(?:\s+([^\s]+))?/g;
    let match;

    while ((match = movePattern.exec(cleanText)) !== null) {
      const moveNumber = parseInt(match[1]);
      const whiteMove = match[2];
      const blackMove = match[3];

      if (whiteMove && whiteMove !== '...' && !whiteMove.match(/[012\/\-½\*]/)) {
        moves.push({
          moveNumber,
          san: whiteMove,
          color: 'white',
          comment: undefined
        });
      }

      if (blackMove && !blackMove.match(/[012\/\-½\*]/)) {
        moves.push({
          moveNumber,
          san: blackMove,
          color: 'black',
          comment: undefined
        });
      }
    }

    return moves;
  }

  /**
   * Convert a game object back to PGN string
   */
  static stringify(game: PgnGame): string {
    let pgn = '';

    // Add headers
    for (const [key, value] of Object.entries(game.headers)) {
      pgn += `[${key} "${value}"]\n`;
    }

    if (Object.keys(game.headers).length > 0) {
      pgn += '\n';
    }

    // Add moves
    let moveText = '';
    
    for (let i = 0; i < game.moves.length; i++) {
      const move = game.moves[i];
      
      if (move.color === 'white') {
        if (i > 0) moveText += ' ';
        moveText += `${move.moveNumber}.${move.san}`;
      } else {
        moveText += ` ${move.san}`;
      }
    }

    pgn += moveText;
    
    if (game.result && game.result !== '*') {
      pgn += ` ${game.result}`;
    }

    return pgn.trim();
  }

  /**
   * Validate PGN format
   */
  static validate(pgnText: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const game = this.parse(pgnText);
      
      // Basic validation
      if (!game.moves || game.moves.length === 0) {
        errors.push('No moves found in PGN');
      }

      // Check for required headers (optional for basic parsing)
      const requiredHeaders = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];
      for (const header of requiredHeaders) {
        if (!game.headers[header]) {
          // Don't treat missing headers as errors for now
          // errors.push(`Missing required header: ${header}`);
        }
      }

    } catch (error) {
      errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a sample PGN for demo purposes
   */
  static createSample(): string {
    return `[Event "Italian Game Study"]
[Site "Chess Vision"]
[Date "2024.12.25"]
[Round "1"]
[White "Student"]
[Black "Engine"]
[Result "*"]

1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.Bb3 Ba7 9.h3 h6 10.Nbd2 Re8 *`;
  }
}