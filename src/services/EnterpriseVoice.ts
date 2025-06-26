// src/services/EnterpriseVoice.ts
/**
 * Enterprise Voice Recognition System
 * Multi-language, noise-resistant, with fallback mechanisms
 */

import { encryptData, decryptData, generateEncryptionKey } from '../utils/security';

export interface VoiceConfig {
  language: 'it-IT' | 'en-US' | 'auto';
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  noiseSuppressionLevel: 'low' | 'medium' | 'high';
  confidenceThreshold: number;
  timeoutMs: number;
}

export interface ChessMove {
  from: string;
  to: string;
  piece?: string;
  special?: 'castling' | 'en-passant' | 'promotion';
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface VoiceResult {
  command: string;
  confidence: number;
  move?: ChessMove;
  language: string;
  timestamp: number;
  alternativeResults?: string[];
}

export interface VoiceGrammar {
  pieces: { [key: string]: string[] };
  files: string[];
  ranks: string[];
  specialMoves: { [key: string]: string[] };
  modifiers: { [key: string]: string[] };
}

// Comprehensive chess grammars for multiple languages
const CHESS_GRAMMARS: { [lang: string]: VoiceGrammar } = {
  'it-IT': {
    pieces: {
      'K': ['re', 'king'],
      'Q': ['donna', 'regina', 'queen'],
      'R': ['torre', 'rook'],
      'B': ['alfiere', 'vescovo', 'bishop'],
      'N': ['cavallo', 'knight'],
      'P': ['pedone', 'pawn']
    },
    files: ['a', 'alfa', 'b', 'bravo', 'c', 'charlie', 'd', 'delta', 'e', 'echo', 'f', 'foxtrot', 'g', 'golf', 'h', 'hotel'],
    ranks: ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', '1', '2', '3', '4', '5', '6', '7', '8'],
    specialMoves: {
      'castling': ['arrocco', 'castle', 'castling'],
      'check': ['scacco', 'check'],
      'mate': ['matto', 'mate', 'scaccomatto'],
      'capture': ['prende', 'cattura', 'takes', 'captures']
    },
    modifiers: {
      'to': ['a', 'in', 'su', 'verso'],
      'from': ['da', 'dalla'],
      'promotion': ['promozione', 'diventa', 'promotion']
    }
  },
  'en-US': {
    pieces: {
      'K': ['king'],
      'Q': ['queen'],
      'R': ['rook'],
      'B': ['bishop'],
      'N': ['knight'],
      'P': ['pawn']
    },
    files: ['a', 'alpha', 'b', 'bravo', 'c', 'charlie', 'd', 'delta', 'e', 'echo', 'f', 'foxtrot', 'g', 'golf', 'h', 'hotel'],
    ranks: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', '1', '2', '3', '4', '5', '6', '7', '8'],
    specialMoves: {
      'castling': ['castle', 'castling'],
      'check': ['check'],
      'mate': ['mate', 'checkmate'],
      'capture': ['takes', 'captures']
    },
    modifiers: {
      'to': ['to'],
      'from': ['from'],
      'promotion': ['promotion', 'promotes']
    }
  }
};

export class EnterpriseVoice {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private config: VoiceConfig;
  private isListening = false;
  private encryptionKey: CryptoKey | null = null;
  private noiseFilter: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Callback handlers
  private onResult?: (result: VoiceResult) => void;
  private onError?: (error: string) => void;
  private onStart?: () => void;
  private onEnd?: () => void;
  
  // Performance metrics
  private accuracyHistory: number[] = [];
  private responseTimeHistory: number[] = [];
  
  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      language: 'auto',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      noiseSuppressionLevel: 'high',
      confidenceThreshold: 0.7,
      timeoutMs: 5000,
      ...config
    };
    
    this.synthesis = window.speechSynthesis;
    this.initializeEncryption();
    this.setupRecognition();
  }
  
  private async initializeEncryption(): Promise<void> {
    try {
      this.encryptionKey = await generateEncryptionKey();
    } catch (error) {
      console.error('Failed to initialize voice encryption:', error);
    }
  }
  
  private setupRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.handleError('Speech recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    
    // Set language
    this.recognition.lang = this.config.language === 'auto' 
      ? this.detectLanguage() 
      : this.config.language;
    
    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStart?.();
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd?.();
    };
    
    this.recognition.onresult = this.handleRecognitionResult.bind(this);
    this.recognition.onerror = this.handleRecognitionError.bind(this);
    
    // Setup noise filtering
    this.setupNoiseFiltering();
  }
  
  private async setupNoiseFiltering(): Promise<void> {
    try {
      if (this.config.noiseSuppressionLevel === 'low') return;
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      this.noiseFilter = new AudioContext();
      const source = this.noiseFilter.createMediaStreamSource(this.mediaStream);
      
      // Create noise reduction filter
      const filter = this.noiseFilter.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 300; // Remove low-frequency noise
      
      const compressor = this.noiseFilter.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      source.connect(filter);
      filter.connect(compressor);
      compressor.connect(this.noiseFilter.destination);
      
    } catch (error) {
      console.warn('Advanced noise filtering not available:', error);
    }
  }
  
  private detectLanguage(): string {
    const browserLang = navigator.language || 'en-US';
    
    if (browserLang.startsWith('it')) return 'it-IT';
    if (browserLang.startsWith('en')) return 'en-US';
    
    return 'en-US'; // Default fallback
  }
  
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const startTime = performance.now();
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        const transcript = result[0].transcript.trim().toLowerCase();
        const confidence = result[0].confidence;
        
        // Record performance metrics
        this.accuracyHistory.push(confidence);
        this.responseTimeHistory.push(performance.now() - startTime);
        
        // Keep only last 100 measurements
        if (this.accuracyHistory.length > 100) {
          this.accuracyHistory = this.accuracyHistory.slice(-100);
          this.responseTimeHistory = this.responseTimeHistory.slice(-100);
        }
        
        if (confidence >= this.config.confidenceThreshold) {
          this.processCommand(transcript, confidence, result);
        } else {
          // Try alternative results for low confidence
          this.tryAlternativeResults(result);
        }
      }
    }
  }
  
  private tryAlternativeResults(result: SpeechRecognitionResult): void {
    const alternatives: string[] = [];
    
    for (let i = 0; i < result.length && i < this.config.maxAlternatives; i++) {
      const alternative = result[i];
      alternatives.push(alternative.transcript.trim().toLowerCase());
      
      if (alternative.confidence >= this.config.confidenceThreshold * 0.8) {
        this.processCommand(alternative.transcript.trim().toLowerCase(), alternative.confidence, result);
        return;
      }
    }
    
    // If no alternative meets threshold, provide feedback
    this.onResult?.({
      command: alternatives[0] || '',
      confidence: result[0]?.confidence || 0,
      language: this.recognition?.lang || 'unknown',
      timestamp: Date.now(),
      alternativeResults: alternatives
    });
  }
  
  private processCommand(command: string, confidence: number, result: SpeechRecognitionResult): void {
    const currentLang = this.recognition?.lang || 'en-US';
    const grammar = CHESS_GRAMMARS[currentLang];
    
    if (!grammar) {
      this.handleError(`No grammar available for language: ${currentLang}`);
      return;
    }
    
    const move = this.parseChessCommand(command, grammar);
    
    const voiceResult: VoiceResult = {
      command,
      confidence,
      move,
      language: currentLang,
      timestamp: Date.now(),
      alternativeResults: this.extractAlternatives(result)
    };
    
    this.onResult?.(voiceResult);
    
    // Encrypt and store for privacy compliance
    this.encryptAndStoreCommand(command);
  }
  
  private parseChessCommand(command: string, grammar: VoiceGrammar): ChessMove | undefined {
    // Remove common filler words
    const cleanCommand = command.replace(/\b(um|uh|the|a|an)\b/g, '').trim();
    
    // Try different parsing strategies
    const strategies = [
      () => this.parseStandardNotation(cleanCommand, grammar),
      () => this.parseNaturalLanguage(cleanCommand, grammar),
      () => this.parsePhoneticNotation(cleanCommand, grammar),
      () => this.parsePartialCommand(cleanCommand, grammar)
    ];
    
    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result) return result;
      } catch (error) {
        console.debug('Parse strategy failed:', error);
      }
    }
    
    return undefined;
  }
  
  private parseStandardNotation(command: string, grammar: VoiceGrammar): ChessMove | undefined {
    // e.g., "e2 to e4", "pawn e2 e4", "knight f3"
    
    // Extract square patterns
    const squarePattern = /([a-h]|alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel)\s*(1|2|3|4|5|6|7|8|uno|due|tre|quattro|cinque|sei|sette|otto)/gi;
    const squares = [...command.matchAll(squarePattern)];
    
    if (squares.length >= 2) {
      const from = this.normalizeSquare(squares[0][0], grammar);
      const to = this.normalizeSquare(squares[1][0], grammar);
      
      if (from && to) {
        return {
          from,
          to,
          piece: this.extractPiece(command, grammar)
        };
      }
    }
    
    return undefined;
  }
  
  private parseNaturalLanguage(command: string, grammar: VoiceGrammar): ChessMove | undefined {
    // e.g., "move the knight from f1 to e3", "castle kingside"
    
    // Check for castling
    if (grammar.specialMoves.castling.some(word => command.includes(word))) {
      if (command.includes('king') || command.includes('corto') || command.includes('short')) {
        return { from: 'e1', to: 'g1', special: 'castling' };
      } else if (command.includes('queen') || command.includes('lungo') || command.includes('long')) {
        return { from: 'e1', to: 'c1', special: 'castling' };
      }
    }
    
    // Extract piece and squares
    const piece = this.extractPiece(command, grammar);
    const squares = this.extractSquares(command, grammar);
    
    if (squares.length >= 2) {
      return {
        from: squares[0],
        to: squares[1],
        piece
      };
    }
    
    return undefined;
  }
  
  private parsePhoneticNotation(command: string, grammar: VoiceGrammar): ChessMove | undefined {
    // e.g., "alpha 2 to alpha 4", "knight foxtrot 3"
    
    const phoneticFiles = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
    const phoneticRanks = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    
    let normalizedCommand = command;
    
    // Replace phonetic with standard
    phoneticFiles.forEach((phonetic, index) => {
      const letter = String.fromCharCode(97 + index); // a-h
      normalizedCommand = normalizedCommand.replace(new RegExp(phonetic, 'gi'), letter);
    });
    
    phoneticRanks.forEach((phonetic, index) => {
      normalizedCommand = normalizedCommand.replace(new RegExp(phonetic, 'gi'), (index + 1).toString());
    });
    
    return this.parseStandardNotation(normalizedCommand, grammar);
  }
  
  private parsePartialCommand(command: string, grammar: VoiceGrammar): ChessMove | undefined {
    // Handle incomplete commands and suggest completion
    const squares = this.extractSquares(command, grammar);
    const piece = this.extractPiece(command, grammar);
    
    if (squares.length === 1) {
      // Partial command - could be expanded with context
      return {
        from: squares[0],
        to: squares[0], // Will need completion
        piece
      };
    }
    
    return undefined;
  }
  
  private normalizeSquare(square: string, grammar: VoiceGrammar): string | undefined {
    const parts = square.toLowerCase().split(/\s+/);
    
    let file = '';
    let rank = '';
    
    for (const part of parts) {
      // Check files
      const fileIndex = grammar.files.indexOf(part);
      if (fileIndex !== -1) {
        file = String.fromCharCode(97 + (fileIndex % 8)); // Convert to a-h
      }
      
      // Check ranks
      if (/^[1-8]$/.test(part)) {
        rank = part;
      } else {
        const rankNames = ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto'];
        const rankIndex = rankNames.indexOf(part);
        if (rankIndex !== -1) {
          rank = (rankIndex + 1).toString();
        }
      }
    }
    
    return file && rank ? file + rank : undefined;
  }
  
  private extractPiece(command: string, grammar: VoiceGrammar): string | undefined {
    for (const [piece, names] of Object.entries(grammar.pieces)) {
      if (names.some(name => command.includes(name))) {
        return piece;
      }
    }
    return undefined;
  }
  
  private extractSquares(command: string, grammar: VoiceGrammar): string[] {
    const squares: string[] = [];
    const words = command.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const square = this.normalizeSquare(`${words[i]} ${words[i + 1]}`, grammar);
      if (square) {
        squares.push(square);
      }
    }
    
    return squares;
  }
  
  private extractAlternatives(result: SpeechRecognitionResult): string[] {
    const alternatives: string[] = [];
    
    for (let i = 0; i < result.length; i++) {
      alternatives.push(result[i].transcript.trim().toLowerCase());
    }
    
    return alternatives;
  }
  
  private async encryptAndStoreCommand(command: string): Promise<void> {
    if (!this.encryptionKey) return;
    
    try {
      const encrypted = await encryptData(command, this.encryptionKey);
      
      // Store with expiration for GDPR compliance
      const storageItem = {
        data: encrypted,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      localStorage.setItem(`voice_cmd_${Date.now()}`, JSON.stringify(storageItem));
      
      // Clean up expired commands
      this.cleanupExpiredCommands();
      
    } catch (error) {
      console.error('Failed to encrypt voice command:', error);
    }
  }
  
  private cleanupExpiredCommands(): void {
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('voice_cmd_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (item.expires && now > item.expires) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key!); // Remove corrupted items
        }
      }
    }
  }
  
  private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
    let errorMessage = 'Voice recognition error';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not available.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied.';
        break;
      case 'network':
        errorMessage = 'Network error during recognition.';
        break;
      case 'language-not-supported':
        errorMessage = 'Selected language not supported.';
        break;
      default:
        errorMessage = `Recognition error: ${event.error}`;
    }
    
    this.handleError(errorMessage);
  }
  
  private handleError(message: string): void {
    console.error('EnterpriseVoice error:', message);
    this.onError?.(message);
  }
  
  // Public API
  
  setCallbacks(callbacks: {
    onResult?: (result: VoiceResult) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }): void {
    this.onResult = callbacks.onResult;
    this.onError = callbacks.onError;
    this.onStart = callbacks.onStart;
    this.onEnd = callbacks.onEnd;
  }
  
  startListening(): void {
    if (!this.recognition) {
      this.handleError('Speech recognition not available');
      return;
    }
    
    if (this.isListening) {
      console.warn('Already listening');
      return;
    }
    
    try {
      this.recognition.start();
    } catch (error) {
      this.handleError(`Failed to start recognition: ${error}`);
    }
  }
  
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
  
  speak(text: string, language?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language || this.config.language || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      
      this.synthesis.speak(utterance);
    });
  }
  
  getPerformanceMetrics() {
    const avgAccuracy = this.accuracyHistory.reduce((a, b) => a + b, 0) / this.accuracyHistory.length || 0;
    const avgResponseTime = this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length || 0;
    
    return {
      averageAccuracy: Math.round(avgAccuracy * 100),
      averageResponseTime: Math.round(avgResponseTime),
      totalCommands: this.accuracyHistory.length,
      isListening: this.isListening,
      currentLanguage: this.recognition?.lang || 'unknown'
    };
  }
  
  switchLanguage(language: 'it-IT' | 'en-US'): void {
    this.config.language = language;
    
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
  
  updateConfig(updates: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.recognition) {
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }
  
  destroy(): void {
    this.stopListening();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.noiseFilter) {
      this.noiseFilter.close();
    }
    
    this.cleanupExpiredCommands();
  }
}

// Type augmentation for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}