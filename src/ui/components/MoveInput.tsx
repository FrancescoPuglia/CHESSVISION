// src/ui/components/MoveInput.tsx
/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";

interface MoveInputProps {
  onMove: (move: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MoveInput: React.FC<MoveInputProps> = ({
  onMove,
  disabled = false,
  placeholder = "Inserisci la mossa (es. e4, Cf3, O-O)...",
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount for better UX
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const move = inputValue.trim();
    if (move && !disabled) {
      onMove(move);
      setInputValue(""); // Clear input after move
      // Keep focus for next move
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow common chess shortcuts
    if (e.key === "Escape") {
      setInputValue("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`move-input-form ${className}`}
      style={{ width: "100%", maxWidth: "400px" }}
    >
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.2rem",
            backgroundColor: disabled ? "#3d4251" : "#3d4251",
            border: `2px solid ${disabled ? "#555" : "#4d5261"}`,
            borderRadius: "8px",
            color: disabled ? "#888" : "#ffffff",
            textAlign: "center",
            outline: "none",
            transition: "all 0.3s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#ffd700";
            e.target.style.boxShadow = "0 0 10px rgba(255, 215, 0, 0.3)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = disabled ? "#555" : "#4d5261";
            e.target.style.boxShadow = "none";
          }}
        />
        <div
          className="input-hint"
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#a0a0a0",
            textAlign: "center",
          }}
        >
          Esempi: e4, Cf3, Axb5, O-O, O-O-O
        </div>
      </div>
    </form>
  );
};
