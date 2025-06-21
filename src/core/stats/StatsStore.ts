// src/core/stats/StatsStore.ts
import { z } from 'zod';
import { StudySession, UserStats } from '../chess/types';

// Zod schemas for data validation
const MoveAttemptSchema = z.object({
  san: z.string(),
  correct: z.boolean(),
  timeMs: z.number().min(0),
  hintsUsed: z.number().min(0)
});

const StudySessionSchema = z.object({
  id: z.string().uuid(),
  date: z.string().datetime(),
  studyId: z.string(),
  moves: z.array(MoveAttemptSchema),
  completed: z.boolean(),
  totalTimeMs: z.number().min(0)
});

const UserStatsSchema = z.object({
  version: z.literal(1),
  sessions: z.array(StudySessionSchema),
  aggregates: z.object({
    totalMoves: z.number().min(0),
    correctMoves: z.number().min(0),
    totalTime: z.number().min(0),
    studiesCompleted: z.number().min(0),
    currentStreak: z.number().min(0),
    lastPlayedDate: z.string().datetime().nullable()
  })
});

export class StatsStore {
  private stats: UserStats;

  constructor(initialStats?: UserStats) {
    this.stats = initialStats || this.createEmptyStats();
  }

  private createEmptyStats(): UserStats {
    return {
      version: 1,
      sessions: [],
      aggregates: {
        totalMoves: 0,
        correctMoves: 0,
        totalTime: 0,
        studiesCompleted: 0,
        currentStreak: 0,
        lastPlayedDate: null
      }
    };
  }

  /**
   * Start a new study session
   */
  startSession(studyId: string): StudySession {
    const session: StudySession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      studyId,
      moves: [],
      completed: false,
      totalTimeMs: 0
    };

    this.stats.sessions.push(session);
    this.updateStreak();
    
    return session;
  }

  /**
   * Record a move attempt
   */
  recordMove(sessionId: string, move: {
    san: string;
    correct: boolean;
    timeMs: number;
    hintsUsed: number;
  }): void {
    const session = this.stats.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.moves.push(move);
    session.totalTimeMs += move.timeMs;

    // Update aggregates
    this.stats.aggregates.totalMoves++;
    if (move.correct) {
      this.stats.aggregates.correctMoves++;
    }
    this.stats.aggregates.totalTime += move.timeMs;
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): void {
    const session = this.stats.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.completed = true;
    this.stats.aggregates.studiesCompleted++;
  }

  /**
   * Update streak based on play dates
   */
  private updateStreak(): void {
    const today = new Date().toDateString();
    const lastPlayed = this.stats.aggregates.lastPlayedDate 
      ? new Date(this.stats.aggregates.lastPlayedDate).toDateString()
      : null;

    if (lastPlayed === today) {
      // Already played today
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastPlayed === yesterdayStr) {
      // Continuing streak
      this.stats.aggregates.currentStreak++;
    } else {
      // Streak broken or first time
      this.stats.aggregates.currentStreak = 1;
    }

    this.stats.aggregates.lastPlayedDate = new Date().toISOString();
  }

  /**
   * Get current stats
   */
  getStats(): UserStats {
    return structuredClone(this.stats);
  }

  /**
   * Get accuracy percentage
   */
  getAccuracy(): number {
    if (this.stats.aggregates.totalMoves === 0) return 0;
    return Math.round(
      (this.stats.aggregates.correctMoves / this.stats.aggregates.totalMoves) * 100
    );
  }

  /**
   * Get average time per move
   */
  getAverageTime(): number {
    if (this.stats.aggregates.totalMoves === 0) return 0;
    return Math.round(this.stats.aggregates.totalTime / this.stats.aggregates.totalMoves);
  }

  /**
   * Get sessions for a specific study
   */
  getStudySessions(studyId: string): StudySession[] {
    return this.stats.sessions.filter(s => s.studyId === studyId);
  }

  /**
   * Validate and parse stats from JSON
   */
  static fromJSON(json: unknown): StatsStore {
    const validated = UserStatsSchema.parse(json);
    return new StatsStore(validated);
  }

  /**
   * Export stats to JSON
   */
  toJSON(): UserStats {
    return this.stats;
  }

  /**
   * Reset all stats
   */
  reset(): void {
    this.stats = this.createEmptyStats();
  }
}
