// public/timer-worker.js
/**
 * High-precision timer Web Worker
 * Eliminates drift issues with main thread setInterval
 * Provides sub-millisecond accuracy using performance.now()
 */

let timerId = null;
let startTime = null;
let duration = null;
let lastTick = null;
let isRunning = false;

// Precision timer using RAF-like approach in worker
function precisionTimer() {
  if (!isRunning) return;
  
  const now = performance.now();
  const elapsed = now - startTime;
  const remaining = Math.max(0, duration - elapsed);
  
  // Send update every ~16ms (60fps) or when time changes significantly
  if (!lastTick || now - lastTick >= 16 || remaining <= 0) {
    self.postMessage({
      type: 'tick',
      elapsed: Math.round(elapsed),
      remaining: Math.round(remaining),
      totalDuration: duration,
      progress: Math.min(1, elapsed / duration),
      isComplete: remaining <= 0,
      timestamp: now
    });
    
    lastTick = now;
  }
  
  // Continue if time remaining
  if (remaining > 0) {
    // Use setTimeout with small interval for precision
    timerId = setTimeout(precisionTimer, 1);
  } else {
    // Timer completed
    isRunning = false;
    self.postMessage({
      type: 'complete',
      elapsed: Math.round(duration),
      remaining: 0,
      totalDuration: duration,
      progress: 1,
      timestamp: now
    });
  }
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'start':
      if (isRunning) {
        self.postMessage({ type: 'error', message: 'Timer already running' });
        return;
      }
      
      startTime = performance.now();
      duration = data.duration * 1000; // Convert seconds to milliseconds
      isRunning = true;
      lastTick = null;
      
      self.postMessage({
        type: 'started',
        startTime,
        duration,
        timestamp: startTime
      });
      
      precisionTimer();
      break;
      
    case 'pause':
      if (!isRunning) {
        self.postMessage({ type: 'error', message: 'Timer not running' });
        return;
      }
      
      isRunning = false;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      
      const pausedAt = performance.now();
      const elapsed = pausedAt - startTime;
      
      self.postMessage({
        type: 'paused',
        elapsed: Math.round(elapsed),
        remaining: Math.round(duration - elapsed),
        timestamp: pausedAt
      });
      break;
      
    case 'resume':
      if (isRunning) {
        self.postMessage({ type: 'error', message: 'Timer already running' });
        return;
      }
      
      const resumeTime = performance.now();
      const previousElapsed = data.elapsed || 0;
      
      // Adjust start time to account for paused duration
      startTime = resumeTime - previousElapsed;
      isRunning = true;
      lastTick = null;
      
      self.postMessage({
        type: 'resumed',
        timestamp: resumeTime
      });
      
      precisionTimer();
      break;
      
    case 'stop':
      isRunning = false;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      
      const stopTime = performance.now();
      const finalElapsed = startTime ? stopTime - startTime : 0;
      
      self.postMessage({
        type: 'stopped',
        elapsed: Math.round(finalElapsed),
        timestamp: stopTime
      });
      
      // Reset state
      startTime = null;
      duration = null;
      lastTick = null;
      break;
      
    case 'reset':
      isRunning = false;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      
      startTime = null;
      duration = null;
      lastTick = null;
      
      self.postMessage({
        type: 'reset',
        timestamp: performance.now()
      });
      break;
      
    case 'getStatus':
      const now = performance.now();
      const currentElapsed = startTime ? now - startTime : 0;
      const currentRemaining = duration ? Math.max(0, duration - currentElapsed) : 0;
      
      self.postMessage({
        type: 'status',
        isRunning,
        elapsed: Math.round(currentElapsed),
        remaining: Math.round(currentRemaining),
        totalDuration: duration,
        progress: duration ? Math.min(1, currentElapsed / duration) : 0,
        timestamp: now
      });
      break;
      
    default:
      self.postMessage({
        type: 'error',
        message: `Unknown command: ${type}`
      });
  }
};

// Handle worker errors
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    message: `Worker error: ${error.message}`,
    filename: error.filename,
    lineno: error.lineno
  });
};

// Heartbeat to detect if main thread is responsive
setInterval(() => {
  if (isRunning) {
    self.postMessage({
      type: 'heartbeat',
      timestamp: performance.now()
    });
  }
}, 5000); // Every 5 seconds