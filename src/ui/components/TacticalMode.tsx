// src/ui/components/TacticalMode.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  TacticalProblem,
  TacticalAttempt,
  TacticalConfig,
  ProblemState,
} from "@core/chess/types";
import { FnsParser } from "@core/fns/FnsParser";
import { ChessGame } from "@core/chess/ChessGame";
import { SpeechService } from "@services/speech/SpeechService";
import { InteractiveChessBoard } from "./InteractiveChessBoard";

interface TacticalModeProps {
  problem: TacticalProblem;
  config: TacticalConfig;
  onComplete: (
    solved: boolean,
    attempts: TacticalAttempt[],
    timeMs: number,
  ) => void;
  onExit: () => void;
  onNext: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
  problemNumber: number;
  totalProblems: number;
}

export const TacticalMode: React.FC<TacticalModeProps> = ({
  problem,
  config,
  onComplete,
  onExit,
  onNext,
  speechService,
  isVoiceEnabled,
  problemNumber,
  totalProblems,
}) => {
  // Initialize the chess position from the problem's FEN
  const initializePosition = (): ChessGame => {
    const game = new ChessGame();
    const result = game.loadFen(problem.fen);
    if (!result.valid) {
      console.error("Invalid FEN in problem:", problem.fen, result.error);
      // Fallback to starting position
      return new ChessGame();
    }
    return game;
  };

  const [state, setState] = useState<ProblemState>({
    currentProblem: problem,
    currentMoveIndex: 0,
    position: initializePosition().getBoard(),
    gameState: initializePosition(),
    attempts: [],
    hintsUsed: 0,
    startTime: Date.now(),
    timeRemaining: config.timeLimit,
    status: "waiting",
    message: `Problema ${problemNumber}/${totalProblems}: ${problem.theme || "Tattica"}`,
    messageType: "info",
  });

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer countdown
  useEffect(() => {
    if (
      state.timeRemaining &&
      state.timeRemaining > 0 &&
      state.status === "thinking"
    ) {
      timerRef.current = window.setTimeout(() => {
        setState((prev) => ({
          ...prev,
          timeRemaining: (prev.timeRemaining || 0) - 1,
        }));
      }, 1000);
    } else if (state.timeRemaining === 0) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.timeRemaining, state.status]);

  // Voice announcement when problem starts
  useEffect(() => {
    if (isVoiceEnabled && speechService) {
      const timer = setTimeout(() => {
        announcePosition();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Focus input when problem is ready
  useEffect(() => {
    if (state.status === "thinking" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.status]);

  const announcePosition = async () => {
    if (!isVoiceEnabled || !speechService) return;

    const board = state.gameState.getBoard();
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];

    board.forEach((row: any, rankIndex: number) => {
      row.forEach((piece: any, fileIndex: number) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex);
          const rank = 8 - rankIndex;
          const pieceNames = {
            p: "Pedone",
            r: "Torre",
            n: "Cavallo",
            b: "Alfiere",
            q: "Donna",
            k: "Re",
          };
          const pieceName =
            pieceNames[piece.type as keyof typeof pieceNames] || piece.type;
          const pieceDescription = `${pieceName} in ${file}${rank}`;

          if (piece.color === "w") {
            whitePieces.push(pieceDescription);
          } else {
            blackPieces.push(pieceDescription);
          }
        }
      });
    });

    let announcement = `Problema tattico numero ${problemNumber}. `;

    if (problem.theme) {
      announcement += `Tema: ${problem.theme}. `;
    }

    if (problem.difficulty) {
      announcement += `Difficoltà: ${problem.difficulty} su 5. `;
    }

    announcement += "Posizione corrente. ";

    if (whitePieces.length > 0) {
      announcement += `Pezzi bianchi: ${whitePieces.join(", ")}. `;
    }

    if (blackPieces.length > 0) {
      announcement += `Pezzi neri: ${blackPieces.join(", ")}. `;
    }

    const turn = state.gameState.getTurn();
    announcement += `È il turno del ${turn === "white" ? "Bianco" : "Nero"}. Trova la mossa migliore!`;

    await speechService.speak(announcement);

    // Change status to thinking after announcement
    setState((prev) => ({
      ...prev,
      status: "thinking",
      message: "Trova la mossa migliore!",
      messageType: "info",
    }));
  };

  const handleTimeUp = () => {
    setState((prev) => ({
      ...prev,
      status: "failed",
      message: "Tempo scaduto! La soluzione era: " + problem.solution.join(" "),
      messageType: "error",
      timeRemaining: 0,
    }));

    if (isVoiceEnabled && speechService) {
      speechService.speak("Tempo scaduto! Problema fallito.");
    }

    const totalTime = Date.now() - state.startTime;
    onComplete(false, state.attempts, totalTime);
  };

  const handleMoveSubmit = (moveInput: string) => {
    if (!moveInput.trim() || state.status !== "thinking") return;

    const userMove = moveInput.trim();
    const expectedMove = problem.solution[state.currentMoveIndex];
    const moveTime = Date.now() - state.startTime;

    // Try to make the move on the game to validate it
    const tempGame = new ChessGame(state.gameState.getFen());
    const moveResult = tempGame.makeMoveFromSan(userMove);

    if (!moveResult) {
      // Invalid move
      setState((prev) => ({
        ...prev,
        message: "Mossa illegale! Riprova.",
        messageType: "error",
      }));

      if (isVoiceEnabled && speechService) {
        speechService.speak("Mossa illegale");
      }
      return;
    }

    // Valid move - check if it's correct
    const isCorrect = FnsParser.validateSolutionMove(
      userMove,
      problem,
      state.currentMoveIndex,
    );

    const attempt: TacticalAttempt = {
      moveIndex: state.currentMoveIndex,
      userMove,
      expectedMove,
      correct: isCorrect,
      timestamp: Date.now(),
      timeMs: moveTime,
    };

    if (isCorrect) {
      // Correct move!
      const newGameState = tempGame;
      const nextMoveIndex = state.currentMoveIndex + 1;
      const isComplete = nextMoveIndex >= problem.solution.length;

      if (isComplete) {
        // Problem solved!
        const totalTime = Date.now() - state.startTime;
        setState((prev) => ({
          ...prev,
          gameState: newGameState,
          position: newGameState.getBoard(),
          attempts: [...prev.attempts, attempt],
          status: "solved",
          message: `Problema risolto! Ottimo lavoro! 🎉`,
          messageType: "success",
        }));

        if (isVoiceEnabled && speechService) {
          speechService.speak("Problema risolto! Ottimo lavoro!");
        }

        onComplete(true, [...state.attempts, attempt], totalTime);
      } else {
        // Move to next step in solution
        setState((prev) => ({
          ...prev,
          gameState: newGameState,
          position: newGameState.getBoard(),
          currentMoveIndex: nextMoveIndex,
          attempts: [...prev.attempts, attempt],
          message: `Corretto! Prossima mossa: ${nextMoveIndex + 1}/${problem.solution.length}`,
          messageType: "success",
        }));

        if (isVoiceEnabled && speechService) {
          speechService.speak("Mossa corretta! Continua.");
        }
      }
    } else {
      // Wrong move
      setState((prev) => ({
        ...prev,
        attempts: [...prev.attempts, attempt],
        message: `Mossa sbagliata! Attesa: ${expectedMove}. Riprova.`,
        messageType: "error",
      }));

      if (isVoiceEnabled && speechService) {
        speechService.speak(`Mossa sbagliata. Era attesa ${expectedMove}`);
      }
    }
  };

  const handleBoardMove = (move: { from: string; to: string; san: string }) => {
    handleMoveSubmit(move.san);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const input = e.currentTarget;
      handleMoveSubmit(input.value);
      input.value = "";
    }
  };

  const handleHint = () => {
    if (state.hintsUsed >= config.maxHints) return;

    const hint = FnsParser.getHint(problem, state.currentMoveIndex);
    if (hint) {
      setState((prev) => ({
        ...prev,
        hintsUsed: prev.hintsUsed + 1,
        message: `Suggerimento: ${hint}`,
        messageType: "warning",
        status: "hint",
      }));

      if (isVoiceEnabled && speechService) {
        speechService.speak(`Suggerimento: ${hint}`);
      }

      // Return to thinking mode after hint
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          status: "thinking",
        }));
      }, 3000);
    }
  };

  const handleSkip = () => {
    const totalTime = Date.now() - state.startTime;
    setState((prev) => ({
      ...prev,
      status: "failed",
      message:
        "Problema saltato. La soluzione era: " + problem.solution.join(" "),
      messageType: "warning",
    }));

    onComplete(false, state.attempts, totalTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (): string => {
    if (!state.timeRemaining) return "#666";
    if (state.timeRemaining <= 10) return "#ef4444";
    if (state.timeRemaining <= 30) return "#f59e0b";
    return "#10b981";
  };

  const canUseHints =
    state.hintsUsed < config.maxHints && state.status === "thinking";
  const progressPercent =
    (state.currentMoveIndex / problem.solution.length) * 100;

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
          backgroundColor: "#1a1a1a",
          borderRadius: "16px",
          padding: "2rem",
          minWidth: "700px",
          maxWidth: "900px",
          border: "2px solid #ffd700",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
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
          <h2 style={{ color: "#ffd700", margin: 0, fontSize: "1.5rem" }}>
            🧩 Problema Tattico #{problemNumber}
          </h2>
          <button
            onClick={onExit}
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

        {/* Problem Info */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "1.5rem",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
                Progresso: {state.currentMoveIndex} / {problem.solution.length}
              </span>
              <span style={{ color: "#8b5cf6", fontSize: "0.9rem" }}>
                Tema: {problem.theme || "Tattica"}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#2d3142",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  backgroundColor: "#8b5cf6",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {config.timeLimit > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: getTimeColor(),
                  fontFamily: "monospace",
                }}
              >
                ⏱️ {formatTime(state.timeRemaining || 0)}
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div
          style={{
            backgroundColor: "#2d3142",
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: `2px solid ${
              state.messageType === "success"
                ? "#10b981"
                : state.messageType === "error"
                  ? "#ef4444"
                  : state.messageType === "warning"
                    ? "#f59e0b"
                    : "#8b5cf6"
            }`,
          }}
        >
          <p
            style={{
              color:
                state.messageType === "success"
                  ? "#10b981"
                  : state.messageType === "error"
                    ? "#ef4444"
                    : state.messageType === "warning"
                      ? "#f59e0b"
                      : "#ffd700",
              fontWeight: "bold",
              margin: 0,
              fontSize: "1.1rem",
              textAlign: "center",
            }}
          >
            {state.message}
          </p>
        </div>

        {/* Chess Board */}
        <div style={{ marginBottom: "2rem" }}>
          <InteractiveChessBoard
            position={state.position}
            isVisible={true}
            game={state.gameState}
            allowMoves={state.status === "thinking"}
            showCoordinates={true}
            onMove={handleBoardMove}
          />
        </div>

        {/* Problem Description */}
        {config.showDescription && problem.description && (
          <div
            style={{
              backgroundColor: "#2d3142",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
              color: "#a0a0a0",
            }}
          >
            <strong>Descrizione:</strong> {problem.description}
          </div>
        )}

        {/* Move Input */}
        {state.status === "thinking" && (
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Inserisci la mossa (es. e4, Nf3, O-O)"
                onKeyPress={handleKeyPress}
                style={{
                  flex: 1,
                  padding: "1rem",
                  backgroundColor: "#2d3142",
                  color: "white",
                  border: "2px solid #666",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
                autoFocus
              />
            </div>
            <div
              style={{
                color: "#8b5cf6",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              💡 Clicca sui pezzi per muoverli o digita la mossa
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {canUseHints && (
            <button
              onClick={handleHint}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              💡 Suggerimento ({config.maxHints - state.hintsUsed} rimasti)
            </button>
          )}

          {state.status === "thinking" && (
            <button
              onClick={handleSkip}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              ⏭️ Salta
            </button>
          )}

          {(state.status === "solved" || state.status === "failed") && (
            <button
              onClick={onNext}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              ➡️ Prossimo Problema
            </button>
          )}

          <button
            onClick={onExit}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            🚪 Esci
          </button>
        </div>

        {/* Problem Stats */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "rgba(139,92,246,0.1)",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-around",
            fontSize: "0.85rem",
            color: "#a0a0a0",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>Difficoltà:</strong>{" "}
            {problem.difficulty ? `${problem.difficulty}/5` : "N/D"}
          </div>
          <div>
            <strong>Tentativi:</strong> {state.attempts.length}
          </div>
          <div>
            <strong>Suggerimenti:</strong> {state.hintsUsed}/{config.maxHints}
          </div>
          {problem.source && (
            <div>
              <strong>Fonte:</strong> {problem.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
