// src/services/engine/StockfishAdvanced.ts
/**
 * ADVANCED STOCKFISH ENGINE WITH PROFESSIONAL ELO RATINGS
 * Provides precise ELO-calibrated opponents from 1200 to 3000
 */

import { Chess } from "chess.js";

export interface EngineMove {
  move: string;
  evaluation?: number;
  depth?: number;
  time?: number;
  elo?: number;
  confidence?: number;
}

export interface AdvancedEngineSettings {
  elo: number; // Target ELO rating
  skillLevel: number; // 0-20
  depth: number; // Search depth
  moveTime: number; // Time per move in ms
  multiPv: number; // Number of variations
  contempt: number; // Contempt factor
  threads: number; // CPU threads
  hash: number; // Hash table size MB
  ponder: boolean; // Think on opponent's time
  syzygyPath?: string; // Tablebase path
  // Advanced parameters for ELO simulation
  errorRate: number; // Chance of suboptimal move
  blunderChance: number; // Chance of blunder
  timeManagement: number; // Time management skill
  opening: number; // Opening knowledge
  endgame: number; // Endgame knowledge
  tactical: number; // Tactical vision
  positional: number; // Positional understanding
}

// Professional ELO-calibrated presets with realistic playing characteristics
export const ELO_PRESETS: Record<number, AdvancedEngineSettings> = {
  1200: {
    elo: 1200,
    skillLevel: 0,
    depth: 6,
    moveTime: 500,
    multiPv: 1,
    contempt: -50,
    threads: 1,
    hash: 16,
    ponder: false,
    errorRate: 0.25,
    blunderChance: 0.15,
    timeManagement: 0.3,
    opening: 0.2,
    endgame: 0.2,
    tactical: 0.3,
    positional: 0.2,
  },
  1300: {
    elo: 1300,
    skillLevel: 1,
    depth: 7,
    moveTime: 600,
    multiPv: 1,
    contempt: -40,
    threads: 1,
    hash: 16,
    ponder: false,
    errorRate: 0.22,
    blunderChance: 0.12,
    timeManagement: 0.35,
    opening: 0.25,
    endgame: 0.25,
    tactical: 0.35,
    positional: 0.25,
  },
  1400: {
    elo: 1400,
    skillLevel: 2,
    depth: 8,
    moveTime: 700,
    multiPv: 1,
    contempt: -30,
    threads: 1,
    hash: 32,
    ponder: false,
    errorRate: 0.20,
    blunderChance: 0.10,
    timeManagement: 0.4,
    opening: 0.3,
    endgame: 0.3,
    tactical: 0.4,
    positional: 0.3,
  },
  1500: {
    elo: 1500,
    skillLevel: 3,
    depth: 9,
    moveTime: 800,
    multiPv: 1,
    contempt: -20,
    threads: 1,
    hash: 32,
    ponder: false,
    errorRate: 0.18,
    blunderChance: 0.08,
    timeManagement: 0.45,
    opening: 0.35,
    endgame: 0.35,
    tactical: 0.45,
    positional: 0.35,
  },
  1600: {
    elo: 1600,
    skillLevel: 5,
    depth: 10,
    moveTime: 1000,
    multiPv: 1,
    contempt: -10,
    threads: 2,
    hash: 64,
    ponder: false,
    errorRate: 0.15,
    blunderChance: 0.06,
    timeManagement: 0.5,
    opening: 0.4,
    endgame: 0.4,
    tactical: 0.5,
    positional: 0.4,
  },
  1700: {
    elo: 1700,
    skillLevel: 7,
    depth: 11,
    moveTime: 1200,
    multiPv: 1,
    contempt: 0,
    threads: 2,
    hash: 64,
    ponder: false,
    errorRate: 0.12,
    blunderChance: 0.05,
    timeManagement: 0.55,
    opening: 0.45,
    endgame: 0.45,
    tactical: 0.55,
    positional: 0.45,
  },
  1800: {
    elo: 1800,
    skillLevel: 9,
    depth: 12,
    moveTime: 1500,
    multiPv: 2,
    contempt: 10,
    threads: 2,
    hash: 128,
    ponder: false,
    errorRate: 0.10,
    blunderChance: 0.04,
    timeManagement: 0.6,
    opening: 0.5,
    endgame: 0.5,
    tactical: 0.6,
    positional: 0.5,
  },
  1900: {
    elo: 1900,
    skillLevel: 11,
    depth: 13,
    moveTime: 2000,
    multiPv: 2,
    contempt: 20,
    threads: 3,
    hash: 128,
    ponder: true,
    errorRate: 0.08,
    blunderChance: 0.03,
    timeManagement: 0.65,
    opening: 0.55,
    endgame: 0.55,
    tactical: 0.65,
    positional: 0.55,
  },
  2000: {
    elo: 2000,
    skillLevel: 13,
    depth: 14,
    moveTime: 2500,
    multiPv: 2,
    contempt: 30,
    threads: 3,
    hash: 256,
    ponder: true,
    errorRate: 0.06,
    blunderChance: 0.02,
    timeManagement: 0.7,
    opening: 0.6,
    endgame: 0.6,
    tactical: 0.7,
    positional: 0.6,
  },
  2100: {
    elo: 2100,
    skillLevel: 14,
    depth: 15,
    moveTime: 3000,
    multiPv: 3,
    contempt: 40,
    threads: 4,
    hash: 256,
    ponder: true,
    errorRate: 0.05,
    blunderChance: 0.015,
    timeManagement: 0.75,
    opening: 0.65,
    endgame: 0.65,
    tactical: 0.75,
    positional: 0.65,
  },
  2200: {
    elo: 2200,
    skillLevel: 15,
    depth: 16,
    moveTime: 3500,
    multiPv: 3,
    contempt: 50,
    threads: 4,
    hash: 512,
    ponder: true,
    errorRate: 0.04,
    blunderChance: 0.01,
    timeManagement: 0.8,
    opening: 0.7,
    endgame: 0.7,
    tactical: 0.8,
    positional: 0.7,
  },
  2300: {
    elo: 2300,
    skillLevel: 16,
    depth: 17,
    moveTime: 4000,
    multiPv: 3,
    contempt: 60,
    threads: 4,
    hash: 512,
    ponder: true,
    errorRate: 0.03,
    blunderChance: 0.008,
    timeManagement: 0.85,
    opening: 0.75,
    endgame: 0.75,
    tactical: 0.85,
    positional: 0.75,
  },
  2400: {
    elo: 2400,
    skillLevel: 17,
    depth: 18,
    moveTime: 4500,
    multiPv: 4,
    contempt: 70,
    threads: 6,
    hash: 1024,
    ponder: true,
    errorRate: 0.025,
    blunderChance: 0.006,
    timeManagement: 0.88,
    opening: 0.8,
    endgame: 0.8,
    tactical: 0.88,
    positional: 0.8,
  },
  2500: {
    elo: 2500,
    skillLevel: 18,
    depth: 19,
    moveTime: 5000,
    multiPv: 4,
    contempt: 80,
    threads: 6,
    hash: 1024,
    ponder: true,
    errorRate: 0.02,
    blunderChance: 0.004,
    timeManagement: 0.9,
    opening: 0.85,
    endgame: 0.85,
    tactical: 0.9,
    positional: 0.85,
  },
  2600: {
    elo: 2600,
    skillLevel: 19,
    depth: 20,
    moveTime: 6000,
    multiPv: 5,
    contempt: 90,
    threads: 8,
    hash: 2048,
    ponder: true,
    errorRate: 0.015,
    blunderChance: 0.003,
    timeManagement: 0.92,
    opening: 0.88,
    endgame: 0.88,
    tactical: 0.92,
    positional: 0.88,
  },
  2700: {
    elo: 2700,
    skillLevel: 19,
    depth: 21,
    moveTime: 7000,
    multiPv: 5,
    contempt: 100,
    threads: 8,
    hash: 2048,
    ponder: true,
    errorRate: 0.01,
    blunderChance: 0.002,
    timeManagement: 0.94,
    opening: 0.9,
    endgame: 0.9,
    tactical: 0.94,
    positional: 0.9,
  },
  2800: {
    elo: 2800,
    skillLevel: 20,
    depth: 22,
    moveTime: 8000,
    multiPv: 5,
    contempt: 100,
    threads: 8,
    hash: 4096,
    ponder: true,
    errorRate: 0.008,
    blunderChance: 0.0015,
    timeManagement: 0.96,
    opening: 0.93,
    endgame: 0.93,
    tactical: 0.96,
    positional: 0.93,
  },
  2900: {
    elo: 2900,
    skillLevel: 20,
    depth: 24,
    moveTime: 10000,
    multiPv: 6,
    contempt: 100,
    threads: 12,
    hash: 8192,
    ponder: true,
    errorRate: 0.005,
    blunderChance: 0.001,
    timeManagement: 0.98,
    opening: 0.96,
    endgame: 0.96,
    tactical: 0.98,
    positional: 0.96,
  },
  3000: {
    elo: 3000,
    skillLevel: 20,
    depth: 26,
    moveTime: 15000,
    multiPv: 6,
    contempt: 100,
    threads: 16,
    hash: 16384,
    ponder: true,
    errorRate: 0.002,
    blunderChance: 0.0005,
    timeManagement: 0.99,
    opening: 0.99,
    endgame: 0.99,
    tactical: 0.99,
    positional: 0.99,
  },
};

export class StockfishAdvanced {
  private worker: Worker | null = null;
  private isReady = false;
  private settings: AdvancedEngineSettings;
  private moveCallback: ((move: EngineMove) => void) | null = null;
  private readyCallback: (() => void) | null = null;
  private evaluationCallback: ((info: string) => void) | null = null;
  private currentPosition: Chess = new Chess();
  private moveHistory: EngineMove[] = [];
  private openingBook: Map<string, string[]> = new Map();
  private elo: number;

  constructor(elo: number = 1500) {
    this.elo = elo;
    this.settings = this.interpolateSettings(elo);
    this.initializeEngine();
    this.initializeOpeningBook();
  }

  // private findClosestElo(targetElo: number, eloKeys: number[]): number {
  //   return eloKeys.reduce((prev, curr) => 
  //     Math.abs(curr - targetElo) < Math.abs(prev - targetElo) ? curr : prev
  //   );
  // }

  private interpolateSettings(targetElo: number): AdvancedEngineSettings {
    const eloKeys = Object.keys(ELO_PRESETS).map(Number).sort((a, b) => a - b);
    
    // If exact match exists
    if (ELO_PRESETS[targetElo]) {
      return { ...ELO_PRESETS[targetElo] };
    }

    // Find surrounding ELO levels
    let lowerElo = 1200;
    let upperElo = 3000;
    
    for (let i = 0; i < eloKeys.length - 1; i++) {
      if (targetElo >= eloKeys[i] && targetElo <= eloKeys[i + 1]) {
        lowerElo = eloKeys[i];
        upperElo = eloKeys[i + 1];
        break;
      }
    }

    // If below minimum, use minimum
    if (targetElo < eloKeys[0]) {
      return { ...ELO_PRESETS[eloKeys[0]], elo: targetElo };
    }

    // If above maximum, use maximum
    if (targetElo > eloKeys[eloKeys.length - 1]) {
      return { ...ELO_PRESETS[eloKeys[eloKeys.length - 1]], elo: targetElo };
    }

    // Interpolate between lower and upper
    const ratio = (targetElo - lowerElo) / (upperElo - lowerElo);
    const lowerSettings = ELO_PRESETS[lowerElo];
    const upperSettings = ELO_PRESETS[upperElo];

    return {
      elo: targetElo,
      skillLevel: Math.round(
        lowerSettings.skillLevel + 
        (upperSettings.skillLevel - lowerSettings.skillLevel) * ratio
      ),
      depth: Math.round(
        lowerSettings.depth + 
        (upperSettings.depth - lowerSettings.depth) * ratio
      ),
      moveTime: Math.round(
        lowerSettings.moveTime + 
        (upperSettings.moveTime - lowerSettings.moveTime) * ratio
      ),
      multiPv: Math.round(
        lowerSettings.multiPv + 
        (upperSettings.multiPv - lowerSettings.multiPv) * ratio
      ),
      contempt: Math.round(
        lowerSettings.contempt + 
        (upperSettings.contempt - lowerSettings.contempt) * ratio
      ),
      threads: Math.round(
        lowerSettings.threads + 
        (upperSettings.threads - lowerSettings.threads) * ratio
      ),
      hash: Math.round(
        lowerSettings.hash + 
        (upperSettings.hash - lowerSettings.hash) * ratio
      ),
      ponder: targetElo >= 1900,
      errorRate: lowerSettings.errorRate + 
        (upperSettings.errorRate - lowerSettings.errorRate) * ratio,
      blunderChance: lowerSettings.blunderChance + 
        (upperSettings.blunderChance - lowerSettings.blunderChance) * ratio,
      timeManagement: lowerSettings.timeManagement + 
        (upperSettings.timeManagement - lowerSettings.timeManagement) * ratio,
      opening: lowerSettings.opening + 
        (upperSettings.opening - lowerSettings.opening) * ratio,
      endgame: lowerSettings.endgame + 
        (upperSettings.endgame - lowerSettings.endgame) * ratio,
      tactical: lowerSettings.tactical + 
        (upperSettings.tactical - lowerSettings.tactical) * ratio,
      positional: lowerSettings.positional + 
        (upperSettings.positional - lowerSettings.positional) * ratio,
    };
  }

  private initializeOpeningBook(): void {
    // Popular openings with variations
    this.openingBook.set("initial", [
      "e2e4", "d2d4", "g1f3", "c2c4", "e2e3", "b1c3", "f2f4", "b2b3"
    ]);
    this.openingBook.set("e2e4", [
      "e7e5", "c7c5", "e7e6", "c7c6", "d7d5", "g8f6", "d7d6", "g7g6"
    ]);
    this.openingBook.set("d2d4", [
      "g8f6", "d7d5", "e7e6", "f7f5", "c7c6", "g7g6", "b8c6", "c7c5"
    ]);
    // Add more opening variations...
  }

  private async initializeEngine(): Promise<void> {
    try {
      // Use local stockfish or CDN
      const stockfishUrl = window.location.hostname === 'localhost' 
        ? '/stockfish/stockfish.js' 
        : 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js';
      
      this.worker = new Worker(stockfishUrl);

      this.worker.onmessage = (event) => {
        this.handleEngineMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error("Stockfish worker error:", error);
        this.createFallbackEngine();
      };

      // Initialize UCI protocol
      this.sendCommand("uci");
    } catch (error) {
      console.error("Failed to initialize Stockfish:", error);
      this.createFallbackEngine();
    }
  }

  private createFallbackEngine(): void {
    console.warn("Using advanced fallback engine");
    this.isReady = true;
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
        if (this.evaluationCallback) {
          this.evaluationCallback(line);
        }
      }
    }
  }

  private configureEngine(): void {
    // Set advanced engine options
    this.sendCommand(`setoption name Skill Level value ${this.settings.skillLevel}`);
    this.sendCommand(`setoption name MultiPV value ${this.settings.multiPv}`);
    this.sendCommand(`setoption name Contempt value ${this.settings.contempt}`);
    this.sendCommand(`setoption name Threads value ${this.settings.threads}`);
    this.sendCommand(`setoption name Hash value ${this.settings.hash}`);
    this.sendCommand(`setoption name Ponder value ${this.settings.ponder}`);
    
    // Additional UCI options for realistic play
    this.sendCommand("setoption name UCI_LimitStrength value true");
    this.sendCommand(`setoption name UCI_Elo value ${this.elo}`);
    
    this.sendCommand("isready");
  }

  private handleBestMove(line: string): void {
    const parts = line.split(" ");
    const bestMove = parts[1];

    if (bestMove && bestMove !== "(none)" && this.moveCallback) {
      // Apply human-like errors based on ELO
      const finalMove = this.applyHumanCharacteristics(bestMove);
      
      this.moveCallback({
        move: finalMove,
        depth: this.settings.depth,
        time: this.settings.moveTime,
        elo: this.elo,
        confidence: 1 - this.settings.errorRate,
      });
    }
  }

  private applyHumanCharacteristics(bestMove: string): string {
    const rand = Math.random();
    
    // Check for blunder
    if (rand < this.settings.blunderChance) {
      return this.generateBlunder();
    }
    
    // Check for suboptimal move
    if (rand < this.settings.errorRate) {
      return this.generateSuboptimalMove(bestMove);
    }
    
    // Time pressure errors (more errors in time trouble)
    if (this.moveHistory.length > 30 && rand < this.settings.errorRate * 2) {
      return this.generateSuboptimalMove(bestMove);
    }
    
    return bestMove;
  }

  private generateBlunder(): string {
    // Generate a legal but bad move
    const moves = this.currentPosition.moves({ verbose: true });
    const badMoves = moves.filter(m => {
      // Avoid obviously winning moves
      return !m.captured && !m.promotion && !m.san.includes('+');
    });
    
    if (badMoves.length > 0) {
      const blunder = badMoves[Math.floor(Math.random() * badMoves.length)];
      return blunder.from + blunder.to + (blunder.promotion || '');
    }
    
    // Fallback to random move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return randomMove.from + randomMove.to + (randomMove.promotion || '');
  }

  private generateSuboptimalMove(bestMove: string): string {
    // Get multiple candidate moves and pick a decent but not best one
    const moves = this.currentPosition.moves({ verbose: true });
    
    // Filter out the best move
    const otherMoves = moves.filter(m => {
      const moveStr = m.from + m.to + (m.promotion || '');
      return moveStr !== bestMove;
    });
    
    if (otherMoves.length > 0) {
      // Prefer captures and checks (tactical moves)
      const tacticalMoves = otherMoves.filter(m => 
        m.captured || m.san.includes('+')
      );
      
      if (tacticalMoves.length > 0 && Math.random() < this.settings.tactical) {
        const move = tacticalMoves[0];
        return move.from + move.to + (move.promotion || '');
      }
      
      // Return a random decent move
      const move = otherMoves[Math.floor(Math.random() * Math.min(3, otherMoves.length))];
      return move.from + move.to + (move.promotion || '');
    }
    
    return bestMove;
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  async getBestMove(fen: string): Promise<EngineMove> {
    return new Promise((resolve, reject) => {
      this.currentPosition = new Chess(fen);
      
      if (!this.isReady && !this.worker) {
        // Use advanced fallback
        resolve(this.generateAdvancedMove(fen));
        return;
      }

      if (!this.isReady) {
        this.readyCallback = () => {
          this.getBestMove(fen).then(resolve).catch(reject);
        };
        return;
      }

      // Check opening book first (for lower ELOs)
      if (this.moveHistory.length < 10 && this.elo < 2000) {
        const bookMove = this.getOpeningBookMove(fen);
        if (bookMove && Math.random() < this.settings.opening) {
          resolve({
            move: bookMove,
            evaluation: 0,
            depth: 0,
            time: 100,
            elo: this.elo,
            confidence: 0.9,
          });
          return;
        }
      }

      this.moveCallback = (move: EngineMove) => {
        this.moveCallback = null;
        this.moveHistory.push(move);
        resolve(move);
      };

      // Set position and get best move
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(
        `go depth ${this.settings.depth} movetime ${this.settings.moveTime}`
      );

      // Timeout fallback
      setTimeout(() => {
        if (this.moveCallback) {
          this.moveCallback = null;
          resolve(this.generateAdvancedMove(fen));
        }
      }, this.settings.moveTime + 2000);
    });
  }

  private getOpeningBookMove(_fen: string): string | null {
    const moves = this.currentPosition.moves({ verbose: true });
    const position = this.moveHistory.length === 0 ? "initial" : 
      this.moveHistory[this.moveHistory.length - 1].move;
    
    const bookMoves = this.openingBook.get(position);
    if (bookMoves && bookMoves.length > 0) {
      const validBookMoves = bookMoves.filter(bm => 
        moves.some(m => m.from + m.to === bm)
      );
      
      if (validBookMoves.length > 0) {
        return validBookMoves[Math.floor(Math.random() * validBookMoves.length)];
      }
    }
    
    return null;
  }

  private generateAdvancedMove(fen: string): EngineMove {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });

      if (moves.length === 0) {
        throw new Error("No legal moves available");
      }

      // Advanced move selection based on ELO
      let selectedMove;
      
      // Evaluate moves based on characteristics
      const evaluatedMoves = moves.map(move => {
        let score = Math.random() * 0.5; // Base randomness
        
        // Tactical preferences
        if (move.captured) score += this.settings.tactical * 0.3;
        if (move.san.includes('+')) score += this.settings.tactical * 0.2;
        if (move.promotion) score += 0.5;
        
        // Positional preferences
        if (move.piece === 'n' && ['c3', 'f3', 'c6', 'f6'].includes(move.to)) {
          score += this.settings.positional * 0.2;
        }
        if (move.piece === 'p' && ['e4', 'd4', 'e5', 'd5'].includes(move.to)) {
          score += this.settings.positional * 0.15;
        }
        
        // Avoid moving the same piece repeatedly
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (lastMove && move.from === lastMove.move.substring(2, 4)) {
          score -= 0.2;
        }
        
        return { move, score };
      });

      // Sort by score and select based on strength
      evaluatedMoves.sort((a, b) => b.score - a.score);
      
      // Higher ELO = more likely to pick best moves
      const selectionRange = Math.floor((1 - this.settings.errorRate) * 
        Math.min(5, evaluatedMoves.length));
      const index = Math.floor(Math.random() * Math.max(1, selectionRange));
      
      selectedMove = evaluatedMoves[index].move;

      return {
        move: selectedMove.from + selectedMove.to + (selectedMove.promotion || ''),
        evaluation: evaluatedMoves[index].score,
        depth: this.settings.depth,
        time: this.settings.moveTime,
        elo: this.elo,
        confidence: 1 - this.settings.errorRate,
      };
    } catch (error) {
      console.error("Error generating advanced move:", error);
      throw error;
    }
  }

  setEloRating(elo: number): void {
    this.elo = elo;
    this.settings = this.interpolateSettings(elo);
    if (this.isReady) {
      this.configureEngine();
    }
  }

  getEloInfo(): string {
    const skillDescription = this.getSkillDescription(this.elo);
    return `ELO ${this.elo} - ${skillDescription}`;
  }

  private getSkillDescription(elo: number): string {
    if (elo < 1300) return "Principiante";
    if (elo < 1500) return "Amatore";
    if (elo < 1700) return "Club Player";
    if (elo < 1900) return "Esperto";
    if (elo < 2100) return "Candidato Maestro";
    if (elo < 2300) return "Maestro FIDE";
    if (elo < 2500) return "Maestro Internazionale";
    if (elo < 2700) return "Grande Maestro";
    if (elo < 2800) return "Super GM";
    return "Elite Mondiale";
  }

  isEngineReady(): boolean {
    return this.isReady;
  }

  setEvaluationCallback(callback: (info: string) => void): void {
    this.evaluationCallback = callback;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.moveCallback = null;
    this.readyCallback = null;
    this.evaluationCallback = null;
    this.moveHistory = [];
  }
}