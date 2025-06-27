// src/ui/components/InteractiveChessBoard.tsx
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { ChessPosition } from "@core/chess/types";
import { ChessGame } from "@core/chess/ChessGame";
import { Square } from "chess.js";
import { PieceIcon } from "./PieceIcon";

interface InteractiveChessBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
  onMove?: (move: { from: string; to: string; san: string }) => void;
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
  allowMoves?: boolean;
  showCoordinates?: boolean;
  game: ChessGame; // Add game instance for move validation
}


// Professional Lichess-style color palette from reference image
const BOARD_COLORS = {
  light: "#f0d9b5", // Light wooden squares
  dark: "#b58863", // Dark wooden squares
  border: "#8b7355", // Board frame
  coordinates: "#8b7355", // Coordinate labels
  highlight: "#cdd26a", // Move highlights (yellow-green)
  lastMoveLight: "#cdd26a",
  lastMoveDark: "#aaa23a",
  check: "#ff5555",
  validMove: "#20bf6b",
  selectedSquare: "#20bf6b",
  possibleMove: "rgba(32, 191, 107, 0.3)",
};

export const InteractiveChessBoard: React.FC<InteractiveChessBoardProps> = ({
  position,
  isVisible,
  className = "",
  onMove,
  highlightedSquares = [],
  lastMove,
  allowMoves = false,
  showCoordinates = true,
  game,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  // Clear selection when position changes
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  }, [position]);

  const getSquareFromCoords = (rank: number, file: number): string => {
    const fileChar = String.fromCharCode(97 + file); // a-h
    return `${fileChar}${8 - rank}`;
  };

  const handleSquareClick = (square: string) => {
    if (!allowMoves) return;

    if (selectedSquare === null) {
      // Select piece if there's a piece on this square
      const file = square.charCodeAt(0) - 97;
      const piece = position[8 - parseInt(square[1])][file];

      if (piece) {
        setSelectedSquare(square);

        // Get possible moves for this piece
        const moves = game.getValidMovesFrom(square as Square);
        setPossibleMoves(moves.map((move) => move.to));
      }
    } else if (selectedSquare === square) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      // Attempt to make a move
      const moveAttempt = {
        from: selectedSquare,
        to: square,
      };

      // Validate move with the game engine
      const validMove = game.isValidMove(
        moveAttempt.from as Square,
        moveAttempt.to as Square,
      );

      if (validMove && onMove) {
        onMove({
          from: moveAttempt.from,
          to: moveAttempt.to,
          san: validMove.san,
        });
      }

      // Clear selection after move attempt
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const getSquareColor = (
    rowIndex: number,
    colIndex: number,
    square: string,
  ) => {
    const isLight = (rowIndex + colIndex) % 2 === 0;

    // Selected square highlight
    if (square === selectedSquare) {
      return BOARD_COLORS.selectedSquare;
    }

    // Possible move highlight
    if (possibleMoves.includes(square)) {
      return BOARD_COLORS.possibleMove;
    }

    // Last move highlight
    if (lastMove && (square === lastMove.from || square === lastMove.to)) {
      return isLight ? BOARD_COLORS.lastMoveLight : BOARD_COLORS.lastMoveDark;
    }

    // Custom highlights
    if (highlightedSquares.includes(square)) {
      return BOARD_COLORS.highlight;
    }

    // Default colors
    return isLight ? BOARD_COLORS.light : BOARD_COLORS.dark;
  };

  if (!isVisible) {
    return (
      <div
        className={`chess-board-hidden ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "500px",
          backgroundColor: "#1a1a1a",
          borderRadius: "12px",
          border: "2px solid #444",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          className="hidden-message"
          style={{
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
            }}
          >
            🙈
          </div>
          <h3
            style={{
              color: "#ffd700",
              fontSize: "1.8rem",
              marginBottom: "1rem",
              fontWeight: "600",
            }}
          >
            Modalità Blindfold Attiva
          </h3>
          <p
            style={{
              color: "#a0a0a0",
              fontSize: "1.1rem",
              lineHeight: "1.5",
            }}
          >
            La scacchiera è nascosta. Usa i comandi vocali per giocare.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "8px",
              fontSize: "0.9rem",
              color: "#888",
            }}
          >
            <p>
              <kbd>B</kbd> per mostrare/nascondere • <kbd>V</kbd> per comandi
              vocali
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chess-board-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      {/* Interactive board */}
      <div
        className="chess-board"
        style={{
          display: "grid",
          gridTemplateColumns: showCoordinates
            ? "24px repeat(8, 70px) 24px"
            : "repeat(8, 70px)",
          gridTemplateRows: showCoordinates
            ? "24px repeat(8, 70px) 24px"
            : "repeat(8, 70px)",
          gap: "0",
          background: BOARD_COLORS.border,
          padding: "12px",
          borderRadius: "12px",
          boxShadow:
            "inset 0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)",
          position: "relative",
        }}
      >
        {showCoordinates && (
          <>
            {/* Top file labels (a-h) */}
            {[null, "a", "b", "c", "d", "e", "f", "g", "h", null].map(
              (file, index) => (
                <div
                  key={`top-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BOARD_COLORS.coordinates,
                    fontSize: "12px",
                    fontWeight: "600",
                    gridColumn: index + 1,
                    gridRow: 1,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {file}
                </div>
              ),
            )}
          </>
        )}

        {/* Board squares with rank labels */}
        {position
          .map((row, rowIndex) => {
            const rank = 8 - rowIndex;
            return [
              // Left rank label
              showCoordinates && (
                <div
                  key={`rank-left-${rank}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BOARD_COLORS.coordinates,
                    fontSize: "12px",
                    fontWeight: "600",
                    gridColumn: 1,
                    gridRow: rowIndex + 2,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {rank}
                </div>
              ),
              // Board squares for this row
              ...row.map((piece, colIndex) => {
                const square = getSquareFromCoords(rowIndex, colIndex);
                const squareColor = getSquareColor(rowIndex, colIndex, square);
                const isHovered = hoveredSquare === square;
                const isSelected = selectedSquare === square;
                const isPossibleMove = possibleMoves.includes(square);
                const hasValidMove =
                  allowMoves && game.hasValidMovesFrom(square as Square);

                return (
                  <div
                    key={square}
                    className="chess-square"
                    style={{
                      backgroundColor: squareColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "42px",
                      position: "relative",
                      gridColumn: showCoordinates ? colIndex + 2 : colIndex + 1,
                      gridRow: showCoordinates ? rowIndex + 2 : rowIndex + 1,
                      width: "70px",
                      height: "70px",
                      cursor: allowMoves
                        ? hasValidMove || isPossibleMove
                          ? "pointer"
                          : "default"
                        : "default",
                      transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform:
                        isHovered || isSelected ? "scale(1.02)" : "scale(1)",
                      boxShadow: isSelected
                        ? "0 0 0 3px rgba(32, 191, 107, 0.6), 0 4px 12px rgba(0,0,0,0.15)"
                        : isHovered
                          ? "0 4px 12px rgba(0,0,0,0.15), inset 0 0 20px rgba(255,255,255,0.1)"
                          : "inset 0 0 0 1px rgba(0,0,0,0.1)",
                      overflow: "hidden",
                      border: isPossibleMove
                        ? "2px solid rgba(32, 191, 107, 0.8)"
                        : "none",
                    }}
                    onClick={() => handleSquareClick(square)}
                    onMouseEnter={() => setHoveredSquare(square)}
                    onMouseLeave={() => setHoveredSquare(null)}
                  >
                    {/* LICHESS-STYLE SVG PIECES */}
                    {piece && (
                      <PieceIcon
                        piece={piece}
                        size={56}
                        className={isHovered || isSelected ? "piece-active" : ""}
                      />
                    )}

                    {/* Possible move indicator */}
                    {isPossibleMove && !piece && (
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: "rgba(32, 191, 107, 0.6)",
                          borderRadius: "50%",
                          position: "absolute",
                        }}
                      />
                    )}

                    {/* Capture indicator */}
                    {isPossibleMove && piece && (
                      <div
                        style={{
                          position: "absolute",
                          inset: "0",
                          border: "3px solid rgba(32, 191, 107, 0.8)",
                          borderRadius: "50%",
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* Square coordinates on hover */}
                    {showCoordinates && (
                      <span
                        className="square-coordinate"
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          right: "4px",
                          fontSize: "10px",
                          color:
                            (rowIndex + colIndex) % 2 === 0
                              ? "#8b7355"
                              : "#f0d9b5",
                          opacity: isHovered ? 0.8 : 0,
                          transition: "opacity 0.2s ease",
                          fontWeight: "600",
                          fontFamily: "monospace",
                          backgroundColor: "rgba(0,0,0,0.1)",
                          borderRadius: "2px",
                          padding: "1px 3px",
                          backdropFilter: "blur(2px)",
                          zIndex: 3,
                        }}
                      >
                        {square}
                      </span>
                    )}

                    {/* Interactive hover effect */}
                    <div
                      style={{
                        position: "absolute",
                        inset: "0",
                        background:
                          isHovered || isSelected
                            ? "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)"
                            : "none",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    />
                  </div>
                );
              }),
              // Right rank label
              showCoordinates && (
                <div
                  key={`rank-right-${rank}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BOARD_COLORS.coordinates,
                    fontSize: "12px",
                    fontWeight: "600",
                    gridColumn: 10,
                    gridRow: rowIndex + 2,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {rank}
                </div>
              ),
            ].filter(Boolean);
          })
          .flat()}

        {showCoordinates && (
          <>
            {/* Bottom file labels (a-h) */}
            {[null, "a", "b", "c", "d", "e", "f", "g", "h", null].map(
              (file, index) => (
                <div
                  key={`bottom-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BOARD_COLORS.coordinates,
                    fontSize: "12px",
                    fontWeight: "600",
                    gridColumn: index + 1,
                    gridRow: 10,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {file}
                </div>
              ),
            )}
          </>
        )}
      </div>

      {/* Board status and controls */}
      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          color: "#a0a0a0",
          fontSize: "0.85rem",
          fontFamily: "Inter, system-ui, sans-serif",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {allowMoves && selectedSquare && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#20bf6b",
              fontWeight: "bold",
            }}
          >
            <span>📍 Selezionato: {selectedSquare.toUpperCase()}</span>
            {possibleMoves.length > 0 && (
              <span>• {possibleMoves.length} mosse possibili</span>
            )}
          </div>
        )}

        {lastMove && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: BOARD_COLORS.lastMoveLight,
                borderRadius: "2px",
              }}
            />
            <span>
              Ultima mossa: {lastMove.from.toUpperCase()}-
              {lastMove.to.toUpperCase()}
            </span>
          </div>
        )}

        {allowMoves && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            💡 Clicca sui pezzi per vedere le mosse possibili
          </div>
        )}
      </div>
    </div>
  );
};
