// src/services/accessibility/BlindModeService.ts
/**
 * BLIND MODE SERVICE - LICHESS-INSPIRED ACCESSIBILITY SYSTEM
 * Complete accessibility for visually impaired chess players
 */

import { ChessGame } from "@core/chess/ChessGame";
import { SpeechService } from "@services/speech/SpeechService";

export interface BlindModeCommand {
  command: string;
  description: string;
  handler: (args?: string) => Promise<string>;
}

export interface BlindModeSettings {
  enabled: boolean;
  voiceSpeed: number;
  announceOpponentMoves: boolean;
  announcePieceCaptures: boolean;
  announceCheck: boolean;
  announceGameStatus: boolean;
  keyboardNavigationEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export class BlindModeService {
  private game: ChessGame | null = null;
  private speechService: SpeechService | null = null;
  private settings: BlindModeSettings;
  private commands: Map<string, BlindModeCommand> = new Map();
  private lastMove: string = "";
  private isEnabled = false;

  constructor(speechService: SpeechService | null = null) {
    this.speechService = speechService;
    this.settings = this.loadSettings();
    this.initializeCommands();
    this.setupKeyboardListeners();
  }

  private loadSettings(): BlindModeSettings {
    const stored = localStorage.getItem('chessvision-blind-mode-settings');
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      enabled: false,
      voiceSpeed: 1.0,
      announceOpponentMoves: true,
      announcePieceCaptures: true,
      announceCheck: true,
      announceGameStatus: true,
      keyboardNavigationEnabled: true,
      soundEffectsEnabled: true,
    };
  }

  private saveSettings(): void {
    localStorage.setItem('chessvision-blind-mode-settings', JSON.stringify(this.settings));
  }

  private initializeCommands(): void {
    // Lichess-inspired command system
    this.commands.set('l', {
      command: 'l',
      description: 'Annuncia ultima mossa',
      handler: () => this.announceLastMove(),
    });

    this.commands.set('p', {
      command: 'p',
      description: 'Annuncia posizione di tutti i pezzi',
      handler: () => this.announceAllPieces(),
    });

    this.commands.set('s', {
      command: 's',
      description: 'Annuncia pezzi per traverse e colonne',
      handler: () => this.announcePiecesByRankFile(),
    });

    this.commands.set('o', {
      command: 'o',
      description: 'Informazioni avversario',
      handler: () => this.announceOpponentInfo(),
    });

    this.commands.set('c', {
      command: 'c',
      description: 'Stato del tempo',
      handler: () => this.announceClockStatus(),
    });

    this.commands.set('board', {
      command: 'board',
      description: 'Descrizione completa della scacchiera',
      handler: () => this.announceBoardDescription(),
    });

    this.commands.set('turn', {
      command: 'turn',
      description: 'Chi deve muovere',
      handler: () => this.announceTurn(),
    });

    this.commands.set('material', {
      command: 'material',
      description: 'Bilancio materiale',
      handler: () => this.announceMaterialBalance(),
    });

    this.commands.set('legal', {
      command: 'legal',
      description: 'Mosse legali disponibili',
      handler: () => this.announceLegalMoves(),
    });

    this.commands.set('help', {
      command: 'help',
      description: 'Lista comandi disponibili',
      handler: () => this.announceHelp(),
    });
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled || !this.settings.keyboardNavigationEnabled) return;

      // Alt + key combinations for accessibility commands
      if (event.altKey) {
        const key = event.key.toLowerCase();
        const command = this.commands.get(key);
        
        if (command) {
          event.preventDefault();
          command.handler();
        }
      }

      // Escape to announce current focus
      if (event.key === 'Escape') {
        this.announceCurrentFocus();
      }
    });
  }

  enable(): void {
    this.isEnabled = true;
    this.settings.enabled = true;
    this.saveSettings();
    this.announceBlindModeEnabled();
    this.setupAccessibilityAttributes();
  }

  disable(): void {
    this.isEnabled = false;
    this.settings.enabled = false;
    this.saveSettings();
    this.removeAccessibilityAttributes();
  }

  private setupAccessibilityAttributes(): void {
    // Add ARIA labels and roles for screen readers
    document.body.setAttribute('aria-label', 'ChessVision - Modalità Accessibilità Attiva');
    
    // Mark important chess elements
    const chessboard = document.querySelector('.chessboard');
    if (chessboard) {
      chessboard.setAttribute('role', 'grid');
      chessboard.setAttribute('aria-label', 'Scacchiera');
    }

    // Add live regions for announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'chess-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-9999px';
    document.body.appendChild(liveRegion);
  }

  private removeAccessibilityAttributes(): void {
    const liveRegion = document.getElementById('chess-live-region');
    if (liveRegion) {
      liveRegion.remove();
    }
  }

  setGame(game: ChessGame): void {
    this.game = game;
  }

  async processCommand(input: string): Promise<string> {
    if (!this.isEnabled) return "Modalità accessibility non attiva";

    const cleanInput = input.trim().toLowerCase();
    
    // Check if it's a chess move
    if (this.isChessMove(cleanInput)) {
      return this.processMoveCommand(cleanInput);
    }

    // Check if it's an accessibility command
    const command = this.commands.get(cleanInput);
    if (command) {
      return await command.handler();
    }

    return `Comando non riconosciuto: ${input}. Digita 'help' per la lista comandi.`;
  }

  private isChessMove(input: string): boolean {
    // Basic chess move validation
    const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$|^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]=?[QRBN]?[+#]?$|^O-O(-O)?[+#]?$/i;
    return movePattern.test(input);
  }

  private async processMoveCommand(move: string): Promise<string> {
    if (!this.game) return "Nessuna partita attiva";

    try {
      const result = this.game.makeMoveFromSan(move);
      if (result) {
        this.lastMove = result.san;
        await this.announceMoveExecuted(result.san);
        
        // Check for special game states
        if (this.game.isCheck()) {
          await this.speak("Scacco!");
        }
        if (this.game.isCheckmate()) {
          await this.speak("Scacco matto!");
        }
        if (this.game.isStalemate()) {
          await this.speak("Stallo!");
        }

        return `Mossa eseguita: ${result.san}`;
      } else {
        return "Mossa illegale";
      }
    } catch (error) {
      return "Errore nell'esecuzione della mossa";
    }
  }

  private async announceLastMove(): Promise<string> {
    if (!this.lastMove) {
      const message = "Nessuna mossa precedente";
      await this.speak(message);
      return message;
    }

    const message = `Ultima mossa: ${this.lastMove}`;
    await this.speak(message);
    return message;
  }

  private async announceAllPieces(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    const board = this.game.getBoard();
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];

    board.forEach((row, rankIndex) => {
      row.forEach((piece, fileIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex); // a-h
          const rank = 8 - rankIndex; // 8-1
          const square = `${file}${rank}`;
          
          const pieceNames: { [key: string]: string } = {
            p: "Pedone",
            r: "Torre", 
            n: "Cavallo",
            b: "Alfiere",
            q: "Donna",
            k: "Re",
          };
          
          const pieceName = pieceNames[piece.type] || piece.type;
          const description = `${pieceName} in ${square}`;
          
          if (piece.color === 'w') {
            whitePieces.push(description);
          } else {
            blackPieces.push(description);
          }
        }
      });
    });

    let message = "Posizione dei pezzi. ";
    if (whitePieces.length > 0) {
      message += `Pezzi bianchi: ${whitePieces.join(", ")}. `;
    }
    if (blackPieces.length > 0) {
      message += `Pezzi neri: ${blackPieces.join(", ")}.`;
    }

    await this.speak(message);
    return message;
  }

  private async announcePiecesByRankFile(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    const board = this.game.getBoard();
    let message = "Pezzi per traversa. ";

    // Announce by ranks (8 to 1)
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const rank = 8 - rankIndex;
      const pieces: string[] = [];
      
      board[rankIndex].forEach((piece, fileIndex) => {
        if (piece) {
          const file = String.fromCharCode(97 + fileIndex);
          const pieceNames: { [key: string]: string } = {
            p: "pedone", r: "torre", n: "cavallo", 
            b: "alfiere", q: "donna", k: "re",
          };
          const pieceName = pieceNames[piece.type] || piece.type;
          const color = piece.color === 'w' ? 'bianco' : 'nero';
          pieces.push(`${pieceName} ${color} in ${file}`);
        }
      });

      if (pieces.length > 0) {
        message += `Traversa ${rank}: ${pieces.join(", ")}. `;
      }
    }

    await this.speak(message);
    return message;
  }

  private async announceOpponentInfo(): Promise<string> {
    const message = "Informazioni avversario: Motore scacchistico";
    await this.speak(message);
    return message;
  }

  private async announceClockStatus(): Promise<string> {
    const message = "Tempo: Partita senza limite di tempo";
    await this.speak(message);
    return message;
  }

  private async announceBoardDescription(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    const fen = this.game.getFen();
    const turn = this.game.getTurn() === 'white' ? 'bianco' : 'nero';
    const message = `Descrizione scacchiera. È il turno del ${turn}. Posizione FEN: ${fen}`;
    
    await this.speak(message);
    return message;
  }

  private async announceTurn(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    const turn = this.game.getTurn() === 'white' ? 'bianco' : 'nero';
    const message = `È il turno del ${turn}`;
    await this.speak(message);
    return message;
  }

  private async announceMaterialBalance(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    // Count material
    const board = this.game.getBoard();
    const material = { white: 0, black: 0 };
    const pieceValues: { [key: string]: number } = {
      p: 1, r: 5, n: 3, b: 3, q: 9, k: 0
    };

    board.forEach(row => {
      row.forEach(piece => {
        if (piece) {
          const value = pieceValues[piece.type] || 0;
          if (piece.color === 'w') {
            material.white += value;
          } else {
            material.black += value;
          }
        }
      });
    });

    const difference = material.white - material.black;
    let message = `Bilancio materiale: Bianco ${material.white}, Nero ${material.black}. `;
    
    if (difference > 0) {
      message += `Il bianco è avanti di ${difference} punti.`;
    } else if (difference < 0) {
      message += `Il nero è avanti di ${Math.abs(difference)} punti.`;
    } else {
      message += "Materiale pari.";
    }

    await this.speak(message);
    return message;
  }

  private async announceLegalMoves(): Promise<string> {
    if (!this.game) {
      const message = "Nessuna partita attiva";
      await this.speak(message);
      return message;
    }

    const moves = this.game.getValidMoves();
    const message = `Mosse legali disponibili: ${moves.length}. Prime 10: ${moves.slice(0, 10).join(", ")}`;
    await this.speak(message);
    return message;
  }

  private async announceHelp(): Promise<string> {
    const commandList = Array.from(this.commands.values())
      .map(cmd => `${cmd.command}: ${cmd.description}`)
      .join(". ");
    
    const message = `Comandi disponibili: ${commandList}. Usa Alt più il tasto del comando per l'accesso rapido.`;
    await this.speak(message);
    return message;
  }

  private async announceCurrentFocus(): Promise<string> {
    const activeElement = document.activeElement;
    const message = `Focus corrente: ${activeElement?.tagName || 'elemento sconosciuto'}`;
    await this.speak(message);
    return message;
  }

  private async announceBlindModeEnabled(): Promise<string> {
    const message = "Modalità accessibility attivata. Premi Alt+H per i comandi disponibili.";
    await this.speak(message);
    return message;
  }

  private async announceMoveExecuted(move: string): Promise<string> {
    const message = `Mossa eseguita: ${move}`;
    await this.speak(message);
    this.updateLiveRegion(message);
    return message;
  }

  private updateLiveRegion(message: string): void {
    const liveRegion = document.getElementById('chess-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  private async speak(text: string): Promise<void> {
    if (this.speechService && this.isEnabled) {
      await this.speechService.speak(text, { rate: this.settings.voiceSpeed });
    }
  }

  isBlindModeEnabled(): boolean {
    return this.isEnabled;
  }

  getSettings(): BlindModeSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<BlindModeSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getAvailableCommands(): BlindModeCommand[] {
    return Array.from(this.commands.values());
  }
}