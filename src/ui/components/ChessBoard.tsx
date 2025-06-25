// src/ui/components/ChessBoard.tsx
import React, { useState } from 'react';
import { ChessPosition } from '@core/chess/types';

interface ChessBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
  onSquareClick?: (square: string) => void;
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
}

// Beautiful chess piece symbols with professional styling
const PIECE_SYMBOLS: { [key: string]: string } = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

// Modern Chess.com/Lichess inspired color palette
const BOARD_COLORS = {
  light: '#f0d9b5',
  dark: '#b58863',
  border: '#8b7355',
  coordinates: '#6b5b47',
  highlight: '#cdd26a',
  lastMoveLight: '#cdd26a',
  lastMoveDark: '#aaa23a',
  check: '#ff6b6b',
  validMove: '#20bf6b'
};

export const ChessBoard: React.FC<ChessBoardProps> = ({ 
  position, 
  isVisible, 
  className = '',
  onSquareClick,
  highlightedSquares = [],
  lastMove
}) => {
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  if (!isVisible) {
    return (
      <div className={`chess-board-hidden ${className}`} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '500px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '2px solid #444',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div className="hidden-message" style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem'
          }}>🙈</div>
          <h3 style={{ 
            color: '#ffd700', 
            fontSize: '1.8rem', 
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            Modalità Blindfold Attiva
          </h3>
          <p style={{ 
            color: '#a0a0a0',
            fontSize: '1.1rem',
            lineHeight: '1.5'
          }}>
            La scacchiera è nascosta. Usa i comandi vocali per giocare.
          </p>
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#888'
          }}>
            <p><kbd>B</kbd> per mostrare/nascondere • <kbd>V</kbd> per comandi vocali</p>
          </div>
        </div>
      </div>
    );
  }

  const getSquareColor = (rowIndex: number, colIndex: number, square: string) => {
    const isLight = (rowIndex + colIndex) % 2 === 0;
    
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

  return (
    <div className={`chess-board-container ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      position: 'relative'
    }}>
      {/* Professional board with coordinates */}
      <div 
        className="chess-board"
        style={{
          display: 'grid',
          gridTemplateColumns: '24px repeat(8, 70px) 24px',
          gridTemplateRows: '24px repeat(8, 70px) 24px',
          gap: '0',
          background: BOARD_COLORS.border,
          padding: '12px',
          borderRadius: '12px',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
          position: 'relative'
        }}
      >
        {/* Top file labels (a-h) */}
        {[null, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', null].map((file, index) => (
          <div
            key={`top-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BOARD_COLORS.coordinates,
              fontSize: '12px',
              fontWeight: '600',
              gridColumn: index + 1,
              gridRow: 1,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {file}
          </div>
        ))}

        {/* Board squares with rank labels */}
        {position.map((row, rowIndex) => {
          const rank = 8 - rowIndex;
          return [
            // Left rank label
            <div
              key={`rank-left-${rank}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BOARD_COLORS.coordinates,
                fontSize: '12px',
                fontWeight: '600',
                gridColumn: 1,
                gridRow: rowIndex + 2,
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {rank}
            </div>,
            // Board squares for this row
            ...row.map((piece, colIndex) => {
              const file = String.fromCharCode(97 + colIndex); // a-h
              const square = `${file}${rank}`;
              const squareColor = getSquareColor(rowIndex, colIndex, square);
              const isHovered = hoveredSquare === square;
              
              return (
                <div
                  key={square}
                  className="chess-square"
                  style={{
                    backgroundColor: squareColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '42px',
                    position: 'relative',
                    gridColumn: colIndex + 2,
                    gridRow: rowIndex + 2,
                    width: '70px',
                    height: '70px',
                    cursor: onSquareClick ? 'pointer' : 'default',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHovered 
                      ? '0 4px 12px rgba(0,0,0,0.15), inset 0 0 20px rgba(255,255,255,0.1)' 
                      : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}
                  onClick={() => onSquareClick?.(square)}
                  onMouseEnter={() => setHoveredSquare(square)}
                  onMouseLeave={() => setHoveredSquare(null)}
                >
                  {/* Piece rendering with shadows and effects */}
                  {piece && (
                    <span style={{
                      textShadow: piece.color === 'w' 
                        ? '0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)' 
                        : '0 2px 4px rgba(255,255,255,0.2), 0 1px 2px rgba(255,255,255,0.3)',
                      filter: piece.color === 'w' ? 'brightness(1.1)' : 'brightness(0.95)',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      display: 'block',
                      lineHeight: '1'
                    }}>
                      {PIECE_SYMBOLS[`${piece.color}${piece.type.toUpperCase()}`]}
                    </span>
                  )}
                  
                  {/* Square coordinates on hover */}
                  <span 
                    className="square-coordinate"
                    style={{
                      position: 'absolute',
                      bottom: '3px',
                      right: '4px',
                      fontSize: '10px',
                      color: (rowIndex + colIndex) % 2 === 0 ? '#8b7355' : '#f0d9b5',
                      opacity: isHovered ? 0.8 : 0,
                      transition: 'opacity 0.2s ease',
                      fontWeight: '600',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '2px',
                      padding: '1px 3px',
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    {square}
                  </span>

                  {/* Subtle square pattern overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: '0',
                    background: isHovered 
                      ? 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)'
                      : 'none',
                    pointerEvents: 'none'
                  }} />
                </div>
              );
            }),
            // Right rank label
            <div
              key={`rank-right-${rank}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BOARD_COLORS.coordinates,
                fontSize: '12px',
                fontWeight: '600',
                gridColumn: 10,
                gridRow: rowIndex + 2,
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {rank}
            </div>
          ];
        }).flat()}

        {/* Bottom file labels (a-h) */}
        {[null, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', null].map((file, index) => (
          <div
            key={`bottom-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BOARD_COLORS.coordinates,
              fontSize: '12px',
              fontWeight: '600',
              gridColumn: index + 1,
              gridRow: 10,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {file}
          </div>
        ))}
      </div>

      {/* Professional board info */}
      <div style={{
        marginTop: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: '#a0a0a0',
        fontSize: '0.85rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: BOARD_COLORS.light,
            borderRadius: '2px'
          }} />
          <span>Light Squares</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: BOARD_COLORS.dark,
            borderRadius: '2px'
          }} />
          <span>Dark Squares</span>
        </div>
        {lastMove && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: BOARD_COLORS.lastMoveLight,
              borderRadius: '2px'
            }} />
            <span>Last Move: {lastMove.from}-{lastMove.to}</span>
          </div>
        )}
      </div>
    </div>
  );
};