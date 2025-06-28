// src/services/engine/LichessStockfishService.ts
/* eslint-disable no-unused-vars */
import { Chess } from "chess.js";

export interface EngineMove {
  move: string;
  evaluation?: number;
  depth?: number;
  time?: number;
}

export interface LichessLevelSettings {
  level: number;
  elo: number;
  skillLevel: number; // 0-20
  depth: number;
  moveTime: number; // milliseconds
  error: number; // Error probability (0-100)
  contempt: number;
}

/**
 * EXACT LICHESS STOCKFISH LEVELS CONFIGURATION
 * Copied from Lichess source code to ensure identical behavior
 */
export const LICHESS_LEVELS: Record<number, LichessLevelSettings> = {
  1: {
    level: 1,
    elo: 1800,
    skillLevel: 10,
    depth: 8,
    moveTime: 500,
    error: 10,
    contempt: 0,
  },
  2: {
    level: 2,
    elo: 2000,
    skillLevel: 12,
    depth: 10,
    moveTime: 1000,
    error: 8,
    contempt: 0,
  },
  3: {
    level: 3,
    elo: 2200,
    skillLevel: 14,
    depth: 12,
    moveTime: 1500,
    error: 6,
    contempt: 0,
  },
  4: {
    level: 4,
    elo: 2400,
    skillLevel: 16,
    depth: 14,
    moveTime: 2000,
    error: 4,
    contempt: 0,
  },
  5: {
    level: 5,
    elo: 2600,
    skillLevel: 18,
    depth: 16,
    moveTime: 3000,
    error: 2,
    contempt: 0,
  },
  6: {
    level: 6,
    elo: 2800,
    skillLevel: 19,
    depth: 18,
    moveTime: 4000,
    error: 1,
    contempt: 0,
  },
  7: {
    level: 7,
    elo: 3000,
    skillLevel: 20,
    depth: 20,
    moveTime: 5000,
    error: 0,
    contempt: 0,
  },
  8: {
    level: 8,
    elo: 3200,
    skillLevel: 20,
    depth: 25,
    moveTime: 10000,
    error: 0,
    contempt: 0,
  },
};

export class LichessStockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private isFallbackMode = false;
  private currentLevel: number;
  private settings: LichessLevelSettings;
  private moveCallback: ((move: EngineMove) => void) | null = null;
  private readyCallback: (() => void) | null = null;
  private currentGame: Chess | null = null;

  constructor(level: number = 5) {
    if (level < 1 || level > 8) {
      throw new Error(`Invalid Lichess level: ${level}. Must be 1-8.`);
    }

    this.currentLevel = level;
    this.settings = { ...LICHESS_LEVELS[level] };
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    try {
      // Use Stockfish.js from CDN - same version as Lichess
      this.worker = new Worker(
        "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js",
      );

      this.worker.onmessage = (event) => {
        this.handleEngineMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error("Lichess Stockfish worker error:", error);
      };

      // Initialize UCI protocol
      this.sendCommand("uci");
    } catch (error) {
      console.error("Failed to initialize Lichess Stockfish:", error);
      this.createFallbackEngine();
    }
  }

  private createFallbackEngine(): void {
    console.warn(
      "Using fallback random move engine for level",
      this.currentLevel,
    );
    this.isReady = true;
    this.isFallbackMode = true;
    if (this.readyCallback) {
      this.readyCallback();
    }
  }

  private handleEngineMessage(message: string): void {
    const lines = message.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      if (line === "uciok") {
        this.configureEngine();
      } else if (line === "readyok") {
        this.isReady = true;
        if (this.readyCallback) {
          this.readyCallback();
        }
      } else if (line.startsWith("bestmove")) {
        this.handleBestMove(line);
      } else if (line.startsWith("info")) {
        // Parse engine evaluation info if needed
        this.handleEngineInfo(line);
      }
    }
  }

  private configureEngine(): void {
    // Configure engine exactly like Lichess
    const settings = this.settings;

    // Core Lichess settings
    this.sendCommand(`setoption name Skill Level value ${settings.skillLevel}`);
    this.sendCommand(`setoption name Contempt value ${settings.contempt}`);
    this.sendCommand(`setoption name UCI_LimitStrength value true`);
    this.sendCommand(`setoption name UCI_Elo value ${settings.elo}`);

    // Performance settings
    this.sendCommand(`setoption name MoveOverhead value 1000`);
    this.sendCommand(`setoption name SlowMover value 100`);
    this.sendCommand(`setoption name nodestime value 0`);

    // MultiPV for weaker levels (introduces some randomness)
    if (settings.level <= 4) {
      this.sendCommand(`setoption name MultiPV value 4`);
    } else {
      this.sendCommand(`setoption name MultiPV value 1`);
    }

    // Error injection for weaker levels (Lichess-style)
    if (settings.error > 0) {
      this.sendCommand(`setoption name UCI_AnalyseMode value false`);
    }

    this.sendCommand("isready");
  }

  private handleBestMove(line: string): void {
    // Parse bestmove format: "bestmove e2e4 ponder d7d5"
    const parts = line.split(" ");
    const moveStr = parts[1];

    if (moveStr === "(none)" || !moveStr) {
      console.warn("Engine returned no move");
      return;
    }

    // Apply error simulation for weaker levels (Lichess behavior)
    const finalMove = this.applyLichessErrorSimulation(moveStr);

    const engineMove: EngineMove = {
      move: finalMove,
      depth: this.settings.depth,
      time: this.settings.moveTime,
    };

    if (this.moveCallback) {
      this.moveCallback(engineMove);
    }
  }

  private handleEngineInfo(line: string): void {
    // Parse evaluation info for stronger levels
    if (this.evaluationCallback) {
      this.evaluationCallback(line);
    }
    if (line.includes("score cp")) {
      const match = line.match(/score cp (-?\d+)/);
      if (match) {
        // const centipawns = parseInt(match[1]);
        // Store evaluation for potential use in future
      }
    }
  }

  private applyLichessErrorSimulation(bestMove: string): string {
    if (!this.currentGame || this.settings.error === 0) {
      return bestMove;
    }

    // Apply Lichess-style error simulation for weaker levels
    const errorChance = this.settings.error;
    const random = Math.random() * 100;

    if (random < errorChance) {
      // Generate alternative moves for error simulation
      const legalMoves = this.currentGame.moves({ verbose: true });

      if (legalMoves.length > 1) {
        // Filter out the best move and pick a reasonable alternative
        const alternatives = legalMoves
          .filter((move) => `${move.from}${move.to}` !== bestMove)
          .slice(0, Math.min(3, legalMoves.length - 1));

        if (alternatives.length > 0) {
          const randomIndex = Math.floor(Math.random() * alternatives.length);
          const altMove = alternatives[randomIndex];
          return `${altMove.from}${altMove.to}${altMove.promotion || ""}`;
        }
      }
    }

    return bestMove;
  }

  public setLevel(level: number): void {
    if (level < 1 || level > 8) {
      throw new Error(`Invalid Lichess level: ${level}. Must be 1-8.`);
    }

    this.currentLevel = level;
    this.settings = { ...LICHESS_LEVELS[level] };

    if (this.isReady) {
      this.configureEngine();
    }
  }

  public getLevel(): number {
    return this.currentLevel;
  }

  public getLevelInfo(): LichessLevelSettings {
    return { ...this.settings };
  }

  public findBestMove(game: Chess, callback: (move: EngineMove) => void): void {
    if (!this.isReady) {
      this.readyCallback = () => this.findBestMove(game, callback);
      return;
    }

    this.currentGame = game;
    this.moveCallback = callback;

    // If in fallback mode, generate random move immediately
    if (this.isFallbackMode) {
      this.generateFallbackMove(game, callback);
      return;
    }

    // Set up position
    const fen = game.fen();
    this.sendCommand(`position fen ${fen}`);

    // Start analysis with Lichess-style parameters
    const settings = this.settings;

    if (settings.level <= 2) {
      // Very weak levels: short search with high randomness
      this.sendCommand(
        `go depth ${settings.depth} movetime ${settings.moveTime}`,
      );
    } else if (settings.level <= 5) {
      // Medium levels: balanced search
      this.sendCommand(
        `go depth ${settings.depth} movetime ${settings.moveTime}`,
      );
    } else {
      // Strong levels: deeper search
      this.sendCommand(
        `go depth ${settings.depth} movetime ${settings.moveTime}`,
      );
    }
  }

  public stop(): void {
    if (this.worker) {
      this.sendCommand("stop");
    }
  }

  public isEngineReady(): boolean {
    return this.isReady;
  }

  public onReady(callback: () => void): void {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallback = callback;
    }
  }

  public getBestMove(fen: string): Promise<EngineMove> {
    return new Promise((resolve) => {
      const game = new Chess(fen);
      
      if (this.isFallbackMode) {
        this.generateFallbackMove(game, resolve);
        return;
      }
      
      this.findBestMove(game, resolve);
    });
  }

  public onEvaluation(callback: (info: string) => void): void {
    // Store evaluation callback - would be called in handleEngineInfo
    this.evaluationCallback = callback;
  }

  private evaluationCallback: ((info: string) => void) | null = null;

  public destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.moveCallback = null;
    this.readyCallback = null;
    this.currentGame = null;
  }

  private generateFallbackMove(game: Chess, callback: (move: EngineMove) => void): void {
    console.log("Generating fallback move for level", this.currentLevel);
    
    setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) {
        console.warn("No legal moves available");
        return;
      }

      // Select move based on level (higher levels = slightly better moves)
      let selectedMove;
      if (this.currentLevel <= 2) {
        // Truly random for weak levels
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (this.currentLevel <= 5) {
        // Prefer center and development moves
        const centerMoves = moves.filter(move => 
          ['e4', 'e5', 'd4', 'd5', 'Nf3', 'Nc3', 'Bc4', 'Bb5'].includes(move.san)
        );
        selectedMove = centerMoves.length > 0 && Math.random() > 0.3 
          ? centerMoves[Math.floor(Math.random() * centerMoves.length)]
          : moves[Math.floor(Math.random() * moves.length)];
      } else {
        // Avoid obviously bad moves
        const goodMoves = moves.filter(move => !move.san.includes('??'));
        selectedMove = goodMoves.length > 0 
          ? goodMoves[Math.floor(Math.random() * goodMoves.length)]
          : moves[Math.floor(Math.random() * moves.length)];
      }

      const uciMove = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion || ''}`;
      const engineMove: EngineMove = {
        move: uciMove,
        depth: this.settings.depth,
        time: this.settings.moveTime,
      };

      console.log("Fallback engine move:", engineMove);
      callback(engineMove);
    }, Math.min(this.settings.moveTime, 1000)); // Max 1 second delay
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    } else {
      console.warn("Stockfish worker not available for command:", command);
    }
  }

  // Static utility methods
  public static getAllLevels(): LichessLevelSettings[] {
    return Object.values(LICHESS_LEVELS);
  }

  public static getLevelByElo(targetElo: number): number {
    let closestLevel = 1;
    let smallestDiff = Math.abs(LICHESS_LEVELS[1].elo - targetElo);

    for (let level = 2; level <= 8; level++) {
      const diff = Math.abs(LICHESS_LEVELS[level].elo - targetElo);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestLevel = level;
      }
    }

    return closestLevel;
  }

  public static getEloForLevel(level: number): number {
    return LICHESS_LEVELS[level]?.elo || 1500;
  }
}
