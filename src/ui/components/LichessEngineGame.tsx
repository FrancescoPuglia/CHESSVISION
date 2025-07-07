// src/ui/components/LichessEngineGame.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { LICHESS_LEVELS } from "@services/engine/LichessEngineAPI";
import {
  lichessAPI,
  LichessGameEvent,
  testLichessAccess,
} from "@services/engine/LichessAPIService";
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
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isProcessingVoice = useRef(false);
  const gameRef = useRef<string | null>(null);
  const streamRef = useRef<boolean>(false);

  // Inizializza gioco con vera API Lichess
  const startGame = async () => {
    setIsConnecting(true);
    setStatus("🔄 Verifica connessione Lichess...");

    try {
      // 1. Prima testa la connessione e il token
      const connectionTest = await lichessAPI.testConnection();
      if (!connectionTest.success) {
        throw new Error(connectionTest.error || "Errore di connessione");
      }

      setStatus("🔄 Connessione verificata, creazione partita...");

      // 2. Reset scacchiera locale PRIMA di iniziare
      gameActions.resetGame();

      // 3. Crea sfida AI su Lichess
      const timeLimit = 600; // 10 minuti
      const increment = 0;
      const gameData = await lichessAPI.challengeAI(
        selectedLevel,
        timeLimit,
        increment,
        playerColor,
      );

      const gameId = gameData.id;
      gameRef.current = gameId;
      setLichessGameId(gameId);

      setGameStarted(true);
      setIsConnecting(false);
      setStatus("✅ Connesso! Gioca contro Stockfish VERO di Lichess");

      // Annuncia l'inizio della partita
      if (speechService && isVoiceEnabled) {
        const colorText = playerColor === "white" ? "bianco" : "nero";
        const levelInfo =
          LICHESS_LEVELS[selectedLevel]?.name || `Livello ${selectedLevel}`;
        await speechService.speak(
          `Partita iniziata contro Stockfish ${levelInfo} di Lichess. ` +
            `Giochi con i pezzi ${colorText}. ` +
            `${continuousListening ? "Microfono sempre attivo." : ""}`,
        );
      }

      // Avvia streaming degli eventi del gioco
      if (!streamRef.current) {
        streamRef.current = true;
        lichessAPI.streamGame(gameId, handleLichessEvent);
      }

      // Se il giocatore è bianco, chiedi la prima mossa
      if (playerColor === "white" && speechService && isVoiceEnabled) {
        await speechService.speak("Tocca a te, quale mossa vuoi fare?");
      }
    } catch (error: any) {
      console.error("Failed to start Lichess game:", error);

      // Test diagnostico per capire il problema
      const diagnostic = await testLichessAccess();
      console.log("🔍 Diagnostic results:", diagnostic);

      let errorMessage = "❌ Errore connessione Lichess";
      if (diagnostic.corsIssue) {
        errorMessage = "❌ CORS Error: Browser blocca connessione Lichess";
      } else if (diagnostic.tokenIssue) {
        errorMessage = "❌ Token non valido o scaduto";
      } else if (diagnostic.networkIssue) {
        errorMessage = "❌ Errore di rete - verifica connessione";
      } else {
        errorMessage = `❌ ${error.message}`;
      }

      setStatus(errorMessage);
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

  // Gestisce eventi dal stream Lichess
  const handleLichessEvent = useCallback(
    async (event: LichessGameEvent) => {
      try {
        if (event.type === "gameFull") {
          // Evento iniziale con stato completo del gioco
          console.log("🎮 Gioco iniziato:", event);

          // Applica le mosse se ce ne sono
          if (event.state?.moves) {
            const moves = event.state.moves
              .trim()
              .split(" ")
              .filter((m) => m);
            for (const move of moves) {
              applyUCIMove(move);
            }
          }

          // Determina se è il nostro turno
          if (event.state) {
            updateGameStatus({
              type: "gameState",
              moves: event.state.moves,
              wtime: event.state.wtime,
              btime: event.state.btime,
              status: event.state.status,
              winner: event.state.winner,
            });
          }
        } else if (event.type === "gameState") {
          // Aggiornamento stato (nuova mossa, fine gioco, etc.)
          console.log("📥 Aggiornamento gioco:", event);

          // Applica tutte le mosse dal server (rebuilding approach)
          gameActions.resetGame();
          if (event.moves) {
            const moves = event.moves
              .trim()
              .split(" ")
              .filter((m) => m);
            for (const move of moves) {
              applyUCIMove(move);
            }

            // Se c'è una nuova mossa, è dell'avversario
            if (moves.length > 0) {
              const lastMove = moves[moves.length - 1];
              const lastMoveSAN = convertUCItoSAN(lastMove);
              if (lastMoveSAN) {
                await speakMove(lastMoveSAN);
              }
            }
          }

          updateGameStatus({
            type: "gameState",
            moves: event.moves || "",
            wtime: event.wtime || 0,
            btime: event.btime || 0,
            status: event.status || "started",
            winner: event.winner,
          });
        }
      } catch (error) {
        console.error("Errore gestione evento Lichess:", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameActions, speakMove],
  );

  // Applica una mossa UCI alla scacchiera locale
  const applyUCIMove = useCallback(
    (uciMove: string) => {
      try {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.substring(4, 5);

        const chess = gameState.game.getInternalChess();
        const moveObj: any = { from, to };
        if (promotion) moveObj.promotion = promotion;

        const moveResult = chess.move(moveObj);
        if (moveResult) {
          gameActions.makeMove(moveResult.san);
        }
      } catch (e) {
        console.error("Errore applicazione mossa UCI:", e);
      }
    },
    [gameState.game, gameActions],
  );

  // Converte UCI in SAN per l'audio
  const convertUCItoSAN = useCallback(
    (uciMove: string): string | null => {
      try {
        const chess = gameState.game.getInternalChess();
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.substring(4, 5);

        const moveObj: any = { from, to };
        if (promotion) moveObj.promotion = promotion;

        const moveResult = chess.move(moveObj);
        chess.undo(); // Undo per non modificare lo stato
        return moveResult?.san || null;
      } catch (e) {
        return null;
      }
    },
    [gameState.game],
  );

  // Aggiorna lo status del gioco
  const updateGameStatus = useCallback(
    async (gameStateData: {
      type: string;
      moves: string;
      wtime: number;
      btime: number;
      status: string;
      winner?: string;
    }) => {
      setIsEngineThinking(false);

      if (gameStateData.status === "started") {
        // Determina di chi è il turno
        const moves = gameStateData.moves
          .trim()
          .split(" ")
          .filter((m) => m);
        const isWhiteTurn = moves.length % 2 === 0;
        const isMyTurn =
          (playerColor === "white" && isWhiteTurn) ||
          (playerColor === "black" && !isWhiteTurn);

        if (isMyTurn) {
          setStatus("✅ Tocca a te!");
          if (speechService && isVoiceEnabled) {
            await speechService.speak("Tocca a te, quale mossa vuoi fare?");
          }
        } else {
          setStatus("⏳ Stockfish sta pensando...");
          setIsEngineThinking(true);
        }
      } else {
        // Gioco finito
        let resultMessage = "Partita terminata";
        if (gameStateData.status === "mate") {
          const winner = gameStateData.winner === "white" ? "Bianco" : "Nero";
          resultMessage = `Scacco matto! Vince ${winner}`;
        } else if (gameStateData.status === "resign") {
          resultMessage = "Partita terminata per abbandono";
        } else if (gameStateData.status === "draw") {
          resultMessage = "Partita patta";
        }

        setStatus(`🏁 ${resultMessage}`);
        setGameStarted(false);

        if (speechService && isVoiceEnabled) {
          await speechService.speak(resultMessage);
        }
      }
    },
    [playerColor, speechService, isVoiceEnabled],
  );

  // Gestisce mosse del giocatore
  const handlePlayerMove = useCallback(
    async (move: { from: string; to: string; san: string }) => {
      if (!gameStarted || !gameRef.current || isEngineThinking) return;

      console.log(`📤 Invio mossa a Lichess: ${move.san}`);

      // Converti in UCI
      const uciMove = `${move.from}${move.to}`;

      try {
        const success = await lichessAPI.makeMove(gameRef.current, uciMove);

        if (success) {
          // Annuncia la mossa del giocatore
          await speakMove(move.san);
          setStatus("⏳ Stockfish sta pensando...");
          setIsEngineThinking(true);
        } else {
          // Mossa non accettata - ripristina la posizione
          gameActions.undoMove();
          setStatus("❌ Mossa non valida");
          await speakMessage("Mossa non valida, riprova");
        }
      } catch (error) {
        console.error("Errore invio mossa:", error);
        gameActions.undoMove();
        setStatus("❌ Errore connessione");
        await speakMessage("Errore di connessione");
      }
    },
    [gameStarted, isEngineThinking, speakMove, speakMessage, gameActions],
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
                // La mossa viene inviata a Lichess via handlePlayerMove
                const moveObj = {
                  from: move.substring(0, 2),
                  to: move.substring(2, 4),
                  san: move,
                };
                await handlePlayerMove(moveObj);
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
      handlePlayerMove,
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

  // Cleanup Lichess API
  useEffect(() => {
    return () => {
      if (gameRef.current && streamRef.current) {
        lichessAPI.stopGameStream(gameRef.current);
        streamRef.current = false;
      }
    };
  }, []);

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
            🎮 Stockfish Professionale
          </h2>
          <button
            onClick={async () => {
              if (gameStarted && gameRef.current) {
                await lichessAPI.resign(gameRef.current);
                setGameStarted(false);
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
              Motore Stockfish professionale con livelli calibrati - Forza
              reale!
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
                  onClick={async () => {
                    if (gameRef.current) {
                      await lichessAPI.resign(gameRef.current);
                      setGameStarted(false);
                    }
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

            {/* Info motore */}
            {lichessGameId && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <div
                  style={{
                    color: "#81b64c",
                    fontSize: "0.9rem",
                  }}
                >
                  🚀 Motore: Stockfish{" "}
                  {LICHESS_LEVELS[selectedLevel]?.name ||
                    `Livello ${selectedLevel}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
