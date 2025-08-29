import { QueueType } from '../queue';
import { UserSettingsSchema, UpdateSettingsSchema, createDefaultSettings } from '../settings';
import { validateSettings, validateUpdateSettings } from '../validation';

describe('Settings Model Validation', () => {
  const validSettingsData = {
    defaultWinRate: 0.55,
    preferredQueues: [QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1],
    minutesPerGame: 10,
    enableNotifications: true,
    autoSave: false,
    theme: 'dark' as const,
  };

  describe('UserSettingsSchema validation', () => {
    it('should validate complete valid settings', () => {
      const result = validateSettings(validSettingsData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSettingsData);
    });

    it('should apply default values for missing fields', () => {
      const minimalSettings = {};
      const result = validateSettings(minimalSettings);
      expect(result.success).toBe(true);
      expect(result.data?.defaultWinRate).toBe(0.5);
      expect(result.data?.preferredQueues).toEqual([QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1]);
      expect(result.data?.minutesPerGame).toBe(8);
      expect(result.data?.enableNotifications).toBe(false);
      expect(result.data?.autoSave).toBe(true);
      expect(result.data?.theme).toBe('system');
    });

    it('should reject win rate below 30%', () => {
      const invalidSettings = { ...validSettingsData, defaultWinRate: 0.25 };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Default win rate cannot be less than 30%');
    });

    it('should reject win rate above 80%', () => {
      const invalidSettings = { ...validSettingsData, defaultWinRate: 0.85 };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Default win rate cannot exceed 80%');
    });

    it('should reject empty preferred queues array', () => {
      const invalidSettings = { ...validSettingsData, preferredQueues: [] };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Must have at least one preferred queue');
    });

    it('should reject more than 5 preferred queues', () => {
      const tooManyQueues = [
        QueueType.STANDARD_BO1,
        QueueType.STANDARD_BO3,
        QueueType.HISTORIC_BO1,
        QueueType.QUICK_DRAFT,
        QueueType.MIDWEEK_MAGIC,
        QueueType.STANDARD_BO1, // Duplicate to exceed limit
      ];
      const invalidSettings = { ...validSettingsData, preferredQueues: tooManyQueues };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Cannot have more than 5 preferred queues');
    });

    it('should reject minutes per game below 3', () => {
      const invalidSettings = { ...validSettingsData, minutesPerGame: 2 };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Minutes per game cannot be less than 3');
    });

    it('should reject minutes per game above 30', () => {
      const invalidSettings = { ...validSettingsData, minutesPerGame: 35 };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Minutes per game cannot exceed 30');
    });

    it('should reject invalid theme value', () => {
      const invalidSettings = { ...validSettingsData, theme: 'invalid' };
      const result = validateSettings(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should accept valid theme values', () => {
      const themes = ['light', 'dark', 'system'] as const;
      themes.forEach(theme => {
        const settings = { ...validSettingsData, theme };
        const result = validateSettings(settings);
        expect(result.success).toBe(true);
        expect(result.data?.theme).toBe(theme);
      });
    });
  });

  describe('UpdateSettingsSchema validation', () => {
    it('should validate partial settings update', () => {
      const updateData = { defaultWinRate: 0.65 };
      const result = validateUpdateSettings(updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateData);
    });

    it('should validate empty update', () => {
      const result = validateUpdateSettings({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid values in partial update', () => {
      const invalidUpdate = { defaultWinRate: 0.9 };
      const result = validateUpdateSettings(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Default win rate cannot exceed 80%');
    });

    it('should validate multiple field updates', () => {
      const updateData = {
        defaultWinRate: 0.45,
        enableNotifications: true,
        theme: 'light' as const,
      };
      const result = validateUpdateSettings(updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateData);
    });
  });

  describe('createDefaultSettings function', () => {
    it('should create valid default settings', () => {
      const defaultSettings = createDefaultSettings();
      expect(defaultSettings.defaultWinRate).toBe(0.5);
      expect(defaultSettings.preferredQueues).toEqual([QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1]);
      expect(defaultSettings.minutesPerGame).toBe(8);
      expect(defaultSettings.enableNotifications).toBe(false);
      expect(defaultSettings.autoSave).toBe(true);
      expect(defaultSettings.theme).toBe('system');
    });

    it('should create settings that pass validation', () => {
      const defaultSettings = createDefaultSettings();
      const result = validateSettings(defaultSettings);
      expect(result.success).toBe(true);
    });
  });
});