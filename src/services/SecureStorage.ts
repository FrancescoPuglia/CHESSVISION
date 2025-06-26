// src/services/SecureStorage.ts
/* eslint-disable no-unused-vars */
/**
 * Enterprise Secure Storage Service
 * GDPR-compliant, encrypted, with automatic cleanup and migration support
 */

import {
  encryptData,
  decryptData,
  generateEncryptionKey,
} from "../utils/security";

export interface StorageConfig {
  dbName: string;
  version: number;
  encryptSensitiveData: boolean;
  maxAge: number; // milliseconds
  compressionEnabled: boolean;
  backupEnabled: boolean;
}

export interface StorageItem<T = any> {
  id: string;
  data: T;
  metadata: {
    created: number;
    updated: number;
    accessed: number;
    expires?: number;
    encrypted: boolean;
    compressed: boolean;
    size: number;
    checksum: string;
  };
}

export interface StorageStats {
  totalItems: number;
  totalSize: number;
  encryptedItems: number;
  expiredItems: number;
  lastCleanup: number;
  dbVersion: number;
}

/**
 * Enterprise-grade secure storage with IndexedDB
 * Features: encryption, compression, GDPR compliance, automatic cleanup
 */
export class SecureStorage {
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;
  protected config: StorageConfig;
  private isInitialized = false;
  private cleanupInterval: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      dbName: "ChessVisionSecure",
      version: 1,
      encryptSensitiveData: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      compressionEnabled: true,
      backupEnabled: true,
      ...config,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Generate encryption key
      if (this.config.encryptSensitiveData) {
        this.encryptionKey = await this.getOrCreateEncryptionKey();
      }

      // Open IndexedDB
      await this.openDatabase();

      // Start automatic cleanup
      this.startCleanupScheduler();

      this.isInitialized = true;
      console.log("SecureStorage initialized successfully");
    } catch (error) {
      console.error("SecureStorage initialization failed:", error);
      throw error;
    }
  }

  private async getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const keyId = "storage_encryption_key_v1";

    // Try to load existing key from IndexedDB (if available)
    try {
      const existingKey = await this.loadEncryptionKey(keyId);
      if (existingKey) return existingKey;
    } catch (error) {
      console.warn(
        "Could not load existing encryption key, generating new one",
      );
    }

    // Generate new key
    const newKey = await generateEncryptionKey();

    // Store key for future use (this is a simplified approach)
    // In production, you might use more sophisticated key management
    try {
      await this.storeEncryptionKey(keyId, newKey);
    } catch (error) {
      console.warn("Could not store encryption key:", error);
    }

    return newKey;
  }

  private async loadEncryptionKey(keyId: string): Promise<CryptoKey | null> {
    // Simplified key loading - in production use proper key derivation
    const stored = localStorage.getItem(keyId);
    if (!stored) return null;

    try {
      const keyData = JSON.parse(stored);
      return await crypto.subtle.importKey(
        "jwk",
        keyData,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"],
      );
    } catch {
      return null;
    }
  }

  private async storeEncryptionKey(
    keyId: string,
    key: CryptoKey,
  ): Promise<void> {
    try {
      const exported = await crypto.subtle.exportKey("jwk", key);
      localStorage.setItem(keyId, JSON.stringify(exported));
    } catch (error) {
      console.error("Failed to store encryption key:", error);
    }
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("storage")) {
          const store = db.createObjectStore("storage", { keyPath: "id" });
          store.createIndex("created", "metadata.created", { unique: false });
          store.createIndex("expires", "metadata.expires", { unique: false });
          store.createIndex("encrypted", "metadata.encrypted", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionStore.createIndex("created", "metadata.created", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("statistics")) {
          db.createObjectStore("statistics", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("backup")) {
          db.createObjectStore("backup", { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Store data securely with optional encryption
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      encrypt?: boolean;
      expires?: number;
      sensitive?: boolean;
    } = {},
  ): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    const shouldEncrypt =
      options.encrypt ??
      (options.sensitive && this.config.encryptSensitiveData);

    let processedData: any = data;
    let compressed = false;
    let encrypted = false;

    // Serialize data
    const serialized = JSON.stringify(data);

    // Compress if enabled and data is large
    if (this.config.compressionEnabled && serialized.length > 1024) {
      processedData = await this.compress(serialized);
      compressed = true;
    } else {
      processedData = serialized;
    }

    // Encrypt if required
    if (shouldEncrypt && this.encryptionKey) {
      processedData = await encryptData(processedData, this.encryptionKey);
      encrypted = true;
    }

    // Calculate checksum
    const checksum = await this.calculateChecksum(processedData);

    const now = Date.now();
    const item: StorageItem<string> = {
      id: key,
      data: processedData,
      metadata: {
        created: now,
        updated: now,
        accessed: now,
        expires: options.expires ? now + options.expires : undefined,
        encrypted,
        compressed,
        size: new Blob([processedData]).size,
        checksum,
      },
    };

    await this.performTransaction("storage", "readwrite", (store) => {
      return store.put(item);
    });
  }

  /**
   * Retrieve and decrypt data
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    const item = (await this.performTransaction(
      "storage",
      "readonly",
      (store) => {
        return store.get(key);
      },
    )) as StorageItem<string> | undefined;

    if (!item) return null;

    // Check expiration
    if (item.metadata.expires && Date.now() > item.metadata.expires) {
      await this.delete(key); // Clean up expired item
      return null;
    }

    // Update access time
    item.metadata.accessed = Date.now();
    await this.performTransaction("storage", "readwrite", (store) => {
      return store.put(item);
    });

    let processedData = item.data;

    // Decrypt if encrypted
    if (item.metadata.encrypted && this.encryptionKey) {
      try {
        processedData = await decryptData(processedData, this.encryptionKey);
      } catch (error) {
        console.error("Failed to decrypt data:", error);
        return null;
      }
    }

    // Decompress if compressed
    if (item.metadata.compressed) {
      processedData = await this.decompress(processedData);
    }

    // Verify checksum
    const calculatedChecksum = await this.calculateChecksum(item.data);
    if (calculatedChecksum !== item.metadata.checksum) {
      console.warn("Data integrity check failed for key:", key);
      // Optionally delete corrupted data
      // await this.delete(key);
      // return null;
    }

    try {
      return JSON.parse(processedData);
    } catch (error) {
      console.error("Failed to parse stored data:", error);
      return null;
    }
  }

  /**
   * Delete item
   */
  async delete(key: string): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    return this.performTransaction("storage", "readwrite", (store) => {
      return store.delete(key);
    });
  }

  /**
   * List all keys
   */
  async keys(): Promise<string[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    return this.performTransaction("storage", "readonly", (store) => {
      return store.getAllKeys();
    }) as Promise<string[]>;
  }

  /**
   * Clear all data (GDPR compliance)
   */
  async clear(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    return this.performTransaction("storage", "readwrite", (store) => {
      return store.clear();
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    const allItems = (await this.performTransaction(
      "storage",
      "readonly",
      (store) => {
        return store.getAll();
      },
    )) as StorageItem[];

    const now = Date.now();
    let totalSize = 0;
    let encryptedItems = 0;
    let expiredItems = 0;

    allItems.forEach((item) => {
      totalSize += item.metadata.size;
      if (item.metadata.encrypted) encryptedItems++;
      if (item.metadata.expires && now > item.metadata.expires) expiredItems++;
    });

    const lastCleanupKey = "last_cleanup_timestamp";
    const lastCleanup = (await this.get<number>(lastCleanupKey)) || 0;

    return {
      totalItems: allItems.length,
      totalSize,
      encryptedItems,
      expiredItems,
      lastCleanup,
      dbVersion: this.config.version,
    };
  }

  /**
   * Cleanup expired items and optimize storage
   */
  async cleanup(): Promise<{ itemsRemoved: number; bytesFreed: number }> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    const allItems = (await this.performTransaction(
      "storage",
      "readonly",
      (store) => {
        return store.getAll();
      },
    )) as StorageItem[];

    const now = Date.now();
    let itemsRemoved = 0;
    let bytesFreed = 0;

    const expiredKeys: string[] = [];

    allItems.forEach((item) => {
      if (item.metadata.expires && now > item.metadata.expires) {
        expiredKeys.push(item.id);
        bytesFreed += item.metadata.size;
      }
    });

    // Remove expired items
    for (const key of expiredKeys) {
      await this.delete(key);
      itemsRemoved++;
    }

    // Update last cleanup timestamp
    await this.set("last_cleanup_timestamp", now);

    console.log(
      `Cleanup completed: ${itemsRemoved} items removed, ${bytesFreed} bytes freed`,
    );

    return { itemsRemoved, bytesFreed };
  }

  /**
   * Export data for backup (GDPR compliance)
   */
  async exportData(): Promise<{ [key: string]: any }> {
    if (!this.isInitialized || !this.db) {
      throw new Error("SecureStorage not initialized");
    }

    const keys = await this.keys();
    const exported: { [key: string]: any } = {};

    for (const key of keys) {
      if (!key.startsWith("__system_")) {
        // Skip system keys
        const data = await this.get(key);
        if (data !== null) {
          exported[key] = data;
        }
      }
    }

    return exported;
  }

  /**
   * Import data from backup
   */
  async importData(
    data: { [key: string]: any },
    overwrite = false,
  ): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      if (!overwrite) {
        const existing = await this.get(key);
        if (existing !== null) continue; // Skip existing items
      }

      await this.set(key, value);
    }
  }

  /**
   * Private helper methods
   */

  private performTransaction<T>(
    storeName: string,
    mode: "readonly" | "readwrite" | "versionchange",
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not available"));
        return;
      }

      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async compress(data: string): Promise<string> {
    // Simple compression using built-in compression
    // In production, use a proper compression library
    try {
      const compressed = await new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(data));
            controller.close();
          },
        }).pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer();

      return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    } catch {
      return data; // Fallback to uncompressed
    }
  }

  private async decompress(compressedData: string): Promise<string> {
    try {
      const compressed = new Uint8Array(
        atob(compressedData)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );

      const decompressed = await new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(compressed);
            controller.close();
          },
        }).pipeThrough(new DecompressionStream("gzip")),
      ).text();

      return decompressed;
    } catch {
      return compressedData; // Fallback to treat as uncompressed
    }
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup().catch((error) => {
          console.error("Scheduled cleanup failed:", error);
        });
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Close database and cleanup
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.isInitialized = false;
  }

  /**
   * GDPR compliance methods
   */

  async deleteUserData(userId: string): Promise<void> {
    const keys = await this.keys();
    const userKeys = keys.filter((key) => key.includes(userId));

    for (const key of userKeys) {
      await this.delete(key);
    }
  }

  async getDataSize(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalSize;
  }

  async isDataExpired(key: string): Promise<boolean> {
    const item = (await this.performTransaction(
      "storage",
      "readonly",
      (store) => {
        return store.get(key);
      },
    )) as StorageItem | undefined;

    if (!item || !item.metadata.expires) return false;
    return Date.now() > item.metadata.expires;
  }
}

// Factory function
export function createSecureStorage(
  config?: Partial<StorageConfig>,
): SecureStorage {
  return new SecureStorage(config);
}

// High-level storage interface for common operations
export class ChessVisionStorage extends SecureStorage {
  // Study-specific methods
  async saveStudy(id: string, study: any): Promise<void> {
    return this.set(`study_${id}`, study, {
      sensitive: false,
      expires: this.config.maxAge,
    });
  }

  async getStudy(id: string): Promise<any> {
    return this.get(`study_${id}`);
  }

  // Progress tracking
  async saveProgress(userId: string, progress: any): Promise<void> {
    return this.set(`progress_${userId}`, progress, {
      sensitive: true,
      encrypt: true,
      expires: this.config.maxAge,
    });
  }

  async getProgress(userId: string): Promise<any> {
    return this.get(`progress_${userId}`);
  }

  // Session data
  async saveSession(sessionId: string, session: any): Promise<void> {
    return this.set(`session_${sessionId}`, session, {
      expires: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  async getSession(sessionId: string): Promise<any> {
    return this.get(`session_${sessionId}`);
  }

  // Settings
  async saveSettings(settings: any): Promise<void> {
    return this.set("user_settings", settings, { sensitive: false });
  }

  async getSettings(): Promise<any> {
    return this.get("user_settings");
  }
}
