import { z } from 'zod';
import { Quest, QuestSchema } from './quest';
import { UserSettings, UserSettingsSchema, createDefaultSettings } from './settings';
import { OptimizedPlan, OptimizedPlanSchema } from './plan';

// Storage version for data migration
const STORAGE_VERSION = '1.0.0';

// Storage keys
const STORAGE_KEYS = {
  QUESTS: 'questflow_quests',
  SETTINGS: 'questflow_settings',
  PLANS: 'questflow_plans',
  VERSION: 'questflow_version',
} as const;

// Storage data schemas for validation
const StoredQuestsSchema = z.array(QuestSchema);
const StoredPlansSchema = z.array(OptimizedPlanSchema);

// Storage error types
export class StorageError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageQuotaError extends StorageError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class StorageCorruptionError extends StorageError {
  constructor(message: string = 'Stored data is corrupted') {
    super(message);
    this.name = 'StorageCorruptionError';
  }
}

// Storage manager interface
export interface IStorageManager {
  saveQuests(quests: Quest[]): Promise<void>;
  loadQuests(): Promise<Quest[]>;
  saveSettings(settings: UserSettings): Promise<void>;
  loadSettings(): Promise<UserSettings>;
  savePlan(plan: OptimizedPlan): Promise<void>;
  savePlans(plans: OptimizedPlan[]): Promise<void>;
  loadPlans(): Promise<OptimizedPlan[]>;
  clearData(): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
}

export interface StorageInfo {
  version: string;
  totalSize: number;
  questsSize: number;
  settingsSize: number;
  plansSize: number;
  available: boolean;
}

// Main storage manager implementation
export class StorageManager implements IStorageManager {
  private readonly maxStorageSize = 1024 * 1024; // 1MB limit

  constructor(private storage?: Storage) {
    // Handle SSR by checking if we're in a browser environment
    if (typeof window !== 'undefined' && !storage) {
      this.storage = localStorage;
    }
  }

  /**
   * Check if storage is available (handles SSR)
   */
  private isStorageReady(): boolean {
    return !!this.storage;
  }

  /**
   * Save quests to local storage with validation and error handling
   */
  async saveQuests(quests: Quest[]): Promise<void> {
    if (!this.isStorageReady()) {
      return;
    }

    try {
      // Validate quests array
      const validatedQuests = StoredQuestsSchema.parse(quests);
      
      // Serialize and check size
      const serialized = JSON.stringify(validatedQuests);
      await this.checkStorageQuota(STORAGE_KEYS.QUESTS, serialized);
      
      // Save to storage
      this.storage.setItem(STORAGE_KEYS.QUESTS, serialized);
      await this.updateVersion();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new StorageCorruptionError(`Invalid quest data: ${error.message}`);
      }
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageQuotaError('Storage quota exceeded while saving quests');
      }
      throw new StorageError('Failed to save quests', error as Error);
    }
  }

  /**
   * Load quests from local storage with validation and fallback
   */
  async loadQuests(): Promise<Quest[]> {
    if (!this.storage) {
      return [];
    }

    try {
      const stored = this.storage.getItem(STORAGE_KEYS.QUESTS);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      
      // Transform date strings back to Date objects if the data is an array
      if (Array.isArray(parsed)) {
        const transformedQuests = parsed.map((quest: Record<string, unknown>) => ({
          ...quest,
          createdAt: quest.createdAt ? new Date(quest.createdAt) : quest.createdAt,
          updatedAt: quest.updatedAt ? new Date(quest.updatedAt) : quest.updatedAt,
        }));
        
        return StoredQuestsSchema.parse(transformedQuests);
      } else {
        // If it's not an array, let validation catch it
        return StoredQuestsSchema.parse(parsed);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageCorruptionError('Quest data is not valid JSON');
      }
      if (error instanceof z.ZodError) {
        throw new StorageCorruptionError(`Quest data validation failed: ${error.message}`);
      }
      throw new StorageError('Failed to load quests', error as Error);
    }
  }

  /**
   * Save user settings to local storage
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      // Validate settings
      const validatedSettings = UserSettingsSchema.parse(settings);
      
      // Serialize and check size
      const serialized = JSON.stringify(validatedSettings);
      await this.checkStorageQuota(STORAGE_KEYS.SETTINGS, serialized);
      
      // Save to storage
      this.storage.setItem(STORAGE_KEYS.SETTINGS, serialized);
      await this.updateVersion();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new StorageCorruptionError(`Invalid settings data: ${error.message}`);
      }
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageQuotaError('Storage quota exceeded while saving settings');
      }
      throw new StorageError('Failed to save settings', error as Error);
    }
  }

  /**
   * Load user settings from local storage with fallback to defaults
   */
  async loadSettings(): Promise<UserSettings> {
    try {
      const stored = this.storage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) {
        return createDefaultSettings();
      }

      const parsed = JSON.parse(stored);
      return UserSettingsSchema.parse(parsed);
    } catch (error) {
      // Return defaults if settings are corrupted
      console.warn('Settings corrupted, using defaults:', error);
      return createDefaultSettings();
    }
  }

  /**
   * Save a single plan to local storage (convenience method)
   */
  async savePlan(plan: OptimizedPlan): Promise<void> {
    try {
      const existingPlans = await this.loadPlans();
      
      // Replace existing plan with same ID or add new one
      const updatedPlans = existingPlans.filter(p => p.id !== plan.id);
      updatedPlans.push(plan);
      
      // Keep only the most recent 10 plans to avoid storage bloat
      const sortedPlans = updatedPlans
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 10);
      
      await this.savePlans(sortedPlans);
    } catch (error) {
      throw new StorageError('Failed to save plan', error as Error);
    }
  }

  /**
   * Save plans to local storage
   */
  async savePlans(plans: OptimizedPlan[]): Promise<void> {
    try {
      // Validate plans array
      const validatedPlans = StoredPlansSchema.parse(plans);
      
      // Serialize and check size
      const serialized = JSON.stringify(validatedPlans);
      await this.checkStorageQuota(STORAGE_KEYS.PLANS, serialized);
      
      // Save to storage
      this.storage.setItem(STORAGE_KEYS.PLANS, serialized);
      await this.updateVersion();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new StorageCorruptionError(`Invalid plan data: ${error.message}`);
      }
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageQuotaError('Storage quota exceeded while saving plans');
      }
      throw new StorageError('Failed to save plans', error as Error);
    }
  }

  /**
   * Load plans from local storage
   */
  async loadPlans(): Promise<OptimizedPlan[]> {
    try {
      const stored = this.storage.getItem(STORAGE_KEYS.PLANS);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      
      // Transform date strings back to Date objects if the data is an array
      if (Array.isArray(parsed)) {
        const transformedPlans = parsed.map((plan: Record<string, unknown>) => ({
          ...plan,
          createdAt: plan.createdAt ? new Date(plan.createdAt) : plan.createdAt,
          updatedAt: plan.updatedAt ? new Date(plan.updatedAt) : plan.updatedAt,
        }));
        
        return StoredPlansSchema.parse(transformedPlans);
      } else {
        // If it's not an array, let validation catch it
        return StoredPlansSchema.parse(parsed);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageCorruptionError('Plan data is not valid JSON');
      }
      if (error instanceof z.ZodError) {
        throw new StorageCorruptionError(`Plan data validation failed: ${error.message}`);
      }
      throw new StorageError('Failed to load plans', error as Error);
    }
  }

  /**
   * Clear all stored data
   */
  async clearData(): Promise<void> {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        this.storage.removeItem(key);
      });
    } catch (error) {
      throw new StorageError('Failed to clear data', error as Error);
    }
  }

  /**
   * Get storage information and usage statistics
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const version = this.storage.getItem(STORAGE_KEYS.VERSION) || '0.0.0';
      
      const questsData = this.storage.getItem(STORAGE_KEYS.QUESTS) || '';
      const settingsData = this.storage.getItem(STORAGE_KEYS.SETTINGS) || '';
      const plansData = this.storage.getItem(STORAGE_KEYS.PLANS) || '';
      
      const questsSize = new Blob([questsData]).size;
      const settingsSize = new Blob([settingsData]).size;
      const plansSize = new Blob([plansData]).size;
      const totalSize = questsSize + settingsSize + plansSize;

      return {
        version,
        totalSize,
        questsSize,
        settingsSize,
        plansSize,
        available: this.isStorageAvailable(),
      };
    } catch (error) {
      throw new StorageError('Failed to get storage info', error as Error);
    }
  }

  /**
   * Check if storage quota would be exceeded
   */
  private async checkStorageQuota(key: string, data: string): Promise<void> {
    try {
      const currentSize = await this.getCurrentStorageSize();
      const existingItemSize = new Blob([this.storage.getItem(key) || '']).size;
      const newItemSize = new Blob([data]).size;
      const projectedSize = currentSize - existingItemSize + newItemSize;

      if (projectedSize > this.maxStorageSize) {
        throw new StorageQuotaError(
          `Storage quota would be exceeded. Current: ${currentSize}, Projected: ${projectedSize}, Limit: ${this.maxStorageSize}`
        );
      }
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        throw error;
      }
      // If we can't check quota, try to save anyway (unless it's a test scenario)
      if (error instanceof Error && error.message.includes('Storage unavailable')) {
        throw new StorageError('Storage unavailable', error);
      }
      console.warn('Could not check storage quota:', error);
    }
  }

  /**
   * Calculate current storage usage
   */
  private async getCurrentStorageSize(): Promise<number> {
    let totalSize = 0;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = this.storage.getItem(key);
      if (item) {
        totalSize += new Blob([item]).size;
      }
    });

    return totalSize;
  }

  /**
   * Update storage version
   */
  private async updateVersion(): Promise<void> {
    this.storage.setItem(STORAGE_KEYS.VERSION, STORAGE_VERSION);
  }

  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      this.storage.setItem(test, test);
      this.storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Data migration utilities
export class StorageMigrator {
  constructor(private storageManager: StorageManager) {}

  /**
   * Migrate data from older versions if needed
   */
  async migrateIfNeeded(): Promise<boolean> {
    try {
      const info = await this.storageManager.getStorageInfo();
      const currentVersion = info.version;

      if (currentVersion === STORAGE_VERSION) {
        return false; // No migration needed
      }

      // Future migration logic would go here
      // For now, we're at version 1.0.0, so no migrations exist yet
      
      return false;
    } catch (error) {
      console.warn('Migration check failed:', error);
      return false;
    }
  }
}

// Factory function for creating storage manager
export function createStorageManager(storage?: Storage): StorageManager {
  return new StorageManager(storage);
}

// Export storage constants for testing
export { STORAGE_KEYS, STORAGE_VERSION };