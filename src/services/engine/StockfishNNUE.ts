// src/services/engine/StockfishNNUE.ts
/* eslint-disable no-unused-vars */
/**
 * 🚀 STOCKFISH.JS v17 NNUE - IMPLEMENTAZIONE CORRETTA
 * Basata sulla ricerca online per motori di forza reale
 *
 * Caratteristiche:
 * - Stockfish.js v17 NNUE (66MB) per vera forza di gioco
 * - UCI_LimitStrength + UCI_Elo per controllo preciso ELO
 * - Web Worker con protocollo UCI completo
 * - Parametri validati secondo standard Lichess/Chess.com
 */

// import { Chess } from "chess.js"; // Not used in this implementation

export interface EngineMove {
  move: string;
  evaluation?: number;
  depth?: number;
  time?: number;
  elo?: number;
  confidence?: number;
  pv?: string[];
}

export interface EngineLevel {
  key: string;
  name: string;
  elo: number;
  skillLevel: number;
  depth: number;
  timeLimit: number;
  multiPV: number;
  threads: number;
  hash: number;
  useNNUE: boolean;
  contempt: number;
  limitStrength: boolean;
}

/**
 * 🎯 STOCKFISH NNUE PROFESSIONALE
 * Implementazione corretta seguendo la ricerca online
 */
export class StockfishNNUE {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private engineLevels: Map<string, EngineLevel>;
  private evaluationCallback: ((info: string) => void) | null = null;
  // private currentPosition: string = ""; // Reserved for future use
  private pendingAnalysis: {
    resolve: (move: EngineMove) => void;
    reject: (error: Error) => void;
    level: EngineLevel;
    timeout: number;
  } | null = null;

  constructor() {
    this.engineLevels = this.initializeCorrectLevels();
  }

  /**
   * 🔥 LIVELLI CORRETTI BASATI SU RICERCA ONLINE
   * UCI_Elo range: 1320-3190 (standard Stockfish)
   * Skill Level: 0-20 correlato con ELO
   */
  private initializeCorrectLevels(): Map<string, EngineLevel> {
    const levels = new Map<string, EngineLevel>();

    // 🟢 PRINCIPIANTE (1320-1500 ELO)
    levels.set("beginner-1", {
      key: "beginner-1",
      name: "Principiante 1 (1350 ELO)",
      elo: 1350,
      skillLevel: 0,
      depth: 5,
      timeLimit: 500,
      multiPV: 1,
      threads: 1,
      hash: 32,
      useNNUE: false,
      contempt: 0,
      limitStrength: true,
    });

    levels.set("beginner-2", {
      key: "beginner-2",
      name: "Principiante 2 (1450 ELO)",
      elo: 1450,
      skillLevel: 2,
      depth: 6,
      timeLimit: 750,
      multiPV: 1,
      threads: 1,
      hash: 64,
      useNNUE: false,
      contempt: 0,
      limitStrength: true,
    });

    // 🟡 INTERMEDIO (1500-2000 ELO)
    levels.set("intermediate-1", {
      key: "intermediate-1",
      name: "Intermedio 1 (1600 ELO)",
      elo: 1600,
      skillLevel: 5,
      depth: 8,
      timeLimit: 1000,
      multiPV: 1,
      threads: 2,
      hash: 128,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    levels.set("intermediate-2", {
      key: "intermediate-2",
      name: "Intermedio 2 (1800 ELO)",
      elo: 1800,
      skillLevel: 8,
      depth: 10,
      timeLimit: 1500,
      multiPV: 1,
      threads: 2,
      hash: 256,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    // 🟠 AVANZATO (2000-2400 ELO)
    levels.set("advanced-1", {
      key: "advanced-1",
      name: "Avanzato 1 (2000 ELO)",
      elo: 2000,
      skillLevel: 12,
      depth: 12,
      timeLimit: 2000,
      multiPV: 1,
      threads: 2,
      hash: 512,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    levels.set("advanced-2", {
      key: "advanced-2",
      name: "Avanzato 2 (2200 ELO)",
      elo: 2200,
      skillLevel: 15,
      depth: 14,
      timeLimit: 3000,
      multiPV: 1,
      threads: 4,
      hash: 1024,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    // 🔴 PROFESSIONALE (2400+ ELO)
    levels.set("professional-1", {
      key: "professional-1",
      name: "Maestro (2400 ELO)",
      elo: 2400,
      skillLevel: 17,
      depth: 16,
      timeLimit: 4000,
      multiPV: 1,
      threads: 4,
      hash: 2048,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    levels.set("professional-2", {
      key: "professional-2",
      name: "Grande Maestro (2600 ELO)",
      elo: 2600,
      skillLevel: 19,
      depth: 18,
      timeLimit: 6000,
      multiPV: 1,
      threads: 6,
      hash: 2048,
      useNNUE: true,
      contempt: 0,
      limitStrength: true,
    });

    levels.set("professional-max", {
      key: "professional-max",
      name: "Super GM (3000+ ELO)",
      elo: 3000,
      skillLevel: 20,
      depth: 20,
      timeLimit: 8000,
      multiPV: 3,
      threads: 8,
      hash: 4096,
      useNNUE: true,
      contempt: 0,
      limitStrength: false, // Forza massima senza limitazioni
    });

    return levels;
  }

  /**
   * 🚀 INIZIALIZZAZIONE CORRETTA CON STOCKFISH.JS v17 NNUE
   */
  async initialize(): Promise<void> {
    if (this.isReady || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    console.log("🔧 Initializing Stockfish.js v17 NNUE...");

    return new Promise((resolve, reject) => {
      try {
        // 🎯 STOCKFISH.JS v17 NNUE - URL CORRETTO DALLA RICERCA
        // nmrugg/stockfish.js è la versione ufficiale con NNUE
        this.worker = new Worker(
          "https://cdn.jsdelivr.net/npm/stockfish@17.0.0/src/stockfish-nnue-16.js",
        );

        let uciOkReceived = false;
        // let readyOkReceived = false; // Not used in this initialization flow

        this.worker.onmessage = (e) => {
          const message = e.data;
          console.log(`🤖 Engine: ${message}`);

          // Handle UCI protocol initialization
          if (message === "uciok") {
            uciOkReceived = true;
            this.sendCommand("isready");
          } else if (message === "readyok") {
            if (uciOkReceived) {
              this.isReady = true;
              this.isInitializing = false;
              console.log(
                "✅ Stockfish NNUE Ready! Engine strength: PROFESSIONAL",
              );
              resolve();
            }
          } else {
            this.handleEngineMessage(message);
          }
        };

        this.worker.onerror = (error) => {
          console.error("❌ Stockfish worker error:", error);
          this.isInitializing = false;
          reject(error);
        };

        // Start UCI protocol
        this.sendCommand("uci");

        // Safety timeout
        setTimeout(() => {
          if (!this.isReady) {
            console.error("⏰ Engine initialization timeout");
            this.isInitializing = false;
            reject(new Error("Engine initialization timeout"));
          }
        }, 10000);
      } catch (error) {
        console.error("❌ Failed to initialize Stockfish:", error);
        this.isInitializing = false;
        reject(error);
      }
    });
  }

  /**
   * 🎯 CONFIGURAZIONE UCI CORRETTA
   * Seguendo i parametri standard ricercati online
   */
  private configureEngine(level: EngineLevel): void {
    console.log(`🔧 Configuring engine for ${level.name} (${level.elo} ELO)`);

    // 🚀 PARAMETRI UCI CORRETTI PER CONTROLLO ELO
    if (level.limitStrength) {
      this.sendCommand("setoption name UCI_LimitStrength value true");
      this.sendCommand(`setoption name UCI_Elo value ${level.elo}`);
    } else {
      this.sendCommand("setoption name UCI_LimitStrength value false");
    }

    // Skill Level (0-20, correlato con ELO)
    this.sendCommand(`setoption name Skill Level value ${level.skillLevel}`);

    // Risorse computazionali
    this.sendCommand(`setoption name Threads value ${level.threads}`);
    this.sendCommand(`setoption name Hash value ${level.hash}`);

    // Analisi
    this.sendCommand(`setoption name MultiPV value ${level.multiPV}`);
    this.sendCommand(`setoption name Contempt value ${level.contempt}`);

    // 🧠 NNUE Neural Network (CRITICO!)
    this.sendCommand(`setoption name Use NNUE value ${level.useNNUE}`);

    // Ottimizzazioni per livelli professionali
    if (level.elo >= 2400) {
      this.sendCommand("setoption name UCI_AnalyseMode value true");
      this.sendCommand("setoption name Ponder value false");
      console.log("🏆 Professional level optimizations enabled");
    }

    // Wait for configuration
    this.sendCommand("isready");
  }

  /**
   * 🎯 ANALISI POSIZIONE CON PROTOCOLLO UCI CORRETTO
   */
  async analyzePosition(fen: string, levelKey: string): Promise<EngineMove> {
    if (!this.isReady) {
      throw new Error("Engine not ready. Call initialize() first.");
    }

    const level = this.engineLevels.get(levelKey);
    if (!level) {
      throw new Error(`Level not found: ${levelKey}`);
    }

    // Cancel any pending analysis
    if (this.pendingAnalysis) {
      clearTimeout(this.pendingAnalysis.timeout);
      this.pendingAnalysis.reject(new Error("Analysis cancelled"));
      this.pendingAnalysis = null;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingAnalysis = null;
        reject(new Error(`Analysis timeout after ${level.timeLimit + 2000}ms`));
      }, level.timeLimit + 2000) as unknown as number;

      this.pendingAnalysis = {
        resolve,
        reject,
        level,
        timeout,
      };

      // Configure engine for this level
      this.configureEngine(level);

      // Set position and start analysis
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go movetime ${level.timeLimit} depth ${level.depth}`);

      console.log(
        `⚡ Analyzing position at ${level.elo} ELO (depth ${level.depth}, ${level.timeLimit}ms)`,
      );
    });
  }

  /**
   * 🔧 GESTIONE MESSAGGI UCI
   */
  private handleEngineMessage(message: string): void {
    // Parse evaluation info
    if (message.startsWith("info") && this.evaluationCallback) {
      this.evaluationCallback(message);
    }

    // Parse best move
    if (message.startsWith("bestmove") && this.pendingAnalysis) {
      const moveMatch = message.match(/bestmove\s+(\S+)/);
      if (moveMatch) {
        const move = moveMatch[1];

        if (move === "(none)" || move === "none") {
          this.pendingAnalysis.reject(new Error("No legal moves available"));
          return;
        }

        // Validate move format (UCI: e2e4, e1g1, a7a8q)
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
          this.pendingAnalysis.reject(
            new Error(`Invalid move format: ${move}`),
          );
          return;
        }

        clearTimeout(this.pendingAnalysis.timeout);

        const result: EngineMove = {
          move,
          elo: this.pendingAnalysis.level.elo,
          depth: this.pendingAnalysis.level.depth,
          time: this.pendingAnalysis.level.timeLimit,
          confidence: this.calculateConfidence(this.pendingAnalysis.level),
        };

        this.pendingAnalysis.resolve(result);
        this.pendingAnalysis = null;
      } else {
        this.pendingAnalysis.reject(new Error("Could not parse best move"));
      }
    }
  }

  private calculateConfidence(level: EngineLevel): number {
    // Confidence basata su ELO e risorse
    const eloFactor = Math.min(level.elo / 3000, 1);
    const depthFactor = Math.min(level.depth / 20, 1);
    const timeFactor = Math.min(level.timeLimit / 8000, 1);

    return eloFactor * 0.5 + depthFactor * 0.3 + timeFactor * 0.2;
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
      console.log(`📤 UCI: ${command}`);
    }
  }

  /**
   * 🎯 PUBLIC API
   */
  getAllLevels(): Array<{ key: string; name: string; elo: number }> {
    return Array.from(this.engineLevels.values()).map((level) => ({
      key: level.key,
      name: level.name,
      elo: level.elo,
    }));
  }

  getLevelInfo(levelKey: string): string {
    const level = this.engineLevels.get(levelKey);
    if (!level) return "Level not found";

    return `${level.name} - ${level.elo} ELO (Depth ${level.depth}, ${level.timeLimit}ms)`;
  }

  isEngineReady(): boolean {
    return this.isReady;
  }

  onEvaluation(callback: (info: string) => void): void {
    this.evaluationCallback = callback;
  }

  destroy(): void {
    if (this.pendingAnalysis) {
      clearTimeout(this.pendingAnalysis.timeout);
      this.pendingAnalysis.reject(new Error("Engine destroyed"));
      this.pendingAnalysis = null;
    }

    if (this.worker) {
      this.sendCommand("quit");
      this.worker.terminate();
      this.worker = null;
    }

    this.isReady = false;
    this.isInitializing = false;
    this.evaluationCallback = null;
  }
}

// 🎯 SINGLETON READY-TO-USE
export const stockfishNNUE = new StockfishNNUE();
