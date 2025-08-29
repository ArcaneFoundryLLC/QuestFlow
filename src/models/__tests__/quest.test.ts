import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { QuestType, MTGAColor, QuestSchema, CreateQuestSchema, UpdateQuestSchema } from '../quest';
import { validateQuest, validateCreateQuest, validateUpdateQuest } from '../validation';

describe('Quest Model Validation', () => {
  const validQuestData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: QuestType.WIN,
    description: 'Win 5 games',
    remaining: 3,
    expiresInDays: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('QuestSchema validation', () => {
    it('should validate a complete valid quest', () => {
      const result = validateQuest(validQuestData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQuestData);
    });

    it('should validate quest with colors for play_colors type', () => {
      const questWithColors = {
        ...validQuestData,
        type: QuestType.PLAY_COLORS,
        colors: [MTGAColor.RED, MTGAColor.GREEN],
      };
      const result = validateQuest(questWithColors);
      expect(result.success).toBe(true);
      expect(result.data?.colors).toEqual([MTGAColor.RED, MTGAColor.GREEN]);
    });

    it('should reject invalid UUID format', () => {
      const invalidQuest = { ...validQuestData, id: 'invalid-uuid' };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('id');
      expect(result.errors?.[0].message).toBe('Invalid quest ID format');
    });

    it('should reject invalid quest type', () => {
      const invalidQuest = { ...validQuestData, type: 'invalid_type' };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('type');
    });

    it('should reject empty description', () => {
      const invalidQuest = { ...validQuestData, description: '' };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Quest description cannot be empty');
    });

    it('should reject description longer than 200 characters', () => {
      const longDescription = 'a'.repeat(201);
      const invalidQuest = { ...validQuestData, description: longDescription };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Quest description must be 200 characters or less');
    });

    it('should reject negative remaining count', () => {
      const invalidQuest = { ...validQuestData, remaining: -1 };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Remaining count cannot be negative');
    });

    it('should reject non-integer remaining count', () => {
      const invalidQuest = { ...validQuestData, remaining: 2.5 };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Remaining count must be a whole number');
    });

    it('should reject remaining count over 100', () => {
      const invalidQuest = { ...validQuestData, remaining: 101 };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Remaining count cannot exceed 100');
    });

    it('should reject negative expiration days', () => {
      const invalidQuest = { ...validQuestData, expiresInDays: -1 };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Quest cannot have negative expiration days');
    });

    it('should reject expiration days over 7', () => {
      const invalidQuest = { ...validQuestData, expiresInDays: 8 };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Quest expiration cannot exceed 7 days');
    });

    it('should reject more than 5 colors', () => {
      const invalidQuest = {
        ...validQuestData,
        colors: [MTGAColor.WHITE, MTGAColor.BLUE, MTGAColor.BLACK, MTGAColor.RED, MTGAColor.GREEN, MTGAColor.WHITE],
      };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Cannot have more than 5 colors');
    });

    it('should reject duplicate colors', () => {
      const invalidQuest = {
        ...validQuestData,
        colors: [MTGAColor.RED, MTGAColor.RED],
      };
      const result = validateQuest(invalidQuest);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Colors must be unique');
    });
  });

  describe('CreateQuestSchema validation', () => {
    const validCreateData = {
      type: QuestType.CAST,
      description: 'Cast 20 spells',
      remaining: 15,
      expiresInDays: 3,
    };

    it('should validate valid create quest data', () => {
      const result = validateCreateQuest(validCreateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCreateData);
    });

    it('should ignore id field when present', () => {
      const dataWithId = { ...validCreateData, id: '123e4567-e89b-12d3-a456-426614174000' };
      const result = validateCreateQuest(dataWithId);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('id');
    });

    it('should ignore createdAt field when present', () => {
      const dataWithCreatedAt = { ...validCreateData, createdAt: new Date() };
      const result = validateCreateQuest(dataWithCreatedAt);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('createdAt');
    });
  });

  describe('UpdateQuestSchema validation', () => {
    it('should validate partial update data', () => {
      const updateData = { remaining: 2 };
      const result = validateUpdateQuest(updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateData);
    });

    it('should validate empty update data', () => {
      const result = validateUpdateQuest({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid field values in update', () => {
      const invalidUpdate = { remaining: -5 };
      const result = validateUpdateQuest(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Remaining count cannot be negative');
    });
  });
});