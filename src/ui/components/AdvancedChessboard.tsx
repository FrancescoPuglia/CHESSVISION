// src/ui/components/AdvancedChessboard.tsx
/**
 * ADVANCED CHESSBOARD - LICHESS CHESSGROUND INSPIRED
 * High-performance chessboard with custom DOM diffing and SVG overlays
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ChessGame } from "@core/chess/ChessGame";

export interface ChessSquare {
  file: string;
  rank: number;
  piece?: {
    type: string;
    color: "w" | "b";
  };
  isHighlighted?: boolean;
  isSelected?: boolean;
  isLastMove?: boolean;
  isPossibleMove?: boolean;
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
}

export interface SVGAnnotation {
  id: string;
  type: "arrow" | "circle" | "square";
  from?: string;
  to?: string;
  square?: string;
  color: string;
  opacity?: number;
}

interface AdvancedChessboardProps {
  game: ChessGame;
  allowMoves?: boolean;
  orientation?: "white" | "black";
  showCoordinates?: boolean;
  showLastMove?: boolean;
  showPossibleMoves?: boolean;
  premovesEnabled?: boolean;
  // eslint-disable-next-line no-unused-vars
  onMove?: (move: ChessMove) => void;
  // eslint-disable-next-line no-unused-vars
  onPremove?: (move: ChessMove) => void;
  animations?: boolean;
  customPieceSet?: string;
  customBoardTheme?: string;
  annotations?: SVGAnnotation[];
}

interface DragState {
  isDragging: boolean;
  piece?: ChessSquare["piece"];
  from?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const AdvancedChessboard: React.FC<AdvancedChessboardProps> = ({
  game,
  allowMoves = true,
  orientation = "white",
  showCoordinates = true,
  // showLastMove = true,
  // showPossibleMoves = true,
  // premovesEnabled = false,
  onMove,
  // onPremove,
  // animations = true,
  customPieceSet = "cburnett",
  customBoardTheme = "brown",
  annotations = [],
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [boardState, setBoardState] = useState<ChessSquare[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  // Premove functionality (not implemented yet)
  // const [premove, setPremove] = useState<ChessMove | null>(null);

  // Custom DOM diff algorithm inspired by Chessground
  const updateBoardDOM = useCallback(
    (newBoardState: ChessSquare[][]) => {
      if (!boardRef.current) return;

      const boardElement = boardRef.current;
      const squares = boardElement.querySelectorAll(".chess-square");

      newBoardState.forEach((row, rankIndex) => {
        row.forEach((square, fileIndex) => {
          const squareIndex = rankIndex * 8 + fileIndex;
          const squareElement = squares[squareIndex] as HTMLElement;

          if (!squareElement) return;

          // Update piece
          const pieceElement = squareElement.querySelector(".chess-piece");
          if (square.piece) {
            if (!pieceElement) {
              const newPiece = document.createElement("div");
              newPiece.className = `chess-piece ${square.piece.color} ${square.piece.type}`;
              newPiece.style.backgroundImage = `url(/pieces/${customPieceSet}/${square.piece.color}${square.piece.type.toUpperCase()}.svg)`;
              squareElement.appendChild(newPiece);
            } else {
              const currentPiece = `${square.piece.color}${square.piece.type.toUpperCase()}`;
              const currentClass = pieceElement.className
                .split(" ")
                .find((cls) => cls.match(/^[wb][PRNBQK]$/));
              if (currentClass !== currentPiece) {
                pieceElement.className = `chess-piece ${square.piece.color} ${square.piece.type}`;
                (pieceElement as HTMLElement).style.backgroundImage =
                  `url(/pieces/${customPieceSet}/${currentPiece}.svg)`;
              }
            }
          } else {
            if (pieceElement) {
              pieceElement.remove();
            }
          }

          // Update highlight classes (minimal DOM writes)
          const classesToRemove = [
            "selected",
            "highlighted",
            "last-move",
            "possible-move",
          ];
          const currentClasses = Array.from(squareElement.classList);
          const classesToAdd: string[] = [];

          classesToRemove.forEach((cls) => {
            if (currentClasses.includes(cls)) {
              squareElement.classList.remove(cls);
            }
          });

          if (square.isSelected) classesToAdd.push("selected");
          if (square.isHighlighted) classesToAdd.push("highlighted");
          if (square.isLastMove) classesToAdd.push("last-move");
          if (square.isPossibleMove) classesToAdd.push("possible-move");

          if (classesToAdd.length > 0) {
            squareElement.classList.add(...classesToAdd);
          }
        });
      });
    },
    [customPieceSet],
  );

  // Convert game board to our square representation
  const gameToSquares = useCallback((): ChessSquare[][] => {
    const board = game.getBoard();
    const squares: ChessSquare[][] = [];

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const rank: ChessSquare[] = [];
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const file = String.fromCharCode(97 + fileIndex); // a-h
        const rankNumber = 8 - rankIndex; // 8-1
        const squareKey = `${file}${rankNumber}`;
        const piece = board[rankIndex][fileIndex];

        const square: ChessSquare = {
          file,
          rank: rankNumber,
          piece: piece ? { type: piece.type, color: piece.color } : undefined,
          isSelected: selectedSquare === squareKey,
          isLastMove: lastMove
            ? lastMove.from === squareKey || lastMove.to === squareKey
            : false,
          isPossibleMove: possibleMoves.includes(squareKey),
        };

        rank.push(square);
      }
      squares.push(rank);
    }

    return orientation === "black"
      ? squares
          .slice()
          .reverse()
          .map((rank) => rank.slice().reverse())
      : squares;
  }, [game, selectedSquare, lastMove, possibleMoves, orientation]);

  // Initialize and update board
  useEffect(() => {
    const newBoardState = gameToSquares();
    setBoardState(newBoardState);
    updateBoardDOM(newBoardState);
  }, [gameToSquares, updateBoardDOM]);

  // Helper function for coordinate conversion
  const squareToCoordinates = useCallback(
    (square: string): { x: number; y: number } => {
      const file = square.charCodeAt(0) - 97; // a-h to 0-7
      const rank = parseInt(square[1]) - 1; // 1-8 to 0-7

      const squareSize = 50; // Assume 50px squares
      const x =
        (orientation === "white" ? file : 7 - file) * squareSize +
        squareSize / 2;
      const y =
        (orientation === "white" ? 7 - rank : rank) * squareSize +
        squareSize / 2;

      return { x, y };
    },
    [orientation],
  );

  // Helper functions for SVG elements
  const createArrowElement = useCallback(
    (from: string, to: string, color: string, opacity = 0.8): SVGElement => {
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "g");
      arrow.setAttribute("class", "annotation-arrow");

      const fromCoords = squareToCoordinates(from);
      const toCoords = squareToCoordinates(to);

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", fromCoords.x.toString());
      line.setAttribute("y1", fromCoords.y.toString());
      line.setAttribute("x2", toCoords.x.toString());
      line.setAttribute("y2", toCoords.y.toString());
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "8");
      line.setAttribute("stroke-opacity", opacity.toString());
      line.setAttribute("marker-end", "url(#arrowhead)");

      arrow.appendChild(line);
      return arrow;
    },
    [squareToCoordinates],
  );

  const createCircleElement = useCallback(
    (square: string, color: string, opacity = 0.6): SVGElement => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      const coords = squareToCoordinates(square);

      circle.setAttribute("cx", coords.x.toString());
      circle.setAttribute("cy", coords.y.toString());
      circle.setAttribute("r", "30");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "6");
      circle.setAttribute("stroke-opacity", opacity.toString());
      circle.setAttribute("class", "annotation-circle");

      return circle;
    },
    [squareToCoordinates],
  );

  const createGhostPiece = useCallback(
    (piece: ChessSquare["piece"], x: number, y: number): SVGElement => {
      const ghost = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "image",
      );
      ghost.setAttribute(
        "href",
        `/pieces/${customPieceSet}/${piece!.color}${piece!.type.toUpperCase()}.svg`,
      );
      ghost.setAttribute("x", (x - 25).toString());
      ghost.setAttribute("y", (y - 25).toString());
      ghost.setAttribute("width", "50");
      ghost.setAttribute("height", "50");
      ghost.setAttribute("opacity", "0.8");
      ghost.setAttribute("class", "drag-ghost");
      return ghost;
    },
    [customPieceSet],
  );

  const coordinatesToSquare = useCallback(
    (x: number, y: number): string | null => {
      if (!boardRef.current) return null;

      const rect = boardRef.current.getBoundingClientRect();
      const squareSize = rect.width / 8;
      const fileIndex = Math.floor((x - rect.left) / squareSize);
      const rankIndex = Math.floor((y - rect.top) / squareSize);

      if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
        return null;
      }

      const file = String.fromCharCode(
        97 + (orientation === "white" ? fileIndex : 7 - fileIndex),
      );
      const rank = orientation === "white" ? 8 - rankIndex : rankIndex + 1;

      return `${file}${rank}`;
    },
    [orientation],
  );

  // SVG overlay management
  const updateSVGOverlay = useCallback(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = ""; // Clear existing annotations

    // Add annotations
    annotations.forEach((annotation) => {
      if (annotation.type === "arrow" && annotation.from && annotation.to) {
        const arrow = createArrowElement(
          annotation.from,
          annotation.to,
          annotation.color,
          annotation.opacity,
        );
        svg.appendChild(arrow);
      } else if (annotation.type === "circle" && annotation.square) {
        const circle = createCircleElement(
          annotation.square,
          annotation.color,
          annotation.opacity,
        );
        svg.appendChild(circle);
      }
    });

    // Add drag ghost piece
    if (dragState.isDragging && dragState.piece) {
      const ghost = createGhostPiece(
        dragState.piece,
        dragState.currentX,
        dragState.currentY,
      );
      svg.appendChild(ghost);
    }
  }, [
    annotations,
    dragState,
    createArrowElement,
    createCircleElement,
    createGhostPiece,
  ]);

  // Mouse/touch event handlers
  const handleSquareClick = useCallback(
    (square: string) => {
      if (!allowMoves) return;

      if (selectedSquare) {
        if (selectedSquare === square) {
          // Deselect
          setSelectedSquare(null);
          setPossibleMoves([]);
        } else if (possibleMoves.includes(square)) {
          // Make move
          const move: ChessMove = {
            from: selectedSquare,
            to: square,
            san: "", // Will be filled by chess engine
          };

          if (onMove) {
            onMove(move);
          }

          setSelectedSquare(null);
          setPossibleMoves([]);
          setLastMove({ from: selectedSquare, to: square });
        } else {
          // Select new square
          setSelectedSquare(square);
          const validMoves = game.getValidMoves();
          const moveStrings = validMoves.map((m) => m.from + m.to);
          const relevantMoves = moveStrings.filter((move) =>
            move.startsWith(square),
          );
          const destinations = relevantMoves.map((move) =>
            move.substring(2, 4),
          );
          setPossibleMoves(destinations);
        }
      } else {
        // First selection
        setSelectedSquare(square);
        const validMoves = game.getValidMoves();
        const moveStrings = validMoves.map((m) => m.from + m.to);
        const relevantMoves = moveStrings.filter((move) =>
          move.startsWith(square),
        );
        const destinations = relevantMoves.map((move) => move.substring(2, 4));
        setPossibleMoves(destinations);
      }
    },
    [allowMoves, selectedSquare, possibleMoves, game, onMove],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, square: string) => {
      if (!allowMoves) return;

      const squareData = boardState
        .find((row) => row.find((sq) => `${sq.file}${sq.rank}` === square))
        ?.find((sq) => `${sq.file}${sq.rank}` === square);

      if (squareData?.piece) {
        setDragState({
          isDragging: true,
          piece: squareData.piece,
          from: square,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
        });
      }
    },
    [allowMoves, boardState],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.isDragging) {
        setDragState((prev) => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
        }));
      }
    },
    [dragState.isDragging],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.isDragging && dragState.from) {
        const dropSquare = coordinatesToSquare(e.clientX, e.clientY);

        if (dropSquare && dropSquare !== dragState.from) {
          const move: ChessMove = {
            from: dragState.from,
            to: dropSquare,
            san: "",
          };

          if (onMove) {
            onMove(move);
          }

          setLastMove({ from: dragState.from, to: dropSquare });
        }

        setDragState({
          isDragging: false,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
        });
      }
    },
    [dragState, onMove, coordinatesToSquare],
  );

  // Update SVG overlay when drag state changes
  useEffect(() => {
    updateSVGOverlay();
  }, [updateSVGOverlay]);

  return (
    <div
      className={`advanced-chessboard ${customBoardTheme}`}
      ref={boardRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: "relative",
        width: "400px",
        height: "400px",
        border: "2px solid #8b5cf6",
        borderRadius: "8px",
        userSelect: "none",
      }}
    >
      {/* Board squares */}
      <div
        className="board-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          width: "100%",
          height: "100%",
        }}
      >
        {boardState.flat().map((square, index) => {
          const squareKey = `${square.file}${square.rank}`;
          const isLight =
            (square.file.charCodeAt(0) - 97 + square.rank) % 2 === 1;

          return (
            <div
              key={squareKey}
              className={`chess-square ${isLight ? "light" : "dark"}`}
              onClick={() => handleSquareClick(squareKey)}
              onMouseDown={(e) => handleMouseDown(e, squareKey)}
              style={{
                backgroundColor: isLight ? "#f0d9b5" : "#b58863",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: allowMoves ? "pointer" : "default",
              }}
            >
              {/* Coordinates */}
              {showCoordinates && index < 8 && (
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: isLight ? "#b58863" : "#f0d9b5",
                  }}
                >
                  {8 - Math.floor(index / 8)}
                </div>
              )}
              {showCoordinates && index >= 56 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: "2px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: isLight ? "#b58863" : "#f0d9b5",
                  }}
                >
                  {String.fromCharCode(97 + (index % 8))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SVG overlay for annotations and effects */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff6b35" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

export default AdvancedChessboard;
