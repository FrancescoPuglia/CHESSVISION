// src/ui/components/StudyMode.tsx
import React, { useState, useEffect, useRef } from "react";
import { PgnGame } from "@core/chess/types";
import { PgnParser } from "@core/pgn/PgnParser";
import { ChessGame } from "@core/chess/ChessGame";
import { SpeechService } from "@services/speech/SpeechService";
import { InteractiveChessBoard } from "./InteractiveChessBoard";

interface StudyModeProps {
  study: PgnGame;
  startFromMoveIndex?: number; // Which move to start from
  onComplete: () => void;
  onExit: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
  timeLimit: number; // seconds
}

interface StudyState {
  currentMoveIndex: number;
  studyGame: ChessGame;
  expectedMove: string | null;
  userInput: string;
  message: string;
  messageType: "info" | "success" | "error" | "warning";
  isWaitingForMove: boolean;
  timeRemaining: number;
  isTimerActive: boolean;
  score: number;
  attempts: number;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  study,
  startFromMoveIndex = 0,
  onComplete,
  onExit,
  speechService,
  isVoiceEnabled,
  timeLimit,
}) => {
  // Initialize the study position correctly from the study data
  const initializeStudyPosition = (): ChessGame => {
    // Create a new game from the FEN if available, otherwise from starting position
    const startingFen = study.headers?.FEN;
    const game = startingFen ? new ChessGame(startingFen) : new ChessGame();

    // Apply moves up to startFromMoveIndex
    for (let i = 0; i < startFromMoveIndex && i < study.moves.length; i++) {
      const move = study.moves[i];
      const result = game.makeMoveFromSan(move.san);
      if (!result) {
        console.error(`Failed to apply move ${i + 1}: ${move.san}`);
        break;
      }
    }

    return game;
  };

  const [state, setState] = useState<StudyState>({
    currentMoveIndex: startFromMoveIndex,
    studyGame: initializeStudyPosition(), // Create correct position from study
    expectedMove: study.moves[startFromMoveIndex]?.san || null,
    userInput: "",
    message: `Studio: ${PgnParser.getStudyTitle(study)}. ${startFromMoveIndex === 0 ? "Trova la prima mossa!" : `Posizione alla mossa ${startFromMoveIndex + 1}. Trova la prossima mossa!`}`,
    messageType: "info",
    isWaitingForMove: true,
    timeRemaining: timeLimit,
    isTimerActive: true,
    score: 0,
    attempts: 0,
  });

  const timerRef = useRef<number | null>(null);

  // Timer countdown
  useEffect(() => {
    if (state.isTimerActive && state.timeRemaining > 0) {
      timerRef.current = window.setTimeout(() => {
        setState((prev) => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    } else if (state.timeRemaining <= 0) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isTimerActive, state.timeRemaining]);

  // Voice announcement on move changes
  useEffect(() => {
    if (isVoiceEnabled && speechService && state.message) {
      speechService.speak(state.message);
    }
  }, [state.message, isVoiceEnabled, speechService]);

  // Automatically announce position when study starts
  useEffect(() => {
    if (isVoiceEnabled && speechService) {
      const timer = setTimeout(() => {
        speakInitialPosition();
      }, 2000); // Wait 2 seconds for UI to settle

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceEnabled, speechService]);

  const speakInitialPosition = async () => {
    if (!isVoiceEnabled || !speechService) return;

    const board = state.studyGame.getBoard();
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];

    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
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

    // Announce white pieces first, then black pieces
    let announcement = "Posizione di partenza dello studio. ";

    if (whitePieces.length > 0) {
      announcement += `Pezzi bianchi: ${whitePieces.join(", ")}. `;
    }

    if (blackPieces.length > 0) {
      announcement += `Pezzi neri: ${blackPieces.join(", ")}. `;
    }

    announcement += `È il turno del ${study.moves[0]?.color === "white" ? "Bianco" : "Nero"}. Trova la mossa migliore!`;

    await speechService.speak(announcement);
  };

  const handleTimeUp = () => {
    setState((prev) => ({
      ...prev,
      isTimerActive: false,
      message: "Tempo scaduto! Studio fallito.",
      messageType: "error",
    }));

    if (isVoiceEnabled && speechService) {
      speechService.speak("Tempo scaduto! Studio fallito.");
    }

    setTimeout(() => onExit(), 3000);
  };

  const handleMoveSubmit = () => {
    if (!state.userInput.trim() || !state.isWaitingForMove) return;

    const userMove = state.userInput.trim();
    setState((prev) => ({ ...prev, attempts: prev.attempts + 1 }));

    // Check if the move is correct
    if (state.expectedMove && userMove === state.expectedMove) {
      // Correct move!
      const newGame = new ChessGame(state.studyGame.getFen());
      const moveResult = newGame.makeMoveFromSan(userMove);

      if (moveResult) {
        const nextMoveIndex = state.currentMoveIndex + 1;
        const isStudyComplete = nextMoveIndex >= study.moves.length;

        if (isStudyComplete) {
          // Study completed!
          const finalScore = Math.round(
            (state.score + 100) * (state.timeRemaining / timeLimit),
          );
          setState((prev) => ({
            ...prev,
            studyGame: newGame,
            message: `Studio completato! Punteggio finale: ${finalScore}`,
            messageType: "success",
            isTimerActive: false,
            score: finalScore,
            userInput: "",
          }));

          setTimeout(() => onComplete(), 2000);
        } else {
          // Move to next position
          const nextMove = study.moves[nextMoveIndex];
          setState((prev) => ({
            ...prev,
            studyGame: newGame,
            currentMoveIndex: nextMoveIndex,
            expectedMove: nextMove?.san || null,
            message: `Corretto! Prossima mossa richiesta: mossa ${nextMoveIndex + 1}`,
            messageType: "success",
            score:
              prev.score + Math.round(50 * (prev.timeRemaining / timeLimit)),
            userInput: "",
          }));
        }
      }
    } else {
      // Wrong move
      setState((prev) => ({
        ...prev,
        message: `Mossa sbagliata! Atteso: ${state.expectedMove}. Riprova.`,
        messageType: "error",
        score: Math.max(0, prev.score - 10),
        userInput: "",
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleMoveSubmit();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (): string => {
    if (state.timeRemaining <= 10) return "#ef4444";
    if (state.timeRemaining <= 30) return "#f59e0b";
    return "#10b981";
  };

  const speakCurrentPosition = async () => {
    if (!isVoiceEnabled || !speechService) return;

    const board = state.studyGame.getBoard();
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];

    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
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

    let announcement = "Posizione corrente. ";

    if (whitePieces.length > 0) {
      announcement += `Pezzi bianchi: ${whitePieces.join(", ")}. `;
    }

    if (blackPieces.length > 0) {
      announcement += `Pezzi neri: ${blackPieces.join(", ")}.`;
    }

    if (whitePieces.length === 0 && blackPieces.length === 0) {
      announcement = "Scacchiera vuota";
    }

    await speechService.speak(announcement);
  };

  const progress = (state.currentMoveIndex / study.moves.length) * 100;

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
          minWidth: "600px",
          maxWidth: "800px",
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
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ color: "#ffd700", margin: 0, fontSize: "1.5rem" }}>
            🧩 Studio Mode: {PgnParser.getStudyTitle(study)}
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

        {/* Progress & Timer */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2rem",
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
                Progresso: {state.currentMoveIndex} / {study.moves.length}
              </span>
              <span style={{ color: "#8b5cf6", fontSize: "0.9rem" }}>
                Punteggio: {state.score}
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
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#8b5cf6",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

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
              ⏱️ {formatTime(state.timeRemaining)}
            </div>
          </div>
        </div>

        {/* Message */}
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

        {/* Interactive Chess Board */}
        <div style={{ marginBottom: "2rem" }}>
          <InteractiveChessBoard
            position={state.studyGame.getBoard()}
            isVisible={true}
            game={state.studyGame}
            allowMoves={true}
            showCoordinates={true}
            onMove={(move) => {
              setState((prev) => ({ ...prev, userInput: move.san }));
              // Auto-submit the move when made via board
              setTimeout(() => handleMoveSubmit(), 100);
            }}
          />
        </div>

        {/* Current Position Info */}
        {state.expectedMove && (
          <div
            style={{
              backgroundColor: "#2d3142",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#a0a0a0",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Trova la mossa numero {state.currentMoveIndex + 1}
            </div>
            <div style={{ color: "#8b5cf6", fontSize: "0.85rem" }}>
              Turno:{" "}
              {study.moves[state.currentMoveIndex]?.color === "white"
                ? "⚪ Bianco"
                : "⚫ Nero"}
            </div>
            <div
              style={{
                color: "#ffd700",
                fontSize: "0.85rem",
                marginTop: "0.5rem",
              }}
            >
              💡 Clicca sui pezzi per muoverli o digita la mossa
            </div>
          </div>
        )}

        {/* Move Input */}
        {state.isWaitingForMove && (
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <input
                type="text"
                value={state.userInput}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, userInput: e.target.value }))
                }
                onKeyPress={handleKeyPress}
                placeholder="Inserisci la mossa (es. e4, Nf3, O-O)"
                disabled={!state.isTimerActive}
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
              <button
                onClick={handleMoveSubmit}
                disabled={!state.userInput.trim() || !state.isTimerActive}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor:
                    state.userInput.trim() && state.isTimerActive
                      ? "#10b981"
                      : "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    state.userInput.trim() && state.isTimerActive
                      ? "pointer"
                      : "not-allowed",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                ✓ Conferma
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
          }}
        >
          <button
            onClick={speakCurrentPosition}
            disabled={!isVoiceEnabled}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: isVoiceEnabled ? "#8b5cf6" : "#666",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isVoiceEnabled ? "pointer" : "not-allowed",
              fontSize: "0.9rem",
            }}
          >
            🔊 Leggi Posizione
          </button>

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
            🚪 Esci dallo Studio
          </button>
        </div>

        {/* Study Stats */}
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
          }}
        >
          <div>
            <strong>Mosse totali:</strong> {study.moves.length}
          </div>
          <div>
            <strong>Tentativi:</strong> {state.attempts}
          </div>
          <div>
            <strong>Precisione:</strong>{" "}
            {state.attempts > 0
              ? Math.round((state.currentMoveIndex / state.attempts) * 100)
              : 100}
            %
          </div>
        </div>
      </div>
    </div>
  );
};
