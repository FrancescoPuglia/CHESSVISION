// src/ui/components/EngineGame.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import {
  StockfishService,
  EngineStrength,
  ENGINE_PRESETS,
} from "@services/engine/StockfishService";
import { useChessGame } from "@ui/hooks/useChessGame";
import { SpeechService } from "@services/speech/SpeechService";

interface EngineGameProps {
  isVisible: boolean;
  onClose: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
}

export const EngineGame: React.FC<EngineGameProps> = ({
  isVisible,
  onClose,
  speechService,
  isVoiceEnabled,
}) => {
  const [gameState, gameActions] = useChessGame();
  const [engine, setEngine] = useState<StockfishService | null>(null);
  const [engineStrength, setEngineStrength] =
    useState<EngineStrength>("expert");
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [moveInput, setMoveInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const engineRef = useRef<StockfishService | null>(null);

  // Initialize engine
  useEffect(() => {
    const stockfish = new StockfishService(engineStrength);
    setEngine(stockfish);
    engineRef.current = stockfish;

    return () => {
      stockfish.destroy();
    };
  }, [engineStrength]);

  // Handle engine moves when it's engine's turn
  useEffect(() => {
    if (gameStarted && !gameState.isGameOver && engine?.isEngineReady()) {
      const currentTurn = gameState.game.getTurn();
      const isEngineTurn =
        (playerColor === "white" && currentTurn === "black") ||
        (playerColor === "black" && currentTurn === "white");

      if (isEngineTurn && !isEngineThinking) {
        makeEngineMove();
      }
    }
  }, [
    gameState.currentMove,
    gameStarted,
    playerColor,
    engine,
    isEngineThinking,
  ]);

  const makeEngineMove = async () => {
    if (!engine || isEngineThinking) return;

    setIsEngineThinking(true);

    try {
      const currentFen = gameState.game.getFen();
      const engineMove = await engine.getBestMove(currentFen);

      // Convert engine move to SAN and apply it
      gameActions.makeMove(engineMove.move);

      if (isVoiceEnabled && speechService) {
        await speechService.speak(`Motore gioca: ${engineMove.move}`);
      }
    } catch (error) {
      console.error("Engine move error:", error);
    } finally {
      setIsEngineThinking(false);
    }
  };

  const startNewGame = () => {
    gameActions.resetGame();
    setGameStarted(true);
    setMoveInput("");

    if (isVoiceEnabled && speechService) {
      const colorText = playerColor === "white" ? "bianco" : "nero";
      speechService.speak(
        `Nuova partita iniziata. Giochi con i pezzi ${colorText} contro ${engineStrength} engine.`,
      );
    }

    // If player is black, let engine make first move
    if (playerColor === "black") {
      setTimeout(() => makeEngineMove(), 1000);
    }
  };

  const handlePlayerMove = async () => {
    if (!gameStarted || !moveInput.trim() || isEngineThinking) return;

    try {
      gameActions.makeMove(moveInput.trim());
      setMoveInput("");

      if (isVoiceEnabled && speechService) {
        await speechService.speak(`Hai giocato: ${moveInput.trim()}`);
      }
    } catch (error) {
      if (isVoiceEnabled && speechService) {
        speechService.speak("Mossa non valida");
      }
    }
  };

  const handleVoiceMove = async () => {
    if (!speechService || !isVoiceEnabled) return;

    setIsListening(true);
    try {
      const voiceInput = await speechService.listen();
      const cleanMove = voiceInput.trim().toLowerCase();

      // Convert common voice patterns to chess notation
      const processedMove = processVoiceMove(cleanMove);

      if (processedMove) {
        setMoveInput(processedMove);
        gameActions.makeMove(processedMove);

        if (isVoiceEnabled && speechService) {
          await speechService.speak(`Hai giocato: ${processedMove}`);
        }
      } else {
        if (isVoiceEnabled && speechService) {
          speechService.speak("Non ho capito la mossa. Riprova.");
        }
      }
    } catch (error) {
      console.error("Voice input error:", error);
    } finally {
      setIsListening(false);
    }
  };

  const processVoiceMove = (voiceInput: string): string | null => {
    // Enhanced voice-to-move conversion for Italian
    let processed = voiceInput
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.,!?]/g, "");

    // Handle Italian voice patterns
    const patterns: Record<string, string> = {
      arroccocorto: "O-O",
      arroccolunga: "O-O-O",
      arrocco: "O-O",
      castling: "O-O",
      castle: "O-O",
      queenside: "O-O-O",
      kingside: "O-O",
    };

    for (const [pattern, move] of Object.entries(patterns)) {
      if (processed.includes(pattern)) {
        return move;
      }
    }

    // Convert Italian piece names to English notation
    const pieceMap: Record<string, string> = {
      re: "K",
      regina: "Q",
      torre: "R",
      alfiere: "B",
      cavallo: "N",
      pedone: "",
    };

    // Replace Italian piece names
    for (const [italian, english] of Object.entries(pieceMap)) {
      processed = processed.replace(italian, english);
    }

    // Handle common voice input patterns
    // e.g., "e quattro" -> "e4", "cavalllo g uno f tre" -> "Ng1f3"
    processed = processed
      .replace(/uno/g, "1")
      .replace(/due/g, "2")
      .replace(/tre/g, "3")
      .replace(/quattro/g, "4")
      .replace(/cinque/g, "5")
      .replace(/sei/g, "6")
      .replace(/sette/g, "7")
      .replace(/otto/g, "8");

    // Handle algebraic notation
    const movePattern =
      /^[a-h][1-8]([a-h][1-8])?$|^[NBRQK][a-h]?[1-8]?x?[a-h][1-8]$/i;
    if (movePattern.test(processed)) {
      return processed;
    }

    // Try to extract coordinates
    const coordPattern = /([a-h]).*?([1-8])/i;
    const match = processed.match(coordPattern);
    if (match) {
      return match[1] + match[2];
    }

    return null;
  };

  const getGameStatus = () => {
    if (!gameStarted) return "Pronto per iniziare";
    if (gameState.isGameOver) return "Partita terminata";
    if (isEngineThinking) return "Motore sta pensando...";

    const currentTurn = gameState.game.getTurn();
    const isPlayerTurn = currentTurn === playerColor;

    return isPlayerTurn ? "Il tuo turno" : "Turno del motore";
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          borderRadius: "16px",
          padding: "2rem",
          minWidth: "500px",
          maxWidth: "600px",
          border: "2px solid #8b5cf6",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ color: "#ffd700", margin: 0 }}>🤖 Partita vs Motore</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Engine Settings */}
        {!gameStarted && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ color: "#8b5cf6", marginBottom: "1rem" }}>
              Impostazioni Partita
            </h3>

            {/* Strength Selection */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  color: "#a0a0a0",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Livello Motore:
              </label>
              <select
                value={engineStrength}
                onChange={(e) =>
                  setEngineStrength(e.target.value as EngineStrength)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "#2d3142",
                  color: "white",
                  border: "1px solid #666",
                  borderRadius: "6px",
                }}
              >
                {Object.keys(ENGINE_PRESETS).map((strength) => (
                  <option key={strength} value={strength}>
                    {engine?.getStrengthInfo(strength as EngineStrength) ||
                      strength}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Selection */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  color: "#a0a0a0",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Gioca con:
              </label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label
                  style={{
                    color: "#a0a0a0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="radio"
                    value="white"
                    checked={playerColor === "white"}
                    onChange={(e) =>
                      setPlayerColor(e.target.value as "white" | "black")
                    }
                  />
                  ♔ Bianco
                </label>
                <label
                  style={{
                    color: "#a0a0a0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="radio"
                    value="black"
                    checked={playerColor === "black"}
                    onChange={(e) =>
                      setPlayerColor(e.target.value as "white" | "black")
                    }
                  />
                  ♚ Nero
                </label>
              </div>
            </div>

            <button
              onClick={startNewGame}
              disabled={!engine?.isEngineReady()}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: engine?.isEngineReady() ? "#10b981" : "#666",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: engine?.isEngineReady() ? "pointer" : "not-allowed",
                fontSize: "1rem",
                fontWeight: "bold",
              }}
            >
              {engine?.isEngineReady()
                ? "🚀 Inizia Partita"
                : "⏳ Caricamento motore..."}
            </button>
          </div>
        )}

        {/* Game Interface */}
        {gameStarted && (
          <div>
            {/* Game Status */}
            <div
              style={{
                backgroundColor: "#2d3142",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#ffd700",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                {getGameStatus()}
              </div>
              {isEngineThinking && (
                <div style={{ color: "#8b5cf6", marginTop: "0.5rem" }}>
                  <div className="thinking-spinner">🤖 Thinking...</div>
                </div>
              )}
            </div>

            {/* Move Input */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <input
                  type="text"
                  value={moveInput}
                  onChange={(e) => setMoveInput(e.target.value)}
                  placeholder="Inserisci mossa (es. e4, Nf3, O-O)"
                  disabled={isEngineThinking || gameState.isGameOver}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#2d3142",
                    color: "white",
                    border: "1px solid #666",
                    borderRadius: "6px",
                  }}
                  onKeyPress={(e) => e.key === "Enter" && handlePlayerMove()}
                />
                <button
                  onClick={handlePlayerMove}
                  disabled={
                    !moveInput.trim() ||
                    isEngineThinking ||
                    gameState.isGameOver
                  }
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  ➤
                </button>
              </div>

              {/* Voice Input */}
              {isVoiceEnabled && (
                <button
                  onClick={handleVoiceMove}
                  disabled={
                    isListening || isEngineThinking || gameState.isGameOver
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: isListening ? "#ef4444" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {isListening ? "🎤 Ascoltando..." : "🎤 Mossa Vocale"}
                </button>
              )}
            </div>

            {/* Game Actions */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={startNewGame}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                🔄 Nuova Partita
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                🚪 Esci
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "rgba(139,92,246,0.1)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "#a0a0a0",
          }}
        >
          <strong style={{ color: "#8b5cf6" }}>💡 Istruzioni Blindfold:</strong>
          <ul style={{ margin: "0.5rem 0", paddingLeft: "1rem" }}>
            <li>Usa notazione algebrica: e4, Nf3, O-O, Qxd5</li>
            <li>Comandi vocali disponibili per inserire mosse</li>
            <li>La scacchiera può essere nascosta (tasto B)</li>
            <li>Usa tasto V per attivare comandi vocali</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
