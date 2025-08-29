import { QueueType } from '../queue';
import { OptimizedPlanSchema, CreatePlanSchema, UpdatePlanSchema } from '../plan';
import { validatePlan, validateCreatePlan, validateUpdatePlan } from '../validation';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
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
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('Plan Model Validation', () => {
  const validPlanStep = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    queue: QueueType.STANDARD_BO1,
    targetGames: 3,
    estimatedMinutes: 24,
    expectedRewards: { gold: 150, gems: 0, packs: 0 },
    questProgress: [
      {
        questId: '123e4567-e89b-12d3-a456-426614174002',
        progressAmount: 3,
      },
    ],
    completed: false,
  };

  const validPlanData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    steps: [validPlanStep],
    totalEstimatedMinutes: 24,
    totalExpectedRewards: { gold: 150, gems: 0, packs: 0 },
    questsCompleted: ['123e4567-e89b-12d3-a456-426614174002'],
    timeBudget: 30,
    winRate: 0.6,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('OptimizedPlanSchema validation', () => {
    it('should validate a complete valid plan', () => {
      const result = validatePlan(validPlanData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPlanData);
    });

    it('should reject invalid UUID format', () => {
      const invalidPlan = { ...validPlanData, id: 'invalid-uuid' };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('id');
      expect(result.errors?.[0].message).toBe('Invalid plan ID format');
    });

    it('should reject plan with no steps', () => {
      const invalidPlan = { ...validPlanData, steps: [] };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Plan must have at least one step');
    });

    it('should reject plan with more than 10 steps', () => {
      const manySteps = Array(11).fill(validPlanStep);
      const invalidPlan = { ...validPlanData, steps: manySteps };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Plan cannot have more than 10 steps');
    });

    it('should reject total time less than 1 minute', () => {
      const invalidPlan = { ...validPlanData, totalEstimatedMinutes: 0 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Total time must be at least 1 minute');
    });

    it('should reject total time over 300 minutes', () => {
      const invalidPlan = { ...validPlanData, totalEstimatedMinutes: 301 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Total time cannot exceed 300 minutes');
    });

    it('should reject time budget less than 15 minutes', () => {
      const invalidPlan = { ...validPlanData, timeBudget: 10 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Time budget must be at least 15 minutes');
    });

    it('should reject time budget over 180 minutes', () => {
      const invalidPlan = { ...validPlanData, timeBudget: 200 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Time budget cannot exceed 180 minutes');
    });

    it('should reject non-integer time budget', () => {
      const invalidPlan = { ...validPlanData, timeBudget: 30.5 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Time budget must be a whole number');
    });

    it('should reject win rate below 30%', () => {
      const invalidPlan = { ...validPlanData, winRate: 0.25 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Win rate cannot be less than 30%');
    });

    it('should reject win rate above 80%', () => {
      const invalidPlan = { ...validPlanData, winRate: 0.85 };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Win rate cannot exceed 80%');
    });

    it('should reject more than 20 completed quests', () => {
      const manyQuests = Array(21).fill('123e4567-e89b-12d3-a456-426614174002');
      const invalidPlan = { ...validPlanData, questsCompleted: manyQuests };
      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Cannot complete more than 20 quests in one plan');
    });
  });

  describe('CreatePlanSchema validation', () => {
    const validCreateData = {
      steps: [validPlanStep],
      totalEstimatedMinutes: 24,
      totalExpectedRewards: { gold: 150, gems: 0, packs: 0 },
      questsCompleted: ['123e4567-e89b-12d3-a456-426614174002'],
      timeBudget: 30,
      winRate: 0.6,
    };

    it('should validate valid create plan data', () => {
      const result = validateCreatePlan(validCreateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCreateData);
    });

    it('should ignore id field when present', () => {
      const dataWithId = { ...validCreateData, id: '123e4567-e89b-12d3-a456-426614174000' };
      const result = validateCreatePlan(dataWithId);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('id');
    });
  });

  describe('UpdatePlanSchema validation', () => {
    it('should validate valid update plan data', () => {
      const updateData = {
        stepId: '123e4567-e89b-12d3-a456-426614174001',
        completed: true,
      };
      const result = validateUpdatePlan(updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updateData);
    });

    it('should reject invalid step ID format', () => {
      const invalidUpdate = {
        stepId: 'invalid-uuid',
        completed: true,
      };
      const result = validateUpdatePlan(invalidUpdate);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('stepId');
      expect(result.errors?.[0].message).toBe('Invalid step ID format');
    });

    it('should reject non-boolean completed value', () => {
      const invalidUpdate = {
        stepId: '123e4567-e89b-12d3-a456-426614174001',
        completed: 'true',
      };
      const result = validateUpdatePlan(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});