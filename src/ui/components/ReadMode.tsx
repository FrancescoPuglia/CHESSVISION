// src/ui/components/ReadMode.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PgnGame } from '@core/chess/types';
import { PgnParser } from '@core/pgn/PgnParser';
import { ChessGame } from '@core/chess/ChessGame';
import { SpeechService } from '@services/speech/SpeechService';

interface ReadModeProps {
  study: PgnGame;
  onClose: () => void;
  speechService: SpeechService | null;
  isVoiceEnabled: boolean;
  autoPlay?: boolean;
  readingSpeed?: number; // seconds between moves
}

interface ReadState {
  currentMoveIndex: number;
  game: ChessGame;
  isPlaying: boolean;
  isPaused: boolean;
  readComments: boolean;
  readingSpeed: number;
  currentlyReading: string;
}

export const ReadMode: React.FC<ReadModeProps> = ({
  study,
  onClose,
  speechService,
  isVoiceEnabled,
  autoPlay = false,
  readingSpeed = 3
}) => {
  const [state, setState] = useState<ReadState>({
    currentMoveIndex: 0,
    game: new ChessGame(),
    isPlaying: autoPlay,
    isPaused: false,
    readComments: true,
    readingSpeed,
    currentlyReading: ''
  });

  // Auto-play functionality
  useEffect(() => {
    let interval: number | null = null;
    
    if (state.isPlaying && !state.isPaused && state.currentMoveIndex < study.moves.length) {
      interval = window.setTimeout(() => {
        nextMove();
      }, state.readingSpeed * 1000);
    }

    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [state.isPlaying, state.isPaused, state.currentMoveIndex, state.readingSpeed]);

  // Voice reading effect
  useEffect(() => {
    if (isVoiceEnabled && speechService && state.currentlyReading) {
      speechService.speak(state.currentlyReading);
    }
  }, [state.currentlyReading, isVoiceEnabled, speechService]);

  const nextMove = useCallback(() => {
    if (state.currentMoveIndex >= study.moves.length) {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false,
        currentlyReading: 'Fine della lettura del libro. Studio completato.'
      }));
      return;
    }

    const move = study.moves[state.currentMoveIndex];
    const newGame = new ChessGame(state.game.getFen());
    const result = newGame.makeMoveFromSan(move.san);

    if (result) {
      // Prepare reading text
      let readingText = `Mossa ${Math.floor(move.moveNumber)}: ${move.san}`;
      
      if (state.readComments && move.comment) {
        readingText += `. Commento dell'autore: ${move.comment}`;
      }

      setState(prev => ({
        ...prev,
        currentMoveIndex: prev.currentMoveIndex + 1,
        game: newGame,
        currentlyReading: readingText
      }));
    }
  }, [state.currentMoveIndex, state.game, state.readComments, study.moves]);

  const previousMove = useCallback(() => {
    if (state.currentMoveIndex <= 0) return;

    // Rebuild game up to previous move
    const newGame = new ChessGame();
    const targetIndex = state.currentMoveIndex - 1;
    
    for (let i = 0; i < targetIndex; i++) {
      newGame.makeMoveFromSan(study.moves[i].san);
    }

    const move = study.moves[targetIndex - 1];
    let readingText = '';
    
    if (move) {
      readingText = `Torno alla mossa ${Math.floor(move.moveNumber)}: ${move.san}`;
      if (state.readComments && move.comment) {
        readingText += `. Commento: ${move.comment}`;
      }
    } else {
      readingText = 'Tornato alla posizione iniziale';
    }

    setState(prev => ({
      ...prev,
      currentMoveIndex: targetIndex,
      game: newGame,
      currentlyReading: readingText
    }));
  }, [state.currentMoveIndex, state.readComments, study.moves]);

  const goToMove = (moveIndex: number) => {
    const newGame = new ChessGame();
    
    for (let i = 0; i < moveIndex; i++) {
      if (i < study.moves.length) {
        newGame.makeMoveFromSan(study.moves[i].san);
      }
    }

    const move = study.moves[moveIndex - 1];
    let readingText = moveIndex === 0 ? 
      'Posizione iniziale' : 
      `Salto alla mossa ${Math.floor(move?.moveNumber || 1)}: ${move?.san || ''}`;

    setState(prev => ({
      ...prev,
      currentMoveIndex: moveIndex,
      game: newGame,
      currentlyReading: readingText
    }));
  };

  const togglePlay = () => {
    setState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying,
      isPaused: false,
      currentlyReading: prev.isPlaying ? 'Lettura in pausa' : 'Ripresa lettura automatica'
    }));
  };


  const speakCurrentPosition = async () => {
    if (!isVoiceEnabled || !speechService) return;
    
    const board = state.game.getBoard();
    const pieces: string[] = [];
    
    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex);
          const rank = 8 - rankIndex;
          const pieceNames = {
            'p': 'Pedone', 'r': 'Torre', 'n': 'Cavallo',
            'b': 'Alfiere', 'q': 'Donna', 'k': 'Re'
          };
          const colorName = piece.color === 'w' ? 'Bianco' : 'Nero';
          const pieceName = pieceNames[piece.type as keyof typeof pieceNames] || piece.type;
          pieces.push(`${pieceName} ${colorName} in ${file}${rank}`);
        }
      });
    });
    
    const text = pieces.length > 0 ? 
      `Posizione corrente: ${pieces.join(', ')}` : 
      'Scacchiera vuota';
    
    setState(prev => ({ ...prev, currentlyReading: text }));
  };

  const progress = (state.currentMoveIndex / study.moves.length) * 100;
  const currentMove = study.moves[state.currentMoveIndex - 1];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        padding: '2rem',
        minWidth: '700px',
        maxWidth: '900px',
        border: '2px solid #10b981',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#10b981', margin: 0, fontSize: '1.5rem' }}>
            📚 Modalità Lettura: {PgnParser.getStudyTitle(study)}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <span style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
              Mossa: {state.currentMoveIndex} / {study.moves.length}
            </span>
            <span style={{ color: '#10b981', fontSize: '0.9rem' }}>
              {Math.round(progress)}% completato
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#2d3142',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Current Move Display */}
        {currentMove && (
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid #10b981'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                {Math.floor(currentMove.moveNumber)}. {currentMove.san}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>
                {currentMove.color === 'white' ? '⚪ Bianco' : '⚫ Nero'}
              </div>
            </div>
            
            {state.readComments && currentMove.comment && (
              <div style={{
                backgroundColor: '#3d4251',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                color: '#e0e0e0',
                fontStyle: 'italic',
                lineHeight: '1.5'
              }}>
                💬 <strong>Commento dell'autore:</strong> {currentMove.comment}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={previousMove}
            disabled={state.currentMoveIndex <= 0}
            style={{
              padding: '0.75rem',
              backgroundColor: state.currentMoveIndex <= 0 ? '#666' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: state.currentMoveIndex <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ⬅️ Precedente
          </button>

          <button
            onClick={togglePlay}
            style={{
              padding: '0.75rem',
              backgroundColor: state.isPlaying ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            {state.isPlaying ? '⏸️ Stop Auto' : '▶️ Auto Play'}
          </button>

          <button
            onClick={nextMove}
            disabled={state.currentMoveIndex >= study.moves.length}
            style={{
              padding: '0.75rem',
              backgroundColor: state.currentMoveIndex >= study.moves.length ? '#666' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: state.currentMoveIndex >= study.moves.length ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Successiva ➡️
          </button>

          <button
            onClick={speakCurrentPosition}
            disabled={!isVoiceEnabled}
            style={{
              padding: '0.75rem',
              backgroundColor: isVoiceEnabled ? '#8b5cf6' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isVoiceEnabled ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem'
            }}
          >
            🔊 Posizione
          </button>
        </div>

        {/* Settings */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '2rem',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#2d3142',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
              Velocità lettura:
            </label>
            <select
              value={state.readingSpeed}
              onChange={(e) => setState(prev => ({ ...prev, readingSpeed: parseInt(e.target.value) }))}
              style={{
                padding: '0.5rem',
                backgroundColor: '#3d4251',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
            >
              <option value={1}>1 secondo</option>
              <option value={2}>2 secondi</option>
              <option value={3}>3 secondi</option>
              <option value={4}>4 secondi</option>
              <option value={5}>5 secondi</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={state.readComments}
              onChange={(e) => setState(prev => ({ ...prev, readComments: e.target.checked }))}
              style={{ marginRight: '0.5rem' }}
            />
            <label style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
              Leggi commenti autore
            </label>
          </div>
        </div>

        {/* Jump to Move */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <label style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
            Vai alla mossa:
          </label>
          <input
            type="range"
            min={0}
            max={study.moves.length}
            value={state.currentMoveIndex}
            onChange={(e) => goToMove(parseInt(e.target.value))}
            style={{
              flex: 1,
              height: '6px',
              backgroundColor: '#2d3142',
              borderRadius: '3px'
            }}
          />
          <button
            onClick={() => goToMove(0)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            🔄 Inizio
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            🚪 Chiudi Lettura
          </button>
        </div>

        {/* Book Info */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'rgba(16,185,129,0.1)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '0.85rem',
          color: '#a0a0a0'
        }}>
          <div><strong>Autore:</strong> {study.headers.White || 'Sconosciuto'}</div>
          <div><strong>Mosse totali:</strong> {study.moves.length}</div>
          <div><strong>Data:</strong> {study.headers.Date || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};