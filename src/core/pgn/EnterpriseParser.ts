// src/core/pgn/EnterpriseParser.ts
/**
 * Enterprise-grade PGN parser using professional libraries
 * Replaces regex-based approach with robust state machine parser
 */

import { parse as pgnParse, ParseTree } from '@mliebelt/pgn-parser';
import { PgnGame, PgnMove, PgnHeader } from '../chess/types';
import { sanitizePGN } from '../../utils/security';

export interface PgnCollection {
  studies: PgnGame[];
  totalStudies: number;
  errors: ParseError[];
}

export interface ParseError {
  studyIndex: number;
  error: string;
  line?: number;
}

/**
 * Enterprise PGN Parser with complete support for:
 * - Complex variations and sub-variations
 * - Multi-line comments with special characters
 * - NAGs (Numeric Annotation Glyphs)
 * - Complex tournament headers
 * - Error recovery and detailed diagnostics
 */
export class EnterpriseParser {
  
  /**
   * Parse multiple PGN games with full error handling
   * @param pgnText - Raw PGN text (potentially unsafe)
   * @returns Parsed collection with detailed error reporting
   */
  static parseMultiple(pgnText: string): PgnCollection {
    const studies: PgnGame[] = [];
    const errors: ParseError[] = [];
    
    try {
      // Security: Sanitize input first
      const sanitizedPgn = sanitizePGN(pgnText);
      
      // Split into individual games using proper PGN delimiters
      const games = this.splitPgnGames(sanitizedPgn);
      
      games.forEach((gameText, index) => {
        try {
          const study = this.parseRobust(gameText, index);
          if (study) {
            studies.push(study);
          }
        } catch (error) {
          errors.push({
            studyIndex: index,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            line: this.extractErrorLine(error)
          });
        }
      });
      
    } catch (error) {
      errors.push({
        studyIndex: -1,
        error: `Global parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    return {
      studies,
      totalStudies: studies.length,
      errors
    };
  }
  
  /**
   * Robust single game parser with professional library
   */
  private static parseRobust(pgnText: string, index: number): PgnGame | null {
    try {
      // Use professional PGN parser
      const parseTree: ParseTree[] = pgnParse(pgnText, { startRule: 'games' });
      
      if (!parseTree || parseTree.length === 0) {
        throw new Error(`No valid games found in study ${index + 1}`);
      }
      
      // Take first game from parse tree
      const game = parseTree[0];
      
      return this.convertToStandardFormat(game);
      
    } catch (error) {
      // Log detailed error for debugging
      console.error(`Parse error in study ${index + 1}:`, {
        error: error instanceof Error ? error.message : error,
        pgnSnippet: pgnText.substring(0, 200) + '...'
      });
      
      // Try fallback parser for partially corrupt PGN
      return this.fallbackParser(pgnText);
    }
  }
  
  /**
   * Convert professional parser output to our standard format
   */
  private static convertToStandardFormat(parseTree: any): PgnGame {
    const headers: PgnHeader = {};
    const moves: PgnMove[] = [];
    
    // Extract headers
    if (parseTree.tags) {
      parseTree.tags.forEach((tag: any) => {
        headers[tag.name] = tag.value;
      });
    }
    
    // Extract moves with full variation support
    if (parseTree.moves) {
      this.extractMovesRecursive(parseTree.moves, moves);
    }
    
    return {
      headers,
      moves,
      result: headers.Result || parseTree.result || '*',
      variations: this.extractVariations(parseTree.moves),
      metadata: {
        parsedAt: new Date().toISOString(),
        complexity: this.calculateComplexity(parseTree),
        hasVariations: this.hasVariations(parseTree.moves),
        totalMoves: moves.length
      }
    };
  }
  
  /**
   * Extract moves recursively including variations
   */
  private static extractMovesRecursive(moves: any[], output: PgnMove[], moveNumber = 1): void {
    let currentMoveNumber = moveNumber;
    
    for (const move of moves) {
      if (move.move) {
        // Main line move
        const pgnMove: PgnMove = {
          moveNumber: Math.ceil(currentMoveNumber / 2),
          san: move.move.notation.notation,
          color: currentMoveNumber % 2 === 1 ? 'white' : 'black',
          comment: move.commentAfter,
          nag: move.nag,
          fen: move.move.fen,
          timestamp: performance.now()
        };
        
        output.push(pgnMove);
        currentMoveNumber++;
      }
      
      // Handle variations
      if (move.variations && move.variations.length > 0) {
        move.variations.forEach((variation: any, index: number) => {
          const variationMoves: PgnMove[] = [];
          this.extractMovesRecursive(variation.moves, variationMoves, currentMoveNumber);
          
          // Mark as variation in metadata
          variationMoves.forEach(vm => {
            vm.variation = {
              index,
              depth: this.calculateVariationDepth(move),
              parentMove: output.length > 0 ? output[output.length - 1].san : undefined
            };
          });
          
          output.push(...variationMoves);
        });
      }
    }
  }
  
  /**
   * Extract variations as separate structure
   */
  private static extractVariations(moves: any[]): any[] {
    const variations: any[] = [];
    
    const extractRecursive = (moveList: any[], parentPath: number[] = []) => {
      moveList.forEach((move, index) => {
        if (move.variations) {
          move.variations.forEach((variation: any, varIndex: number) => {
            const currentPath = [...parentPath, index, varIndex];
            variations.push({
              path: currentPath,
              moves: variation.moves,
              comment: variation.comment,
              depth: currentPath.length
            });
            
            // Recursively extract nested variations
            extractRecursive(variation.moves, currentPath);
          });
        }
      });
    };
    
    extractRecursive(moves);
    return variations;
  }
  
  /**
   * Calculate game complexity for analytics
   */
  private static calculateComplexity(parseTree: any): number {
    let complexity = 0;
    
    // Base complexity from move count
    complexity += (parseTree.moves?.length || 0) * 0.1;
    
    // Variation complexity
    const variationCount = this.countVariations(parseTree.moves);
    complexity += variationCount * 2;
    
    // Comment complexity
    const commentCount = this.countComments(parseTree.moves);
    complexity += commentCount * 0.5;
    
    // NAG complexity
    const nagCount = this.countNAGs(parseTree.moves);
    complexity += nagCount * 0.3;
    
    return Math.round(complexity * 10) / 10;
  }
  
  /**
   * Fallback parser for malformed PGN
   */
  private static fallbackParser(pgnText: string): PgnGame | null {
    console.warn('Using fallback parser for malformed PGN');
    
    // Extract basic headers with regex as last resort
    const headers: PgnHeader = {};
    const headerMatches = pgnText.match(/\[(\w+)\s+"([^"]*)"\]/g);
    
    if (headerMatches) {
      headerMatches.forEach(match => {
        const parsed = match.match(/\[(\w+)\s+"([^"]*)"\]/);
        if (parsed) {
          headers[parsed[1]] = parsed[2];
        }
      });
    }
    
    // Extract basic moves (very simple, for emergency only)
    const moveText = pgnText.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '');
    const moves: PgnMove[] = [];
    const movePattern = /\d+\.\s*([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?)/g;
    
    let match;
    let moveNumber = 1;
    let isWhite = true;
    
    while ((match = movePattern.exec(moveText)) !== null) {
      moves.push({
        moveNumber: Math.ceil(moveNumber / 2),
        san: match[1],
        color: isWhite ? 'white' : 'black',
        fallback: true
      });
      
      if (!isWhite) moveNumber++;
      isWhite = !isWhite;
    }
    
    return moves.length > 0 ? {
      headers,
      moves,
      result: headers.Result || '*',
      fallback: true
    } : null;
  }
  
  /**
   * Split PGN text into individual games properly
   */
  private static splitPgnGames(pgnText: string): string[] {
    // Use professional approach: look for [Event headers that start new games
    const games: string[] = [];
    const lines = pgnText.split('\n');
    
    let currentGame = '';
    let gameStarted = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // New game detected
      if (line.startsWith('[Event ') && gameStarted && currentGame.trim()) {
        games.push(currentGame.trim());
        currentGame = line + '\n';
      } else {
        currentGame += lines[i] + '\n';
        if (line.startsWith('[')) {
          gameStarted = true;
        }
      }
    }
    
    // Add last game
    if (currentGame.trim()) {
      games.push(currentGame.trim());
    }
    
    return games.filter(game => game.trim().length > 0);
  }
  
  // Helper methods for complexity calculation
  private static countVariations(moves: any[]): number {
    if (!moves) return 0;
    
    let count = 0;
    moves.forEach(move => {
      if (move.variations) {
        count += move.variations.length;
        move.variations.forEach((v: any) => {
          count += this.countVariations(v.moves);
        });
      }
    });
    return count;
  }
  
  private static countComments(moves: any[]): number {
    if (!moves) return 0;
    
    let count = 0;
    moves.forEach(move => {
      if (move.commentBefore) count++;
      if (move.commentAfter) count++;
      if (move.variations) {
        move.variations.forEach((v: any) => {
          count += this.countComments(v.moves);
        });
      }
    });
    return count;
  }
  
  private static countNAGs(moves: any[]): number {
    if (!moves) return 0;
    
    let count = 0;
    moves.forEach(move => {
      if (move.nag && move.nag.length > 0) {
        count += move.nag.length;
      }
      if (move.variations) {
        move.variations.forEach((v: any) => {
          count += this.countNAGs(v.moves);
        });
      }
    });
    return count;
  }
  
  private static hasVariations(moves: any[]): boolean {
    if (!moves) return false;
    
    return moves.some(move => 
      (move.variations && move.variations.length > 0) ||
      (move.variations && move.variations.some((v: any) => this.hasVariations(v.moves)))
    );
  }
  
  private static calculateVariationDepth(move: any): number {
    // Calculate how deep this variation is nested
    let depth = 1;
    let current = move.parent;
    
    while (current) {
      depth++;
      current = current.parent;
    }
    
    return depth;
  }
  
  private static extractErrorLine(error: any): number | undefined {
    // Try to extract line number from error message
    if (error && error.message) {
      const lineMatch = error.message.match(/line (\d+)/i);
      if (lineMatch) {
        return parseInt(lineMatch[1]);
      }
    }
    return undefined;
  }
  
  /**
   * Validate PGN with comprehensive error reporting
   */
  static validate(pgnText: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    studyCount: number;
    complexity: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let studyCount = 0;
    let totalComplexity = 0;
    
    try {
      const collection = this.parseMultiple(pgnText);
      studyCount = collection.totalStudies;
      
      // Aggregate errors
      collection.errors.forEach(error => {
        errors.push(`Study ${error.studyIndex + 1}: ${error.error}`);
      });
      
      // Calculate total complexity
      collection.studies.forEach(study => {
        if (study.metadata?.complexity) {
          totalComplexity += study.metadata.complexity;
        }
      });
      
      // Generate warnings
      if (studyCount === 0) {
        errors.push('No valid studies found in PGN');
      }
      
      if (collection.studies.some(s => s.fallback)) {
        warnings.push('Some studies parsed with fallback parser - quality may be reduced');
      }
      
      if (totalComplexity > 50) {
        warnings.push('High complexity detected - may impact performance');
      }
      
    } catch (error) {
      errors.push(`Critical parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      studyCount,
      complexity: Math.round(totalComplexity * 10) / 10
    };
  }
}

// Extend the types to support new features
declare module '../chess/types' {
  interface PgnMove {
    nag?: string[];
    fen?: string;
    timestamp?: number;
    variation?: {
      index: number;
      depth: number;
      parentMove?: string;
    };
    fallback?: boolean;
  }
  
  interface PgnGame {
    variations?: any[];
    metadata?: {
      parsedAt: string;
      complexity: number;
      hasVariations: boolean;
      totalMoves: number;
    };
    fallback?: boolean;
  }
}