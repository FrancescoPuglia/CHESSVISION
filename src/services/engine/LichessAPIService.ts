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

  /**
   * 🔍 TESTA LA CONNESSIONE E IL TOKEN
   */
  async testConnection(): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: "Token non valido o scaduto" };
        }
        return { success: false, error: `Errore API: ${response.status}` };
      }

      const user = await response.json();
      console.log("✅ Token valido, utente:", user.username);
      return { success: true, user };
    } catch (error: any) {
      console.error("❌ Test connessione fallito:", error);
      return {
        success: false,
        error: "Errore di rete - impossibile raggiungere Lichess",
      };
    }
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
    console.log(`🔗 URL: ${url}`);
    console.log(`🔑 Token: ${this.token.substring(0, 10)}...`);
    console.log(`📝 Params:`, params.toString());

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: params,
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(
        `📡 Response headers:`,
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Lichess API Error: ${response.status} - ${error}`);

        // Errori specifici
        if (response.status === 401) {
          throw new Error(
            "Token non valido o scaduto. Verifica il token Lichess.",
          );
        } else if (response.status === 429) {
          throw new Error("Troppe richieste. Attendi un momento e riprova.");
        } else if (
          response.status === 0 ||
          response.status.toString().startsWith("5")
        ) {
          throw new Error("Errore di rete. Verifica la connessione internet.");
        }

        throw new Error(`Errore API Lichess (${response.status}): ${error}`);
      }

      const data = await response.json();
      console.log("✅ AI challenge created:", data);

      return data as LichessGameData;
    } catch (networkError: any) {
      console.error("❌ Network error:", networkError);

      if (
        networkError.name === "TypeError" &&
        networkError.message.includes("fetch")
      ) {
        throw new Error(
          "Errore di connessione: impossibile raggiungere Lichess. " +
            "Potrebbe essere un problema CORS o di rete.",
        );
      }

      throw networkError;
    }
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

// Singleton con token configurato da variabile ambiente
const lichessToken = import.meta.env.VITE_LICHESS_TOKEN || "TOKEN_NON_CONFIGURATO";
export const lichessAPI = new LichessAPIService(lichessToken);

/**
 * 🔧 FUNZIONE DI UTILITY PER TESTARE CORS
 */
export const testLichessAccess = async (): Promise<{
  corsIssue: boolean;
  networkIssue: boolean;
  tokenIssue: boolean;
  details: string;
}> => {
  try {
    // Test semplice senza token per verificare CORS
    const corsTest = await fetch("https://lichess.org/api/status", {
      method: "GET",
    });

    if (corsTest.ok) {
      console.log("✅ CORS OK - Lichess è raggiungibile");

      // Ora testa con token
      const tokenTest = await lichessAPI.testConnection();
      if (!tokenTest.success) {
        return {
          corsIssue: false,
          networkIssue: false,
          tokenIssue: true,
          details: tokenTest.error || "Token non valido",
        };
      }

      return {
        corsIssue: false,
        networkIssue: false,
        tokenIssue: false,
        details: "Tutto OK",
      };
    } else {
      return {
        corsIssue: true,
        networkIssue: false,
        tokenIssue: false,
        details: `CORS bloccato: ${corsTest.status}`,
      };
    }
  } catch (error: any) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return {
        corsIssue: true,
        networkIssue: false,
        tokenIssue: false,
        details: "CORS Policy blocca le richieste cross-origin",
      };
    }

    return {
      corsIssue: false,
      networkIssue: true,
      tokenIssue: false,
      details: `Errore di rete: ${error.message}`,
    };
  }
};
