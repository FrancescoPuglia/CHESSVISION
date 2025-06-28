// src/services/engine/LichessEngineAPI.ts
/**
 * 🎯 LICHESS ENGINE API - MOTORI VERI E FORTI
 * Usa l'API di Lichess per giocare contro Stockfish REALE
 *
 * Vantaggi:
 * - Stockfish VERO di Lichess (non simulazioni)
 * - 8 livelli di difficoltà reali (1-8)
 * - Nessun download, usa i server Lichess
 * - Forza garantita e testata da milioni di giocatori
 */

import { Chess } from "chess.js";

export interface LichessEngineMove {
  move: string; // UCI format
  evaluation?: number;
  confidence?: number;
}

export interface LichessGameState {
  gameId: string;
  fen: string;
  moves: string;
  status:
    | "created"
    | "started"
    | "aborted"
    | "mate"
    | "resign"
    | "stalemate"
    | "timeout"
    | "draw"
    | "outoftime"
    | "cheat"
    | "noStart"
    | "unknownFinish"
    | "variantEnd";
  winner?: "white" | "black";
  isMyTurn: boolean;
}

// Livelli Lichess ufficiali (1-8)
export const LICHESS_LEVELS: Record<
  number,
  { name: string; strength: number }
> = {
  1: { name: "Livello 1 (800 ELO)", strength: 1 },
  2: { name: "Livello 2 (1100 ELO)", strength: 2 },
  3: { name: "Livello 3 (1400 ELO)", strength: 3 },
  4: { name: "Livello 4 (1700 ELO)", strength: 4 },
  5: { name: "Livello 5 (2000 ELO)", strength: 5 },
  6: { name: "Livello 6 (2300 ELO)", strength: 6 },
  7: { name: "Livello 7 (2500 ELO)", strength: 7 },
  8: { name: "Livello 8 (2850 ELO)", strength: 8 },
};

export class LichessEngineAPI {
  private currentGameId: string | null = null;
  private eventSource: EventSource | null = null;
  private playerColor: "white" | "black" = "white";
  private gameStateCallback: ((state: LichessGameState) => void) | null = null;

  /**
   * 🚀 CREA UNA NUOVA PARTITA CONTRO STOCKFISH DI LICHESS
   */
  async createGame(
    level: number = 4,
    color: "white" | "black" | "random" = "white",
  ): Promise<string> {
    console.log(`🎮 Creating Lichess game vs Stockfish level ${level}...`);

    try {
      // Challenge AI endpoint di Lichess
      const response = await fetch("https://lichess.org/api/challenge/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          level: level.toString(),
          clock: "10+0", // 10 minuti per giocatore
          color: color,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lichess API error: ${response.status}`);
      }

      const data = await response.json();
      this.currentGameId = data.id || null;
      this.playerColor = data.color === "white" ? "white" : "black";

      console.log(
        `✅ Game created! ID: ${this.currentGameId}, You play: ${this.playerColor}`,
      );

      // Inizia a ricevere eventi della partita
      this.startGameStream();

      return this.currentGameId!; // We know it's not null here
    } catch (error) {
      console.error("❌ Failed to create Lichess game:", error);
      throw error;
    }
  }

  /**
   * 🎯 STREAM EVENTI DELLA PARTITA IN TEMPO REALE
   */
  private startGameStream(): void {
    if (!this.currentGameId) return;

    const streamUrl = `https://lichess.org/api/board/game/stream/${this.currentGameId}`;

    this.eventSource = new EventSource(streamUrl);

    this.eventSource.onmessage = (event) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          this.handleGameEvent(data);
        } catch (e) {
          // Some events are not JSON
          console.log("Game event:", event.data);
        }
      }
    };

    this.eventSource.onerror = (error) => {
      console.error("❌ Game stream error:", error);
      this.cleanup();
    };
  }

  /**
   * 🎯 GESTIONE EVENTI PARTITA
   */
  private handleGameEvent(data: any): void {
    if (data.type === "gameFull") {
      // Evento iniziale con stato completo
      this.handleGameState(data.state);
    } else if (data.type === "gameState") {
      // Aggiornamento stato partita
      this.handleGameState(data);
    } else if (data.type === "chatLine") {
      // Chat (ignorare per ora)
    }
  }

  /**
   * 🎯 AGGIORNA STATO PARTITA
   */
  private handleGameState(state: any): void {
    const chess = new Chess();

    // Applica tutte le mosse
    if (state.moves) {
      const moves = state.moves.split(" ");
      for (const move of moves) {
        if (move) {
          // Converti da UCI a SAN
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.substring(4, 5);

          chess.move({
            from,
            to,
            promotion: promotion || undefined,
          });
        }
      }
    }

    const gameState: LichessGameState = {
      gameId: this.currentGameId!,
      fen: chess.fen(),
      moves: state.moves || "",
      status: state.status,
      winner: state.winner,
      isMyTurn: this.isMyTurn(chess),
    };

    // Se è il turno di Stockfish e non ci sono ancora mosse
    if (
      !this.isMyTurn(chess) &&
      !state.moves &&
      this.playerColor === "black"
    ) {
      console.log("⏳ Waiting for Stockfish's first move...");
    }

    // Notifica il callback
    if (this.gameStateCallback) {
      this.gameStateCallback(gameState);
    }

    // Se la partita è finita
    if (
      ["mate", "resign", "stalemate", "timeout", "draw"].includes(state.status)
    ) {
      console.log(
        `🏁 Game ended: ${state.status}${state.winner ? `, winner: ${state.winner}` : ""}`,
      );
      this.cleanup();
    }
  }

  /**
   * 🎯 CONTROLLA SE È IL NOSTRO TURNO
   */
  private isMyTurn(chess: Chess): boolean {
    const turn = chess.turn();
    return (
      (turn === "w" && this.playerColor === "white") ||
      (turn === "b" && this.playerColor === "black")
    );
  }

  /**
   * 🎯 FAI UNA MOSSA
   */
  async makeMove(move: string): Promise<boolean> {
    if (!this.currentGameId) {
      throw new Error("No active game");
    }

    console.log(`📤 Sending move: ${move}`);

    try {
      const response = await fetch(
        `https://lichess.org/api/board/game/${this.currentGameId}/move/${move}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("❌ Move error:", error);
        return false;
      }

      console.log("✅ Move sent successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to make move:", error);
      return false;
    }
  }

  /**
   * 🎯 OTTIENI L'ULTIMA MOSSA DI STOCKFISH
   */
  getLastEngineMove(moves: string): string | null {
    if (!moves) return null;

    const moveList = moves.split(" ");
    const lastMove = moveList[moveList.length - 1];

    // Verifica che sia una mossa del motore
    const isEngineTurn =
      (moveList.length % 2 === 1 && this.playerColor === "black") ||
      (moveList.length % 2 === 0 && this.playerColor === "white");

    return isEngineTurn ? lastMove : null;
  }

  /**
   * 🎯 REGISTRA CALLBACK PER AGGIORNAMENTI
   */
  onGameStateUpdate(callback: (state: LichessGameState) => void): void {
    this.gameStateCallback = callback;
  }

  /**
   * 🎯 OTTIENI URL PARTITA SU LICHESS
   */
  getGameUrl(): string | null {
    return this.currentGameId
      ? `https://lichess.org/${this.currentGameId}`
      : null;
  }

  /**
   * 🎯 ABBANDONA PARTITA
   */
  async resign(): Promise<void> {
    if (!this.currentGameId) return;

    try {
      await fetch(
        `https://lichess.org/api/board/game/${this.currentGameId}/resign`,
        {
          method: "POST",
        },
      );
      console.log("🏳️ Game resigned");
    } catch (error) {
      console.error("❌ Failed to resign:", error);
    }

    this.cleanup();
  }

  /**
   * 🧹 PULIZIA RISORSE
   */
  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentGameId = null;
    this.gameStateCallback = null;
  }

  /**
   * 🎯 DISTRUGGI ISTANZA
   */
  destroy(): void {
    this.cleanup();
  }
}

// Singleton per uso globale
export const lichessEngine = new LichessEngineAPI();
