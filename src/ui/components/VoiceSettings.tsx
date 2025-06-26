// src/ui/components/VoiceSettings.tsx
import React, { useState, useEffect } from 'react';
import { SpeechService } from '@services/speech/SpeechService';

interface VoiceSettingsProps {
  speechService: SpeechService | null;
  isVisible: boolean;
  onClose: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  speechService,
  isVisible,
  onClose
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!speechService || !isVisible) return;

    // Load current settings
    const settings = speechService.getSpeechSettings();
    setSelectedVoice(settings.voice);
    setRate(settings.rate);
    setPitch(settings.pitch);
    setVolume(settings.volume);

    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechService.getVoicesForCurrentLanguage();
      setVoices(availableVoices);
    };

    loadVoices();

    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [speechService, isVisible]);

  const handleVoiceChange = (voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    if (speechService) {
      speechService.setVoice(voice);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (speechService) {
      speechService.setSpeechRate(newRate);
    }
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    if (speechService) {
      speechService.setSpeechPitch(newPitch);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (speechService) {
      speechService.setSpeechVolume(newVolume);
    }
  };

  const testVoice = () => {
    if (speechService) {
      speechService.speak('Questa è una prova della voce selezionata per ChessVision.');
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        padding: '2rem',
        minWidth: '500px',
        maxWidth: '700px',
        border: '2px solid #ffd700',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#ffd700', margin: 0, fontSize: '1.8rem' }}>
            🔊 Impostazioni Voce
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

        {/* Voice Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>Selezione Voce</h3>
          <select
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = voices.find(v => v.name === e.target.value);
              if (voice) handleVoiceChange(voice);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2d3142',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          >
            <option value="">Seleziona una voce...</option>
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang}) {voice.localService ? '(Locale)' : '(Remota)'}
              </option>
            ))}
          </select>
        </div>

        {/* Rate Control */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>
            Velocità: {rate.toFixed(1)}x
          </h3>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#2d3142',
              outline: 'none',
              borderRadius: '3px'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.25rem'
          }}>
            <span>Lenta</span>
            <span>Normale</span>
            <span>Veloce</span>
          </div>
        </div>

        {/* Pitch Control */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>
            Tonalità: {pitch.toFixed(1)}
          </h3>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#2d3142',
              outline: 'none',
              borderRadius: '3px'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.25rem'
          }}>
            <span>Grave</span>
            <span>Normale</span>
            <span>Acuta</span>
          </div>
        </div>

        {/* Volume Control */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '0.5rem' }}>
            Volume: {Math.round(volume * 100)}%
          </h3>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#2d3142',
              outline: 'none',
              borderRadius: '3px'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.25rem'
          }}>
            <span>Silenzioso</span>
            <span>Massimo</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={testVoice}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            🎤 Prova Voce
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Chiudi
          </button>
        </div>

        {/* Info */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#2d3142',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#a0a0a0'
        }}>
          💡 <strong>Suggerimento:</strong> Le voci locali offrono prestazioni migliori e maggiore privacy. 
          Le impostazioni vengono salvate automaticamente nel browser.
        </div>
      </div>
    </div>
  );
};