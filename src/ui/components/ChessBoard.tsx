// src/ui/components/ChessBoard.tsx
/* eslint-disable no-unused-vars */
import React from "react";
import { ChessPosition } from "@core/chess/types";
import { ChessgroundBoard } from "./ChessgroundBoard";

interface ChessBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
  onSquareClick?: (square: string) => void;
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  isVisible,
  className = "",
  onSquareClick,
  highlightedSquares = [],
  lastMove,
}) => {
  return (
    <ChessgroundBoard
      position={position}
      isVisible={isVisible}
      className={className}
      onSquareClick={onSquareClick}
      highlightedSquares={highlightedSquares}
      lastMove={lastMove}
      size={500}
    />
  );
};
