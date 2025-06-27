// src/ui/components/LichessPiece.tsx
import React from "react";

interface LichessPieceProps {
  piece: {
    type: string; // 'k', 'q', 'r', 'b', 'n', 'p'
    color: "w" | "b";
  };
  isSelected?: boolean;
  isDragging?: boolean;
  className?: string;
}

/**
 * EXACT LICHESS PIECE IMPLEMENTATION
 * Uses CSS background-image like real Lichess
 */
export const LichessPiece: React.FC<LichessPieceProps> = ({
  piece,
  isSelected = false,
  isDragging = false,
  className = "",
}) => {
  // Map piece notation to Lichess class names
  const pieceTypeMap: { [key: string]: string } = {
    k: "king",
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight",
    p: "pawn",
  };

  const pieceName = pieceTypeMap[piece.type.toLowerCase()];
  const pieceColor = piece.color === "w" ? "white" : "black";

  // Build CSS classes exactly like Lichess (including is2d for cburnett pieces)
  const cssClasses = [
    "is2d", // Required for cburnett-pieces.css selectors
    "piece",
    pieceName,
    pieceColor,
    isSelected ? "selected" : "",
    isDragging ? "dragging" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cssClasses}
      style={{
        // Interactive chessboard positioning - stay within grid square
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: isSelected ? 10 : isDragging ? 11 : 2,
        willChange: "transform",
        pointerEvents: "none",
        // Additional styling for better visibility
        filter: isSelected
          ? "drop-shadow(0 0 8px rgba(32, 191, 107, 0.8))"
          : "none",
        transform: isSelected ? "scale(1.05)" : "scale(1)",
        transition: "all 0.2s ease-out",
      }}
    />
  );
};
