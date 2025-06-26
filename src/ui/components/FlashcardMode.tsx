// src/ui/components/FlashcardMode.tsx
import React, { useState, useEffect } from "react";
import { ChessBoard } from "./ChessBoard";
import { ChessGame } from "@core/chess/ChessGame";
import { PgnGame } from "@core/chess/types";
import { SpeechService } from "@services/speech/SpeechService";

interface FlashcardData {
  id: string;
  question: string;
  position: string; // FEN
  correctMove: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  nextReview: Date;
  interval: number; // days
  easeFactor: number;
  reviewCount: number;
}

interface FlashcardModeProps {
  studies: PgnGame[];
  onClose: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
}

interface FlashcardState {
  currentCard: FlashcardData | null;
  cardIndex: number;
  totalCards: number;
  game: ChessGame;
  userMove: string;
  showAnswer: boolean;
  performance: "again" | "hard" | "good" | "easy" | null;
  sessionStats: {
    reviewed: number;
    correct: number;
    streak: number;
  };
  message: string;
  messageType: "info" | "success" | "error";
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  studies,
  onClose,
  speechService,
  isVoiceEnabled,
}) => {
  const [state, setState] = useState<FlashcardState>({
    currentCard: null,
    cardIndex: 0,
    totalCards: 0,
    game: new ChessGame(),
    userMove: "",
    showAnswer: false,
    performance: null,
    sessionStats: { reviewed: 0, correct: 0, streak: 0 },
    message: "Caricamento flashcard...",
    messageType: "info",
  });

  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

  // Generate flashcards from studies
  useEffect(() => {
    const generateFlashcards = () => {
      const cards: FlashcardData[] = [];

      studies.forEach((study, studyIndex) => {
        study.moves.forEach((move, moveIndex) => {
          if (moveIndex > 0) {
            // Skip first move, use as setup
            // Create game up to this move
            const game = new ChessGame();
            for (let i = 0; i < moveIndex; i++) {
              game.makeMoveFromSan(study.moves[i].san);
            }

            const card: FlashcardData = {
              id: `${studyIndex}-${moveIndex}`,
              question: `Qual è la mossa migliore per ${move.color === "white" ? "il Bianco" : "il Nero"}?`,
              position: game.getFen(),
              correctMove: move.san,
              explanation: move.comment || `La mossa corretta è ${move.san}`,
              difficulty: "medium",
              nextReview: new Date(),
              interval: 1,
              easeFactor: 2.5,
              reviewCount: 0,
            };

            cards.push(card);
          }
        });
      });

      return cards;
    };

    const cards = generateFlashcards();
    setFlashcards(cards);

    if (cards.length > 0) {
      const firstCard = cards[0];
      const game = new ChessGame(firstCard.position);

      setState((prev) => ({
        ...prev,
        currentCard: firstCard,
        totalCards: cards.length,
        game,
        message: firstCard.question,
        messageType: "info",
      }));
    }
  }, [studies]);

  // Voice announcement
  useEffect(() => {
    if (isVoiceEnabled && speechService && state.message) {
      speechService.speak(state.message);
    }
  }, [state.message, isVoiceEnabled, speechService]);

  const handleMoveSubmit = () => {
    if (!state.userMove.trim() || !state.currentCard) return;

    const isCorrect = state.userMove.trim() === state.currentCard.correctMove;

    setState((prev) => ({
      ...prev,
      showAnswer: true,
      performance: isCorrect ? "good" : "again",
      message: isCorrect
        ? `Corretto! ${state.currentCard?.explanation || ""}`
        : `Sbagliato. La mossa corretta era: ${state.currentCard?.correctMove}. ${state.currentCard?.explanation || ""}`,
      messageType: isCorrect ? "success" : "error",
      sessionStats: {
        ...prev.sessionStats,
        reviewed: prev.sessionStats.reviewed + 1,
        correct: isCorrect
          ? prev.sessionStats.correct + 1
          : prev.sessionStats.correct,
        streak: isCorrect ? prev.sessionStats.streak + 1 : 0,
      },
    }));
  };

  const handlePerformanceRating = (
    rating: "again" | "hard" | "good" | "easy",
  ) => {
    if (!state.currentCard) return;

    // Anki-style spaced repetition algorithm
    const updateCard = (
      card: FlashcardData,
      performance: string,
    ): FlashcardData => {
      let newInterval = card.interval;
      let newEaseFactor = card.easeFactor;

      switch (performance) {
        case "again":
          newInterval = 1;
          newEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
          break;
        case "hard":
          newInterval = Math.ceil(card.interval * 1.2);
          newEaseFactor = Math.max(1.3, card.easeFactor - 0.15);
          break;
        case "good":
          newInterval =
            card.reviewCount === 0
              ? 1
              : card.reviewCount === 1
                ? 6
                : Math.ceil(card.interval * card.easeFactor);
          break;
        case "easy":
          newInterval =
            card.reviewCount === 0
              ? 4
              : card.reviewCount === 1
                ? 10
                : Math.ceil(card.interval * card.easeFactor * 1.3);
          newEaseFactor = card.easeFactor + 0.15;
          break;
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      return {
        ...card,
        interval: newInterval,
        easeFactor: newEaseFactor,
        nextReview,
        reviewCount: card.reviewCount + 1,
      };
    };

    // Update the card
    const updatedCard = updateCard(state.currentCard, rating);
    setFlashcards((prev) =>
      prev.map((card) => (card.id === updatedCard.id ? updatedCard : card)),
    );

    // Move to next card
    nextCard();
  };

  const nextCard = () => {
    const nextIndex = state.cardIndex + 1;

    if (nextIndex >= flashcards.length) {
      // End of session
      setState((prev) => ({
        ...prev,
        message: `Sessione completata! Hai rivisto ${prev.sessionStats.reviewed} carte, ${prev.sessionStats.correct} corrette.`,
        messageType: "success",
      }));
      setTimeout(() => onClose(), 3000);
      return;
    }

    const nextCard = flashcards[nextIndex];
    const game = new ChessGame(nextCard.position);

    setState((prev) => ({
      ...prev,
      currentCard: nextCard,
      cardIndex: nextIndex,
      game,
      userMove: "",
      showAnswer: false,
      performance: null,
      message: nextCard.question,
      messageType: "info",
    }));
  };

  const speakPosition = async () => {
    if (!isVoiceEnabled || !speechService) return;

    const board = state.game.getBoard();
    const pieces: string[] = [];

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
          const colorName = piece.color === "w" ? "Bianco" : "Nero";
          const pieceName =
            pieceNames[piece.type as keyof typeof pieceNames] || piece.type;
          pieces.push(`${pieceName} ${colorName} in ${file}${rank}`);
        }
      });
    });

    const text =
      pieces.length > 0
        ? `Posizione: ${pieces.join(", ")}`
        : "Scacchiera vuota";

    setState((prev) => ({ ...prev, message: text }));
  };

  const progress =
    state.totalCards > 0 ? ((state.cardIndex + 1) / state.totalCards) * 100 : 0;
  const accuracy =
    state.sessionStats.reviewed > 0
      ? Math.round(
          (state.sessionStats.correct / state.sessionStats.reviewed) * 100,
        )
      : 100;

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
          minWidth: "800px",
          maxWidth: "1000px",
          border: "2px solid #8b5cf6",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          maxHeight: "90vh",
          overflowY: "auto",
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
          <h2 style={{ color: "#8b5cf6", margin: 0, fontSize: "1.5rem" }}>
            🎴 Flashcard Anki - Allenamento Tattico
          </h2>
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

        {/* Progress and Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#2d3142",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#8b5cf6",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {state.cardIndex + 1} / {state.totalCards}
            </div>
            <div style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
              Progresso
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#2d3142",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#10b981",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {accuracy}%
            </div>
            <div style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
              Precisione
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#2d3142",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#ffd700",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {state.sessionStats.streak}
            </div>
            <div style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>Serie</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#2d3142",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "2rem",
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

        {/* Question */}
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
                  : "#8b5cf6"
            }`,
          }}
        >
          <h3
            style={{
              color:
                state.messageType === "success"
                  ? "#10b981"
                  : state.messageType === "error"
                    ? "#ef4444"
                    : "#ffd700",
              margin: 0,
              fontSize: "1.2rem",
              textAlign: "center",
            }}
          >
            {state.message}
          </h3>
        </div>

        {/* Chess Board */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <ChessBoard
              position={state.game.getBoard()}
              isVisible={true}
              onSquareClick={() => {}} // Interactive moves could be added here
            />
          </div>

          {/* Side Panel */}
          <div style={{ flex: "0 0 300px" }}>
            {/* Move Input */}
            {!state.showAnswer && (
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    color: "#a0a0a0",
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "1rem",
                  }}
                >
                  La tua mossa:
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={state.userMove}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        userMove: e.target.value,
                      }))
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleMoveSubmit()}
                    placeholder="es. Nf3, e4, O-O"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      backgroundColor: "#2d3142",
                      color: "white",
                      border: "2px solid #666",
                      borderRadius: "6px",
                      fontSize: "1rem",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleMoveSubmit}
                    disabled={!state.userMove.trim()}
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: state.userMove.trim()
                        ? "#8b5cf6"
                        : "#666",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: state.userMove.trim() ? "pointer" : "not-allowed",
                      fontSize: "1rem",
                    }}
                  >
                    ✓
                  </button>
                </div>
              </div>
            )}

            {/* Performance Rating (after answer) */}
            {state.showAnswer && (
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    color: "#a0a0a0",
                    display: "block",
                    marginBottom: "1rem",
                    fontSize: "1rem",
                  }}
                >
                  Quanto è stata difficile?
                </label>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <button
                    onClick={() => handlePerformanceRating("again")}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    🔴 Di nuovo (&lt;1 giorno)
                  </button>
                  <button
                    onClick={() => handlePerformanceRating("hard")}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    🟡 Difficile (&lt;6 giorni)
                  </button>
                  <button
                    onClick={() => handlePerformanceRating("good")}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    🟢 Buono (&lt;10 giorni)
                  </button>
                  <button
                    onClick={() => handlePerformanceRating("easy")}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    🔵 Facile (14+ giorni)
                  </button>
                </div>
              </div>
            )}

            {/* Voice Controls */}
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={speakPosition}
                disabled={!isVoiceEnabled}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: isVoiceEnabled ? "#8b5cf6" : "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isVoiceEnabled ? "pointer" : "not-allowed",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                🔊 Leggi Posizione
              </button>

              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                🚪 Fine Sessione
              </button>
            </div>

            {/* Card Info */}
            {state.currentCard && (
              <div
                style={{
                  backgroundColor: "#2d3142",
                  padding: "1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#a0a0a0",
                }}
              >
                <div>
                  <strong>Carta:</strong> {state.currentCard.id}
                </div>
                <div>
                  <strong>Revisioni:</strong> {state.currentCard.reviewCount}
                </div>
                <div>
                  <strong>Intervallo:</strong> {state.currentCard.interval}{" "}
                  giorni
                </div>
                <div>
                  <strong>Facilità:</strong>{" "}
                  {state.currentCard.easeFactor.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "1rem",
            backgroundColor: "rgba(139,92,246,0.1)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "#a0a0a0",
          }}
        >
          <strong style={{ color: "#8b5cf6" }}>💡 Come funziona:</strong>
          <ul style={{ margin: "0.5rem 0", paddingLeft: "1rem" }}>
            <li>Studia la posizione e trova la mossa migliore</li>
            <li>
              Inserisci la mossa in notazione algebrica (es. Nf3, e4, O-O)
            </li>
            <li>
              Dopo la risposta, valuta la difficoltà per l&apos;algoritmo Anki
            </li>
            <li>Le carte difficili riappariranno più spesso</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
