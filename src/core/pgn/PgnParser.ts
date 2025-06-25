// src/core/pgn/PgnParser.ts
import { PgnGame, PgnMove, PgnHeader } from '../chess/types';

// Multi-study collection type
export interface PgnCollection {
  studies: PgnGame[];
  totalStudies: number;
}

export class PgnParser {
  /**
   * Parse a PGN string that may contain multiple games/studies
   */
  static parseMultiple(pgnText: string): PgnCollection {
    const studies: PgnGame[] = [];
    
    // Split PGN text into individual games
    // Look for header sections starting with [Event or similar
    const gameTexts = this.splitMultiplePgn(pgnText);
    
    for (const gameText of gameTexts) {
      if (gameText.trim()) {
        try {
          const study = this.parse(gameText);
          studies.push(study);
        } catch (error) {
          console.warn('Failed to parse PGN study:', error);
          // Continue parsing other studies even if one fails
        }
      }
    }
    
    return {
      studies,
      totalStudies: studies.length
    };
  }
  
  /**
   * Split PGN text containing multiple games
   */
  private static splitMultiplePgn(pgnText: string): string[] {
    const games: string[] = [];
    const lines = pgnText.split('\n');
    
    let currentGame = '';
    let inGame = false;
    let foundFirstHeader = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this is a header line
      if (trimmedLine.startsWith('[') && trimmedLine.includes('"')) {
        // This is a header line
        
        // If this is an Event header and we already have a game, save the previous one
        if (trimmedLine.startsWith('[Event') && foundFirstHeader && inGame && currentGame.trim()) {
          games.push(currentGame.trim());
          currentGame = '';
        }
        
        // Add this header to current game
        currentGame += line + '\n';
        inGame = true;
        
        // Mark that we found at least one header
        if (trimmedLine.startsWith('[Event')) {
          foundFirstHeader = true;
        }
      } else if (inGame) {
        // This is either moves, comments, or empty lines - add to current game
        currentGame += line + '\n';
      }
    }
    
    // Don't forget the last game
    if (inGame && currentGame.trim()) {
      games.push(currentGame.trim());
    }
    
    // If no explicit games found, treat entire text as single game
    if (games.length === 0 && pgnText.trim()) {
      games.push(pgnText.trim());
    }
    
    return games;
  }

  /**
   * Parse a single PGN string into a structured game object
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
    
    // Extract comments first and preserve them
    const commentPattern = /\{([^}]*)\}/g;
    const comments: { index: number; text: string }[] = [];
    let commentMatch;
    
    while ((commentMatch = commentPattern.exec(movesText)) !== null) {
      comments.push({
        index: commentMatch.index,
        text: commentMatch[1].trim()
      });
    }
    
    // Remove comments and variations for move parsing
    let cleanText = movesText
      .replace(/\{[^}]*\}/g, ' ') // Replace comments with spaces
      .replace(/\([^)]*\)/g, ' ') // Remove variations
      .replace(/[012\/\-½\*]+\s*$/, '') // Remove result
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Split by move numbers and extract moves
    const movePattern = /(\d+)\.\s*([^\s]+)(?:\s+([^\s]+))?/g;
    let match;
    let moveIndex = 0;

    while ((match = movePattern.exec(cleanText)) !== null) {
      const moveNumber = parseInt(match[1]);
      const whiteMove = match[2];
      const blackMove = match[3];

      if (whiteMove && whiteMove !== '...' && !whiteMove.match(/[012\/\-½\*]/)) {
        // Find comment for this move
        const comment = this.findCommentForMove(movesText, moveIndex, comments);
        moves.push({
          moveNumber,
          san: whiteMove,
          color: 'white',
          comment
        });
        moveIndex++;
      }

      if (blackMove && !blackMove.match(/[012\/\-½\*]/)) {
        // Find comment for this move
        const comment = this.findCommentForMove(movesText, moveIndex, comments);
        moves.push({
          moveNumber,
          san: blackMove,
          color: 'black',
          comment
        });
        moveIndex++;
      }
    }

    return moves;
  }

  /**
   * Find comment associated with a move
   */
  private static findCommentForMove(
    _originalText: string, 
    moveIndex: number, 
    comments: { index: number; text: string }[]
  ): string | undefined {
    // This is a simplified approach - in real PGN parsing this would be more complex
    // For now, we'll associate comments with moves based on their position in the text
    if (comments.length > moveIndex) {
      return comments[moveIndex]?.text;
    }
    return undefined;
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
   * Validate PGN format (single or multiple games)
   */
  static validate(pgnText: string): { valid: boolean; errors: string[]; studyCount: number } {
    const errors: string[] = [];
    let studyCount = 0;
    
    try {
      const collection = this.parseMultiple(pgnText);
      studyCount = collection.totalStudies;
      
      if (studyCount === 0) {
        errors.push('No valid studies found in PGN file');
      }
      
      // Validate each study
      collection.studies.forEach((study, index) => {
        if (!study.moves || study.moves.length === 0) {
          errors.push(`Study ${index + 1}: No moves found`);
        }
      });

    } catch (error) {
      errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      studyCount
    };
  }

  /**
   * Create a sample multi-study PGN for demo purposes
   */
  static createSample(): string {
    return `[Event "Italian Game Study 1"]
[Site "Chess Vision"]
[Date "2024.12.25"]
[Round "1"]
[White "Student"]
[Black "Engine"]
[Result "*"]

1.e4 {Apertura del re, controllo del centro} e5 2.Nf3 {Sviluppo naturale} Nc6 3.Bc4 {Punta al punto debole f7} Bc5 4.c3 {Prepara d4} Nf6 5.d3 {Supporta il centro} d6 6.O-O {Mette al sicuro il re} O-O 7.Re1 {Pressione su e5} a6 8.Bb3 {Mantiene l'alfiere attivo} Ba7 *

[Event "Sicilian Defense Study"]
[Site "Chess Vision"]
[Date "2024.12.25"]
[Round "2"]
[White "Student"]
[Black "Engine"]
[Result "*"]

1.e4 {Controllo del centro} c5 {Difesa Siciliana} 2.Nf3 {Sviluppo normale} d6 3.d4 {Attacco al centro} cxd4 4.Nxd4 {Riprende con sviluppo} Nf6 5.Nc3 {Protezione di e4} a6 6.Be3 {Sviluppo dell'alfiere} e6 7.f3 {Supporta il centro} Be7 *

[Event "French Defense Study"]
[Site "Chess Vision"]
[Date "2024.12.25"]
[Round "3"]
[White "Student"]
[Black "Engine"]
[Result "*"]

1.e4 {Apertura del re} e6 {Difesa Francese} 2.d4 {Controllo del centro} d5 3.Nc3 {Variante Winawer} Bb4 {Inchioda il cavallo} 4.e5 {Conquista spazio} c5 5.a3 {Attacca l'alfiere} Bxc3+ 6.bxc3 {Mantiene il centro} Ne7 *`;
  }
  
  /**
   * Get study title from headers
   */
  static getStudyTitle(study: PgnGame, index?: number): string {
    const event = study.headers.Event || 'Unnamed Study';
    const round = study.headers.Round;
    const prefix = index !== undefined ? `${index + 1}. ` : '';
    
    if (round && round !== '1') {
      return `${prefix}${event} (Round ${round})`;
    }
    return `${prefix}${event}`;
  }
  
  /**
   * Get study description from headers
   */
  static getStudyDescription(study: PgnGame): string {
    const parts: string[] = [];
    
    if (study.headers.White && study.headers.Black) {
      parts.push(`${study.headers.White} vs ${study.headers.Black}`);
    }
    
    if (study.headers.Date && study.headers.Date !== '????.??.??') {
      parts.push(study.headers.Date);
    }
    
    if (study.headers.Site && study.headers.Site !== '?') {
      parts.push(study.headers.Site);
    }
    
    return parts.join(' • ');
  }
  
  /**
   * Convert multiple games back to PGN string
   */
  static stringifyCollection(collection: PgnCollection): string {
    return collection.studies.map(study => this.stringify(study)).join('\n\n');
  }
}