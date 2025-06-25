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
    <div className={`chess-board ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1rem'
    }}>
      {/* Rank Labels (8-1) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '30px repeat(8, 60px) 30px',
        gridTemplateRows: 'repeat(8, 60px)',
        gap: '0',
        border: '3px solid #8B4513',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#8B4513'
      }}>
        {/* File labels top (a-h) */}
        {['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', ''].map((file, index) => (
          <div
            key={`top-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#8B4513',
              color: '#F5DEB3',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              gridColumn: index + 1,
              gridRow: 0,
              height: '20px'
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
                backgroundColor: '#8B4513',
                color: '#F5DEB3',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                gridColumn: 1,
                gridRow: rowIndex + 1,
                width: '30px',
                height: '60px'
              }}
            >
              {rank}
            </div>,
            // Board squares for this row
            ...row.map((piece, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const file = String.fromCharCode(97 + colIndex); // a-h
              const square = `${file}${rank}`;
              
              return (
                <div
                  key={square}
                  style={{
                    backgroundColor: isLight ? '#f0d9b5' : '#b58863',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    position: 'relative',
                    gridColumn: colIndex + 2,
                    gridRow: rowIndex + 1,
                    width: '60px',
                    height: '60px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {piece && (
                    <span style={{
                      textShadow: piece.color === 'w' ? '1px 1px 2px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(255,255,255,0.3)',
                      filter: piece.color === 'w' ? 'brightness(1.1)' : 'brightness(0.9)'
                    }}>
                      {PIECE_SYMBOLS[`${piece.color}${piece.type.toUpperCase()}`]}
                    </span>
                  )}
                  
                  {/* Square coordinate - only show on hover */}
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '4px',
                      fontSize: '0.6rem',
                      color: isLight ? '#8B4513' : '#F5DEB3',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '2px',
                      padding: '1px 2px'
                    }}
                    className="square-coordinate"
                  >
                    {square}
                  </span>
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
                backgroundColor: '#8B4513',
                color: '#F5DEB3',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                gridColumn: 10,
                gridRow: rowIndex + 1,
                width: '30px',
                height: '60px'
              }}
            >
              {rank}
            </div>
          ];
        }).flat()}

        {/* File labels bottom (a-h) */}
        {['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', ''].map((file, index) => (
          <div
            key={`bottom-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#8B4513',
              color: '#F5DEB3',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              gridColumn: index + 1,
              gridRow: 9,
              height: '20px'
            }}
          >
            {file}
          </div>
        ))}
      </div>

      {/* Board info */}
      <div style={{
        marginTop: '1rem',
        textAlign: 'center',
        color: '#a0a0a0',
        fontSize: '0.9rem'
      }}>
        <p>🎯 Standard 8×8 Chess Board | Files: a-h, Ranks: 1-8</p>
      </div>

      <style>{`
        .chess-board .square-coordinate {
          opacity: 0 !important;
        }
        .chess-board div:hover .square-coordinate {
          opacity: 0.8 !important;
        }
      `}</style>
    </div>
  );
};