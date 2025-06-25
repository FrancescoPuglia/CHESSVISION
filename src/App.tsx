import React, { useState, useEffect } from 'react';
import { ChessBoard } from './ui/components/ChessBoard';
import { MoveInput } from './ui/components/MoveInput';
import { GameControls } from './ui/components/GameControls';
import { GameStats } from './ui/components/GameStats';
import { useChessGame } from './ui/hooks/useChessGame';
import { PgnParser } from './core/pgn/PgnParser';

function App() {
  const [gameState, gameActions] = useChessGame();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBoardVisible, setIsBoardVisible] = useState(true);
  const [loadedStudies, setLoadedStudies] = useState<string[]>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return; // Don't interfere with input
      
      switch (event.key.toLowerCase()) {
        case 'd':
          event.preventDefault();
          setIsBoardVisible(prev => !prev);
          break;
        case 'l':
          event.preventDefault();
          alert(gameActions.listPieces());
          break;
        case 'h':
          event.preventDefault();
          alert(gameActions.getHint());
          break;
        case 'r':
          event.preventDefault();
          gameActions.resetGame();
          break;
        case 'u':
          event.preventDefault();
          gameActions.undoMove();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameActions]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.pgn')) {
      setSelectedFile(file);
      
      try {
        const text = await file.text();
        gameActions.loadPgnStudy(text);
        
        // Add to loaded studies list
        const fileName = file.name.replace('.pgn', '');
        setLoadedStudies(prev => {
          if (!prev.includes(fileName)) {
            return [...prev, fileName];
          }
          return prev;
        });
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Errore nella lettura del file PGN');
      }
    }
  };

  const loadSampleStudy = () => {
    const samplePgn = PgnParser.createSample();
    gameActions.loadPgnStudy(samplePgn);
    setLoadedStudies(prev => {
      const sampleName = "Studio Demo - Italiana";
      if (!prev.includes(sampleName)) {
        return [...prev, sampleName];
      }
      return prev;
    });
  };

  const getMessageColor = () => {
    switch (gameState.messageType) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#ffd700';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1d29',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        borderBottom: '2px solid #2d3142'
      }}>
        <h1 style={{
          fontSize: '3rem',
          color: '#ffd700',
          marginBottom: '0.5rem'
        }}>
          Blindfold Chess Master
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#a0a0a0' }}>
          Allena la tua visione scacchistica alla cieca
        </p>
      </div>

      <div style={{
        display: 'flex',
        maxWidth: '1400px',
        margin: '0 auto',
        gap: '2rem',
        padding: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Left Sidebar - File Upload & Studies */}
        <div style={{ 
          flex: '0 0 280px',
          minWidth: '280px'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              Carica Studio PGN
            </h2>
            <label style={{
              display: 'block',
              padding: '2rem',
              border: '2px dashed #ffd700',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              backgroundColor: selectedFile ? '#2d3142' : 'transparent'
            }}>
              <input
                type="file"
                accept=".pgn"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {selectedFile ? 
                `✓ ${selectedFile.name}` : 
                'Clicca per caricare file PGN'
              }
            </label>
            
            <button
              onClick={loadSampleStudy}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Carica Studio Demo
            </button>
          </div>

          <div>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              Studi Disponibili
            </h2>
            <div style={{
              padding: '1rem',
              backgroundColor: '#2d3142',
              borderRadius: '8px',
              minHeight: '200px'
            }}>
              {loadedStudies.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {loadedStudies.map((study, index) => (
                    <li key={index} style={{
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                      backgroundColor: '#3d4251',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      📚 {study}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#666' }}>Carica un file PGN per iniziare</p>
              )}
            </div>
          </div>
        </div>

        {/* Center - Chess Board & Game */}
        <div style={{ 
          flex: '1',
          minWidth: '400px'
        }}>
          {/* Game Message */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: `2px solid ${getMessageColor()}`,
            textAlign: 'center'
          }}>
            <p style={{ 
              color: getMessageColor(),
              fontWeight: '500',
              margin: 0,
              fontSize: '1.1rem'
            }}>
              {gameState.lastMessage}
            </p>
          </div>

          {/* Chess Board */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <ChessBoard
              position={gameState.game.getBoard()}
              isVisible={isBoardVisible}
            />
          </div>

          {/* Move Input */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <MoveInput
              onMove={gameActions.makeMove}
              disabled={gameState.isGameOver}
            />
            
            <GameControls
              onToggleBoard={() => setIsBoardVisible(prev => !prev)}
              onListPieces={() => alert(gameActions.listPieces())}
              onShowHint={() => alert(gameActions.getHint())}
              onReset={gameActions.resetGame}
              isBoardVisible={isBoardVisible}
              disabled={gameState.isGameOver}
            />
          </div>
        </div>

        {/* Right Sidebar - Statistics */}
        <div style={{ 
          flex: '0 0 280px',
          minWidth: '280px'
        }}>
          <GameStats
            precision={Math.round(gameState.stats.getAccuracyPercentage())}
            completed={gameState.stats.toJSON().aggregates.studiesCompleted}
            series={gameState.stats.toJSON().aggregates.currentStreak}
            movesPlayed={gameState.moves.length}
          />

          {/* Game Info */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              Stato Partita
            </h3>
            <p style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>
              Turno: <span style={{ color: '#fff' }}>
                {gameState.game.getTurn() === 'white' ? 'Bianco' : 'Nero'}
              </span>
            </p>
            <p style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>
              Mosse: <span style={{ color: '#fff' }}>{gameState.moves.length}</span>
            </p>
            {gameState.isGameOver && (
              <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
                {gameState.gameResult}
              </p>
            )}
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.2rem' }}>
              Scorciatoie
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>
              <p><kbd>D</kbd> - Nascondi/Mostra</p>
              <p><kbd>L</kbd> - Elenca Pezzi</p>
              <p><kbd>H</kbd> - Suggerimento</p>
              <p><kbd>R</kbd> - Ricomincia</p>
              <p><kbd>U</kbd> - Annulla Mossa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;