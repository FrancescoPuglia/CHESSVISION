// src/ui/hooks/useChessGame.ts
import { useState, useCallback } from 'react';
import { ChessGame } from '@core/chess/ChessGame';
import { ChessMove } from '@core/chess/types';
import { StatsStore } from '@core/stats/StatsStore';
import { PgnParser } from '@core/pgn/PgnParser';

export interface GameState {
  game: ChessGame;
  currentMove: number;
  moves: ChessMove[];
  isGameOver: boolean;
  gameResult: string | null;
  stats: StatsStore;
  lastMessage: string;
  messageType: 'success' | 'error' | 'info';
}

export interface GameActions {
  makeMove: (moveText: string) => void;
  resetGame: () => void;
  loadPgnStudy: (pgnText: string) => void;
  loadStudyPosition: (moves: string[], moveIndex: number) => boolean;
  undoMove: () => void;
  getHint: () => string;
  listPieces: () => string;
}

export const useChessGame = (): [GameState, GameActions] => {
  const [game, setGame] = useState(() => new ChessGame());
  const [currentMove, setCurrentMove] = useState(0);
  const [moves, setMoves] = useState<ChessMove[]>([]);
  const [stats, setStats] = useState(() => new StatsStore());
  const [lastMessage, setLastMessage] = useState('Benvenuto! Inserisci una mossa per iniziare.');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [studyMoves, setStudyMoves] = useState<string[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);

  // Game state derived values
  const isGameOver = game.isGameOver();
  const gameResult = isGameOver ? 
    (game.isCheckmate() ? 
      `Scacco matto! Vince ${game.getTurn() === 'white' ? 'il Nero' : 'il Bianco'}` :
      game.isStalemate() ? 'Stallo!' :
      game.isDraw() ? 'Patta!' : 'Partita terminata'
    ) : null;

  const setMessage = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setLastMessage(message);
    setMessageType(type);
  }, []);

  const makeMove = useCallback((moveText: string) => {
    try {
      // Check if we're in study mode and if this is the expected move
      if (studyMoves.length > 0 && studyIndex < studyMoves.length) {
        const expectedMove = studyMoves[studyIndex];
        
        // Try the move first to see if it's legal
        const result = game.makeMoveFromSan(moveText);
        
        if (result) {
          if (result.san === expectedMove) {
            // Correct move in study
            setMoves(prev => [...prev, result]);
            setCurrentMove(prev => prev + 1);
            setStudyIndex(prev => prev + 1);
            setMessage(`Corretto! Mossa: ${result.san}`, 'success');
            
            stats.recordSimpleMove(true, 0); // TODO: track actual time
            setStats(new StatsStore(stats.toJSON()));
            
            // Check if study is complete
            if (studyIndex + 1 >= studyMoves.length) {
              setMessage('Studio completato! Ottimo lavoro! 🎉', 'success');
              stats.completeCurrentSession();
              setStats(new StatsStore(stats.toJSON()));
            }
          } else {
            // Legal move but not the expected one in study
            game.undoMove(); // Undo the move
            setMessage(`Mossa legale ma non quella attesa. Atteso: ${expectedMove}`, 'error');
            stats.recordSimpleMove(false, 0);
            setStats(new StatsStore(stats.toJSON()));
          }
        } else {
          setMessage('Mossa illegale! Riprova.', 'error');
          stats.recordSimpleMove(false, 0);
          setStats(new StatsStore(stats.toJSON()));
        }
      } else {
        // Free play mode
        const result = game.makeMoveFromSan(moveText);
        
        if (result) {
          setMoves(prev => [...prev, result]);
          setCurrentMove(prev => prev + 1);
          setMessage(`Mossa eseguita: ${result.san}`, 'success');
          
          stats.recordSimpleMove(true, 0);
          setStats(new StatsStore(stats.toJSON()));
        } else {
          setMessage('Mossa illegale! Controlla la notazione.', 'error');
          stats.recordSimpleMove(false, 0);
          setStats(new StatsStore(stats.toJSON()));
        }
      }
      
      setGame(new ChessGame(game.getFen())); // Trigger re-render
    } catch (error) {
      setMessage('Errore nell\'esecuzione della mossa.', 'error');
      console.error('Move error:', error);
    }
  }, [game, studyMoves, studyIndex, stats]);

  const resetGame = useCallback(() => {
    const newGame = new ChessGame();
    setGame(newGame);
    setMoves([]);
    setCurrentMove(0);
    setStudyMoves([]);
    setStudyIndex(0);
    setMessage('Partita resettata. Pronto per iniziare!', 'info');
    
    // Start new session
    stats.startSimpleSession();
    setStats(new StatsStore(stats.toJSON()));
  }, [stats]);

  const loadPgnStudy = useCallback((pgnText: string) => {
    try {
      const parsedGame = PgnParser.parse(pgnText);
      const movesList = parsedGame.moves.map(m => m.san);
      
      if (movesList.length === 0) {
        setMessage('Il PGN non contiene mosse valide.', 'error');
        return;
      }

      // Reset to starting position
      const newGame = new ChessGame();
      setGame(newGame);
      setMoves([]);
      setCurrentMove(0);
      setStudyMoves(movesList);
      setStudyIndex(0);
      
      const studyName = parsedGame.headers.Event || 'Studio PGN';
      setMessage(`Studio caricato: "${studyName}" (${movesList.length} mosse)`, 'success');
      
      stats.startSimpleSession();
      setStats(new StatsStore(stats.toJSON()));
    } catch (error) {
      setMessage('Errore nel caricamento del PGN. Verifica il formato.', 'error');
      console.error('PGN load error:', error);
    }
  }, [stats]);

  const loadStudyPosition = useCallback((moves: string[], moveIndex: number): boolean => {
    try {
      // Create fresh game from starting position
      const newGame = new ChessGame();
      
      // Apply moves up to the specified index
      const appliedMoves: ChessMove[] = [];
      for (let i = 0; i < Math.min(moveIndex, moves.length); i++) {
        const move = moves[i];
        const result = newGame.makeMoveFromSan(move);
        
        if (!result) {
          console.error(`Failed to make move ${i + 1}: ${move}`);
          setMessage(`Errore nella mossa ${i + 1}: ${move}`, 'error');
          return false;
        }
        
        appliedMoves.push(result);
      }
      
      // Update game state
      setGame(newGame);
      setMoves(appliedMoves);
      setCurrentMove(appliedMoves.length);
      
      // Update study tracking
      setStudyMoves(moves);
      setStudyIndex(moveIndex);
      
      const positionText = moveIndex === 0 
        ? 'posizione iniziale' 
        : `posizione dopo ${moveIndex} moss${moveIndex === 1 ? 'a' : 'e'}`;
        
      setMessage(`Caricata ${positionText}`, 'success');
      return true;
      
    } catch (error) {
      console.error('Error loading study position:', error);
      setMessage('Errore nel caricamento della posizione', 'error');
      return false;
    }
  }, []);

  const undoMove = useCallback(() => {
    if (moves.length > 0) {
      const undoneMove = game.undoMove();
      if (undoneMove) {
        setMoves(prev => prev.slice(0, -1));
        setCurrentMove(prev => prev - 1);
        if (studyMoves.length > 0 && studyIndex > 0) {
          setStudyIndex(prev => prev - 1);
        }
        setMessage(`Mossa annullata: ${undoneMove.san}`, 'info');
        setGame(new ChessGame(game.getFen()));
      }
    } else {
      setMessage('Nessuna mossa da annullare.', 'info');
    }
  }, [game, moves, studyIndex, studyMoves.length]);

  const getHint = useCallback((): string => {
    if (studyMoves.length > 0 && studyIndex < studyMoves.length) {
      const nextMove = studyMoves[studyIndex];
      return `Suggerimento: La prossima mossa è ${nextMove}`;
    } else {
      // For free play, could integrate with chess engine later
      return 'Suggerimento: Controlla le mosse candidate e cerca tattiche!';
    }
  }, [studyMoves, studyIndex]);

  const listPieces = useCallback((): string => {
    const board = game.getBoard();
    const pieces: string[] = [];
    
    board.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + colIndex); // a-h
          const rank = 8 - rowIndex; // 8-1
          const square = `${file}${rank}`;
          const pieceNames: { [key: string]: string } = {
            'p': 'Pedone', 'r': 'Torre', 'n': 'Cavallo', 
            'b': 'Alfiere', 'q': 'Donna', 'k': 'Re'
          };
          const colorName = piece.color === 'w' ? 'Bianco' : 'Nero';
          const pieceName = pieceNames[piece.type] || piece.type;
          pieces.push(`${pieceName} ${colorName} in ${square}`);
        }
      });
    });
    
    return pieces.length > 0 ? 
      `Pezzi sulla scacchiera:\n${pieces.join(', ')}` : 
      'Nessun pezzo sulla scacchiera';
  }, [game]);

  return [
    {
      game,
      currentMove,
      moves,
      isGameOver,
      gameResult,
      stats,
      lastMessage,
      messageType
    },
    {
      makeMove,
      resetGame,
      loadPgnStudy,
      loadStudyPosition,
      undoMove,
      getHint,
      listPieces
    }
  ];
};