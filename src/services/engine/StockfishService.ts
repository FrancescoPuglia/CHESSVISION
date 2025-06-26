// src/services/engine/StockfishService.ts
import { Chess } from "chess.js";

export interface EngineMove {
  move: string;
  evaluation?: number;
  depth?: number;
  time?: number;
}

export interface EngineSettings {
  depth: number;
  skillLevel: number; // 0-20, where 20 is strongest
  moveTime: number; // milliseconds
  multiPv: number; // number of best moves to consider
}

export type EngineStrength =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "master";

export const ENGINE_PRESETS: Record<EngineStrength, EngineSettings> = {
  beginner: { depth: 5, skillLevel: 3, moveTime: 500, multiPv: 1 },
  intermediate: { depth: 8, skillLevel: 8, moveTime: 1000, multiPv: 1 },
  advanced: { depth: 12, skillLevel: 13, moveTime: 2000, multiPv: 1 },
  expert: { depth: 15, skillLevel: 17, moveTime: 3000, multiPv: 1 },
  master: { depth: 18, skillLevel: 20, moveTime: 5000, multiPv: 1 },
};

export class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private settings: EngineSettings;
  private moveCallback: ((move: EngineMove) => void) | null = null;
  private readyCallback: (() => void) | null = null;

  constructor(strength: EngineStrength = "intermediate") {
    this.settings = { ...ENGINE_PRESETS[strength] };
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    try {
      // Use Stockfish.js from CDN
      this.worker = new Worker(
        "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js",
      );

      this.worker.onmessage = (event) => {
        this.handleEngineMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error("Stockfish worker error:", error);
      };

      // Initialize UCI protocol
      this.sendCommand("uci");
    } catch (error) {
      console.error("Failed to initialize Stockfish:", error);
      // Fallback: create a simple random move engine
      this.createFallbackEngine();
    }
  }

  private createFallbackEngine(): void {
    console.warn("Using fallback random move engine");
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
      }
    }
  }

  private configureEngine(): void {
    // Set engine options
    this.sendCommand(
      `setoption name Skill Level value ${this.settings.skillLevel}`,
    );
    this.sendCommand(`setoption name MultiPV value ${this.settings.multiPv}`);
    this.sendCommand("isready");
  }

  private handleBestMove(line: string): void {
    const parts = line.split(" ");
    const bestMove = parts[1];

    if (bestMove && bestMove !== "(none)" && this.moveCallback) {
      this.moveCallback({
        move: bestMove,
        depth: this.settings.depth,
        time: this.settings.moveTime,
      });
    }
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  setStrength(strength: EngineStrength): void {
    this.settings = { ...ENGINE_PRESETS[strength] };
    if (this.isReady) {
      this.sendCommand(
        `setoption name Skill Level value ${this.settings.skillLevel}`,
      );
    }
  }

  async getBestMove(fen: string): Promise<EngineMove> {
    return new Promise((resolve, reject) => {
      if (!this.isReady && !this.worker) {
        // Fallback: generate random legal move
        resolve(this.generateRandomMove(fen));
        return;
      }

      if (!this.isReady) {
        this.readyCallback = () => {
          this.getBestMove(fen).then(resolve).catch(reject);
        };
        return;
      }

      this.moveCallback = (move: EngineMove) => {
        this.moveCallback = null;
        resolve(move);
      };

      // Set position and get best move
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(
        `go depth ${this.settings.depth} movetime ${this.settings.moveTime}`,
      );

      // Timeout fallback
      setTimeout(() => {
        if (this.moveCallback) {
          this.moveCallback = null;
          resolve(this.generateRandomMove(fen));
        }
      }, this.settings.moveTime + 2000);
    });
  }

  private generateRandomMove(fen: string): EngineMove {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });

      if (moves.length === 0) {
        throw new Error("No legal moves available");
      }

      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return {
        move: randomMove.from + randomMove.to + (randomMove.promotion || ""),
        evaluation: 0,
        depth: 1,
        time: 100,
      };
    } catch (error) {
      console.error("Error generating random move:", error);
      throw error;
    }
  }

  async makeMove(
    fen: string,
    userMove: string,
  ): Promise<{ fen: string; engineMove: EngineMove }> {
    try {
      // Apply user move
      const chess = new Chess(fen);
      const move = chess.move(userMove);

      if (!move) {
        throw new Error("Invalid move");
      }

      const newFen = chess.fen();

      // Check if game is over
      if (chess.isGameOver()) {
        throw new Error("Game is over");
      }

      // Get engine response
      const engineMove = await this.getBestMove(newFen);

      // Apply engine move
      const engineMoveResult = chess.move(engineMove.move);
      if (!engineMoveResult) {
        throw new Error("Engine generated invalid move");
      }

      return {
        fen: chess.fen(),
        engineMove: {
          ...engineMove,
          move: engineMoveResult.san, // Return in SAN notation
        },
      };
    } catch (error) {
      console.error("Error in makeMove:", error);
      throw error;
    }
  }

  isEngineReady(): boolean {
    return this.isReady;
  }

  getStrengthInfo(strength: EngineStrength): string {
    const preset = ENGINE_PRESETS[strength];
    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} (Skill ${preset.skillLevel}/20, Depth ${preset.depth})`;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.moveCallback = null;
    this.readyCallback = null;
  }
}
