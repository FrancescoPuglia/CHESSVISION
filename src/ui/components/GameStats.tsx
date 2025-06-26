// src/ui/components/GameStats.tsx
import React from "react";

interface GameStatsProps {
  precision: number;
  completed: number;
  series: number;
  movesPlayed?: number;
  timeElapsed?: number;
  className?: string;
}

export const GameStats: React.FC<GameStatsProps> = ({
  precision,
  completed,
  series,
  movesPlayed = 0,
  timeElapsed = 0,
  className = "",
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }> = ({ title, value, subtitle, color = "#ffd700" }) => (
    <div
      style={{
        backgroundColor: "#2d3142",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "1rem",
        border: "1px solid #3d4251",
        transition: "all 0.3s ease",
      }}
    >
      <h3
        style={{
          fontSize: "2rem",
          color,
          marginBottom: "0.5rem",
          fontWeight: "bold",
        }}
      >
        {value}
      </h3>
      <p
        style={{
          color: "#a0a0a0",
          fontSize: "0.9rem",
          marginBottom: subtitle ? "0.2rem" : "0",
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            color: "#8a8a8a",
            fontSize: "0.8rem",
            fontStyle: "italic",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className={`game-stats ${className}`}>
      <h2
        style={{
          color: "#ffd700",
          marginBottom: "1rem",
          fontSize: "1.5rem",
          fontWeight: "bold",
        }}
      >
        Statistiche
      </h2>

      <StatCard
        title="Precisione"
        value={`${precision}%`}
        subtitle={
          precision >= 80
            ? "Eccellente!"
            : precision >= 60
              ? "Buono"
              : "Puoi migliorare"
        }
        color={
          precision >= 80 ? "#10b981" : precision >= 60 ? "#ffd700" : "#ef4444"
        }
      />

      <StatCard
        title="Studi Completati"
        value={completed}
        subtitle={
          completed > 0
            ? `${completed} ${completed === 1 ? "studio" : "studi"}`
            : undefined
        }
      />

      <StatCard
        title="Serie Attuale"
        value={series}
        subtitle={
          series > 5
            ? "In fiamme! 🔥"
            : series > 0
              ? "Continua così!"
              : undefined
        }
        color={series > 5 ? "#ef4444" : "#ffd700"}
      />

      {movesPlayed > 0 && (
        <StatCard
          title="Mosse Giocate"
          value={movesPlayed}
          subtitle="Questa sessione"
          color="#8b5cf6"
        />
      )}

      {timeElapsed > 0 && (
        <StatCard
          title="Tempo"
          value={formatTime(timeElapsed)}
          subtitle="Sessione corrente"
          color="#3b82f6"
        />
      )}
    </div>
  );
};
