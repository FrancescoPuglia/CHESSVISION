// src/ui/components/Timer.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@core/i18n/useTranslation";

interface TimerProps {
  initialMinutes?: number;
  onTimeUp?: () => void;
  onTick?: (remainingSeconds: number) => void;
  autoStart?: boolean;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({
  initialMinutes = 5,
  onTimeUp,
  onTick,
  autoStart = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && remainingSeconds > 0) {
      interval = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          const newValue = prev - 1;
          onTick?.(newValue);

          if (newValue <= 0) {
            setIsRunning(false);
            setIsExpired(true);
            onTimeUp?.();
          }

          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRunning, remainingSeconds, onTimeUp, onTick]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleStart = () => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
      setIsExpired(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setIsExpired(false);
  };

  const handleSetTime = (minutes: number) => {
    const newTotal = minutes * 60;
    setTotalSeconds(newTotal);
    setRemainingSeconds(newTotal);
    setIsRunning(false);
    setIsExpired(false);
  };

  const getTimerColor = () => {
    if (isExpired) return "#ef4444"; // Red
    if (remainingSeconds <= 30) return "#f59e0b"; // Orange
    if (remainingSeconds <= 60) return "#eab308"; // Yellow
    return "#10b981"; // Green
  };

  const getProgressPercentage = () => {
    return totalSeconds > 0
      ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
      : 0;
  };

  return (
    <div
      className={`timer-container ${className}`}
      style={{
        padding: "1.5rem",
        backgroundColor: "#2d3142",
        borderRadius: "12px",
        border: `2px solid ${getTimerColor()}`,
        textAlign: "center",
      }}
    >
      {/* Timer Display */}
      <div
        style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: getTimerColor(),
          marginBottom: "1rem",
          fontFamily: "monospace",
        }}
      >
        {formatTime(remainingSeconds)}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#3d4251",
          borderRadius: "4px",
          marginBottom: "1rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${getProgressPercentage()}%`,
            height: "100%",
            backgroundColor: getTimerColor(),
            transition: "width 1s linear",
          }}
        />
      </div>

      {/* Time Expired Message */}
      {isExpired && (
        <div
          style={{
            color: "#ef4444",
            fontWeight: "bold",
            marginBottom: "1rem",
            fontSize: "1.2rem",
          }}
        >
          ⏰ {t("timeUp")}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={remainingSeconds <= 0}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: remainingSeconds <= 0 ? "#666" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: remainingSeconds <= 0 ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            ▶️ {t("startTimer")}
          </button>
        ) : (
          <button
            onClick={handlePause}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ⏸️ {t("pauseTimer")}
          </button>
        )}

        <button
          onClick={handleReset}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          🔄 {t("resetTimer")}
        </button>
      </div>

      {/* Quick Time Selectors */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {[1, 3, 5, 10, 15].map((minutes) => (
          <button
            key={minutes}
            onClick={() => handleSetTime(minutes)}
            disabled={isRunning}
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: isRunning
                ? "#666"
                : totalSeconds === minutes * 60
                  ? "#8b5cf6"
                  : "#4b5563",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
            }}
          >
            {minutes}m
          </button>
        ))}
      </div>

      {/* Status */}
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.8rem",
          color: "#a0a0a0",
        }}
      >
        {isRunning ? "🔴 Running" : "⏸️ Paused"}
      </div>
    </div>
  );
};
