// src/services/speech/SpeechService.ts
/* eslint-disable no-undef */
import { Language } from "@core/i18n/useTranslation";

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private language: Language = "en";
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private speechRate: number = 1;
  private speechPitch: number = 1;
  private speechVolume: number = 1;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initRecognition();

    // Load voice preferences from localStorage
    this.loadVoicePreferences();
  }

  private initRecognition(): void {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.language === "it" ? "it-IT" : "en-US";
  }

  setLanguage(lang: Language): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang === "it" ? "it-IT" : "en-US";
    }

    // Try to find a good default voice for the new language
    this.autoSelectVoiceForLanguage();
  }

  private loadVoicePreferences(): void {
    try {
      const prefs = localStorage.getItem("chessvision-voice-prefs");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        this.speechRate = parsed.rate || 1;
        this.speechPitch = parsed.pitch || 1;
        this.speechVolume = parsed.volume || 1;

        if (parsed.voiceName) {
          // Wait for voices to load, then select the saved voice
          setTimeout(() => {
            const voices = this.getAvailableVoices();
            const savedVoice = voices.find((v) => v.name === parsed.voiceName);
            if (savedVoice) {
              this.selectedVoice = savedVoice;
            }
          }, 100);
        }
      }
    } catch (error) {
      console.warn("Failed to load voice preferences:", error);
    }
  }

  private saveVoicePreferences(): void {
    try {
      const prefs = {
        voiceName: this.selectedVoice?.name,
        rate: this.speechRate,
        pitch: this.speechPitch,
        volume: this.speechVolume,
      };
      localStorage.setItem("chessvision-voice-prefs", JSON.stringify(prefs));
    } catch (error) {
      console.warn("Failed to save voice preferences:", error);
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  getVoicesForCurrentLanguage(): SpeechSynthesisVoice[] {
    const langCode = this.language === "it" ? "it" : "en";
    return this.getAvailableVoices().filter((voice) =>
      voice.lang.startsWith(langCode),
    );
  }

  setVoice(voice: SpeechSynthesisVoice | null): void {
    this.selectedVoice = voice;
    this.saveVoicePreferences();
  }

  setSpeechRate(rate: number): void {
    this.speechRate = Math.max(0.1, Math.min(3, rate));
    this.saveVoicePreferences();
  }

  setSpeechPitch(pitch: number): void {
    this.speechPitch = Math.max(0, Math.min(2, pitch));
    this.saveVoicePreferences();
  }

  setSpeechVolume(volume: number): void {
    this.speechVolume = Math.max(0, Math.min(1, volume));
    this.saveVoicePreferences();
  }

  getSpeechSettings() {
    return {
      rate: this.speechRate,
      pitch: this.speechPitch,
      volume: this.speechVolume,
      voice: this.selectedVoice,
    };
  }

  private autoSelectVoiceForLanguage(): void {
    const voices = this.getVoicesForCurrentLanguage();
    if (voices.length > 0) {
      // Prefer local voices
      const localVoice = voices.find((v) => v.localService);
      this.selectedVoice = localVoice || voices[0];
    }
  }

  async speak(
    text: string,
    options: { rate?: number; pitch?: number; volume?: number } = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      // Stop any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language === "it" ? "it-IT" : "en-US";

      // Use selected voice if available
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      // Use saved settings or provided options
      utterance.rate = options.rate || this.speechRate;
      utterance.pitch = options.pitch || this.speechPitch;
      utterance.volume = options.volume || this.speechVolume;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(`Speech error: ${e.error}`));

      this.synthesis.speak(utterance);
    });
  }

  async listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not supported"));
        return;
      }

      if (this.isListening) {
        reject(new Error("Already listening"));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.resultIndex];
        const transcript = result[0].transcript.trim();
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Chess-specific speech functions
  speakPieceList(
    pieces: Array<{ piece: string; color: string; square: string }>,
    translations: any,
  ): Promise<void> {
    const pieceTexts = pieces.map((p) => {
      const pieceName = translations[p.piece.toLowerCase()];
      const colorName = translations[p.color.toLowerCase()];
      return `${colorName} ${pieceName} ${translations.on} ${p.square}`;
    });

    const text = pieceTexts.join(", ");
    return this.speak(text);
  }

  speakMove(move: string, translations: any): Promise<void> {
    // Convert algebraic notation to spoken form
    let spokenMove = move;

    // Handle castling
    if (move === "O-O") {
      spokenMove =
        translations.castles +
        " " +
        (this.language === "it" ? "corto" : "kingside");
    } else if (move === "O-O-O") {
      spokenMove =
        translations.castles +
        " " +
        (this.language === "it" ? "lungo" : "queenside");
    }

    return this.speak(spokenMove);
  }

  speakPosition(fen: string, translations: any): Promise<void> {
    // Parse FEN and speak current position
    const position = this.parseFenForSpeech(fen);
    const text = this.formatPositionForSpeech(position, translations);
    return this.speak(text);
  }

  private parseFenForSpeech(
    fen: string,
  ): Array<{ piece: string; color: string; square: string }> {
    const pieces: Array<{ piece: string; color: string; square: string }> = [];
    const [board] = fen.split(" ");
    const ranks = board.split("/");

    ranks.forEach((rank, rankIndex) => {
      let fileIndex = 0;
      for (const char of rank) {
        if (isNaN(Number(char))) {
          // It's a piece
          const isWhite = char === char.toUpperCase();
          const file = String.fromCharCode(97 + fileIndex); // a-h
          const rankNum = 8 - rankIndex; // 8-1

          pieces.push({
            piece: this.getPieceType(char.toLowerCase()),
            color: isWhite ? "white" : "black",
            square: `${file}${rankNum}`,
          });
          fileIndex++;
        } else {
          // It's a number of empty squares
          fileIndex += Number(char);
        }
      }
    });

    return pieces;
  }

  private getPieceType(piece: string): string {
    const pieceMap: { [key: string]: string } = {
      k: "king",
      q: "queen",
      r: "rook",
      b: "bishop",
      n: "knight",
      p: "pawn",
    };
    return pieceMap[piece] || piece;
  }

  private formatPositionForSpeech(
    pieces: Array<{ piece: string; color: string; square: string }>,
    translations: any,
  ): string {
    const whitePieces = pieces.filter((p) => p.color === "white");
    const blackPieces = pieces.filter((p) => p.color === "black");

    let text = "";

    if (whitePieces.length > 0) {
      text += `${translations.white}: `;
      text += whitePieces
        .map((p) => `${translations[p.piece]} ${p.square}`)
        .join(", ");
    }

    if (blackPieces.length > 0) {
      if (text) text += ". ";
      text += `${translations.black}: `;
      text += blackPieces
        .map((p) => `${translations[p.piece]} ${p.square}`)
        .join(", ");
    }

    return text;
  }
}
