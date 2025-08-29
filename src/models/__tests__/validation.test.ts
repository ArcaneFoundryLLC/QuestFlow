import { QuestType, MTGAColor } from '../quest';
import { QueueType } from '../queue';
import {
  validateData,
  validateQuestArray,
  isValidUUID,
  isValidWinRate,
  isValidTimeBudget,
  formatValidationErrors,
  getFieldErrors,
  ValidationError,
} from '../validation';
import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('validateData generic function', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive'),
    });

    it('should return success for valid data', () => {
      const validData = { name: 'John', age: 25 };
      const result = validateData(testSchema, validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = { name: '', age: -5 };
      const result = validateData(testSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0].field).toBe('name');
      expect(result.errors?.[0].message).toBe('Name is required');
      expect(result.errors?.[1].field).toBe('age');
      expect(result.errors?.[1].message).toBe('Age must be positive');
    });

    it('should handle nested field errors', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string().email('Invalid email'),
          }),
        }),
      });
      const invalidData = { user: { profile: { email: 'invalid-email' } } };
      const result = validateData(nestedSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('user.profile.email');
    });

    it('should handle unexpected errors gracefully', () => {
      const throwingSchema = z.any().transform(() => {
        throw new Error('Unexpected error');
      });
      const result = validateData(throwingSchema, {});
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('root');
      expect(result.errors?.[0].message).toBe('Unexpected error');
      expect(result.errors?.[0].code).toBe('VALIDATION_ERROR');
    });
  });

  describe('validateQuestArray function', () => {
    const validQuest1 = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: QuestType.WIN,
      description: 'Win 5 games',
      remaining: 3,
      expiresInDays: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const validQuest2 = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      type: QuestType.CAST,
      description: 'Cast 20 spells',
      remaining: 15,
      expiresInDays: 3,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should validate array of valid quests', () => {
      const questArray = [validQuest1, validQuest2];
      const result = validateQuestArray(questArray);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(questArray);
    });

    it('should return errors with array indices for invalid quests', () => {
      const invalidQuest = { ...validQuest1, remaining: -1 };
      const questArray = [validQuest1, invalidQuest];
      const result = validateQuestArray(questArray);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('[1].remaining');
      expect(result.errors?.[0].message).toBe('Remaining count cannot be negative');
    });

    it('should handle empty array', () => {
      const result = validateQuestArray([]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should collect all errors from multiple invalid quests', () => {
      const invalidQuest1 = { ...validQuest1, remaining: -1 };
      const invalidQuest2 = { ...validQuest2, description: '' };
      const questArray = [invalidQuest1, invalidQuest2];
      const result = validateQuestArray(questArray);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0].field).toBe('[0].remaining');
      expect(result.errors?.[1].field).toBe('[1].description');
    });
  });

  describe('isValidUUID function', () => {
    it('should return true for valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];
      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        'not-a-uuid-at-all',
      ];
      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('isValidWinRate function', () => {
    it('should return true for valid win rates', () => {
      const validRates = [0.3, 0.5, 0.65, 0.8];
      validRates.forEach(rate => {
        expect(isValidWinRate(rate)).toBe(true);
      });
    });

    it('should return false for invalid win rates', () => {
      const invalidRates = [0.29, 0.81, 0, 1, -0.1, 1.5];
      invalidRates.forEach(rate => {
        expect(isValidWinRate(rate)).toBe(false);
      });
    });
  });

  describe('isValidTimeBudget function', () => {
    it('should return true for valid time budgets', () => {
      const validBudgets = [15, 30, 60, 120, 180];
      validBudgets.forEach(budget => {
        expect(isValidTimeBudget(budget)).toBe(true);
      });
    });

    it('should return false for invalid time budgets', () => {
      const invalidBudgets = [14, 181, 30.5, -10, 0];
      invalidBudgets.forEach(budget => {
        expect(isValidTimeBudget(budget)).toBe(false);
      });
    });
  });

  describe('formatValidationErrors function', () => {
    it('should format single error correctly', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'required' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('name: Name is required');
    });

    it('should format multiple errors correctly', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'required' },
        { field: 'age', message: 'Age must be positive', code: 'min' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('name: Name is required; age: Age must be positive');
    });

    it('should handle empty errors array', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe('');
    });
  });

  describe('getFieldErrors function', () => {
    const errors: ValidationError[] = [
      { field: 'name', message: 'Name is required', code: 'required' },
      { field: 'user.email', message: 'Invalid email', code: 'email' },
      { field: 'user.profile.age', message: 'Age must be positive', code: 'min' },
      { field: 'other', message: 'Other error', code: 'custom' },
    ];

    it('should return errors for exact field match', () => {
      const fieldErrors = getFieldErrors(errors, 'name');
      expect(fieldErrors).toHaveLength(1);
      expect(fieldErrors[0].field).toBe('name');
    });

    it('should return errors for field and nested fields', () => {
      const fieldErrors = getFieldErrors(errors, 'user');
      expect(fieldErrors).toHaveLength(2);
      expect(fieldErrors[0].field).toBe('user.email');
      expect(fieldErrors[1].field).toBe('user.profile.age');
    });

    it('should return empty array for non-existent field', () => {
      const fieldErrors = getFieldErrors(errors, 'nonexistent');
      expect(fieldErrors).toHaveLength(0);
    });

    it('should return nested field errors correctly', () => {
      const fieldErrors = getFieldErrors(errors, 'user.profile');
      expect(fieldErrors).toHaveLength(1);
      expect(fieldErrors[0].field).toBe('user.profile.age');
    });
  });
});