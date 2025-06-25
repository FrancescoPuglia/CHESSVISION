// src/tests/setup.ts
import { beforeAll, vi } from 'vitest';

// Mock global APIs that might not be available in test environment
beforeAll(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock IndexedDB (used by idb-keyval)
  if (!window.indexedDB) {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn(),
        deleteDatabase: vi.fn(),
      }
    });
  }
});