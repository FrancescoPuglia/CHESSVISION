import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard } from './ui/components/ChessBoard';
import { MoveInput } from './ui/components/MoveInput';
import { GameStats } from './ui/components/GameStats';
import { Timer } from './ui/components/Timer';
import { useChessGame } from './ui/hooks/useChessGame';
import { useTranslation } from './core/i18n/useTranslation';
import { translations } from './core/i18n/translations';
import { SpeechService } from './services/speech/SpeechService';
import { PgnParser } from './core/pgn/PgnParser';

function App() {
  const { t, language, changeLanguage } = useTranslation();
  const [gameState, gameActions] = useChessGame();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBoardVisible, setIsBoardVisible] = useState(true);
  const [loadedStudies, setLoadedStudies] = useState<string[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentStudy, setCurrentStudy] = useState<any>(null);
  const [studyMoveIndex, setStudyMoveIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const speechService = useRef<SpeechService | null>(null);

  // Initialize speech service
  useEffect(() => {
    speechService.current = new SpeechService();
    speechService.current.setLanguage(language);
    setIsVoiceEnabled(speechService.current.isSupported());
  }, []);

  // Update speech language when UI language changes
  useEffect(() => {
    if (speechService.current) {
      speechService.current.setLanguage(language);
    }
  }, [language]);

  // Keyboard shortcuts - REAL blindfold chess focused
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          setIsBoardVisible(prev => !prev);
          if (isVoiceEnabled) {
            speechService.current?.speak(isBoardVisible ? t('hideBoard') : t('showBoard'));
          }
          break;
        case 'v':
          event.preventDefault();
          toggleVoice();
          break;
        case 'l':
          event.preventDefault();
          speakPieceList();
          break;
        case 'r':
          event.preventDefault();
          speakPosition();
          break;
        case 't':
          event.preventDefault();
          setIsTimerActive(prev => !prev);
          break;
        case ' ':
          event.preventDefault();
          if (currentStudy) {
            navigateStudy(event.shiftKey ? -1 : 1);
          }
          break;
        case 'arrowleft':
          event.preventDefault();
          navigateStudy(-1);
          break;
        case 'arrowright':
          event.preventDefault();
          navigateStudy(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBoardVisible, isVoiceEnabled, currentStudy, studyMoveIndex]);

  // Voice functions - CORE blindfold functionality
  const toggleVoice = () => {
    if (!speechService.current?.isSupported()) {
      alert(t('voiceNotSupported'));
      return;
    }
    setIsVoiceEnabled(prev => !prev);
  };

  const speakPieceList = async () => {
    if (!isVoiceEnabled || !speechService.current) return;
    
    const board = gameState.game.getBoard();
    const pieces: Array<{ piece: string; color: string; square: string }> = [];
    
    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex);
          const rank = 8 - rankIndex;
          pieces.push({
            piece: piece.type,
            color: piece.color === 'w' ? 'white' : 'black',
            square: `${file}${rank}`
          });
        }
      });
    });

    const whitePieces = pieces.filter(p => p.color === 'white');
    const blackPieces = pieces.filter(p => p.color === 'black');

    let text = '';
    if (whitePieces.length > 0) {
      text += `${t('white')}: `;
      text += whitePieces.map(p => `${t(p.piece as keyof typeof translations.en)} ${p.square}`).join(', ');
    }
    if (blackPieces.length > 0) {
      if (text) text += '. ';
      text += `${t('black')}: `;
      text += blackPieces.map(p => `${t(p.piece as keyof typeof translations.en)} ${p.square}`).join(', ');
    }

    try {
      await speechService.current.speak(text);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const speakPosition = async () => {
    if (!isVoiceEnabled || !speechService.current) return;
    
    try {
      await speechService.current.speakPosition(gameState.game.getFen(), {
        white: t('white'),
        black: t('black'),
        king: t('king'),
        queen: t('queen'),
        rook: t('rook'),
        bishop: t('bishop'),
        knight: t('knight'),
        pawn: t('pawn'),
        on: t('on')
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const startVoiceRecognition = async () => {
    if (!isVoiceEnabled || !speechService.current || isListening) return;

    try {
      setIsListening(true);
      const transcript = await speechService.current.listen();
      
      // Process voice command
      await processVoiceCommand(transcript.toLowerCase());
    } catch (error) {
      console.error('Voice recognition error:', error);
      if (error instanceof Error && error.message.includes('not-allowed')) {
        alert(t('microphoneAccess'));
      }
    } finally {
      setIsListening(false);
    }
  };

  const processVoiceCommand = async (command: string) => {
    // Handle chess moves first
    if (isChessMove(command)) {
      gameActions.makeMove(command);
      return;
    }

    // Handle voice commands
    if (command.includes('list') || command.includes('elenca')) {
      if (command.includes('white') || command.includes('bianc')) {
        speakWhitePieces();
      } else if (command.includes('black') || command.includes('ner')) {
        speakBlackPieces();
      } else {
        speakPieceList();
      }
    } else if (command.includes('position') || command.includes('posizione')) {
      speakPosition();
    } else if (command.includes('hide') || command.includes('nascondi')) {
      setIsBoardVisible(false);
      speechService.current?.speak(t('boardHidden'));
    } else if (command.includes('show') || command.includes('mostra')) {
      setIsBoardVisible(true);
      speechService.current?.speak(t('showBoard'));
    }
  };

  const speakWhitePieces = async () => {
    if (!isVoiceEnabled || !speechService.current) return;
    
    const board = gameState.game.getBoard();
    const whitePieces: string[] = [];
    
    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece && piece.color === 'w') {
          const file = String.fromCharCode(97 + fileIndex);
          const rank = 8 - rankIndex;
          whitePieces.push(`${t(piece.type)} ${file}${rank}`);
        }
      });
    });

    const text = `${t('white')}: ${whitePieces.join(', ')}`;
    try {
      await speechService.current.speak(text);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const speakBlackPieces = async () => {
    if (!isVoiceEnabled || !speechService.current) return;
    
    const board = gameState.game.getBoard();
    const blackPieces: string[] = [];
    
    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece && piece.color === 'b') {
          const file = String.fromCharCode(97 + fileIndex);
          const rank = 8 - rankIndex;
          blackPieces.push(`${t(piece.type)} ${file}${rank}`);
        }
      });
    });

    const text = `${t('black')}: ${blackPieces.join(', ')}`;
    try {
      await speechService.current.speak(text);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const isChessMove = (text: string): boolean => {
    // Simple chess move validation
    const movePattern = /^[a-h][1-8]([a-h][1-8])?$|^[NBRQK][a-h]?[1-8]?x?[a-h][1-8]$|^O-O(-O)?$/i;
    return movePattern.test(text.replace(/\s/g, ''));
  };

  // Study navigation - KEY feature for PGN books
  const navigateStudy = async (direction: number) => {
    if (!currentStudy || !currentStudy.moves) return;

    const newIndex = Math.max(0, Math.min(currentStudy.moves.length - 1, studyMoveIndex + direction));
    
    if (newIndex !== studyMoveIndex) {
      setStudyMoveIndex(newIndex);
      
      // Speak the move if voice is enabled
      if (isVoiceEnabled && speechService.current) {
        const move = currentStudy.moves[newIndex];
        try {
          await speechService.current.speakMove(move.san, {
            castles: t('castles')
          });
          
          // Read comments if any
          if (move.comment) {
            await speechService.current.speak(move.comment);
          }
        } catch (error) {
          console.error('Speech error:', error);
        }
      }
    }
  };

  // Timer functionality - ESSENTIAL for study mode
  const handleTimeUp = () => {
    setIsTimerActive(false);
    if (isVoiceEnabled && speechService.current) {
      speechService.current.speak(t('timeUp'));
    }
    // Block further input when time is up
    alert(t('timeUp'));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.pgn')) {
      setSelectedFile(file);
      
      try {
        const text = await file.text();
        const study = PgnParser.parse(text);
        setCurrentStudy(study);
        setStudyMoveIndex(0);
        gameActions.loadPgnStudy(text);
        
        const fileName = file.name.replace('.pgn', '');
        setLoadedStudies(prev => {
          if (!prev.includes(fileName)) {
            return [...prev, fileName];
          }
          return prev;
        });

        if (isVoiceEnabled && speechService.current) {
          const studyName = study.headers.Event || fileName;
          speechService.current.speak(`${t('uploadSuccess')} ${studyName}`);
        }
      } catch (error) {
        console.error('Error reading file:', error);
        alert(t('uploadError'));
      }
    }
  };

  const loadSampleStudy = () => {
    const samplePgn = PgnParser.createSample();
    const study = PgnParser.parse(samplePgn);
    setCurrentStudy(study);
    setStudyMoveIndex(0);
    gameActions.loadPgnStudy(samplePgn);
    
    setLoadedStudies(prev => {
      const sampleName = "Italian Game Study";
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
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header with Language Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '2px solid #2d3142'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{
            fontSize: '2.5rem',
            color: '#ffd700',
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#a0a0a0' }}>
            {t('subtitle')}
          </p>
        </div>
        
        {/* Language Toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <button
            onClick={() => changeLanguage('en')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: language === 'en' ? '#ffd700' : '#3d4251',
              color: language === 'en' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage('it')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: language === 'it' ? '#ffd700' : '#3d4251',
              color: language === 'it' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            IT
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        display: 'flex',
        maxWidth: '1600px',
        margin: '0 auto',
        gap: '1.5rem',
        padding: '1.5rem',
        flexWrap: 'wrap'
      }}>
        
        {/* Left Sidebar - Voice Controls & Timer */}
        <div style={{ 
          flex: '0 0 300px',
          minWidth: '300px'
        }}>
          {/* Voice Controls - PRIORITY 1 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.4rem' }}>
              🎤 {t('voiceCommands')}
            </h2>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#2d3142',
              borderRadius: '12px',
              border: `2px solid ${isVoiceEnabled ? '#10b981' : '#666'}`
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <button
                  onClick={toggleVoice}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: isVoiceEnabled ? '#10b981' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {isVoiceEnabled ? '🔊 ' + t('enableVoice') : '🔇 ' + t('voiceDisabled')}
                </button>
              </div>

              {isVoiceEnabled && (
                <>
                  <button
                    onClick={startVoiceRecognition}
                    disabled={isListening}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      backgroundColor: isListening ? '#f59e0b' : '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isListening ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      marginBottom: '1rem'
                    }}
                  >
                    {isListening ? t('listenForVoice') : '🎤 Voice Command'}
                  </button>

                  <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
                    <button
                      onClick={speakWhitePieces}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      🔸 {t('listWhitePieces')}
                    </button>
                    <button
                      onClick={speakBlackPieces}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      🔹 {t('listBlackPieces')}
                    </button>
                    <button
                      onClick={speakPieceList}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        gridColumn: '1 / 3'
                      }}
                    >
                      📍 {t('readPosition')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timer - PRIORITY 2 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.4rem' }}>
              ⏱️ {t('timer')}
            </h2>
            <Timer
              initialMinutes={5}
              onTimeUp={handleTimeUp}
              onTick={setTimeRemaining}
              autoStart={isTimerActive}
            />
          </div>

          {/* PGN Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.4rem' }}>
              📁 {t('uploadPgn')}
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
                t('uploadOrDrop')
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
              Load Sample Study
            </button>
          </div>

          {/* Studies List */}
          <div>
            <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.4rem' }}>
              📚 {t('studyLibrary')}
            </h2>
            <div style={{
              padding: '1rem',
              backgroundColor: '#2d3142',
              borderRadius: '8px',
              minHeight: '150px'
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
                      📖 {study}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{t('noStudyLoaded')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Center - Chess Board & Training Interface */}
        <div style={{ 
          flex: '1',
          minWidth: '500px'
        }}>
          {/* Blindfold Mode Toggle - PROMINENT */}
          <div style={{
            backgroundColor: isBoardVisible ? '#2d3142' : '#1f2937',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: `3px solid ${isBoardVisible ? '#666' : '#ffd700'}`,
            textAlign: 'center'
          }}>
            <button
              onClick={() => setIsBoardVisible(prev => !prev)}
              style={{
                width: '100%',
                padding: '1.5rem',
                backgroundColor: isBoardVisible ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.3rem',
                fontWeight: 'bold'
              }}
            >
              {isBoardVisible ? '🙈 ' + t('hideBoard') : '👁️ ' + t('showBoard')}
            </button>
            {!isBoardVisible && (
              <p style={{ 
                color: '#ffd700',
                fontWeight: 'bold',
                marginTop: '1rem',
                fontSize: '1.1rem'
              }}>
                🎯 {t('blindfoldMode')} {t('boardHidden')}
              </p>
            )}
          </div>

          {/* Current Study Info & Navigation */}
          {currentStudy && (
            <div style={{
              backgroundColor: '#2d3142',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              border: '2px solid #8b5cf6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#ffd700', margin: 0 }}>
                  📖 {currentStudy.headers.Event || 'Current Study'}
                </h3>
                <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                  {studyMoveIndex + 1} / {currentStudy.moves.length}
                </div>
              </div>
              
              {/* Study Navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                <button
                  onClick={() => navigateStudy(-1)}
                  disabled={studyMoveIndex <= 0}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: studyMoveIndex <= 0 ? '#666' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: studyMoveIndex <= 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⬅️ {t('previousMove')}
                </button>
                <button
                  onClick={() => {
                    setStudyMoveIndex(0);
                    gameActions.resetGame();
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 {t('firstMove')}
                </button>
                <button
                  onClick={() => navigateStudy(1)}
                  disabled={studyMoveIndex >= currentStudy.moves.length - 1}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: studyMoveIndex >= currentStudy.moves.length - 1 ? '#666' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: studyMoveIndex >= currentStudy.moves.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('nextMove')} ➡️
                </button>
              </div>

              {/* Current Move Display */}
              {currentStudy.moves[studyMoveIndex] && (
                <div style={{
                  backgroundColor: '#3d4251',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '0.5rem' }}>
                    {currentStudy.moves[studyMoveIndex].san}
                  </div>
                  {currentStudy.moves[studyMoveIndex].comment && (
                    <div style={{ fontSize: '0.9rem', color: '#a0a0a0', fontStyle: 'italic' }}>
                      💬 {currentStudy.moves[studyMoveIndex].comment}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* Move Input - Enhanced for Blindfold */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem' }}>
              {t('yourMove')}
            </h3>
            <MoveInput
              onMove={gameActions.makeMove}
              disabled={gameState.isGameOver || timeRemaining <= 0}
              placeholder={t('enterMove')}
            />
            
            {/* Quick Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem',
              marginTop: '1rem',
              width: '100%',
              maxWidth: '500px'
            }}>
              <button
                onClick={gameActions.undoMove}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ↶ Undo
              </button>
              <button
                onClick={() => alert(gameActions.getHint())}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                💡 Hint
              </button>
              <button
                onClick={gameActions.resetGame}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Statistics & Controls */}
        <div style={{ 
          flex: '0 0 300px',
          minWidth: '300px'
        }}>
          {/* Enhanced Statistics */}
          <GameStats
            precision={Math.round(gameState.stats.getAccuracyPercentage())}
            completed={gameState.stats.toJSON().aggregates.studiesCompleted}
            series={gameState.stats.toJSON().aggregates.currentStreak}
            movesPlayed={gameState.moves.length}
            timeElapsed={timeRemaining > 0 ? (300 - timeRemaining) : 0}
          />

          {/* Game Status */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem',
            border: '1px solid #3d4251'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.3rem' }}>
              🎮 Game Status
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0a0' }}>Turn:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>
                  {gameState.game.getTurn() === 'white' ? '⚪ ' + t('white') : '⚫ ' + t('black')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0a0' }}>Moves:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>
                  {gameState.moves.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0a0' }}>Board:</span>
                <span style={{ color: isBoardVisible ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {isBoardVisible ? '👁️ Visible' : '🙈 Hidden'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0a0' }}>Voice:</span>
                <span style={{ color: isVoiceEnabled ? '#10b981' : '#666', fontWeight: 'bold' }}>
                  {isVoiceEnabled ? '🔊 ON' : '🔇 OFF'}
                </span>
              </div>
            </div>
            
            {gameState.isGameOver && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#ef4444',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <p style={{ color: 'white', fontWeight: 'bold', margin: 0 }}>
                  🏁 {gameState.gameResult}
                </p>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts - Updated for Blindfold */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem',
            border: '1px solid #3d4251'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.3rem' }}>
              ⌨️ {t('shortcuts')}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#a0a0a0', display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>B</kbd>
                <span>{t('keyB')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>V</kbd>
                <span>{t('keyV')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>L</kbd>
                <span>{t('keyL')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>R</kbd>
                <span>{t('keyR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>T</kbd>
                <span>{t('keyT')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>←→</kbd>
                <span>{t('keyArrows')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>SPC</kbd>
                <span>{t('keySpace')}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            backgroundColor: '#2d3142',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem',
            border: '1px solid #3d4251'
          }}>
            <h3 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.3rem' }}>
              ⚡ Quick Actions
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  if (isVoiceEnabled && speechService.current) {
                    speechService.current.speak('Welcome to ChessVision blindfold training. Use voice commands or keyboard shortcuts to navigate.');
                  }
                }}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                🔊 Voice Welcome
              </button>
              <button
                onClick={() => {
                  const fen = gameState.game.getFen();
                  navigator.clipboard.writeText(fen);
                  alert('FEN copied to clipboard!');
                }}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                📋 Copy FEN
              </button>
              <button
                onClick={() => {
                  const stats = gameState.stats.toJSON();
                  const json = JSON.stringify(stats, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'chessvision-stats.json';
                  a.click();
                }}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                💾 Export Stats
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Version Info */}
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        borderTop: '1px solid #2d3142',
        color: '#666',
        fontSize: '0.9rem'
      }}>
        <p>
          CHESSVISION v2.0 - Blindfold Chess Training Platform
        </p>
        <p>
          🎯 Focus: Voice Commands • Timer • PGN Studies • Bilingue EN/IT
        </p>
      </div>
    </div>
  );
}

export default App;