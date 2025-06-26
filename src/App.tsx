import React, { useState, useEffect, useRef } from 'react';
import { InteractiveChessBoard } from './ui/components/InteractiveChessBoard';
import { MoveInput } from './ui/components/MoveInput';
import { GameStats } from './ui/components/GameStats';
import { Timer } from './ui/components/Timer';
import { useChessGame } from './ui/hooks/useChessGame';
import { useTacticalTraining } from './ui/hooks/useTacticalTraining';
import { useTranslation } from './core/i18n/useTranslation';
import { translations } from './core/i18n/translations';
import { SpeechService } from './services/speech/SpeechService';
import { PgnParser, PgnCollection } from './core/pgn/PgnParser';
import { FnsParser } from './core/fns/FnsParser';
import { EngineGame } from './ui/components/EngineGame';
import { StudyMode } from './ui/components/StudyMode';
import { TacticalMode } from './ui/components/TacticalMode';
import { ReadMode } from './ui/components/ReadMode';
import { FlashcardMode } from './ui/components/FlashcardMode';
import { VoiceSettings } from './ui/components/VoiceSettings';
import { StreakCalendar } from './ui/components/StreakCalendar';

function App() {
  const { t, language, changeLanguage } = useTranslation();
  const [gameState, gameActions] = useChessGame();
  const [tacticalState, tacticalActions] = useTacticalTraining();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBoardVisible, setIsBoardVisible] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // PGN Study System (Legacy)
  const [currentCollection, setCurrentCollection] = useState<PgnCollection | null>(null);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [studyMoveIndex, setStudyMoveIndex] = useState(0);
  
  // UI State
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showEngineGame, setShowEngineGame] = useState(false);
  const [showStudyMode, setShowStudyMode] = useState(false);
  const [showTacticalMode, setShowTacticalMode] = useState(false);
  const [showReadMode, setShowReadMode] = useState(false);
  const [showFlashcardMode, setShowFlashcardMode] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [studyTimeLimit, setStudyTimeLimit] = useState(300); // 5 minutes default
  const [, setForceRerender] = useState(0);
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
          if (currentCollection) {
            navigateStudyMoves(event.shiftKey ? -1 : 1);
          }
          break;
        case 'arrowleft':
          event.preventDefault();
          navigateStudyMoves(-1);
          break;
        case 'arrowright':
          event.preventDefault();
          navigateStudyMoves(1);
          break;
        case 'pageup':
          event.preventDefault();
          navigateStudies(-1);
          break;
        case 'pagedown':
          event.preventDefault();
          navigateStudies(1);
          break;
        case 'e':
          event.preventDefault();
          setShowEngineGame(true);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBoardVisible, isVoiceEnabled, currentCollection, currentStudyIndex, studyMoveIndex]);

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
    
    // Always use the main game state - studies are loaded into gameState.game
    const activeBoard = gameState.game.getBoard();
    
    
    const pieces: Array<{ piece: string; color: string; square: string }> = [];
    
    activeBoard.forEach((row, rankIndex) => {
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
    
    const activeGame = gameState.game;
    
    try {
      await speechService.current.speakPosition(activeGame.getFen(), {
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


  // Timer functionality - ESSENTIAL for study mode
  const handleTimeUp = () => {
    setIsTimerActive(false);
    if (isVoiceEnabled && speechService.current) {
      speechService.current.speak(t('timeUp'));
    }
    // Block further input when time is up
    alert(t('timeUp'));
  };

  // Load study position using ONLY the unified game state system
  const loadStudyPosition = (study: any, moveIndex: number) => {
    try {
      const moves = study.moves.map((m: any) => m.san);
      
      // Get the FEN from the study headers if available
      const startingFen = study.headers?.FEN;
      
      // Use ONLY the hook's loadStudyPosition method - no parallel state
      const success = gameActions.loadStudyPosition(moves, moveIndex, startingFen);
      
      if (success) {
        // Force re-render to ensure UI updates
        setForceRerender(prev => prev + 1);
        
        if (isVoiceEnabled && speechService.current) {
          const position = moveIndex === 0 
            ? (startingFen ? 'posizione studio' : 'posizione iniziale') 
            : `dopo ${moveIndex} moss${moveIndex === 1 ? 'a' : 'e'}`;
          speechService.current.speak(`Caricata ${position} di ${PgnParser.getStudyTitle(study)}`);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error loading study position:', error);
      return false;
    }
  };

  // Navigate between different studies
  const navigateStudies = (direction: number) => {
    if (!currentCollection || currentCollection.studies.length <= 1) return;
    
    const newIndex = Math.max(0, Math.min(currentCollection.studies.length - 1, currentStudyIndex + direction));
    
    if (newIndex !== currentStudyIndex) {
      setCurrentStudyIndex(newIndex);
      setStudyMoveIndex(0);
      
      const newStudy = currentCollection.studies[newIndex];
      loadStudyPosition(newStudy, 0);
    }
  };

  // Navigate through moves within a study
  const navigateStudyMoves = (direction: number) => {
    if (!currentCollection || currentCollection.studies.length === 0) return;
    
    const currentStudy = currentCollection.studies[currentStudyIndex];
    const maxMoves = currentStudy.moves.length;
    const newMoveIndex = Math.max(0, Math.min(maxMoves, studyMoveIndex + direction));
    
    if (newMoveIndex !== studyMoveIndex) {
      setStudyMoveIndex(newMoveIndex);
      loadStudyPosition(currentStudy, newMoveIndex);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    setSelectedFile(file);
    
    try {
      const text = await file.text();
      
      if (file.name.endsWith('.fns')) {
        // Handle FNS files (Lucas Chess format) for tactical training
        const collection = FnsParser.parseFnsFile(text, file.name);
        
        if (collection.problems.length === 0) {
          throw new Error('No valid tactical problems found in FNS file');
        }
        
        tacticalActions.loadCollection(collection);
        
        if (isVoiceEnabled && speechService.current) {
          const message = `${collection.problems.length} problemi tattici caricati da ${file.name}`;
          speechService.current.speak(message);
        }
        
      } else if (file.name.endsWith('.pgn')) {
        // Handle PGN files (legacy study system)
        const collection = PgnParser.parseMultiple(text);
        
        if (collection.studies.length === 0) {
          throw new Error('No valid studies found in PGN file');
        }
        
        setCurrentCollection(collection);
        setCurrentStudyIndex(0);
        setStudyMoveIndex(0);
        
        // Load the first study position
        const firstStudy = collection.studies[0];
        loadStudyPosition(firstStudy, 0);
        
        if (isVoiceEnabled && speechService.current) {
          const message = collection.studies.length === 1 
            ? `${t('uploadSuccess')} ${PgnParser.getStudyTitle(firstStudy)}`
            : `${collection.studies.length} studi caricati. Studio corrente: ${PgnParser.getStudyTitle(firstStudy)}`;
          speechService.current.speak(message);
        }
      } else {
        throw new Error('Unsupported file format. Please use .pgn or .fns files.');
      }
      
    } catch (error) {
      console.error('Error reading file:', error);
      alert(error instanceof Error ? error.message : t('uploadError'));
    }
  };

  const loadSampleStudy = async () => {
    const samplePgn = PgnParser.createSample();
    const collection = PgnParser.parseMultiple(samplePgn);
    
    setCurrentCollection(collection);
    setCurrentStudyIndex(0);
    setStudyMoveIndex(0);
    
    // Load the first study position
    const firstStudy = collection.studies[0];
    loadStudyPosition(firstStudy, 0);
    

    if (isVoiceEnabled && speechService.current) {
      const message = `${collection.studies.length} studi di esempio caricati. Studio corrente: ${PgnParser.getStudyTitle(firstStudy)}`;
      speechService.current.speak(message);
    }
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
                    
                    <button
                      onClick={() => setShowVoiceSettings(true)}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        gridColumn: '1 / 3'
                      }}
                    >
                      ⚙️ Impostazioni Voce
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
            
            {/* Timer Settings */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block',
                color: '#a0a0a0',
                fontSize: '0.9rem',
                marginBottom: '0.5rem'
              }}>
                Tempo per posizione (minuti):
              </label>
              <select
                value={Math.floor(studyTimeLimit / 60)}
                onChange={(e) => setStudyTimeLimit(parseInt(e.target.value) * 60)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#2d3142',
                  color: 'white',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              >
                <option value={1}>1 minuto</option>
                <option value={2}>2 minuti</option>
                <option value={3}>3 minuti</option>
                <option value={5}>5 minuti</option>
                <option value={10}>10 minuti</option>
                <option value={15}>15 minuti</option>
                <option value={30}>30 minuti</option>
                <option value={0}>Illimitato</option>
              </select>
            </div>
            
            <Timer
              initialMinutes={Math.floor(studyTimeLimit / 60)}
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
                accept=".pgn,.fns"
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
            
            <button
              onClick={() => {
                const sampleFns = FnsParser.createSampleFns();
                const collection = FnsParser.parseFnsFile(sampleFns, 'Sample Tactics');
                tacticalActions.loadCollection(collection);
              }}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              🧩 Load Sample Tactics
            </button>
            
            {tacticalState.currentCollection && (
              <button
                onClick={() => setShowTacticalMode(true)}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                🎯 Start Tactical Training ({tacticalState.currentCollection.problems.length} problems)
              </button>
            )}
            
            <button
              onClick={() => setShowEngineGame(true)}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              🤖 Gioca vs Motore
            </button>
            
            {currentCollection && currentCollection.studies.length > 0 && (
              <>
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                  <label style={{ color: '#a0a0a0', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    ⏱️ Tempo Studio (minuti):
                  </label>
                  <select
                    value={studyTimeLimit / 60}
                    onChange={(e) => setStudyTimeLimit(parseInt(e.target.value) * 60)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: '#2d3142',
                      color: 'white',
                      border: '1px solid #666',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value={2}>2 minuti</option>
                    <option value={3}>3 minuti</option>
                    <option value={5}>5 minuti</option>
                    <option value={10}>10 minuti</option>
                    <option value={15}>15 minuti</option>
                  </select>
                </div>
                
                <button
                  onClick={() => setShowStudyMode(true)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  🧩 INIZIA STUDIO (Timer)
                </button>
                
                <button
                  onClick={() => setShowReadMode(true)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  📚 LEGGI LIBRO (Vocale)
                </button>
                
                <button
                  onClick={() => setShowFlashcardMode(true)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  🎴 FLASHCARD ANKI
                </button>
                
                <button
                  onClick={() => {
                    // Test: Load position after 3 moves
                    const currentStudy = currentCollection.studies[currentStudyIndex];
                    const testMoveIndex = Math.min(3, currentStudy.moves.length);
                    loadStudyPosition(currentStudy, testMoveIndex);
                    setStudyMoveIndex(testMoveIndex);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}
                >
                  🧪 Test: Carica 3ª Mossa
                </button>
              </>
            )}
          </div>

          {/* Studies List */}
          <div>
            {currentCollection && currentCollection.studies.length > 0 && (
              <div style={{
                backgroundColor: '#2d3142',
                padding: '1.5rem',
                borderRadius: '8px',
                marginTop: '1rem',
                border: '1px solid #3d4251'
              }}>
                <h3 style={{ 
                  color: '#ffd700', 
                  marginBottom: '1rem', 
                  fontSize: '1.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📚 Studi Caricati ({currentCollection.studies.length})
                </h3>
                
                {/* Study List */}
                <div style={{ 
                  display: 'grid', 
                  gap: '0.75rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '0.5rem'
                }}>
                  {currentCollection.studies.map((study, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setCurrentStudyIndex(index);
                        setStudyMoveIndex(0);
                        loadStudyPosition(study, 0);
                        
                        if (isVoiceEnabled && speechService.current) {
                          speechService.current.speak(`Selezionato studio ${index + 1}: ${PgnParser.getStudyTitle(study)}`);
                        }
                      }}
                      style={{
                        backgroundColor: index === currentStudyIndex ? '#8b5cf6' : '#3d4251',
                        padding: '1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: index === currentStudyIndex ? '2px solid #ffd700' : '2px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (index !== currentStudyIndex) {
                          e.currentTarget.style.backgroundColor = '#4b5563';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== currentStudyIndex) {
                          e.currentTarget.style.backgroundColor = '#3d4251';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <h4 style={{ 
                          color: index === currentStudyIndex ? '#fff' : '#ffd700',
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}. {study.headers.Event || 'Studio Senza Nome'}
                        </h4>
                        
                        {index === currentStudyIndex && (
                          <span style={{
                            backgroundColor: '#ffd700',
                            color: '#000',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            ATTIVO
                          </span>
                        )}
                      </div>
                      
                      <div style={{
                        fontSize: '0.8rem',
                        color: index === currentStudyIndex ? '#e0e0e0' : '#a0a0a0',
                        marginBottom: '0.5rem'
                      }}>
                        {PgnParser.getStudyDescription(study)}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        fontSize: '0.8rem',
                        color: index === currentStudyIndex ? '#d0d0d0' : '#888'
                      }}>
                        <span>📝 {study.moves.length} mosse</span>
                        {study.headers.Date && study.headers.Date !== '????.??.??' && (
                          <span>📅 {study.headers.Date}</span>
                        )}
                        {study.headers.Result && study.headers.Result !== '*' && (
                          <span>🏁 {study.headers.Result}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Quick Study Navigation */}
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#3d4251',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                      Studio Corrente: <strong style={{ color: '#ffd700' }}>{currentStudyIndex + 1} di {currentCollection.studies.length}</strong>
                    </span>
                    <span style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                      Mossa: <strong style={{ color: '#8b5cf6' }}>{studyMoveIndex} di {currentCollection.studies[currentStudyIndex].moves.length}</strong>
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    💡 Clicca su uno studio per caricarlo • Usa PageUp/PageDown per navigare • ← → per le mosse
                  </div>
                </div>
              </div>
            )}
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
          {currentCollection && currentCollection.studies.length > 0 && (
            <div style={{
              backgroundColor: '#2d3142',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              border: '2px solid #8b5cf6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#ffd700', margin: 0 }}>
                  📖 {PgnParser.getStudyTitle(currentCollection.studies[currentStudyIndex], currentStudyIndex)}
                </h3>
                <div style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                  {studyMoveIndex + 1} / {currentCollection.studies[currentStudyIndex].moves.length}
                </div>
              </div>
              
              {/* Multi-Study Navigation */}
              {currentCollection.studies.length > 1 && (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#3d4251', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Studio {currentStudyIndex + 1} di {currentCollection.studies.length}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => navigateStudies(-1)}
                      disabled={currentStudyIndex <= 0}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: currentStudyIndex <= 0 ? '#666' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentStudyIndex <= 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ⬆️ Studio Precedente
                    </button>
                    <button
                      onClick={() => navigateStudies(1)}
                      disabled={currentStudyIndex >= currentCollection.studies.length - 1}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: currentStudyIndex >= currentCollection.studies.length - 1 ? '#666' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: currentStudyIndex >= currentCollection.studies.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Studio Successivo ⬇️
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '0.5rem' }}>
                    📖 {PgnParser.getStudyDescription(currentCollection.studies[currentStudyIndex])}
                  </div>
                </div>
              )}
              
              {/* Study Navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                <button
                  onClick={() => navigateStudyMoves(-1)}
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
                    loadStudyPosition(currentCollection.studies[currentStudyIndex], 0);
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
                  onClick={() => navigateStudyMoves(1)}
                  disabled={studyMoveIndex >= currentCollection.studies[currentStudyIndex].moves.length - 1}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: studyMoveIndex >= currentCollection.studies[currentStudyIndex].moves.length - 1 ? '#666' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: studyMoveIndex >= currentCollection.studies[currentStudyIndex].moves.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('nextMove')} ➡️
                </button>
              </div>

              {/* Current Move Display */}
              {currentCollection.studies[currentStudyIndex].moves[studyMoveIndex] && (
                <div style={{
                  backgroundColor: '#3d4251',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '0.5rem' }}>
                    {currentCollection.studies[currentStudyIndex].moves[studyMoveIndex].san}
                  </div>
                  {currentCollection.studies[currentStudyIndex].moves[studyMoveIndex].comment && (
                    <div style={{ fontSize: '0.9rem', color: '#a0a0a0', fontStyle: 'italic' }}>
                      💬 {currentCollection.studies[currentStudyIndex].moves[studyMoveIndex].comment}
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
            <InteractiveChessBoard
              position={gameState.game.getBoard()}
              isVisible={isBoardVisible}
              game={gameState.game}
              allowMoves={true}
              showCoordinates={true}
              onMove={(move) => {
                gameActions.makeMove(move.san);
                // Record normal game activity
                (window as any).recordChessVisionActivity?.('game', 1);
              }}
              lastMove={gameState.moves.length > 0 ? {
                from: gameState.moves[gameState.moves.length - 1]?.from || 'a1',
                to: gameState.moves[gameState.moves.length - 1]?.to || 'a1'
              } : undefined}
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <kbd style={{ backgroundColor: '#3d4251', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>E</kbd>
                <span>Gioca vs Motore</span>
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

          {/* Streak Calendar */}
          <StreakCalendar />
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
          🎯 Focus: Voice Commands • Timer • PGN Studies • Engine Games • Bilingue EN/IT
        </p>
      </div>

      {/* Engine Game Modal */}
      <EngineGame
        isVisible={showEngineGame}
        onClose={() => {
          setShowEngineGame(false);
          // Record engine game activity
          (window as any).recordChessVisionActivity?.('engine', 6);
        }}
        speechService={speechService.current}
        isVoiceEnabled={isVoiceEnabled}
      />

      {/* Study Mode Modal */}
      {showStudyMode && currentCollection && currentCollection.studies.length > 0 && (
        <StudyMode
          study={currentCollection.studies[currentStudyIndex]}
          startFromMoveIndex={studyMoveIndex}
          onComplete={() => {
            setShowStudyMode(false);
            // Record study activity
            (window as any).recordChessVisionActivity?.('study', 10);
            if (isVoiceEnabled && speechService.current) {
              speechService.current.speak('Studio completato con successo!');
            }
          }}
          onExit={() => {
            setShowStudyMode(false);
            // Record partial study activity
            (window as any).recordChessVisionActivity?.('study', 3);
          }}
          speechService={speechService.current}
          isVoiceEnabled={isVoiceEnabled}
          timeLimit={studyTimeLimit}
        />
      )}

      {/* Read Mode Modal */}
      {showReadMode && currentCollection && currentCollection.studies.length > 0 && (
        <ReadMode
          study={currentCollection.studies[currentStudyIndex]}
          onClose={() => {
            setShowReadMode(false);
            // Record reading activity
            (window as any).recordChessVisionActivity?.('read', 5);
          }}
          speechService={speechService.current}
          isVoiceEnabled={isVoiceEnabled}
          autoPlay={false}
          readingSpeed={3}
        />
      )}

      {/* Flashcard Mode Modal */}
      {showFlashcardMode && currentCollection && currentCollection.studies.length > 0 && (
        <FlashcardMode
          studies={currentCollection.studies}
          onClose={() => {
            setShowFlashcardMode(false);
            // Record flashcard activity
            (window as any).recordChessVisionActivity?.('flashcard', 8);
          }}
          speechService={speechService.current}
          isVoiceEnabled={isVoiceEnabled}
        />
      )}

      {/* Tactical Mode Modal */}
      {showTacticalMode && tacticalState.currentProblem && (
        <TacticalMode
          problem={tacticalState.currentProblem}
          config={tacticalState.config}
          onComplete={(solved, attempts, timeMs) => {
            tacticalActions.submitSolution(attempts, timeMs, solved);
            // Record tactical training activity
            (window as any).recordChessVisionActivity?.('tactical', solved ? 15 : 5);
          }}
          onExit={() => {
            setShowTacticalMode(false);
            tacticalActions.stopTraining();
          }}
          onNext={() => {
            tacticalActions.nextProblem();
            if (tacticalState.currentProblemIndex >= (tacticalState.currentCollection?.problems.length || 0) - 1) {
              setShowTacticalMode(false);
              if (isVoiceEnabled && speechService.current) {
                speechService.current.speak('Allenamento tattico completato! Ottimo lavoro!');
              }
            }
          }}
          speechService={speechService.current}
          isVoiceEnabled={isVoiceEnabled}
          problemNumber={tacticalState.currentProblemIndex + 1}
          totalProblems={tacticalState.currentCollection?.problems.length || 0}
        />
      )}

      {/* Voice Settings Modal */}
      <VoiceSettings
        speechService={speechService.current}
        isVisible={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />
    </div>
  );
}

export default App;