// src/ui/components/ProfessionalEngineGame.tsx
/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, react/no-unescaped-entities, no-empty-pattern */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { StockfishNNUE, stockfishNNUE } from "@services/engine/StockfishNNUE";
import { useChessGame } from "@ui/hooks/useChessGame";
import { SpeechService } from "@services/speech/SpeechService";
import { InteractiveChessBoard } from "./InteractiveChessBoard";
import { useTranslation } from "@core/i18n/useTranslation";
import { Chess } from "chess.js";

interface ProfessionalEngineGameProps {
  isVisible: boolean;
  onClose: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
}

interface VoiceCommand {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => void;
}

export const ProfessionalEngineGame: React.FC<ProfessionalEngineGameProps> = ({
  isVisible,
  onClose,
  speechService,
  isVoiceEnabled,
}) => {
  const {} = useTranslation();
  const [gameState, gameActions] = useChessGame();
  const [engine, setEngine] = useState<StockfishNNUE | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("intermediate-1"); // Start with intermediate level
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [moveInput, setMoveInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [continuousListening, setContinuousListening] = useState(true);
  const [boardHidden, setBoardHidden] = useState(false);
  const [showEvaluation] = useState(true);
  const [engineEvaluation, setEngineEvaluation] = useState<string>("");
  const [gameStats, setGameStats] = useState({
    playerMoves: 0,
    engineMoves: 0,
    avgThinkTime: 0,
    accuracy: 100,
  });

  const engineRef = useRef<StockfishNNUE | null>(null);
  const recognitionRef = useRef<any>(null);
  const isProcessingVoice = useRef(false);
  // const voiceQueueRef = useRef<string[]>([]);

  // Move confirmation states
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);

  // Initialize professional engine
  useEffect(() => {
    if (!isVisible) return;

    const initEngine = async () => {
      try {
        console.log("🔧 Initializing Stockfish NNUE v17...");
        await stockfishNNUE.initialize();
        console.log("✅ Stockfish NNUE initialized successfully");
        setEngine(stockfishNNUE);
        engineRef.current = stockfishNNUE;

        stockfishNNUE.onEvaluation((info: string) => {
          // Parse engine evaluation info
          if (info.includes("score cp")) {
            const cpMatch = info.match(/score cp (-?\d+)/);
            if (cpMatch) {
              const centipawns = parseInt(cpMatch[1]);
              const evaluation = (centipawns / 100).toFixed(2);
              setEngineEvaluation(`Eval: ${evaluation}`);
            }
          }
        });
      } catch (error) {
        console.error("❌ Failed to initialize NNUE engine:", error);
        console.log("🔄 Engine initialization failed");
      }
    };

    initEngine();

    return () => {
      // Don't destroy singleton, just reset reference
      setEngine(null);
      engineRef.current = null;
    };
  }, [isVisible]);

  // Initialize continuous voice recognition
  useEffect(() => {
    if (!isVisible || !isVoiceEnabled || !continuousListening) {
      // Clean up if switching to manual mode
      if (recognitionRef.current && !continuousListening) {
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

        // Only process final results or clear commands
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
          // Restart recognition after no speech
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
        // Automatically restart if continuous listening is enabled
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

      // Start listening
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
  ]);

  // Move confirmation functions
  const confirmMove = useCallback(async () => {
    if (!pendingMove) return;

    try {
      gameActions.makeMove(pendingMove);
      setGameStats((prev) => ({
        ...prev,
        playerMoves: prev.playerMoves + 1,
      }));

      if (speechService && isVoiceEnabled) {
        await speechService.speak(`Hai giocato: ${pendingMove}`);
      }
    } catch (error) {
      if (speechService && isVoiceEnabled) {
        await speechService.speak("Errore nell'eseguire la mossa");
      }
    } finally {
      setPendingMove(null);
      setIsWaitingConfirmation(false);
    }
  }, [pendingMove, gameActions, speechService, isVoiceEnabled]);

  const cancelMove = useCallback(async () => {
    if (speechService && isVoiceEnabled) {
      await speechService.speak("Mossa annullata");
    }
    setPendingMove(null);
    setIsWaitingConfirmation(false);
  }, [speechService, isVoiceEnabled]);

  // Voice command processor
  const processVoiceCommand = useCallback(
    async (transcript: string) => {
      if (!gameStarted || gameState.isGameOver || isEngineThinking) return;

      isProcessingVoice.current = true;

      // Clean and process transcript
      const cleanTranscript = transcript
        .toLowerCase()
        .replace(/[.,!?]/g, "")
        .trim();

      // Handle confirmation commands when waiting for confirmation
      if (isWaitingConfirmation) {
        if (
          cleanTranscript.includes("confermo") ||
          cleanTranscript.includes("conferma") ||
          cleanTranscript.includes("sì") ||
          cleanTranscript.includes("si")
        ) {
          await confirmMove();
          isProcessingVoice.current = false;
          return;
        } else if (
          cleanTranscript.includes("annulla") ||
          cleanTranscript.includes("no") ||
          cleanTranscript.includes("cancella")
        ) {
          await cancelMove();
          isProcessingVoice.current = false;
          return;
        }
      }

      // Voice commands mapping
      const voiceCommands: VoiceCommand[] = [
        // Special moves
        {
          pattern: /arrocco\s*corto|o\s*o/,
          handler: () => makeVoiceMove("O-O"),
        },
        {
          pattern: /arrocco\s*lungo|o\s*o\s*o/,
          handler: () => makeVoiceMove("O-O-O"),
        },

        // Piece moves with Italian names
        {
          pattern: /re\s*([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`K${m[1]}${m[2]}`),
        },
        {
          pattern: /regina\s*([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`Q${m[1]}${m[2]}`),
        },
        {
          pattern: /torre\s*([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`R${m[1]}${m[2]}`),
        },
        {
          pattern: /alfiere\s*([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`B${m[1]}${m[2]}`),
        },
        {
          pattern: /cavallo\s*([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`N${m[1]}${m[2]}`),
        },

        // Pawn moves
        {
          pattern: /([a-h])\s*([1-8])/,
          handler: (m) => makeVoiceMove(`${m[1]}${m[2]}`),
        },

        // Commands
        { pattern: /nuova\s*partita/, handler: () => startNewGame() },
        { pattern: /abbandona|mi\s*arrendo/, handler: () => resignGame() },
        {
          pattern: /nascondi\s*scacchiera/,
          handler: () => setBoardHidden(true),
        },
        {
          pattern: /mostra\s*scacchiera/,
          handler: () => setBoardHidden(false),
        },
      ];

      // Convert Italian numbers to digits
      const numberMap: Record<string, string> = {
        uno: "1",
        due: "2",
        tre: "3",
        quattro: "4",
        cinque: "5",
        sei: "6",
        sette: "7",
        otto: "8",
      };

      let processedTranscript = cleanTranscript;
      for (const [word, digit] of Object.entries(numberMap)) {
        processedTranscript = processedTranscript.replace(
          new RegExp(word, "g"),
          digit,
        );
      }

      // Try to match commands
      let commandExecuted = false;
      for (const command of voiceCommands) {
        const match = processedTranscript.match(command.pattern);
        if (match) {
          command.handler(match);
          commandExecuted = true;
          break;
        }
      }

      if (!commandExecuted && speechService) {
        await speechService.speak("Non ho capito la mossa. Riprova.");
      }

      setTimeout(() => {
        isProcessingVoice.current = false;
      }, 500);
    },
    [
      gameStarted,
      gameState.isGameOver,
      isEngineThinking,
      speechService,
      isWaitingConfirmation,
      confirmMove,
      cancelMove,
    ],
  );

  const makeVoiceMove = async (move: string) => {
    try {
      // Check if the move is valid before asking for confirmation
      const testGame = new Chess(gameState.game.getFen());
      const isValidMove = testGame.move(move);

      if (!isValidMove) {
        if (speechService && isVoiceEnabled) {
          await speechService.speak("Mossa non valida");
        }
        return;
      }

      // Request confirmation for the move
      setPendingMove(move);
      setIsWaitingConfirmation(true);

      if (speechService && isVoiceEnabled) {
        await speechService.speak(
          `Vuoi giocare ${move}? Dì "confermo" o "annulla"`,
        );
      }
    } catch (error) {
      if (speechService && isVoiceEnabled) {
        await speechService.speak("Mossa non valida");
      }
    }
  };

  // Manual voice control functions for on-demand mode
  const startListening = useCallback(() => {
    if (!isVoiceEnabled || isListening || !speechService) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "it-IT";

    recognition.addEventListener("start", () => {
      setIsListening(true);
    });

    recognition.addEventListener("result", (event: any) => {
      const result = event.results[0];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim().toLowerCase();
        processVoiceCommand(transcript);
      }
    });

    recognition.addEventListener("error", (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    });

    recognition.addEventListener("end", () => {
      setIsListening(false);
    });

    recognition.start();
    recognitionRef.current = recognition;
  }, [isVoiceEnabled, isListening, speechService]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

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
    gameState.isGameOver,
    gameState.game,
  ]);

  const makeEngineMove = async () => {
    if (!engine || isEngineThinking) return;

    console.log(`🤖 Engine making move at level: ${selectedLevel}`);
    setIsEngineThinking(true);
    const startTime = Date.now();

    try {
      const currentFen = gameState.game.getFen();
      console.log(`🔍 Analyzing position: ${currentFen}`);
      const engineMove = await engine.analyzePosition(
        currentFen,
        selectedLevel,
      );
      console.log(
        `🎯 Engine suggests: ${engineMove.move} (depth: ${engineMove.depth}, elo: ${engineMove.elo})`,
      );

      // Convert UCI to SAN
      const tempChess = gameState.game.clone();
      // Convert UCI notation to move
      const from = engineMove.move.substring(0, 2);
      const to = engineMove.move.substring(2, 4);
      const promotion = engineMove.move[4];

      // Try to make the move - NEVER RETURN WITHOUT RESETTING isEngineThinking
      let san = "";
      try {
        const chess = tempChess.getInternalChess();
        const moveResult = chess.move({ from, to, promotion });
        if (moveResult) {
          san = moveResult.san;
        } else {
          console.error("Invalid engine move:", engineMove.move);
        }
      } catch (e) {
        console.error(
          "Failed to convert engine move:",
          e,
          "Move:",
          engineMove.move,
        );
        // Don't return here - let it continue to finally block
      }

      if (san) {
        gameActions.makeMove(san);

        const thinkTime = Date.now() - startTime;
        setGameStats((prev) => ({
          ...prev,
          engineMoves: prev.engineMoves + 1,
          avgThinkTime:
            (prev.avgThinkTime * prev.engineMoves + thinkTime) /
            (prev.engineMoves + 1),
        }));

        if (isVoiceEnabled && speechService) {
          await speechService.speak(`Motore gioca: ${san}`);
        }
      } else {
        console.warn("Engine move failed, no valid SAN generated");
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
    setGameStats({
      playerMoves: 0,
      engineMoves: 0,
      avgThinkTime: 0,
      accuracy: 100,
    });

    if (isVoiceEnabled && speechService) {
      const colorText = playerColor === "white" ? "bianco" : "nero";
      speechService.speak(
        `Nuova partita iniziata contro motore Livello ${selectedLevel}. ` +
          `Giochi con i pezzi ${colorText}. ` +
          `${continuousListening ? "Microfono sempre attivo." : ""}`,
      );
    }

    // If player is black, let engine make first move
    if (playerColor === "black") {
      setTimeout(() => makeEngineMove(), 1000);
    }
  };

  const resignGame = () => {
    setGameStarted(false);
    if (speechService && isVoiceEnabled) {
      speechService.speak("Hai abbandonato la partita.");
    }
  };

  const getGameStatus = () => {
    if (!gameStarted) return "Pronto per iniziare";
    if (gameState.isGameOver) {
      if (gameState.game.isCheckmate()) {
        const winner = gameState.game.getTurn() === "white" ? "Nero" : "Bianco";
        return `Scaccomatto! ${winner} vince`;
      }
      if (gameState.game.isDraw()) return "Patta";
      return "Partita terminata";
    }
    if (isEngineThinking) return "Motore sta pensando...";

    const currentTurn = gameState.game.getTurn();
    const isPlayerTurn = currentTurn === playerColor;

    return isPlayerTurn ? "Il tuo turno" : "Turno del motore";
  };

  if (!isVisible) return null;

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.02);
              opacity: 0.9;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: "#0f0f0f",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "1200px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "3px solid #8b5cf6",
            boxShadow: "0 25px 70px rgba(139,92,246,0.3)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              borderBottom: "2px solid #333",
              paddingBottom: "1rem",
            }}
          >
            <h2 style={{ color: "#ffd700", margin: 0, fontSize: "2rem" }}>
              🏆 Partita Professionale vs Motore
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontSize: "1.5rem",
                cursor: "pointer",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: "2rem" }}>
            {/* Left Panel - Settings & Board */}
            <div style={{ flex: 1 }}>
              {/* Engine Settings */}
              {!gameStarted && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ color: "#8b5cf6", marginBottom: "1rem" }}>
                    🎯 Livelli Professionali
                  </h3>

                  {/* Professional Level Selector */}
                  <div style={{ marginBottom: "2rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span style={{ color: "#a0a0a0" }}>
                        Livello Attuale:{" "}
                        {engine?.getLevelInfo(selectedLevel) || selectedLevel}
                      </span>
                    </div>

                    {/* Professional Level Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "0.75rem",
                        marginTop: "1rem",
                      }}
                    >
                      {stockfishNNUE.getAllLevels().map((level) => {
                        const isSelected = selectedLevel === level.key;

                        const getLevelColor = (elo: number) => {
                          if (elo >= 2200)
                            return {
                              bg: "#8b5cf6",
                              border: "#a78bfa",
                              glow: "147, 51, 234",
                            };
                          if (elo >= 1800)
                            return {
                              bg: "#3b82f6",
                              border: "#60a5fa",
                              glow: "59, 130, 246",
                            };
                          if (elo >= 1200)
                            return {
                              bg: "#10b981",
                              border: "#34d399",
                              glow: "16, 185, 129",
                            };
                          return {
                            bg: "#6b7280",
                            border: "#9ca3af",
                            glow: "107, 114, 128",
                          };
                        };

                        const colors = getLevelColor(level.elo);

                        return (
                          <button
                            key={level.key}
                            onClick={() => setSelectedLevel(level.key)}
                            style={{
                              padding: "1rem",
                              backgroundColor: isSelected
                                ? colors.bg
                                : "#2d3142",
                              color: "white",
                              border: isSelected
                                ? `2px solid ${colors.border}`
                                : "2px solid transparent",
                              borderRadius: "12px",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: isSelected ? "bold" : "normal",
                              transition: "all 0.3s ease",
                              transform: isSelected
                                ? "scale(1.05)"
                                : "scale(1)",
                              boxShadow: isSelected
                                ? `0 4px 20px rgba(${colors.glow}, 0.4)`
                                : "0 2px 8px rgba(0,0,0,0.2)",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "#3d4663";
                                e.currentTarget.style.transform = "scale(1.02)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "#2d3142";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }}
                          >
                            <div
                              style={{
                                fontSize: "1rem",
                                marginBottom: "0.3rem",
                                fontWeight: "600",
                              }}
                            >
                              {level.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                opacity: 0.9,
                                color: "#ffd700",
                              }}
                            >
                              {level.elo} ELO
                            </div>
                            {level.elo >= 2200 && (
                              <div
                                style={{
                                  fontSize: "0.65rem",
                                  opacity: 0.7,
                                  marginTop: "0.2rem",
                                }}
                              >
                                🏆 Professionale
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div style={{ marginBottom: "1.5rem" }}>
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
                          flex: 1,
                          padding: "1rem",
                          backgroundColor:
                            playerColor === "white" ? "#8b5cf6" : "#2d3142",
                          color: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          transition: "all 0.3s",
                        }}
                      >
                        <input
                          type="radio"
                          value="white"
                          checked={playerColor === "white"}
                          onChange={(e) =>
                            setPlayerColor(e.target.value as "white" | "black")
                          }
                          style={{ display: "none" }}
                        />
                        <span style={{ fontSize: "1.5rem" }}>♔</span> Bianco
                      </label>
                      <label
                        style={{
                          flex: 1,
                          padding: "1rem",
                          backgroundColor:
                            playerColor === "black" ? "#8b5cf6" : "#2d3142",
                          color: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          transition: "all 0.3s",
                        }}
                      >
                        <input
                          type="radio"
                          value="black"
                          checked={playerColor === "black"}
                          onChange={(e) =>
                            setPlayerColor(e.target.value as "white" | "black")
                          }
                          style={{ display: "none" }}
                        />
                        <span style={{ fontSize: "1.5rem" }}>♚</span> Nero
                      </label>
                    </div>
                  </div>

                  {/* Voice Settings */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        color: "#a0a0a0",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={continuousListening}
                        onChange={(e) =>
                          setContinuousListening(e.target.checked)
                        }
                        style={{
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                        }}
                      />
                      🎤 Microfono sempre attivo (Comandi vocali continui)
                    </label>
                  </div>

                  <button
                    onClick={startNewGame}
                    disabled={!engine?.isEngineReady()}
                    style={{
                      width: "100%",
                      padding: "1.2rem",
                      backgroundColor: engine?.isEngineReady()
                        ? "#10b981"
                        : "#666",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: engine?.isEngineReady()
                        ? "pointer"
                        : "not-allowed",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      transition: "all 0.3s",
                    }}
                  >
                    {engine?.isEngineReady()
                      ? "🚀 Inizia Partita Professionale"
                      : "⏳ Caricamento motore avanzato..."}
                  </button>
                </div>
              )}

              {/* Chess Board */}
              {gameStarted && (
                <div style={{ marginBottom: "2rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <h3 style={{ color: "#8b5cf6", margin: 0 }}>Scacchiera</h3>
                    <button
                      onClick={() => setBoardHidden(!boardHidden)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#2d3142",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {boardHidden ? "👁️ Mostra" : "🙈 Nascondi"} Scacchiera
                    </button>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#1a1a1a",
                      padding: "1rem",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <InteractiveChessBoard
                      position={gameState.game.getBoard()}
                      isVisible={!boardHidden}
                      game={gameState.game}
                      onMove={(move) => {
                        try {
                          gameActions.makeMove(move.san);
                        } catch (error) {
                          console.error("Invalid move:", error);
                        }
                      }}
                      allowMoves={!isEngineThinking && !gameState.isGameOver}
                      showCoordinates={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Game Interface */}
            <div style={{ flex: 1 }}>
              {gameStarted && (
                <>
                  {/* Game Status */}
                  <div
                    style={{
                      backgroundColor: "#1a1a1a",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                      textAlign: "center",
                      border: "2px solid #333",
                    }}
                  >
                    <div
                      style={{
                        color: "#ffd700",
                        fontSize: "1.3rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {getGameStatus()}
                    </div>
                    {isEngineThinking && (
                      <div
                        style={{
                          color: "#8b5cf6",
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div className="thinking-spinner">⚙️</div>
                        Analizzando posizione...
                      </div>
                    )}
                    {showEvaluation && engineEvaluation && !boardHidden && (
                      <div style={{ color: "#10b981", marginTop: "0.5rem" }}>
                        {engineEvaluation}
                      </div>
                    )}
                  </div>

                  {/* Move Confirmation Indicator */}
                  {isWaitingConfirmation && pendingMove && (
                    <div
                      style={{
                        backgroundColor: "#ff6b6b",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        marginBottom: "1.5rem",
                        border: "2px solid #ff4444",
                        textAlign: "center",
                        animation: "pulse 1s infinite",
                      }}
                    >
                      <div
                        style={{
                          color: "#ffffff",
                          fontSize: "1.4rem",
                          fontWeight: "bold",
                          marginBottom: "0.5rem",
                        }}
                      >
                        🎤 CONFERMA RICHIESTA
                      </div>
                      <div style={{ color: "#ffdddd", fontSize: "1.2rem" }}>
                        Vuoi giocare: <strong>{pendingMove}</strong>?
                      </div>
                      <div style={{ color: "#ffcccc", marginTop: "0.5rem" }}>
                        Dì "CONFERMO" per eseguire o "ANNULLA" per cancellare
                      </div>
                    </div>
                  )}

                  {/* Voice Control Panel */}
                  {isVoiceEnabled && (
                    <div
                      style={{
                        backgroundColor: "#1a1a1a",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        marginBottom: "1.5rem",
                        border: "2px solid #333",
                      }}
                    >
                      <h4
                        style={{
                          color: "#8b5cf6",
                          marginTop: 0,
                          marginBottom: "1rem",
                        }}
                      >
                        🎤 Controllo Vocale
                      </h4>

                      {/* Voice Mode Toggle */}
                      <div style={{ marginBottom: "1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <label
                            style={{ color: "#a0a0a0", fontSize: "0.9rem" }}
                          >
                            Modalità microfono:
                          </label>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => setContinuousListening(true)}
                            style={{
                              flex: 1,
                              padding: "0.75rem",
                              backgroundColor: continuousListening
                                ? "#10b981"
                                : "#374151",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              transition: "all 0.3s",
                            }}
                          >
                            🔴 Sempre Attivo
                          </button>
                          <button
                            onClick={() => setContinuousListening(false)}
                            style={{
                              flex: 1,
                              padding: "0.75rem",
                              backgroundColor: !continuousListening
                                ? "#10b981"
                                : "#374151",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              transition: "all 0.3s",
                            }}
                          >
                            🎯 Su Richiesta
                          </button>
                        </div>
                      </div>

                      {/* Voice Status */}
                      <div
                        style={{
                          backgroundColor: isListening ? "#065f46" : "#2d3142",
                          padding: "1rem",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: `2px solid ${isListening ? "#10b981" : "#444"}`,
                          transition: "all 0.3s",
                        }}
                      >
                        <div
                          style={{
                            color: isListening ? "#10b981" : "#666",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {isListening ? (
                            <>
                              <span className="pulse-dot"></span>
                              Microfono attivo - Pronuncia la tua mossa
                            </>
                          ) : continuousListening ? (
                            <>🎤 In attesa di comando vocale...</>
                          ) : (
                            <>🎤 Modalità manuale - Usa il pulsante o digita</>
                          )}
                        </div>
                      </div>

                      {/* Manual Voice Trigger (only in non-continuous mode) */}
                      {!continuousListening && (
                        <div style={{ marginTop: "1rem", textAlign: "center" }}>
                          <button
                            onClick={() => {
                              if (!isListening) {
                                startListening();
                              } else {
                                stopListening();
                              }
                            }}
                            style={{
                              padding: "0.75rem 1.5rem",
                              backgroundColor: isListening
                                ? "#ef4444"
                                : "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "1rem",
                              transition: "all 0.3s",
                            }}
                          >
                            {isListening
                              ? "🛑 Ferma Ascolto"
                              : "🎤 Inizia Ascolto"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Move Input */}
                  <div style={{ marginBottom: "1.5rem" }}>
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
                          padding: "1rem",
                          backgroundColor: "#2d3142",
                          color: "white",
                          border: "2px solid #444",
                          borderRadius: "8px",
                          fontSize: "1rem",
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            gameActions.makeMove(moveInput.trim());
                            setMoveInput("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          gameActions.makeMove(moveInput.trim());
                          setMoveInput("");
                        }}
                        disabled={
                          !moveInput.trim() ||
                          isEngineThinking ||
                          gameState.isGameOver
                        }
                        style={{
                          padding: "1rem 1.5rem",
                          backgroundColor: "#8b5cf6",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          transition: "all 0.3s",
                        }}
                      >
                        ➤
                      </button>
                    </div>
                  </div>

                  {/* Game Stats */}
                  <div
                    style={{
                      backgroundColor: "#1a1a1a",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                      border: "2px solid #333",
                    }}
                  >
                    <h4 style={{ color: "#8b5cf6", marginTop: 0 }}>
                      📊 Statistiche
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                        color: "#a0a0a0",
                      }}
                    >
                      <div>Tue mosse: {gameStats.playerMoves}</div>
                      <div>Mosse motore: {gameStats.engineMoves}</div>
                      <div>
                        Tempo medio motore: {Math.round(gameStats.avgThinkTime)}
                        ms
                      </div>
                      <div>Livello Motore: {selectedLevel}</div>
                    </div>
                  </div>

                  {/* Game Actions */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={startNewGame}
                      style={{
                        flex: 1,
                        padding: "1rem",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                    >
                      🔄 Nuova Partita
                    </button>
                    <button
                      onClick={resignGame}
                      style={{
                        flex: 1,
                        padding: "1rem",
                        backgroundColor: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                    >
                      🏳️ Abbandona
                    </button>
                  </div>
                </>
              )}

              {/* Voice Commands Help */}
              {continuousListening && (
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1.5rem",
                    backgroundColor: "rgba(139,92,246,0.1)",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    color: "#a0a0a0",
                    border: "1px solid #8b5cf6",
                  }}
                >
                  <strong style={{ color: "#8b5cf6" }}>
                    🎤 Comandi Vocali Attivi:
                  </strong>
                  <ul style={{ margin: "0.5rem 0", paddingLeft: "1rem" }}>
                    <li>Mosse: "e quattro", "cavallo f tre", "torre d uno"</li>
                    <li>Arrocco: "arrocco corto", "arrocco lungo"</li>
                    <li>Pezzi: re, regina, torre, alfiere, cavallo</li>
                    <li>
                      Comandi: "nuova partita", "abbandona", "nascondi
                      scacchiera"
                    </li>
                    <li>Il microfono è sempre attivo durante la partita</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .pulse-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
        
        .thinking-spinner {
          display: inline-block;
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </>
  );
};
