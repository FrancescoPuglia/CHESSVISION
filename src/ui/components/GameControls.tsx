// src/ui/components/GameControls.tsx
import React from "react";

interface GameControlsProps {
  onToggleBoard: () => void;
  onListPieces: () => void;
  onShowHint: () => void;
  onReset: () => void;
  isBoardVisible: boolean;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onToggleBoard,
  onListPieces,
  onShowHint,
  onReset,
  isBoardVisible,
  disabled = false,
}) => {
  const buttonStyle = (color: string) => ({
    padding: "0.75rem 1.5rem",
    backgroundColor: disabled ? "#666" : color,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    transition: "all 0.3s ease",
    opacity: disabled ? 0.6 : 1,
  });

  const handleButtonClick = (callback: () => void) => {
    if (!disabled) {
      callback();
    }
  };

  return (
    <div
      className="game-controls"
      style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: "1.5rem",
      }}
    >
      <button
        onClick={() => handleButtonClick(onToggleBoard)}
        style={buttonStyle("#8b5cf6")}
        disabled={disabled}
        title="Nascondi o mostra la scacchiera (Tasto D)"
      >
        {isBoardVisible ? "Nascondi (D)" : "Mostra (D)"}
      </button>

      <button
        onClick={() => handleButtonClick(onListPieces)}
        style={buttonStyle("#ef4444")}
        disabled={disabled}
        title="Elenca tutti i pezzi sulla scacchiera (Tasto L)"
      >
        Elenca Pezzi (L)
      </button>

      <button
        onClick={() => handleButtonClick(onShowHint)}
        style={buttonStyle("#3b82f6")}
        disabled={disabled}
        title="Mostra un suggerimento per la prossima mossa (Tasto H)"
      >
        Suggerimento (H)
      </button>

      <button
        onClick={() => handleButtonClick(onReset)}
        style={buttonStyle("#10b981")}
        disabled={disabled}
        title="Ricomincia la partita (Tasto R)"
      >
        Ricomincia (R)
      </button>
    </div>
  );
};
