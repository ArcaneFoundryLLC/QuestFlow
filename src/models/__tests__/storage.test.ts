import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageManager,
  StorageMigrator,
  StorageError,
  StorageQuotaError,
  StorageCorruptionError,
  createStorageManager,
  STORAGE_KEYS,
} from '../storage';
import { Quest, QuestType, MTGAColor } from '../quest';
import { UserSettings, createDefaultSettings } from '../settings';
import { OptimizedPlan } from '../plan';
import { QueueType } from '../queue';

// Mock localStorage
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  private quota = 1024 * 1024; // 1MB
  private shouldThrowQuotaError = false;

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowQuotaError) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    
    const size = new Blob([value]).size;
    const existingSize = this.store[key] ? new Blob([this.store[key]]).size : 0;
    const totalSize = Object.values(this.store).reduce(
      (acc, val) => acc + new Blob([val]).size,
      0
    );
    
    const projectedSize = totalSize - existingSize + size;
    
    if (projectedSize > this.quota) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    
    this.store[key] = value;
  }

  // Test utilities
  setQuotaExceededMode(enabled: boolean): void {
    this.shouldThrowQuotaError = enabled;
  }

  setQuota(bytes: number): void {
    this.quota = bytes;
  }

  getCurrentSize(): number {
    return Object.values(this.store).reduce(
      (acc, val) => acc + new Blob([val]).size,
      0
    );
  }
}

// Test data factories
const createTestQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: QuestType.WIN,
  description: 'Win 5 games',
  remaining: 3,
  expiresInDays: 2,
  colors: [MTGAColor.RED, MTGAColor.BLUE],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const createTestSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  ...createDefaultSettings(),
  ...overrides,
});

const createTestPlan = (overrides: Partial<OptimizedPlan> = {}): OptimizedPlan => ({
  id: '123e4567-e89b-12d3-a456-426614174001',
  steps: [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      queue: QueueType.STANDARD_BO1,
      targetGames: 3,
      estimatedMinutes: 24,
      expectedRewards: { gold: 150, gems: 0, packs: 0 },
      questProgress: [
        {
          questId: '123e4567-e89b-12d3-a456-426614174000',
          progressAmount: 3,
        },
      ],
      completed: false,
    },
  ],
  totalEstimatedMinutes: 24,
  totalExpectedRewards: { gold: 150, gems: 0, packs: 0 },
  questsCompleted: ['123e4567-e89b-12d3-a456-426614174000'],
  timeBudget: 30,
  winRate: 0.6,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

describe('StorageManager', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('Quest Management', () => {
    it('should save and load quests successfully', async () => {
      const quests = [createTestQuest(), createTestQuest({ id: uuidv4() })];

      await storageManager.saveQuests(quests);
      const loadedQuests = await storageManager.loadQuests();

      expect(loadedQuests).toHaveLength(2);
      expect(loadedQuests[0]).toEqual(quests[0]);
      expect(loadedQuests[1]).toEqual(quests[1]);
    });

    it('should return empty array when no quests are stored', async () => {
      const quests = await storageManager.loadQuests();
      expect(quests).toEqual([]);
    });

    it('should handle empty quest array', async () => {
      await storageManager.saveQuests([]);
      const loadedQuests = await storageManager.loadQuests();
      expect(loadedQuests).toEqual([]);
    });

    it('should throw StorageCorruptionError for invalid quest data', async () => {
      // Manually corrupt the data
      mockStorage.setItem(STORAGE_KEYS.QUESTS, '{"invalid": "data"}');

      await expect(storageManager.loadQuests()).rejects.toThrow(StorageCorruptionError);
    });

    it('should throw StorageCorruptionError for malformed JSON', async () => {
      mockStorage.setItem(STORAGE_KEYS.QUESTS, 'invalid json');

      await expect(storageManager.loadQuests()).rejects.toThrow(StorageCorruptionError);
    });

    it('should validate quest data before saving', async () => {
      const invalidQuest = { ...createTestQuest(), remaining: -1 } as Quest;

      await expect(storageManager.saveQuests([invalidQuest])).rejects.toThrow(StorageCorruptionError);
    });
  });

  describe('Settings Management', () => {
    it('should save and load settings successfully', async () => {
      const settings = createTestSettings({ defaultWinRate: 0.7 });

      await storageManager.saveSettings(settings);
      const loadedSettings = await storageManager.loadSettings();

      expect(loadedSettings).toEqual(settings);
    });

    it('should return default settings when none are stored', async () => {
      const settings = await storageManager.loadSettings();
      expect(settings).toEqual(createDefaultSettings());
    });

    it('should return default settings for corrupted data', async () => {
      mockStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid json');

      const settings = await storageManager.loadSettings();
      expect(settings).toEqual(createDefaultSettings());
    });

    it('should validate settings data before saving', async () => {
      const invalidSettings = { ...createTestSettings(), defaultWinRate: 1.5 } as UserSettings;

      await expect(storageManager.saveSettings(invalidSettings)).rejects.toThrow(StorageCorruptionError);
    });
  });

  describe('Plan Management', () => {
    it('should save and load plans successfully', async () => {
      const plans = [createTestPlan(), createTestPlan({ id: uuidv4() })];

      await storageManager.savePlans(plans);
      const loadedPlans = await storageManager.loadPlans();

      expect(loadedPlans).toHaveLength(2);
      expect(loadedPlans[0]).toEqual(plans[0]);
      expect(loadedPlans[1]).toEqual(plans[1]);
    });

    it('should return empty array when no plans are stored', async () => {
      const plans = await storageManager.loadPlans();
      expect(plans).toEqual([]);
    });

    it('should throw StorageCorruptionError for invalid plan data', async () => {
      mockStorage.setItem(STORAGE_KEYS.PLANS, '{"invalid": "data"}');

      await expect(storageManager.loadPlans()).rejects.toThrow(StorageCorruptionError);
    });

    it('should validate plan data before saving', async () => {
      const invalidPlan = { ...createTestPlan(), totalEstimatedMinutes: -1 } as OptimizedPlan;

      await expect(storageManager.savePlans([invalidPlan])).rejects.toThrow(StorageCorruptionError);
    });
  });

  describe('Storage Quota Management', () => {
    it('should throw StorageQuotaError when quota is exceeded', async () => {
      // Set a very small quota to trigger the error
      mockStorage.setQuota(50); // 50 bytes
      
      // Create a single valid quest that will exceed the tiny quota
      const quest = createTestQuest();

      await expect(storageManager.saveQuests([quest])).rejects.toThrow(StorageQuotaError);
    });

    it('should handle browser quota exceeded errors', async () => {
      mockStorage.setQuotaExceededMode(true);
      const quests = [createTestQuest()];

      await expect(storageManager.saveQuests(quests)).rejects.toThrow(StorageError);
    });
  });

  describe('Data Management', () => {
    it('should clear all data successfully', async () => {
      // Add some data
      await storageManager.saveQuests([createTestQuest()]);
      await storageManager.saveSettings(createTestSettings());
      await storageManager.savePlans([createTestPlan()]);

      // Clear all data
      await storageManager.clearData();

      // Verify data is cleared
      expect(await storageManager.loadQuests()).toEqual([]);
      expect(await storageManager.loadSettings()).toEqual(createDefaultSettings());
      expect(await storageManager.loadPlans()).toEqual([]);
    });

    it('should provide accurate storage information', async () => {
      const quests = [createTestQuest()];
      const settings = createTestSettings();
      const plans = [createTestPlan()];

      await storageManager.saveQuests(quests);
      await storageManager.saveSettings(settings);
      await storageManager.savePlans(plans);

      const info = await storageManager.getStorageInfo();

      expect(info.version).toBe('1.0.0');
      expect(info.totalSize).toBeGreaterThan(0);
      expect(info.questsSize).toBeGreaterThan(0);
      expect(info.settingsSize).toBeGreaterThan(0);
      expect(info.plansSize).toBeGreaterThan(0);
      expect(info.available).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage unavailable gracefully', async () => {
      const brokenStorage = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('Storage unavailable');
        }),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('Storage unavailable');
        }),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      } as unknown as Storage;

      const brokenStorageManager = new StorageManager(brokenStorage);

      await expect(brokenStorageManager.loadQuests()).rejects.toThrow(StorageError);
      await expect(brokenStorageManager.saveQuests([createTestQuest()])).rejects.toThrow(StorageError);
    });

    it('should wrap unknown errors in StorageError', async () => {
      const errorStorage = {
        ...mockStorage,
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('Unknown error');
        }),
      } as unknown as Storage;

      const errorStorageManager = new StorageManager(errorStorage);

      await expect(errorStorageManager.saveQuests([createTestQuest()])).rejects.toThrow(StorageError);
    });
  });
});

describe('StorageMigrator', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;
  let migrator: StorageMigrator;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage);
    migrator = new StorageMigrator(storageManager);
  });

  it('should return false when no migration is needed', async () => {
    // Set current version
    mockStorage.setItem(STORAGE_KEYS.VERSION, '1.0.0');

    const migrated = await migrator.migrateIfNeeded();
    expect(migrated).toBe(false);
  });

  it('should handle missing version gracefully', async () => {
    const migrated = await migrator.migrateIfNeeded();
    expect(migrated).toBe(false);
  });

  it('should handle migration errors gracefully', async () => {
    const errorStorage = {
      ...mockStorage,
      getItem: jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      }),
    } as unknown as Storage;

    const errorStorageManager = new StorageManager(errorStorage);
    const errorMigrator = new StorageMigrator(errorStorageManager);

    const migrated = await errorMigrator.migrateIfNeeded();
    expect(migrated).toBe(false);
  });
});

describe('createStorageManager', () => {
  it('should create a StorageManager with default localStorage', () => {
    const manager = createStorageManager();
    expect(manager).toBeInstanceOf(StorageManager);
  });

  it('should create a StorageManager with custom storage', () => {
    const customStorage = new MockStorage();
    const manager = createStorageManager(customStorage);
    expect(manager).toBeInstanceOf(StorageManager);
  });
});

describe('Storage Error Classes', () => {
  it('should create StorageError with message and cause', () => {
    const cause = new Error('Original error');
    const error = new StorageError('Storage failed', cause);

    expect(error.message).toBe('Storage failed');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('StorageError');
  });

  it('should create StorageQuotaError with default message', () => {
    const error = new StorageQuotaError();

    expect(error.message).toBe('Storage quota exceeded');
    expect(error.name).toBe('StorageQuotaError');
  });

  it('should create StorageCorruptionError with default message', () => {
    const error = new StorageCorruptionError();

    expect(error.message).toBe('Stored data is corrupted');
    expect(error.name).toBe('StorageCorruptionError');
  });
});

describe('Integration Tests', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage);
  });

  it('should handle complete workflow: save, load, update, clear', async () => {
    // Initial save
    const initialQuests = [createTestQuest()];
    const initialSettings = createTestSettings({ defaultWinRate: 0.6 });
    const initialPlans = [createTestPlan()];

    await storageManager.saveQuests(initialQuests);
    await storageManager.saveSettings(initialSettings);
    await storageManager.savePlans(initialPlans);

    // Verify initial load
    expect(await storageManager.loadQuests()).toEqual(initialQuests);
    expect(await storageManager.loadSettings()).toEqual(initialSettings);
    expect(await storageManager.loadPlans()).toEqual(initialPlans);

    // Update data
    const updatedQuests = [
      ...initialQuests,
      createTestQuest({ id: uuidv4() }),
    ];
    const updatedSettings = { ...initialSettings, defaultWinRate: 0.7 };

    await storageManager.saveQuests(updatedQuests);
    await storageManager.saveSettings(updatedSettings);

    // Verify updates
    expect(await storageManager.loadQuests()).toEqual(updatedQuests);
    expect(await storageManager.loadSettings()).toEqual(updatedSettings);

    // Clear and verify
    await storageManager.clearData();
    expect(await storageManager.loadQuests()).toEqual([]);
    expect(await storageManager.loadSettings()).toEqual(createDefaultSettings());
    expect(await storageManager.loadPlans()).toEqual([]);
  });

  it('should maintain data consistency across multiple operations', async () => {
    const operations = Array.from({ length: 10 }, () => async () => {
      const quests = [createTestQuest({ id: uuidv4() })];
      await storageManager.saveQuests(quests);
      const loaded = await storageManager.loadQuests();
      expect(loaded).toEqual(quests);
    });

    // Run operations sequentially
    for (const operation of operations) {
      await operation();
    }
  });
});