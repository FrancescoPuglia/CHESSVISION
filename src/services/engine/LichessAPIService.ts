// src/services/engine/LichessAPIService.ts
/**
 * 🎯 VERA API LICHESS - IMPLEMENTAZIONE COMPLETA
 * Usa l'API Board di Lichess per giocare contro AI reali
 */

export interface LichessGameData {
  id: string;
  rated: boolean;
  variant: { key: string; name: string };
  clock?: { initial: number; increment: number };
  players: {
    white: { id: string; username: string };
    black: { id: string; username: string };
  };
  initialFen: string;
  state: {
    type: string;
    moves: string;
    wtime: number;
    btime: number;
    status: string;
    winner?: string;
  };
}

export interface LichessGameState {
  type: string;
  moves: string;
  wtime: number;
  btime: number;
  status: string;
  winner?: string;
}

export interface LichessGameEvent {
  type: "gameFull" | "gameState" | "chatLine";
  id?: string;
  // gameFull properties
  rated?: boolean;
  variant?: { key: string; name: string };
  clock?: { initial: number; increment: number };
  players?: {
    white: { id: string; username: string };
    black: { id: string; username: string };
  };
  initialFen?: string;
  state?: LichessGameState;
  // gameState properties
  moves?: string;
  wtime?: number;
  btime?: number;
  status?: string;
  winner?: string;
}

export class LichessAPIService {
  private readonly token: string;
  private readonly baseUrl = "https://lichess.org/api";
  private gameStreams: Map<string, ReadableStreamDefaultReader> = new Map();

  constructor(token: string) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  /**
   * 🚀 CREA UNA SFIDA CONTRO L'AI DI LICHESS
   */
  async challengeAI(
    level: number = 4,
    timeLimit: number = 300,
    increment: number = 0,
    color: "white" | "black" | "random" = "random",
  ): Promise<LichessGameData> {
    const url = `${this.baseUrl}/challenge/ai`;

    const params = new URLSearchParams({
      level: level.toString(),
      "clock.limit": timeLimit.toString(),
      "clock.increment": increment.toString(),
      color: color,
      rated: "false",
    });

    console.log(
      `🎮 Creating Lichess AI challenge - Level ${level}, Time ${timeLimit}+${increment}`,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: params,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to create AI challenge: ${response.status} - ${error}`,
      );
    }

    const data = await response.json();
    console.log("✅ AI challenge created:", data);

    return data as LichessGameData;
  }

  /**
   * 🎯 FAI UNA MOSSA NEL GIOCO
   */
  async makeMove(gameId: string, move: string): Promise<boolean> {
    const url = `${this.baseUrl}/board/game/${gameId}/move/${move}`;

    console.log(`📤 Making move: ${move} in game ${gameId}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Move failed: ${error}`);
      return false;
    }

    console.log("✅ Move sent successfully");
    return true;
  }

  /**
   * 🌊 STREAM DEGLI EVENTI DEL GIOCO IN TEMPO REALE
   */
  async streamGame(
    gameId: string,
    // eslint-disable-next-line no-unused-vars
    onEvent: (event: LichessGameEvent) => void,
  ): Promise<void> {
    const url = `${this.baseUrl}/board/game/stream/${gameId}`;

    console.log(`🌊 Starting game stream for ${gameId}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to start game stream: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    this.gameStreams.set(gameId, reader);

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("🏁 Game stream ended");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line for next iteration

        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines/heartbeats

          try {
            const event = JSON.parse(line);
            console.log("📥 Game event:", event);
            onEvent(event);
          } catch (e) {
            console.warn("Failed to parse game event:", line);
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      this.gameStreams.delete(gameId);
    }
  }

  /**
   * 🛑 INTERROMPI LO STREAM DI UN GIOCO
   */
  stopGameStream(gameId: string): void {
    const reader = this.gameStreams.get(gameId);
    if (reader) {
      reader.cancel();
      this.gameStreams.delete(gameId);
      console.log(`🛑 Stopped stream for game ${gameId}`);
    }
  }

  /**
   * 🏳️ ABBANDONA IL GIOCO
   */
  async resign(gameId: string): Promise<void> {
    const url = `${this.baseUrl}/board/game/${gameId}/resign`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to resign game");
    } else {
      console.log("🏳️ Game resigned");
    }
  }

  /**
   * 🧹 PULIZIA RISORSE
   */
  destroy(): void {
    // Stop all active streams
    for (const [, reader] of this.gameStreams) {
      reader.cancel();
    }
    this.gameStreams.clear();
    console.log("🧹 LichessAPIService destroyed");
  }
}

// Singleton con token configurato
export const lichessAPI = new LichessAPIService("lip_N4a0clTuekafqEPP2BtC");
