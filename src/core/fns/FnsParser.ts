// src/core/fns/FnsParser.ts
import { ChessGame } from "@core/chess/ChessGame";
import {
  TacticalProblem,
  TacticalCollection,
  ProblemDifficulty,
  TacticalTheme,
} from "@core/chess/types";

/**
 * Parser for Lucas Chess FNS format and tactical problems
 */
export class FnsParser {
  /**
   * Parse FNS file content into tactical problems
   * FNS format: FEN|description|solution|pgn (one per line)
   */
  static parseFnsFile(
    fnsContent: string,
    fileName: string = "Unknown",
  ): TacticalCollection {
    const problems: TacticalProblem[] = [];
    const lines = fnsContent.split("\n");

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (
        !trimmedLine ||
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith("//")
      ) {
        continue;
      }

      try {
        const problem = this.parseFnsLine(
          trimmedLine,
          `${fileName}_${lineNumber}`,
        );
        if (problem) {
          problems.push(problem);
        }
      } catch (error) {
        console.warn(`Failed to parse FNS line ${lineNumber}:`, error);
        // Continue parsing other lines
      }
    }

    return {
      name: fileName,
      description: `Tactical problems from ${fileName}`,
      problems,
      totalProblems: problems.length,
      themes: this.extractThemes(problems),
      source: fileName,
    };
  }

  /**
   * Parse a single FNS line: FEN|description|solution|pgn
   */
  private static parseFnsLine(
    line: string,
    id: string,
  ): TacticalProblem | null {
    const parts = line.split("|");

    if (parts.length < 3) {
      console.warn("Invalid FNS line format, expected at least 3 parts:", line);
      return null;
    }

    const fen = parts[0].trim();
    const description = parts[1].trim();
    const solutionText = parts[2].trim();
    const fullPgn = parts.length > 3 ? parts[3].trim() : undefined;

    // Validate FEN
    if (!this.isValidFen(fen)) {
      console.warn("Invalid FEN in line:", fen);
      return null;
    }

    // Parse solution moves
    const solution = this.parseSolutionMoves(solutionText);
    if (solution.length === 0) {
      console.warn("No valid solution moves found:", solutionText);
      return null;
    }

    // Extract theme and difficulty from description
    const { theme, difficulty } = this.analyzeDescription(description);

    return {
      id,
      fen,
      description,
      solution,
      fullPgn,
      theme,
      difficulty,
      source: id.split("_")[0],
    };
  }

  /**
   * Basic FEN validation
   */
  private static isValidFen(fen: string): boolean {
    if (!fen || typeof fen !== "string") return false;

    const parts = fen.split(" ");
    if (parts.length < 4) return false; // Need at least position, turn, castling, en passant

    const position = parts[0];
    const turn = parts[1];

    // Check if position has 8 ranks separated by /
    const ranks = position.split("/");
    if (ranks.length !== 8) return false;

    // Check turn
    if (turn !== "w" && turn !== "b") return false;

    return true;
  }

  /**
   * Parse solution moves from text
   * Examples: "1.Nf3 Nc6 2.e4" or "Nf3, e4, Bb5"
   */
  private static parseSolutionMoves(solutionText: string): string[] {
    const moves: string[] = [];

    // Clean the solution text
    let cleanText = solutionText
      .replace(/\d+\./g, " ") // Remove move numbers like "1."
      .replace(/[+#]/g, "") // Remove check/mate symbols for now
      .replace(/[()]/g, " ") // Remove parentheses
      .replace(/,/g, " ") // Replace commas with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    // Split by spaces and filter valid moves
    const tokens = cleanText.split(" ");

    for (const token of tokens) {
      const move = token.trim();
      if (move && this.isValidMoveNotation(move)) {
        moves.push(move);
      }
    }

    return moves;
  }

  /**
   * Basic validation for chess move notation
   */
  private static isValidMoveNotation(move: string): boolean {
    if (!move || move.length < 2) return false;

    // Basic patterns for chess moves
    const movePatterns = [
      /^[a-h][1-8]$/, // Pawn moves like "e4"
      /^[NBRQK][a-h][1-8]$/, // Piece moves like "Nf3"
      /^[NBRQK][a-h]?[1-8]?x?[a-h][1-8]$/, // Captures like "Nxf3" or "Bxe4"
      /^O-O(-O)?$/, // Castling
      /^[a-h]x[a-h][1-8]$/, // Pawn captures like "exd5"
      /^[a-h][1-8]=[NBRQ]$/, // Pawn promotion like "e8=Q"
    ];

    return movePatterns.some((pattern) => pattern.test(move));
  }

  /**
   * Analyze description to extract theme and difficulty
   */
  private static analyzeDescription(description: string): {
    theme?: TacticalTheme;
    difficulty?: ProblemDifficulty;
  } {
    const lowerDesc = description.toLowerCase();

    // Extract theme
    let theme: TacticalTheme | undefined;
    const themePatterns: Record<TacticalTheme, RegExp> = {
      mate: /(?:mate|#\d+|checkmate|matto)/i,
      pin: /(?:pin|inchiod)/i,
      fork: /(?:fork|forchett)/i,
      skewer: /(?:skewer|infilz)/i,
      discovery: /(?:discover|scopert)/i,
      deflection: /(?:deflect|deviazion)/i,
      decoy: /(?:decoy|attrazion)/i,
      sacrifice: /(?:sacrific|sacrifizio)/i,
      combination: /(?:combinat|combinazion)/i,
      endgame: /(?:endgame|finale)/i,
      opening: /(?:opening|apertur)/i,
      tactics: /(?:tactic|tattic)/i,
      middlegame: /(?:middlegame|mediogioco)/i,
      puzzle: /(?:puzzle|rompicapo)/i,
      study: /(?:study|studio)/i,
    };

    for (const [themeKey, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(lowerDesc)) {
        theme = themeKey as TacticalTheme;
        break;
      }
    }

    // Extract difficulty (mate in X gives difficulty)
    let difficulty: ProblemDifficulty | undefined;
    const mateMatch = lowerDesc.match(/#(\d+)|mate in (\d+)/i);
    if (mateMatch) {
      const mateIn = parseInt(mateMatch[1] || mateMatch[2]);
      if (mateIn >= 1 && mateIn <= 5) {
        difficulty = mateIn as ProblemDifficulty;
      }
    }

    return { theme, difficulty };
  }

  /**
   * Extract all unique themes from problems
   */
  private static extractThemes(problems: TacticalProblem[]): TacticalTheme[] {
    const themes = new Set<TacticalTheme>();

    for (const problem of problems) {
      if (problem.theme) {
        themes.add(problem.theme);
      }
    }

    return Array.from(themes).sort();
  }

  /**
   * Convert a tactical problem to displayable format
   */
  static problemToDisplayString(problem: TacticalProblem): string {
    const parts = [
      `ID: ${problem.id}`,
      `Theme: ${problem.theme || "Unknown"}`,
      problem.difficulty ? `Difficulty: ${problem.difficulty}` : "",
      `Description: ${problem.description}`,
      `Solution: ${problem.solution.join(" ")}`,
    ].filter(Boolean);

    return parts.join("\n");
  }

  /**
   * Create a sample FNS file for demo purposes
   */
  static createSampleFns(): string {
    const problems = [
      // Mate in 1 problems
      'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1|Scholar\'s Mate Pattern - Mate in 1|Qxf7#|[Event "Basic Mate in 1"][White "Student"][Black "Computer"][Result "1-0"][FEN "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1"] 1. Qxf7#',

      // Back rank mate
      '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1|Back Rank Mate - Mate in 1|Ra8#|[Event "Back Rank Mate"][White "Student"][Black "Computer"][Result "1-0"][FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"] 1. Ra8#',

      // Smothered mate setup
      '6k1/5p1p/6p1/8/8/8/5P1P/5RK1 w - - 0 1|Smothered Mate Pattern - Mate in 1|Rf8#|[Event "Smothered Mate"][White "Student"][Black "Computer"][Result "1-0"][FEN "6k1/5p1p/6p1/8/8/8/5P1P/5RK1 w - - 0 1"] 1. Rf8#',

      // Queen and King mate
      '7k/8/6K1/8/8/8/8/7Q w - - 0 1|Queen and King Endgame - Mate in 2|Qh7#|[Event "Queen King Mate"][White "Student"][Black "Computer"][Result "1-0"][FEN "7k/8/6K1/8/8/8/8/7Q w - - 0 1"] 1. Qh7#',

      // Discovered attack
      'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP1NPPP/R1BQK2R w KQ - 0 1|Discovered Attack - Win Material|Bxf7+|[Event "Discovered Attack"][White "Student"][Black "Computer"][Result "1-0"][FEN "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP1NPPP/R1BQK2R w KQ - 0 1"] 1. Bxf7+',
    ];

    return problems.join("\n");
  }

  /**
   * Validate a game position against a problem's FEN
   */
  static validatePosition(game: ChessGame, problem: TacticalProblem): boolean {
    const currentFen = game.getFen();
    const problemFen = problem.fen;

    // Compare the essential parts (ignore halfmove and fullmove counters)
    const currentParts = currentFen.split(" ").slice(0, 4).join(" ");
    const problemParts = problemFen.split(" ").slice(0, 4).join(" ");

    return currentParts === problemParts;
  }

  /**
   * Check if a user's move matches the solution
   */
  static validateSolutionMove(
    userMove: string,
    problem: TacticalProblem,
    moveIndex: number = 0,
  ): boolean {
    if (moveIndex >= problem.solution.length) {
      return false;
    }

    const expectedMove = problem.solution[moveIndex];

    // Normalize both moves for comparison
    const normalizedUser = this.normalizeMove(userMove);
    const normalizedExpected = this.normalizeMove(expectedMove);

    return normalizedUser === normalizedExpected;
  }

  /**
   * Normalize move notation for comparison
   */
  private static normalizeMove(move: string): string {
    return move
      .replace(/[+#]/g, "") // Remove check/mate symbols
      .replace(/\s+/g, "") // Remove spaces
      .trim()
      .toLowerCase();
  }

  /**
   * Get hint for current move in solution
   */
  static getHint(
    problem: TacticalProblem,
    moveIndex: number = 0,
  ): string | null {
    if (moveIndex >= problem.solution.length) {
      return null;
    }

    const move = problem.solution[moveIndex];
    const piece = this.identifyPiece(move);

    return `Try moving your ${piece}`;
  }

  /**
   * Identify piece from move notation
   */
  private static identifyPiece(move: string): string {
    if (move.startsWith("O")) return "king (castling)";
    if (move.match(/^[a-h]/)) return "pawn";

    const pieceMap: { [key: string]: string } = {
      N: "knight",
      B: "bishop",
      R: "rook",
      Q: "queen",
      K: "king",
    };

    return pieceMap[move[0]] || "piece";
  }
}
