// src/services/storage/StorageService.ts
import { get, set, del, clear } from 'idb-keyval';
import { UserStats } from '@core/chess/types';
import { StatsStore } from '@core/stats/StatsStore';

export interface StorageData {
  version: number;
  stats: UserStats;
  settings: UserSettings;
  studies: SavedStudy[];
}

export interface UserSettings {
  language: 'it' | 'en';
  soundEnabled: boolean;
  voiceEnabled: boolean;
  autoNext: boolean;
  theme: 'dark' | 'light';
}

export interface SavedStudy {
  id: string;
  title: string;
  pgn: string;
  lastPlayed?: string;
  progress?: number;
}

const STORAGE_VERSION = 1;
const STORAGE_KEY = 'blindfold-chess-data';

export class StorageService {
  /**
   * Initialize storage and run migrations if needed
   */
  async initialize(): Promise<void> {
    const data = await this.load();
    
    if (!data) {
      // First time user
      await this.save(this.createDefaultData());
      return;
    }

    // Run migrations if needed
    if (data.version < STORAGE_VERSION) {
      const migrated = await this.migrate(data);
      await this.save(migrated);
    }
  }

  /**
   * Load data from storage
   */
  async load(): Promise<StorageData | null> {
    try {
      const data = await get(STORAGE_KEY);
      if (!data) return null;
      
      // Validate data structure
      if (typeof data === 'object' && 'version' in data) {
        return data as StorageData;
      }
      
      // Try to recover from legacy localStorage
      return this.loadLegacyData();
    } catch (error) {
      console.error('Failed to load storage:', error);
      return null;
    }
  }

  /**
   * Save data to storage
   */
  async save(data: StorageData): Promise<void> {
    try {
      await set(STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save storage:', error);
      throw error;
    }
  }

  /**
   * Load stats
   */
  async loadStats(): Promise<StatsStore> {
    const data = await this.load();
    if (data?.stats) {
      return StatsStore.fromJSON(data.stats);
    }
    return new StatsStore();
  }

  /**
   * Save stats
   */
  async saveStats(stats: StatsStore): Promise<void> {
    const data = await this.load() || this.createDefaultData();
    data.stats = stats.toJSON();
    await this.save(data);
  }

  /**
   * Load settings
   */
  async loadSettings(): Promise<UserSettings> {
    const data = await this.load();
    return data?.settings || this.createDefaultSettings();
  }

  /**
   * Save settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    const data = await this.load() || this.createDefaultData();
    data.settings = settings;
    await this.save(data);
  }

  /**
   * Load studies
   */
  async loadStudies(): Promise<SavedStudy[]> {
    const data = await this.load();
    return data?.studies || [];
  }

  /**
   * Save study
   */
  async saveStudy(study: SavedStudy): Promise<void> {
    const data = await this.load() || this.createDefaultData();
    
    const existingIndex = data.studies.findIndex(s => s.id === study.id);
    if (existingIndex >= 0) {
      data.studies[existingIndex] = study;
    } else {
      data.studies.push(study);
    }
    
    await this.save(data);
  }

  /**
   * Delete study
   */
  async deleteStudy(studyId: string): Promise<void> {
    const data = await this.load();
    if (!data) return;
    
    data.studies = data.studies.filter(s => s.id !== studyId);
    await this.save(data);
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await clear();
  }

  /**
   * Create default data structure
   */
  private createDefaultData(): StorageData {
    return {
      version: STORAGE_VERSION,
      stats: new StatsStore().toJSON(),
      settings: this.createDefaultSettings(),
      studies: []
    };
  }

  /**
   * Create default settings
   */
  private createDefaultSettings(): UserSettings {
    return {
      language: 'it',
      soundEnabled: true,
      voiceEnabled: false,
      autoNext: false,
      theme: 'dark'
    };
  }

  /**
   * Load legacy data from localStorage
   */
  private loadLegacyData(): StorageData | null {
    try {
      const statsJson = localStorage.getItem('blindfoldStats');
      if (!statsJson) return null;

      const legacyStats = JSON.parse(statsJson);
      
      // Convert legacy format to new format
      const data = this.createDefaultData();
      
      // Map legacy stats
      if (legacyStats.completed !== undefined) {
        data.stats.aggregates.studiesCompleted = legacyStats.completed;
      }
      if (legacyStats.streak !== undefined) {
        data.stats.aggregates.currentStreak = legacyStats.streak;
      }
      
      // Clear legacy storage
      localStorage.removeItem('blindfoldStats');
      
      return data;
    } catch (error) {
      console.error('Failed to load legacy data:', error);
      return null;
    }
  }

  /**
   * Migrate data to current version
   */
  private async migrate(data: StorageData): Promise<StorageData> {
    let migrated = { ...data };

    // Version 0 -> 1: Add studies array
    if (migrated.version < 1) {
      migrated.studies = migrated.studies || [];
      migrated.version = 1;
    }

    // Future migrations go here
    // if (migrated.version < 2) { ... }

    return migrated;
  }
}
