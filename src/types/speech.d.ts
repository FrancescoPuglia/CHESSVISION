// src/types/speech.d.ts
/* eslint-disable no-unused-vars */
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    speechSynthesis?: SpeechSynthesis;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((ev: Event) => any) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechSynthesis extends EventTarget {
    paused: boolean;
    pending: boolean;
    speaking: boolean;
    cancel(): void;
    getVoices(): SpeechSynthesisVoice[];
    pause(): void;
    resume(): void;
    speak(utterance: SpeechSynthesisUtterance): void;
  }

  interface SpeechSynthesisVoice {
    default: boolean;
    lang: string;
    localService: boolean;
    name: string;
    voiceURI: string;
  }

  interface SpeechSynthesisUtterance extends EventTarget {
    lang: string;
    pitch: number;
    rate: number;
    text: string;
    voice: SpeechSynthesisVoice | null;
    volume: number;
    onboundary: ((ev: SpeechSynthesisEvent) => any) | null;
    onend: ((ev: SpeechSynthesisEvent) => any) | null;
    onerror: ((ev: SpeechSynthesisErrorEvent) => any) | null;
    onmark: ((ev: SpeechSynthesisEvent) => any) | null;
    onpause: ((ev: SpeechSynthesisEvent) => any) | null;
    onresume: ((ev: SpeechSynthesisEvent) => any) | null;
    onstart: ((ev: SpeechSynthesisEvent) => any) | null;
  }

  interface SpeechSynthesisEvent extends Event {
    charIndex: number;
    charLength: number;
    elapsedTime: number;
    name: string;
    utterance: SpeechSynthesisUtterance;
  }

  interface SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
    error: string;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  var SpeechSynthesisUtterance: {
    prototype: SpeechSynthesisUtterance;
    new (text?: string): SpeechSynthesisUtterance;
  };
}

export {};
