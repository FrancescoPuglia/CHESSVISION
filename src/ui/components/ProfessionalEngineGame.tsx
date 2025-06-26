// src/ui/components/ProfessionalEngineGame.tsx
/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, react/no-unescaped-entities, no-empty-pattern */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { StockfishAdvanced } from "@services/engine/StockfishAdvanced";
import { useChessGame } from "@ui/hooks/useChessGame";
import { SpeechService } from "@services/speech/SpeechService";
import { InteractiveChessBoard } from "./InteractiveChessBoard";
import { useTranslation } from "@core/i18n/useTranslation";

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
  const [engine, setEngine] = useState<StockfishAdvanced | null>(null);
  const [selectedElo, setSelectedElo] = useState(1500);
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

  const engineRef = useRef<StockfishAdvanced | null>(null);
  const recognitionRef = useRef<any>(null);
  const isProcessingVoice = useRef(false);
  // const voiceQueueRef = useRef<string[]>([]);

  // ELO Ranges for selection
  const eloRanges = [
    { label: "Principiante", range: [1200, 1399], color: "#10b981" },
    { label: "Amatore", range: [1400, 1599], color: "#3b82f6" },
    { label: "Club Player", range: [1600, 1799], color: "#8b5cf6" },
    { label: "Esperto", range: [1800, 1999], color: "#f59e0b" },
    { label: "Candidato Maestro", range: [2000, 2199], color: "#ef4444" },
    { label: "Maestro FIDE", range: [2200, 2399], color: "#dc2626" },
    { label: "Maestro Internazionale", range: [2400, 2599], color: "#991b1b" },
    { label: "Grande Maestro", range: [2600, 2799], color: "#7c3aed" },
    { label: "Super GM", range: [2800, 2899], color: "#4c1d95" },
    { label: "Elite Mondiale", range: [2900, 3000], color: "#1e1b4b" },
  ];

  // Initialize engine with selected ELO
  useEffect(() => {
    if (!isVisible) return;

    const stockfish = new StockfishAdvanced(selectedElo);
    setEngine(stockfish);
    engineRef.current = stockfish;

    stockfish.setEvaluationCallback((info) => {
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

    return () => {
      stockfish.destroy();
    };
  }, [selectedElo, isVisible]);

  // Initialize continuous voice recognition
  useEffect(() => {
    if (!isVisible || !isVoiceEnabled || !continuousListening) return;

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
    [gameStarted, gameState.isGameOver, isEngineThinking, speechService],
  );

  const makeVoiceMove = async (move: string) => {
    try {
      gameActions.makeMove(move);
      setGameStats((prev) => ({
        ...prev,
        playerMoves: prev.playerMoves + 1,
      }));

      if (speechService && isVoiceEnabled) {
        await speechService.speak(`Hai giocato: ${move}`);
      }
    } catch (error) {
      if (speechService && isVoiceEnabled) {
        await speechService.speak("Mossa non valida");
      }
    }
  };

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

    setIsEngineThinking(true);
    const startTime = Date.now();

    try {
      const currentFen = gameState.game.getFen();
      const engineMove = await engine.getBestMove(currentFen);

      // Convert UCI to SAN
      const tempChess = gameState.game.clone();
      // Convert UCI notation to move
      const from = engineMove.move.substring(0, 2);
      const to = engineMove.move.substring(2, 4);
      const promotion = engineMove.move[4];

      // Try to make the move
      let san = "";
      try {
        const chess = tempChess.getInternalChess();
        const moveResult = chess.move({ from, to, promotion });
        if (moveResult) {
          san = moveResult.san;
        }
      } catch (e) {
        console.error("Failed to convert engine move:", e);
        return;
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
          await speechService.speak(
            `Motore gioca: ${san}. ` +
              `Confidenza: ${Math.round((engineMove.confidence || 0) * 100)}%`,
          );
        }
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
        `Nuova partita iniziata contro motore ELO ${selectedElo}. ` +
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
                  Selezione Livello ELO
                </h3>

                {/* ELO Slider */}
                <div style={{ marginBottom: "2rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ color: "#a0a0a0" }}>ELO: {selectedElo}</span>
                    <span style={{ color: "#ffd700" }}>
                      {engine?.getEloInfo() || ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1200"
                    max="3000"
                    step="50"
                    value={selectedElo}
                    onChange={(e) => setSelectedElo(parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      height: "8px",
                      background: `linear-gradient(to right, #10b981 0%, #8b5cf6 50%, #ef4444 100%)`,
                      borderRadius: "4px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />

                  {/* ELO Categories */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "0.5rem",
                      marginTop: "1rem",
                    }}
                  >
                    {eloRanges.map((range) => (
                      <button
                        key={range.label}
                        onClick={() => setSelectedElo(range.range[0])}
                        style={{
                          padding: "0.5rem",
                          backgroundColor:
                            selectedElo >= range.range[0] &&
                            selectedElo <= range.range[1]
                              ? range.color
                              : "#2d3142",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          transition: "all 0.3s",
                        }}
                      >
                        {range.label}
                        <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                          {range.range[0]}-{range.range[1]}
                        </div>
                      </button>
                    ))}
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
                    cursor: engine?.isEngineReady() ? "pointer" : "not-allowed",
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

                {!boardHidden && (
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
                      game={gameState.game}
                      position={gameState.game.getBoard()}
                      isVisible={true}
                      onMove={(move) => {
                        gameActions.makeMove(move.san);
                      }}
                      allowMoves={true}
                      showCoordinates={true}
                    />
                  </div>
                )}
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
                  {showEvaluation && engineEvaluation && (
                    <div style={{ color: "#10b981", marginTop: "0.5rem" }}>
                      {engineEvaluation}
                    </div>
                  )}
                </div>

                {/* Voice Status */}
                {isVoiceEnabled && (
                  <div
                    style={{
                      backgroundColor: isListening ? "#065f46" : "#1a1a1a",
                      padding: "1rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                      textAlign: "center",
                      border: `2px solid ${isListening ? "#10b981" : "#333"}`,
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
                          🎤 Microfono attivo - Pronuncia la tua mossa
                        </>
                      ) : (
                        <>🎤 Microfono disattivato</>
                      )}
                    </div>
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
                      Tempo medio motore: {Math.round(gameStats.avgThinkTime)}ms
                    </div>
                    <div>ELO Motore: {selectedElo}</div>
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
                    Comandi: "nuova partita", "abbandona", "nascondi scacchiera"
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
  );
};
