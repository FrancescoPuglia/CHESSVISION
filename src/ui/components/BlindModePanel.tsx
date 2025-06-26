// src/ui/components/BlindModePanel.tsx
/**
 * BLIND MODE CONTROL PANEL
 * Accessibility control interface inspired by Lichess
 */

import React, { useState, useEffect } from "react";
import {
  BlindModeService,
  BlindModeSettings,
  BlindModeCommand,
} from "@services/accessibility/BlindModeService";
import { SpeechService } from "@services/speech/SpeechService";

interface BlindModePanelProps {
  blindModeService: BlindModeService;
  speechService: SpeechService | null;
  isVisible: boolean;
  onClose: () => void;
}

export const BlindModePanel: React.FC<BlindModePanelProps> = ({
  blindModeService,
  // speechService,
  isVisible,
  onClose,
}) => {
  const [settings, setSettings] = useState<BlindModeSettings>(
    blindModeService.getSettings(),
  );
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isBlindModeActive, setIsBlindModeActive] = useState(
    blindModeService.isBlindModeEnabled(),
  );
  const [availableCommands] = useState<BlindModeCommand[]>(
    blindModeService.getAvailableCommands(),
  );

  useEffect(() => {
    const currentSettings = blindModeService.getSettings();
    setSettings(currentSettings);
    setIsBlindModeActive(blindModeService.isBlindModeEnabled());
  }, [blindModeService]);

  const handleToggleBlindMode = () => {
    if (isBlindModeActive) {
      blindModeService.disable();
      setIsBlindModeActive(false);
    } else {
      blindModeService.enable();
      setIsBlindModeActive(true);
    }
  };

  const handleSettingChange = (key: keyof BlindModeSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    blindModeService.updateSettings({ [key]: value });
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const command = commandInput.trim();
    setCommandHistory((prev) => [...prev, `> ${command}`]);

    try {
      const result = await blindModeService.processCommand(command);
      setCommandHistory((prev) => [...prev, result]);
    } catch (error) {
      setCommandHistory((prev) => [...prev, `Errore: ${error}`]);
    }

    setCommandInput("");
  };

  const handleQuickCommand = async (command: string) => {
    setCommandInput(command);
    const result = await blindModeService.processCommand(command);
    setCommandHistory((prev) => [...prev, `> ${command}`, result]);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      role="dialog"
      aria-labelledby="blind-mode-title"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          borderRadius: "16px",
          padding: "2rem",
          minWidth: "800px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "3px solid #ffd700",
          boxShadow: "0 25px 70px rgba(255,215,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            borderBottom: "2px solid #333",
            paddingBottom: "1rem",
          }}
        >
          <h2
            id="blind-mode-title"
            style={{ color: "#ffd700", margin: 0, fontSize: "2rem" }}
          >
            ♿ Modalità Accessibilità
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: "2rem",
              cursor: "pointer",
            }}
            aria-label="Chiudi pannello accessibilità"
          >
            ✕
          </button>
        </div>

        {/* Main Toggle */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={handleToggleBlindMode}
            style={{
              width: "100%",
              padding: "1.5rem",
              backgroundColor: isBlindModeActive ? "#10b981" : "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "1.2rem",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            aria-pressed={isBlindModeActive}
          >
            {isBlindModeActive
              ? "✅ Modalità Accessibilità ATTIVA"
              : "❌ Modalità Accessibilità DISATTIVA"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
        >
          {/* Settings Panel */}
          <div>
            <h3 style={{ color: "#8b5cf6", marginBottom: "1.5rem" }}>
              ⚙️ Impostazioni
            </h3>

            {/* Voice Speed */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#a0a0a0",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                Velocità Voce: {settings.voiceSpeed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.voiceSpeed}
                onChange={(e) =>
                  handleSettingChange("voiceSpeed", parseFloat(e.target.value))
                }
                style={{
                  width: "100%",
                  height: "6px",
                  backgroundColor: "#2d3142",
                  outline: "none",
                  borderRadius: "3px",
                }}
                aria-label="Velocità della voce"
              />
            </div>

            {/* Checkboxes */}
            <div style={{ display: "grid", gap: "1rem" }}>
              {[
                {
                  key: "announceOpponentMoves",
                  label: "Annuncia mosse avversario",
                },
                { key: "announcePieceCaptures", label: "Annuncia catture" },
                { key: "announceCheck", label: "Annuncia scacchi" },
                { key: "announceGameStatus", label: "Annuncia stato partita" },
                {
                  key: "keyboardNavigationEnabled",
                  label: "Navigazione tastiera",
                },
                { key: "soundEffectsEnabled", label: "Effetti sonori" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "#a0a0a0",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      settings[key as keyof BlindModeSettings] as boolean
                    }
                    onChange={(e) =>
                      handleSettingChange(
                        key as keyof BlindModeSettings,
                        e.target.checked,
                      )
                    }
                    style={{
                      marginRight: "0.5rem",
                      transform: "scale(1.2)",
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Command Interface */}
          <div>
            <h3 style={{ color: "#8b5cf6", marginBottom: "1.5rem" }}>
              🎤 Interfaccia Comandi
            </h3>

            {/* Command Input */}
            <form
              onSubmit={handleCommandSubmit}
              style={{ marginBottom: "1.5rem" }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Inserisci comando o mossa (es: e4, l, p, help)"
                  style={{
                    flex: 1,
                    padding: "1rem",
                    backgroundColor: "#2d3142",
                    color: "white",
                    border: "2px solid #444",
                    borderRadius: "8px",
                    fontSize: "1rem",
                  }}
                  aria-label="Campo inserimento comandi"
                  autoFocus={isBlindModeActive}
                />
                <button
                  type="submit"
                  style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                  aria-label="Esegui comando"
                >
                  ➤
                </button>
              </div>
            </form>

            {/* Quick Commands */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h4
                style={{
                  color: "#a0a0a0",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                Comandi Rapidi:
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.5rem",
                }}
              >
                {["l", "p", "s", "o", "c", "help"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleQuickCommand(cmd)}
                    style={{
                      padding: "0.5rem",
                      backgroundColor: "#374151",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#4b5563";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#374151";
                    }}
                  >
                    {cmd.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Command History */}
            <div>
              <h4
                style={{
                  color: "#a0a0a0",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                Cronologia Comandi:
              </h4>
              <div
                style={{
                  backgroundColor: "#0f0f0f",
                  padding: "1rem",
                  borderRadius: "8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  border: "1px solid #333",
                }}
                role="log"
                aria-live="polite"
                aria-label="Cronologia comandi e risposte"
              >
                {commandHistory.length === 0 ? (
                  <div style={{ color: "#666", fontStyle: "italic" }}>
                    Nessun comando eseguito
                  </div>
                ) : (
                  commandHistory.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        color: entry.startsWith(">") ? "#ffd700" : "#a0a0a0",
                        marginBottom: "0.5rem",
                        wordBreak: "break-word",
                      }}
                    >
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Commands Reference */}
        <div
          style={{
            marginTop: "2rem",
            borderTop: "2px solid #333",
            paddingTop: "2rem",
          }}
        >
          <h3 style={{ color: "#8b5cf6", marginBottom: "1.5rem" }}>
            📖 Riferimento Comandi
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {availableCommands.map((cmd) => (
              <div
                key={cmd.command}
                style={{
                  backgroundColor: "#2d3142",
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "1px solid #444",
                }}
              >
                <div
                  style={{
                    color: "#ffd700",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    fontFamily: "monospace",
                  }}
                >
                  {cmd.command.toUpperCase()}
                </div>
                <div style={{ color: "#a0a0a0", fontSize: "0.85rem" }}>
                  {cmd.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accessibility Instructions */}
        <div
          style={{
            marginTop: "2rem",
            backgroundColor: "#065f46",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "2px solid #10b981",
          }}
        >
          <h4 style={{ color: "#10b981", marginTop: 0, marginBottom: "1rem" }}>
            💡 Istruzioni Accessibilità
          </h4>
          <ul style={{ color: "#a0a0a0", margin: 0, paddingLeft: "1.5rem" }}>
            <li>
              Usa <strong>Alt + [comando]</strong> per accesso rapido (es: Alt+L
              per ultima mossa)
            </li>
            <li>
              Il campo comandi supporta sia comandi che mosse scacchistiche (e4,
              Nf3, etc.)
            </li>
            <li>
              Premi <strong>Escape</strong> per sentire l&apos;elemento corrente
              con focus
            </li>
            <li>
              Usa <strong>H</strong>, <strong>F</strong>, <strong>E</strong> per
              navigare per intestazioni, form ed edit
            </li>
            <li>
              Tutti i comandi sono compatibili con screen reader (NVDA, JAWS,
              VoiceOver)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BlindModePanel;
