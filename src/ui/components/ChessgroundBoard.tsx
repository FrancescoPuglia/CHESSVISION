// src/ui/components/ChessgroundBoard.tsx
import React, { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import { Api } from "@lichess-org/chessground/api";
import { Config } from "@lichess-org/chessground/config";
import { ChessPosition } from "@core/chess/types";

interface ChessgroundBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
  onSquareClick?: (square: string) => void; // eslint-disable-line no-unused-vars
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
  size?: number;
  orientation?: "white" | "black";
  onMove?: (from: string, to: string) => void; // eslint-disable-line no-unused-vars
}

/**
 * OFFICIAL LICHESS CHESSGROUND IMPLEMENTATION
 * Uses the exact same library as lichess.org
 */
export const ChessgroundBoard: React.FC<ChessgroundBoardProps> = ({
  position,
  isVisible,
  className = "",
  onSquareClick,
  highlightedSquares = [],
  lastMove,
  size = 500,
  orientation = "white",
  onMove,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<Api | null>(null);

  // Convert our position to FEN format
  const positionToFen = (pos: ChessPosition): string => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

    const pieceMap = new Map<string, string>();

    pos.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece) {
          const file = files[colIndex];
          const rank = ranks[rowIndex];
          const square = `${file}${rank}`;

          // Convert piece notation to FEN format
          const pieceSymbol = piece.type === "n" ? "n" : piece.type;
          const symbol =
            piece.color === "w"
              ? pieceSymbol.toUpperCase()
              : pieceSymbol.toLowerCase();
          pieceMap.set(square, symbol);
        }
      });
    });

    // Build FEN board representation
    const fenRows: string[] = [];
    for (let rank = 8; rank >= 1; rank--) {
      let fenRow = "";
      let emptyCount = 0;

      for (const file of files) {
        const square = `${file}${rank}`;
        const piece = pieceMap.get(square);

        if (piece) {
          if (emptyCount > 0) {
            fenRow += emptyCount;
            emptyCount = 0;
          }
          fenRow += piece;
        } else {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        fenRow += emptyCount;
      }

      fenRows.push(fenRow);
    }

    return fenRows.join("/") + " w - - 0 1"; // Basic FEN, always white to move
  };

  // Initialize Chessground
  useEffect(() => {
    if (!boardRef.current || !isVisible) return;

    const config: Config = {
      fen: positionToFen(position),
      orientation,
      turnColor: "white",
      check: false,
      lastMove: lastMove
        ? [lastMove.from as any, lastMove.to as any]
        : undefined,
      coordinates: true,
      autoCastle: true,
      viewOnly: true, // Start as view-only, can be changed later
      disableContextMenu: false,
      addPieceZIndex: false,
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      movable: {
        free: false,
        color: "both",
        dests: new Map(),
        showDests: true,
        events: {
          after: (orig, dest) => {
            if (onMove) {
              onMove(orig, dest);
            }
          },
        },
        rookCastle: true,
      },
      premovable: {
        enabled: true,
        showDests: true,
        castle: true,
        events: {},
      },
      draggable: {
        enabled: true,
        distance: 3,
        autoDistance: true,
        showGhost: true,
        deleteOnDropOff: false,
      },
      selectable: {
        enabled: true,
      },
      events: {
        select: (key) => {
          if (onSquareClick) {
            onSquareClick(key);
          }
        },
      },
      drawable: {
        enabled: true,
        visible: true,
        defaultSnapToValidMove: true,
        shapes: [],
        autoShapes: [],
        brushes: {
          green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
          red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
          blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
          yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
        },
      },
    };

    // Initialize Chessground
    chessgroundRef.current = Chessground(boardRef.current, config);

    return () => {
      // Cleanup
      if (chessgroundRef.current) {
        chessgroundRef.current.destroy();
        chessgroundRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRef, isVisible, orientation]);

  // Update position
  useEffect(() => {
    if (!chessgroundRef.current) return;

    const fen = positionToFen(position);
    chessgroundRef.current.set({ fen });
  }, [position]);

  // Update last move highlight
  useEffect(() => {
    if (!chessgroundRef.current) return;

    chessgroundRef.current.set({
      lastMove: lastMove
        ? [lastMove.from as any, lastMove.to as any]
        : undefined,
    });
  }, [lastMove]);

  // Update highlighted squares
  useEffect(() => {
    if (!chessgroundRef.current) return;

    const shapes = highlightedSquares.map((square) => ({
      orig: square as any,
      brush: "yellow",
    }));

    chessgroundRef.current.setShapes(shapes);
  }, [highlightedSquares]);

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

  return (
    <div
      className={`chessground-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <div
        ref={boardRef}
        className="cg-wrap blue cburnett is2d"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
};
