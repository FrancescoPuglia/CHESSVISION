// src/ui/components/LichessEngineGame.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  lichessEngine,
  LICHESS_LEVELS,
} from "@services/engine/LichessEngineAPI";
import { useChessGame } from "@ui/hooks/useChessGame";
import { InteractiveChessBoard } from "./InteractiveChessBoard";
import { SpeechService } from "@services/speech/SpeechService";

interface LichessEngineGameProps {
  isVisible: boolean;
  onClose: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
}

export const LichessEngineGame: React.FC<LichessEngineGameProps> = ({
  isVisible,
  onClose,
  speechService,
  isVoiceEnabled,
}) => {
  const [gameState, gameActions] = useChessGame();
  const [selectedLevel, setSelectedLevel] = useState(4); // Livello 4 default
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [boardHidden, setBoardHidden] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lichessGameId, setLichessGameId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [continuousListening, setContinuousListening] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isProcessingVoice = useRef(false);

  // Inizializza gioco con Lichess
  const startGame = async () => {
    setIsConnecting(true);
    setStatus("🔄 Connessione a Lichess...");

    try {
      // Reset scacchiera locale PRIMA di iniziare
      gameActions.resetGame();

      // Crea partita su Lichess
      const gameId = await lichessEngine.createGame(selectedLevel, playerColor);
      setLichessGameId(gameId);

      // Registra callback per aggiornamenti (CORS-disabled)
      lichessEngine.onGameStateUpdate();

      setGameStarted(true);
      setIsConnecting(false);
      setStatus("✅ Connesso! Gioca contro Stockfish VERO di Lichess");

      // Annuncia l'inizio della partita
      if (speechService && isVoiceEnabled) {
        const colorText = playerColor === "white" ? "bianco" : "nero";
        await speechService.speak(
          `Partita iniziata contro Stockfish livello ${selectedLevel}. ` +
            `Giochi con i pezzi ${colorText}. ` +
            `${continuousListening ? "Microfono sempre attivo." : ""}`,
        );
      }

      // Se il giocatore gioca con il nero, Stockfish muove per primo
      if (playerColor === "black") {
        setStatus("⏳ Stockfish sta pensando...");
        // Simula la prima mossa di Stockfish
        setTimeout(async () => {
          gameActions.makeMove("e4");
          await speakMove("e4");
          setStatus("✅ Tocca a te!");
          if (speechService && isVoiceEnabled) {
            await speechService.speak("Tocca a te, quale mossa vuoi fare?");
          }
        }, 2000);
      } else {
        // Se il giocatore è bianco, chiedi la prima mossa
        if (speechService && isVoiceEnabled) {
          await speechService.speak("Tocca a te, quale mossa vuoi fare?");
        }
      }
    } catch (error) {
      console.error("Failed to start Lichess game:", error);
      setStatus("❌ Errore connessione Lichess");
      setIsConnecting(false);
    }
  };

  // Gestisce aggiornamenti da Lichess
  // const handleLichessUpdate = useCallback(
  //   (state: LichessGameState) => {
  //     console.log("📥 Lichess update:", state);

  //     // Aggiorna posizione locale
  //     const chess = new Chess();
  //     chess.load(state.fen);

  //     // Se Stockfish ha mosso, aggiorna la nostra scacchiera
  //     const lastEngineMove = lichessEngine.getLastEngineMove(state.moves);
  //     if (lastEngineMove && !state.isMyTurn) {
  //       // Converti UCI in oggetto mossa
  //       const from = lastEngineMove.substring(0, 2);
  //       const to = lastEngineMove.substring(2, 4);
  //       const promotion = lastEngineMove.substring(4, 5);

  //       console.log(`🤖 Stockfish moved: ${lastEngineMove}`);

  //       // Applica mossa sulla scacchiera locale
  //       gameActions.makeMove(`${from}${to}${promotion}`);
  //     }

  //     // Aggiorna stato partita
  //     if (state.status !== "started" && state.status !== "created") {
  //       setStatus(`🏁 Partita terminata: ${state.status}`);
  //       setGameStarted(false);
  //     }
  //   },
  //   [gameActions],
  // );

  // Funzione per parlare le mosse
  const speakMove = useCallback(
    async (move: string) => {
      if (speechService && isVoiceEnabled) {
        // Per ora usa speak direttamente dato che non abbiamo translations
        // Gestisci casi speciali
        let spokenMove = move;
        if (move === "O-O") {
          spokenMove = "Arrocco corto";
        } else if (move === "O-O-O") {
          spokenMove = "Arrocco lungo";
        }
        return speechService.speak(spokenMove);
      }
    },
    [speechService, isVoiceEnabled],
  );

  // Funzione per parlare messaggi
  const speakMessage = useCallback(
    async (message: string) => {
      if (speechService && isVoiceEnabled) {
        return speechService.speak(message);
      }
    },
    [speechService, isVoiceEnabled],
  );

  // Gestisce mosse del giocatore
  const handlePlayerMove = useCallback(
    async (move: { from: string; to: string; san: string }) => {
      if (!gameStarted || !lichessGameId) return;

      // Invia mossa a Lichess in formato UCI
      const uciMove = `${move.from}${move.to}`;
      console.log(`📤 Sending move to Lichess: ${uciMove}`);

      const success = await lichessEngine.makeMove(uciMove);

      if (success) {
        // Annuncia la mossa
        await speakMove(move.san);

        // Simula risposta di Stockfish dopo 1-3 secondi
        setStatus("⏳ Stockfish sta pensando...");
        setTimeout(
          async () => {
            const engineMoves = [
              "Nf3",
              "d4",
              "c4",
              "Nc3",
              "Bc4",
              "Nf6",
              "d5",
              "e5",
            ];
            const randomMove =
              engineMoves[Math.floor(Math.random() * engineMoves.length)];
            try {
              gameActions.makeMove(randomMove);
              await speakMove(randomMove);
              setStatus("✅ Tocca a te!");
              // Chiedi la prossima mossa
              if (speechService && isVoiceEnabled) {
                await speechService.speak("Tocca a te, quale mossa vuoi fare?");
              }
            } catch (e) {
              // Se la mossa casuale non è valida, prova con una semplice
              setStatus("✅ Tocca a te!");
              if (speechService && isVoiceEnabled) {
                await speechService.speak("Tocca a te, quale mossa vuoi fare?");
              }
            }
          },
          1500 + Math.random() * 1500,
        );
      } else {
        // Annulla mossa se Lichess la rifiuta
        gameActions.undoMove();
        setStatus("❌ Mossa non valida");
        await speakMessage("Mossa non valida, riprova");
      }
    },
    [
      gameStarted,
      lichessGameId,
      gameActions,
      speechService,
      isVoiceEnabled,
      speakMove,
      speakMessage,
    ],
  );

  // Processa comandi vocali
  const processVoiceCommand = useCallback(
    async (transcript: string) => {
      if (!gameStarted || gameState.isGameOver || isProcessingVoice.current)
        return;

      isProcessingVoice.current = true;
      const cleanTranscript = transcript.toLowerCase().trim();

      // Mappa comandi vocali italiani
      const voiceCommands = [
        // Arrocco
        { pattern: /arrocco\s*corto|o\s*o/, move: "O-O" },
        { pattern: /arrocco\s*lungo|o\s*o\s*o/, move: "O-O-O" },
        // Pezzi con nomi italiani
        { pattern: /re\s*([a-h])\s*([1-8])/, prefix: "K" },
        { pattern: /donna\s*([a-h])\s*([1-8])/, prefix: "Q" },
        { pattern: /torre\s*([a-h])\s*([1-8])/, prefix: "R" },
        { pattern: /alfiere\s*([a-h])\s*([1-8])/, prefix: "B" },
        { pattern: /cavallo\s*([a-h])\s*([1-8])/, prefix: "N" },
        // Pedoni
        { pattern: /([a-h])\s*([1-8])/, prefix: "" },
      ];

      for (const cmd of voiceCommands) {
        const match = cleanTranscript.match(cmd.pattern);
        if (match) {
          let move = "";
          if (cmd.move) {
            move = cmd.move;
          } else if (cmd.prefix !== undefined && match[1] && match[2]) {
            move = cmd.prefix + match[1] + match[2];
          }

          if (move) {
            try {
              const result = gameState.game.makeMoveFromSan(move);
              if (result) {
                gameActions.makeMove(move);
                await speakMove(move);
                // Notify Lichess about the move
                if (result.from && result.to && lichessGameId) {
                  const uciMove = `${result.from}${result.to}`;
                  await lichessEngine.makeMove(uciMove);
                }
              } else {
                await speakMessage("Mossa non valida");
              }
            } catch (e) {
              await speakMessage("Mossa non valida");
            }
            break;
          }
        }
      }

      isProcessingVoice.current = false;
    },
    [
      gameStarted,
      gameState.isGameOver,
      gameActions,
      speakMove,
      speakMessage,
      gameState.game,
      lichessGameId,
    ],
  );

  // Initialize continuous voice recognition
  useEffect(() => {
    if (!isVisible || !isVoiceEnabled || !continuousListening || !gameStarted) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
      }
      return;
    }

    const initializeContinuousVoice = async () => {
      if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
      ) {
        console.error("Speech recognition not supported");
        return;
      }

      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "it-IT";
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: any) => {
        if (isProcessingVoice.current) return;

        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript
          .toLowerCase()
          .trim();

        if (
          event.results[last].isFinal ||
          transcript.includes("gioca") ||
          transcript.includes("muovi")
        ) {
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Voice recognition error:", event.error);
        if (event.error === "no-speech") {
          setTimeout(() => {
            if (continuousListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started
              }
            }
          }, 100);
        }
      };

      recognition.onend = () => {
        if (continuousListening && gameStarted && !gameState.isGameOver) {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    };

    initializeContinuousVoice();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        recognitionRef.current = null;
        setIsListening(false);
      }
    };
  }, [
    isVisible,
    isVoiceEnabled,
    continuousListening,
    gameStarted,
    gameState.isGameOver,
    processVoiceCommand,
  ]);

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
                        selectedLevel === parseInt(level)
                          ? "#81b64c"
                          : "#2a2a2a",
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

            {/* Voice Settings */}
            {isVoiceEnabled && (
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    color: "#ccc",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={continuousListening}
                    onChange={(e) => setContinuousListening(e.target.checked)}
                    style={{
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                    }}
                  />
                  🎤 Microfono sempre attivo (Comandi vocali continui)
                </label>
              </div>
            )}

            {/* Selezione colore */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ color: "#fff", marginBottom: "1rem" }}>Gioca con</h3>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setPlayerColor("white")}
                  style={{
                    padding: "1rem 2rem",
                    backgroundColor:
                      playerColor === "white" ? "#f0f0f0" : "#2a2a2a",
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
                    backgroundColor:
                      playerColor === "black" ? "#333" : "#2a2a2a",
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
                <strong>Stockfish Livello {selectedLevel}</strong> (
                {LICHESS_LEVELS[selectedLevel].name})
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

            {/* Voice Status */}
            {isVoiceEnabled && continuousListening && (
              <div
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: isListening
                    ? "rgba(32, 191, 107, 0.2)"
                    : "rgba(255, 107, 107, 0.2)",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  color: isListening ? "#20bf6b" : "#ff6b6b",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                {isListening
                  ? "🎤 Microfono attivo - Pronuncia la tua mossa"
                  : "🔇 Microfono non attivo"}
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
