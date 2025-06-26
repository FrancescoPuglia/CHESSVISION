// src/ui/components/StreakCalendar.tsx
import React, { useState, useEffect } from "react";

interface StreakData {
  date: string; // YYYY-MM-DD format
  activities: string[]; // ['study', 'flashcard', 'read', 'engine']
  score: number;
}

interface StreakCalendarProps {
  className?: string;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  className = "",
}) => {
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  // Load streak data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chessvision-streak-data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStreakData(data);
        calculateStats(data);
      } catch (error) {
        console.error("Error loading streak data:", error);
      }
    }
  }, []);

  // Save streak data to localStorage
  const saveStreakData = (data: StreakData[]) => {
    localStorage.setItem("chessvision-streak-data", JSON.stringify(data));
    setStreakData(data);
    calculateStats(data);
  };

  // Calculate streak statistics
  const calculateStats = (data: StreakData[]) => {
    if (data.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      setTotalDays(0);
      return;
    }

    // Sort by date
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

    let current = 0;
    let longest = 0;
    let temp = 1;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Check if today or yesterday has activity (for current streak)
    const hasRecentActivity = sorted.some(
      (d) => d.date === today || d.date === yesterday,
    );

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        temp++;
      } else {
        longest = Math.max(longest, temp);
        temp = 1;
      }
    }
    longest = Math.max(longest, temp);

    // Current streak calculation
    if (hasRecentActivity) {
      current = 1;
      for (let i = sorted.length - 2; i >= 0; i--) {
        const prevDate = new Date(sorted[i].date);
        const nextDate = new Date(sorted[i + 1].date);
        const diffTime = Math.abs(nextDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          current++;
        } else {
          break;
        }
      }
    }

    setCurrentStreak(current);
    setLongestStreak(longest);
    setTotalDays(sorted.length);
  };

  // Record today's activity
  const recordActivity = (activity: string, score: number = 1) => {
    const today = new Date().toISOString().split("T")[0];
    const existing = streakData.find((d) => d.date === today);

    let newData: StreakData[];

    if (existing) {
      // Update existing day
      if (!existing.activities.includes(activity)) {
        existing.activities.push(activity);
      }
      existing.score += score;
      newData = streakData.map((d) => (d.date === today ? existing : d));
    } else {
      // Add new day
      const newEntry: StreakData = {
        date: today,
        activities: [activity],
        score,
      };
      newData = [...streakData, newEntry];
    }

    saveStreakData(newData);
  };

  // Get last 30 days for calendar display
  const getLast30Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const data = streakData.find((d) => d.date === dateStr);

      days.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        day: date.getDate(),
        hasActivity: !!data,
        activities: data?.activities || [],
        score: data?.score || 0,
      });
    }

    return days;
  };

  const days = getLast30Days();

  // Expose the recordActivity function globally for other components
  useEffect(() => {
    (window as any).recordChessVisionActivity = recordActivity;
    return () => {
      delete (window as any).recordChessVisionActivity;
    };
  }, [recordActivity]);

  const getActivityColor = (activities: string[], score: number) => {
    if (activities.length === 0) return "#2d3142";
    if (score >= 10) return "#10b981"; // High activity
    if (score >= 5) return "#ffd700"; // Medium activity
    return "#8b5cf6"; // Low activity
  };

  const getActivityEmoji = (activities: string[]) => {
    if (activities.includes("study")) return "🧩";
    if (activities.includes("flashcard")) return "🎴";
    if (activities.includes("read")) return "📚";
    if (activities.includes("engine")) return "🤖";
    return "✓";
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: "#2d3142",
        padding: "1.5rem",
        borderRadius: "8px",
        border: "1px solid #3d4251",
      }}
    >
      <h3
        style={{
          color: "#ffd700",
          marginBottom: "1rem",
          fontSize: "1.3rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        🔥 Streak Calendar
      </h3>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#3d4251",
            padding: "0.75rem",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <div
            style={{ color: "#ffd700", fontSize: "1.5rem", fontWeight: "bold" }}
          >
            {currentStreak}
          </div>
          <div style={{ color: "#a0a0a0", fontSize: "0.8rem" }}>
            Giorni attuali
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#3d4251",
            padding: "0.75rem",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <div
            style={{ color: "#10b981", fontSize: "1.5rem", fontWeight: "bold" }}
          >
            {longestStreak}
          </div>
          <div style={{ color: "#a0a0a0", fontSize: "0.8rem" }}>Record</div>
        </div>

        <div
          style={{
            backgroundColor: "#3d4251",
            padding: "0.75rem",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <div
            style={{ color: "#8b5cf6", fontSize: "1.5rem", fontWeight: "bold" }}
          >
            {totalDays}
          </div>
          <div style={{ color: "#a0a0a0", fontSize: "0.8rem" }}>Totale</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "1rem",
        }}
      >
        {/* Day headers */}
        {["D", "L", "M", "M", "G", "V", "S"].map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              color: "#a0a0a0",
              fontSize: "0.8rem",
              fontWeight: "bold",
              padding: "4px",
            }}
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => (
          <div
            key={day.date}
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: getActivityColor(day.activities, day.score),
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              color: day.hasActivity ? "white" : "#666",
              fontWeight: "bold",
              border:
                day.date === new Date().toISOString().split("T")[0]
                  ? "2px solid #ffd700"
                  : "none",
              position: "relative",
              cursor: "help",
            }}
            title={`${day.date}\nAttività: ${day.activities.join(", ") || "Nessuna"}\nPunteggio: ${day.score}`}
          >
            {day.hasActivity ? getActivityEmoji(day.activities) : day.day}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          fontSize: "0.75rem",
          color: "#a0a0a0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#2d3142",
              borderRadius: "2px",
            }}
          />
          <span>Nessuna</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#8b5cf6",
              borderRadius: "2px",
            }}
          />
          <span>Bassa</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#ffd700",
              borderRadius: "2px",
            }}
          />
          <span>Media</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#10b981",
              borderRadius: "2px",
            }}
          />
          <span>Alta</span>
        </div>
      </div>

      {/* Progress message */}
      {currentStreak > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "rgba(255,215,0,0.1)",
            borderRadius: "6px",
            textAlign: "center",
            color: "#ffd700",
            fontSize: "0.9rem",
          }}
        >
          🎉 Ottimo lavoro! Hai mantenuto la serie per {currentStreak} giorni
          consecutivi!
          {currentStreak >= 7 && " Sei in fiamme! 🔥"}
          {currentStreak >= 30 && " Sei un vero maestro della costanza! 👑"}
        </div>
      )}
    </div>
  );
};
