// src/ui/components/LichessEngineGame.tsx
import React, { useState, useEffect, useCallback } from "react";
import { lichessEngine, LichessGameState, LICHESS_LEVELS } from "@services/engine/LichessEngineAPI";
import { useChessGame } from "@ui/hooks/useChessGame";
import { InteractiveChessBoard } from "./InteractiveChessBoard";
import { Chess } from "chess.js";

interface LichessEngineGameProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LichessEngineGame: React.FC<LichessEngineGameProps> = ({
  isVisible,
  onClose,
}) => {
  const [gameState, gameActions] = useChessGame();
  const [selectedLevel, setSelectedLevel] = useState(4); // Livello 4 default
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [boardHidden, setBoardHidden] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lichessGameId, setLichessGameId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  // Inizializza gioco con Lichess
  const startGame = async () => {
    setIsConnecting(true);
    setStatus("🔄 Connessione a Lichess...");
    
    try {
      // Crea partita su Lichess
      const gameId = await lichessEngine.createGame(selectedLevel, playerColor);
      setLichessGameId(gameId);
      
      // Registra callback per aggiornamenti
      lichessEngine.onGameStateUpdate((state: LichessGameState) => {
        handleLichessUpdate(state);
      });
      
      setGameStarted(true);
      setIsConnecting(false);
      setStatus("✅ Connesso! Gioca contro Stockfish VERO di Lichess");
      
      // Reset scacchiera locale
      gameActions.resetGame();
      
    } catch (error) {
      console.error("Failed to start Lichess game:", error);
      setStatus("❌ Errore connessione Lichess");
      setIsConnecting(false);
    }
  };

  // Gestisce aggiornamenti da Lichess
  const handleLichessUpdate = useCallback((state: LichessGameState) => {
    console.log("📥 Lichess update:", state);
    
    // Aggiorna posizione locale
    const chess = new Chess();
    chess.load(state.fen);
    
    // Se Stockfish ha mosso, aggiorna la nostra scacchiera
    const lastEngineMove = lichessEngine.getLastEngineMove(state.moves);
    if (lastEngineMove && !state.isMyTurn) {
      // Converti UCI in oggetto mossa
      const from = lastEngineMove.substring(0, 2);
      const to = lastEngineMove.substring(2, 4);
      const promotion = lastEngineMove.substring(4, 5);
      
      console.log(`🤖 Stockfish moved: ${lastEngineMove}`);
      
      // Applica mossa sulla scacchiera locale
      gameActions.makeMove(`${from}${to}${promotion}`);
    }
    
    // Aggiorna stato partita
    if (state.status !== "started" && state.status !== "created") {
      setStatus(`🏁 Partita terminata: ${state.status}`);
      setGameStarted(false);
    }
  }, [gameActions]);

  // Gestisce mosse del giocatore
  const handlePlayerMove = useCallback(async (move: { from: string; to: string; san: string }) => {
    if (!gameStarted || !lichessGameId) return;
    
    // Invia mossa a Lichess in formato UCI
    const uciMove = `${move.from}${move.to}`;
    console.log(`📤 Sending move to Lichess: ${uciMove}`);
    
    const success = await lichessEngine.makeMove(uciMove);
    
    if (!success) {
      // Annulla mossa se Lichess la rifiuta
      gameActions.undoMove();
      setStatus("❌ Mossa non valida");
    }
  }, [gameStarted, lichessGameId, gameActions]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameStarted) {
        lichessEngine.destroy();
      }
    };
  }, [gameStarted]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#161512",
          borderRadius: "16px",
          padding: "2rem",
          maxWidth: "1000px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.8rem" }}>
            🎮 Gioca contro Stockfish di Lichess
          </h2>
          <button
            onClick={() => {
              if (gameStarted) {
                lichessEngine.resign();
              }
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.5rem",
            }}
          >
            ✕
          </button>
        </div>

        {!gameStarted ? (
          // Setup iniziale
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ccc", marginBottom: "2rem" }}>
              Gioca contro il VERO Stockfish di Lichess - Nessuna simulazione!
            </p>

            {/* Selezione livello */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ color: "#fff", marginBottom: "1rem" }}>
                Seleziona Livello Stockfish
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.5rem",
                }}
              >
                {Object.entries(LICHESS_LEVELS).map(([level, info]) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(parseInt(level))}
                    style={{
                      padding: "1rem",
                      backgroundColor:
                        selectedLevel === parseInt(level) ? "#81b64c" : "#2a2a2a",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                      Livello {level}
                    </div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                      {info.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selezione colore */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ color: "#fff", marginBottom: "1rem" }}>
                Gioca con
              </h3>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button
                  onClick={() => setPlayerColor("white")}
                  style={{
                    padding: "1rem 2rem",
                    backgroundColor: playerColor === "white" ? "#f0f0f0" : "#2a2a2a",
                    color: playerColor === "white" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ♔ Bianco
                </button>
                <button
                  onClick={() => setPlayerColor("black")}
                  style={{
                    padding: "1rem 2rem",
                    backgroundColor: playerColor === "black" ? "#333" : "#2a2a2a",
                    color: "#fff",
                    border: "2px solid #666",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ♚ Nero
                </button>
              </div>
            </div>

            {/* Pulsante start */}
            <button
              onClick={startGame}
              disabled={isConnecting}
              style={{
                padding: "1rem 3rem",
                backgroundColor: "#81b64c",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.2rem",
                fontWeight: "bold",
                cursor: isConnecting ? "not-allowed" : "pointer",
                opacity: isConnecting ? 0.6 : 1,
              }}
            >
              {isConnecting ? "⏳ Connessione..." : "🚀 Inizia Partita"}
            </button>

            {status && (
              <p style={{ color: "#81b64c", marginTop: "1rem" }}>{status}</p>
            )}
          </div>
        ) : (
          // Partita in corso
          <div>
            {/* Controlli partita */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                padding: "1rem",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
              }}
            >
              <div style={{ color: "#fff" }}>
                <strong>Stockfish Livello {selectedLevel}</strong> ({LICHESS_LEVELS[selectedLevel].name})
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={() => setBoardHidden(!boardHidden)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: boardHidden ? "#81b64c" : "#666",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {boardHidden ? "👁️ Mostra" : "🙈 Blindfold"}
                </button>
                <button
                  onClick={() => {
                    lichessEngine.resign();
                    setGameStarted(false);
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#d32f2f",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  🏳️ Abbandona
                </button>
              </div>
            </div>

            {/* Status */}
            {status && (
              <div
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgba(129, 182, 76, 0.2)",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  color: "#81b64c",
                  textAlign: "center",
                }}
              >
                {status}
              </div>
            )}

            {/* Scacchiera */}
            <InteractiveChessBoard
              position={gameState.game.getBoard()}
              isVisible={!boardHidden}
              onMove={handlePlayerMove}
              allowMoves={gameStarted}
              game={gameState.game}
              showCoordinates={true}
            />

            {/* Link partita Lichess */}
            {lichessGameId && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <a
                  href={`https://lichess.org/${lichessGameId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#81b64c",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                  }}
                >
                  📺 Vedi partita su Lichess →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};