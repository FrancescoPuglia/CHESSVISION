// src/services/PrecisionTimer.ts
/* eslint-disable no-unused-vars */
/**
 * Enterprise-grade precision timer service
 * Uses Web Workers to eliminate main thread interference
 * Provides sub-millisecond accuracy and comprehensive state management
 */

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number;
  remaining: number;
  totalDuration: number;
  progress: number;
  startTime?: number;
  pausedAt?: number;
}

export interface TimerConfig {
  duration: number; // in seconds
  onTick?: (state: TimerState) => void;
  onComplete?: (state: TimerState) => void;
  onError?: (error: string) => void;
  onPause?: (state: TimerState) => void;
  onResume?: (state: TimerState) => void;
  precision?: number; // Update frequency in ms (default: 16ms for 60fps)
}

export class PrecisionTimer {
  private worker: Worker | null = null;
  private config: TimerConfig;
  private state: TimerState;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeat = 0;

  constructor(config: TimerConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      isPaused: false,
      elapsed: 0,
      remaining: config.duration * 1000,
      totalDuration: config.duration * 1000,
      progress: 0,
    };

    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker("/timer-worker.js");
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Set up heartbeat monitoring
      this.startHeartbeatMonitoring();
    } catch (error) {
      this.handleError(`Failed to initialize timer worker: ${error}`);
    }
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { type, ...data } = e.data;

    switch (type) {
      case "tick":
        this.updateState({
          elapsed: data.elapsed,
          remaining: data.remaining,
          progress: data.progress,
        });
        this.config.onTick?.(this.state);
        break;

      case "complete":
        this.updateState({
          isRunning: false,
          elapsed: data.elapsed,
          remaining: 0,
          progress: 1,
        });
        this.config.onComplete?.(this.state);
        break;

      case "started":
        this.updateState({
          isRunning: true,
          isPaused: false,
          startTime: data.startTime,
        });
        break;

      case "paused":
        this.updateState({
          isRunning: false,
          isPaused: true,
          elapsed: data.elapsed,
          remaining: data.remaining,
          pausedAt: data.timestamp,
        });
        this.config.onPause?.(this.state);
        break;

      case "resumed":
        this.updateState({
          isRunning: true,
          isPaused: false,
          pausedAt: undefined,
        });
        this.config.onResume?.(this.state);
        break;

      case "stopped":
      case "reset":
        this.updateState({
          isRunning: false,
          isPaused: false,
          elapsed: 0,
          remaining: this.config.duration * 1000,
          progress: 0,
          startTime: undefined,
          pausedAt: undefined,
        });
        break;

      case "status":
        this.updateState({
          isRunning: data.isRunning,
          elapsed: data.elapsed,
          remaining: data.remaining,
          progress: data.progress,
        });
        break;

      case "heartbeat":
        this.lastHeartbeat = performance.now();
        break;

      case "error":
        this.handleError(data.message);
        break;

      default:
        console.warn(`Unknown timer message type: ${type}`);
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    this.handleError(`Timer worker error: ${error.message}`);
  }

  private handleError(message: string): void {
    console.error("PrecisionTimer error:", message);
    this.config.onError?.(message);
  }

  private updateState(updates: Partial<TimerState>): void {
    this.state = { ...this.state, ...updates };
  }

  private startHeartbeatMonitoring(): void {
    this.lastHeartbeat = performance.now();

    this.heartbeatTimeout = setInterval(() => {
      const now = performance.now();
      const timeSinceHeartbeat = now - this.lastHeartbeat;

      // If no heartbeat for 10 seconds and timer is running, something's wrong
      if (timeSinceHeartbeat > 10000 && this.state.isRunning) {
        this.handleError("Timer worker appears to be unresponsive");
        this.stop(); // Safety stop
      }
    }, 5000);
  }

  private sendWorkerMessage(type: string, data?: any): void {
    if (!this.worker) {
      this.handleError("Timer worker not available");
      return;
    }

    try {
      this.worker.postMessage({ type, data });
    } catch (error) {
      this.handleError(`Failed to send message to worker: ${error}`);
    }
  }

  // Public API

  start(): void {
    if (this.state.isRunning) {
      console.warn("Timer already running");
      return;
    }

    this.sendWorkerMessage("start", {
      duration: this.config.duration,
    });
  }

  pause(): void {
    if (!this.state.isRunning) {
      console.warn("Timer not running");
      return;
    }

    this.sendWorkerMessage("pause");
  }

  resume(): void {
    if (!this.state.isPaused) {
      console.warn("Timer not paused");
      return;
    }

    this.sendWorkerMessage("resume", {
      elapsed: this.state.elapsed,
    });
  }

  stop(): void {
    this.sendWorkerMessage("stop");
  }

  reset(): void {
    this.sendWorkerMessage("reset");
  }

  getState(): TimerState {
    return { ...this.state };
  }

  async getStatus(): Promise<TimerState> {
    return new Promise((resolve) => {
      const originalOnTick = this.config.onTick;

      // Temporarily override onTick to capture status
      this.config.onTick = (state) => {
        this.config.onTick = originalOnTick; // Restore original
        resolve(state);
      };

      this.sendWorkerMessage("getStatus");

      // Fallback timeout
      setTimeout(() => {
        this.config.onTick = originalOnTick;
        resolve(this.state);
      }, 1000);
    });
  }

  updateDuration(newDuration: number): void {
    const wasRunning = this.state.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config.duration = newDuration;
    this.updateState({
      totalDuration: newDuration * 1000,
      remaining: newDuration * 1000,
    });

    if (wasRunning) {
      // Restart with new duration
      setTimeout(() => this.start(), 100);
    }
  }

  addTime(seconds: number): void {
    const newDuration = this.config.duration + seconds;
    this.updateDuration(newDuration);
  }

  subtractTime(seconds: number): void {
    const newDuration = Math.max(1, this.config.duration - seconds);
    this.updateDuration(newDuration);
  }

  // Calculate accuracy metrics
  getAccuracyMetrics(): {
    driftPerMinute: number;
    totalDrift: number;
    accuracy: number;
  } {
    const expectedElapsed = this.state.totalDuration - this.state.remaining;
    const actualElapsed = this.state.elapsed;
    const drift = Math.abs(expectedElapsed - actualElapsed);

    const driftPerMinute = drift / (actualElapsed / 60000) || 0;
    const accuracy = Math.max(0, 100 - (drift / expectedElapsed) * 100);

    return {
      driftPerMinute: Math.round(driftPerMinute * 100) / 100,
      totalDrift: Math.round(drift),
      accuracy: Math.round(accuracy * 100) / 100,
    };
  }

  // Format time for display
  formatTime(milliseconds?: number): string {
    const ms = milliseconds ?? this.state.remaining;
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // Cleanup
  destroy(): void {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Factory function for easy timer creation
export function createPrecisionTimer(config: TimerConfig): PrecisionTimer {
  return new PrecisionTimer(config);
}

// High-level timer hook for React components
export function useTimerState(timer: PrecisionTimer | null) {
  if (!timer) return null;
  return timer.getState();
}
