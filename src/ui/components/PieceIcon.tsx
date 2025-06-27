// src/ui/components/PieceIcon.tsx
import React from "react";

interface PieceIconProps {
  piece: {
    type: string; // 'k', 'q', 'r', 'b', 'n', 'p'
    color: "w" | "b";
  };
  size?: number;
  className?: string;
}

/**
 * LICHESS-STYLE SVG PIECE COMPONENT
 * Uses CBurnett piece set - the most popular on Lichess
 * SVG files should be placed in public/pieces/cburnett/
 */
export const PieceIcon: React.FC<PieceIconProps> = ({
  piece,
  size = 60,
  className = "",
}) => {
  // Map piece notation to SVG filename
  const pieceMap: { [key: string]: string } = {
    k: "king",
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight",
    p: "pawn",
  };

  const pieceName = pieceMap[piece.type.toLowerCase()];
  const pieceColor = piece.color === "w" ? "white" : "black";

  // SVG path following Lichess naming convention
  const svgPath = `/pieces/cburnett/${pieceColor}-${pieceName}.svg`;

  // Fallback to Unicode if SVG not available
  const unicodeFallback: { [key: string]: string } = {
    wK: "♔",
    wQ: "♕",
    wR: "♖",
    wB: "♗",
    wN: "♘",
    wP: "♙",
    bK: "♚",
    bQ: "♛",
    bR: "♜",
    bB: "♝",
    bN: "♞",
    bP: "♟",
  };

  const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
  const fallbackSymbol = unicodeFallback[pieceKey];

  return (
    <div
      className={`chess-piece ${className}`}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <img
        src={svgPath}
        alt={`${pieceColor} ${pieceName}`}
        width={size}
        height={size}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // High contrast filter for visibility
          filter:
            piece.color === "w"
              ? "drop-shadow(1px 1px 2px rgba(0,0,0,0.8))"
              : "drop-shadow(1px 1px 2px rgba(255,255,255,0.4))",
        }}
        onError={(e) => {
          // Fallback to Unicode if SVG fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span style="
              font-size: ${size * 0.9}px;
              line-height: 1;
              font-weight: 900;
              color: ${piece.color === "w" ? "#ffffff" : "#000000"};
              text-shadow: ${
                piece.color === "w"
                  ? "0 0 3px #000, 1px 1px 2px #000, -1px -1px 2px #000"
                  : "0 0 3px #fff, 1px 1px 2px #fff, -1px -1px 2px #fff"
              };
              -webkit-text-stroke: ${piece.color === "w" ? "2px #000" : "2px #fff"};
            ">${fallbackSymbol}</span>`;
          }
        }}
      />
    </div>
  );
};
