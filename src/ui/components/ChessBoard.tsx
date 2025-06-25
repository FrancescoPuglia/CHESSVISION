// src/ui/components/ChessBoard.tsx
import React from 'react';
import { ChessPosition } from '@core/chess/types';

interface ChessBoardProps {
  position: ChessPosition;
  isVisible: boolean;
  className?: string;
}

const PIECE_SYMBOLS: { [key: string]: string } = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

export const ChessBoard: React.FC<ChessBoardProps> = ({ position, isVisible, className = '' }) => {
  if (!isVisible) {
    return (
      <div className={`chess-board-hidden ${className}`}>
        <div className="hidden-message">
          <h3 style={{ color: '#ffd700', fontSize: '1.5rem', marginBottom: '1rem' }}>
            Modalità Blindfold Attiva
          </h3>
          <p style={{ color: '#a0a0a0' }}>
            La scacchiera è nascosta. Usa i comandi per giocare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`chess-board ${className}`}>
      <div className="board-grid">
        {position.map((row, rowIndex) => 
          row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const file = String.fromCharCode(97 + colIndex); // a-h
            const rank = 8 - rowIndex; // 8-1
            const square = `${file}${rank}`;
            
            return (
              <div
                key={square}
                className={`chess-square ${isLight ? 'light' : 'dark'}`}
                style={{
                  backgroundColor: isLight ? '#f0d9b5' : '#b58863',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  position: 'relative'
                }}
              >
                {piece && PIECE_SYMBOLS[`${piece.color}${piece.type.toUpperCase()}`]}
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '4px',
                    fontSize: '0.7rem',
                    color: isLight ? '#8B4513' : '#F5DEB3',
                    opacity: 0.7
                  }}
                >
                  {square}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};