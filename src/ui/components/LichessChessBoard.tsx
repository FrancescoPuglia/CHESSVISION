// src/ui/components/LichessChessBoard.tsx
import React from "react";
import { ChessPosition } from "@core/chess/types";

interface LichessChessBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
  onSquareClick?: (square: string) => void; // eslint-disable-line no-unused-vars
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
  size?: number;
}

/**
 * EXACT LICHESS CHESSBOARD IMPLEMENTATION
 * Uses the same HTML structure as lichess.org
 */
export const LichessChessBoard: React.FC<LichessChessBoardProps> = ({
  position,
  isVisible,
  className = "",
  onSquareClick,
  highlightedSquares = [],
  lastMove,
  size = 500,
}) => {
  if (!isVisible) {
    return (
      <div
        className={`chess-board-hidden ${className}`}
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
          borderRadius: "12px",
          border: "2px solid #444",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🙈</div>
          <h3
            style={{
              color: "#ffd700",
              fontSize: "1.8rem",
              marginBottom: "1rem",
            }}
          >
            Modalità Blindfold Attiva
          </h3>
          <p style={{ color: "#a0a0a0", fontSize: "1.1rem" }}>
            La scacchiera è nascosta. Usa i comandi vocali per giocare.
          </p>
        </div>
      </div>
    );
  }

  // Generate files and ranks
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  // Convert position to square-piece mapping
  const squarePieceMap: { [square: string]: { type: string; color: string } } =
    {};

  position.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        const file = files[colIndex];
        const rank = ranks[rowIndex];
        const square = `${file}${rank}`;
        squarePieceMap[square] = piece;
      }
    });
  });

  const renderSquare = (file: string, rank: number) => {
    const square = `${file}${rank}`;
    const piece = squarePieceMap[square];
    const isHighlighted = highlightedSquares.includes(square);
    const isLastMove =
      lastMove && (square === lastMove.from || square === lastMove.to);

    // Calculate position based on file and rank
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    const left = fileIndex * 12.5 + "%";
    const top = rankIndex * 12.5 + "%";

    return (
      <React.Fragment key={square}>
        {/* Square */}
        <div
          className={`square ${isHighlighted ? "selected" : ""} ${isLastMove ? "last-move" : ""}`}
          style={{
            position: "absolute",
            left,
            top,
            width: "12.5%",
            height: "12.5%",
            cursor: onSquareClick ? "pointer" : "default",
          }}
          onClick={() => onSquareClick?.(square)}
        />

        {/* Piece */}
        {piece && (
          <div
            className={`piece ${piece.type} ${piece.color === "w" ? "white" : "black"}`}
            style={{
              position: "absolute",
              left,
              top,
              width: "12.5%",
              height: "12.5%",
              backgroundSize: "cover",
              zIndex: 2,
              willChange: "transform",
              pointerEvents: "none",
            }}
          />
        )}
      </React.Fragment>
    );
  };

  return (
    <div
      className={`lichess-chessboard-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <div
        className="cg-board"
        style={{
          position: "relative",
          width: size,
          height: size,
          backgroundColor: "#f0d9b5",
          backgroundImage: `
            linear-gradient(45deg, #b58863 25%, transparent 25%),
            linear-gradient(-45deg, #b58863 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #b58863 75%),
            linear-gradient(-45deg, transparent 75%, #b58863 75%)
          `,
          backgroundSize: "25% 25%",
          backgroundPosition: "0 0, 0 12.5%, 12.5% -12.5%, -12.5% 0px",
          userSelect: "none",
          lineHeight: 0,
          transformOrigin: "0 0",
        }}
      >
        {/* Render all squares and pieces */}
        {files.map((file) => ranks.map((rank) => renderSquare(file, rank)))}

        {/* Coordinates */}
        <div
          className="coords ranks"
          style={{
            position: "absolute",
            right: "-15px",
            top: 0,
            display: "flex",
            flexDirection: "column-reverse",
            height: "100%",
            width: "12px",
            pointerEvents: "none",
            opacity: 0.8,
            fontSize: "9px",
          }}
        >
          {ranks.map((rank) => (
            <div
              key={rank}
              className="coord"
              style={{
                flex: "1 1 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rank}
            </div>
          ))}
        </div>

        <div
          className="coords files"
          style={{
            position: "absolute",
            bottom: "-16px",
            left: 0,
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "12px",
            textTransform: "uppercase",
            textAlign: "center",
            pointerEvents: "none",
            opacity: 0.8,
            fontSize: "9px",
          }}
        >
          {files.map((file) => (
            <div
              key={file}
              className="coord"
              style={{
                flex: "1 1 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
