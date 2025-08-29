import { QueueType, QuestProgressSchema, RewardsSchema, PlanStepSchema } from '../queue';
import { validateQuestProgress, validateRewards, validatePlanStep } from '../validation';

describe('Queue Model Validation', () => {
  describe('QuestProgressSchema validation', () => {
    const validProgressData = {
      questId: '123e4567-e89b-12d3-a456-426614174000',
      progressAmount: 5,
    };

    it('should validate valid quest progress', () => {
      const result = validateQuestProgress(validProgressData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validProgressData);
    });

    it('should reject invalid quest ID format', () => {
      const invalidProgress = { ...validProgressData, questId: 'invalid-uuid' };
      const result = validateQuestProgress(invalidProgress);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('questId');
      expect(result.errors?.[0].message).toBe('Invalid quest ID format');
    });

    it('should reject negative progress amount', () => {
      const invalidProgress = { ...validProgressData, progressAmount: -1 };
      const result = validateQuestProgress(invalidProgress);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Progress amount cannot be negative');
    });

    it('should reject progress amount over 100', () => {
      const invalidProgress = { ...validProgressData, progressAmount: 101 };
      const result = validateQuestProgress(invalidProgress);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Progress amount cannot exceed 100');
    });

    it('should accept progress amount of 0', () => {
      const zeroProgress = { ...validProgressData, progressAmount: 0 };
      const result = validateQuestProgress(zeroProgress);
      expect(result.success).toBe(true);
    });

    it('should accept progress amount of 100', () => {
      const maxProgress = { ...validProgressData, progressAmount: 100 };
      const result = validateQuestProgress(maxProgress);
      expect(result.success).toBe(true);
    });
  });

  describe('RewardsSchema validation', () => {
    const validRewardsData = {
      gold: 150,
      gems: 50,
      packs: 1,
    };

    it('should validate valid rewards', () => {
      const result = validateRewards(validRewardsData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRewardsData);
    });

    it('should accept zero rewards', () => {
      const zeroRewards = { gold: 0, gems: 0, packs: 0 };
      const result = validateRewards(zeroRewards);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(zeroRewards);
    });

    it('should reject negative gold', () => {
      const invalidRewards = { ...validRewardsData, gold: -10 };
      const result = validateRewards(invalidRewards);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Gold rewards cannot be negative');
    });

    it('should reject negative gems', () => {
      const invalidRewards = { ...validRewardsData, gems: -5 };
      const result = validateRewards(invalidRewards);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Gem rewards cannot be negative');
    });

    it('should reject negative packs', () => {
      const invalidRewards = { ...validRewardsData, packs: -1 };
      const result = validateRewards(invalidRewards);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Pack rewards cannot be negative');
    });
  });

  describe('PlanStepSchema validation', () => {
    const validStepData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      queue: QueueType.STANDARD_BO1,
      targetGames: 3,
      estimatedMinutes: 24,
      expectedRewards: { gold: 150, gems: 0, packs: 0 },
      questProgress: [
        {
          questId: '123e4567-e89b-12d3-a456-426614174001',
          progressAmount: 3,
        },
      ],
      completed: false,
    };

    it('should validate valid plan step', () => {
      const result = validatePlanStep(validStepData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validStepData);
    });

    it('should reject invalid step ID format', () => {
      const invalidStep = { ...validStepData, id: 'invalid-uuid' };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('id');
      expect(result.errors?.[0].message).toBe('Invalid step ID format');
    });

    it('should reject invalid queue type', () => {
      const invalidStep = { ...validStepData, queue: 'invalid_queue' };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('queue');
      expect(result.errors?.[0].message).toBe('Invalid queue type');
    });

    it('should accept all valid queue types', () => {
      const queueTypes = Object.values(QueueType);
      queueTypes.forEach(queue => {
        const step = { ...validStepData, queue };
        const result = validatePlanStep(step);
        expect(result.success).toBe(true);
        expect(result.data?.queue).toBe(queue);
      });
    });

    it('should reject target games less than 1', () => {
      const invalidStep = { ...validStepData, targetGames: 0 };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Must target at least 1 game');
    });

    it('should reject target games over 50', () => {
      const invalidStep = { ...validStepData, targetGames: 51 };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Cannot target more than 50 games in one step');
    });

    it('should reject non-integer target games', () => {
      const invalidStep = { ...validStepData, targetGames: 2.5 };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Target games must be a whole number');
    });

    it('should reject estimated minutes less than 1', () => {
      const invalidStep = { ...validStepData, estimatedMinutes: 0 };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Estimated time must be at least 1 minute');
    });

    it('should reject estimated minutes over 300', () => {
      const invalidStep = { ...validStepData, estimatedMinutes: 301 };
      const result = validatePlanStep(invalidStep);
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toBe('Estimated time cannot exceed 300 minutes');
    });

    it('should validate step with empty quest progress', () => {
      const stepWithNoProgress = { ...validStepData, questProgress: [] };
      const result = validatePlanStep(stepWithNoProgress);
      expect(result.success).toBe(true);
      expect(result.data?.questProgress).toEqual([]);
    });

    it('should validate step with multiple quest progress items', () => {
      const multipleProgress = [
        { questId: '123e4567-e89b-12d3-a456-426614174001', progressAmount: 2 },
        { questId: '123e4567-e89b-12d3-a456-426614174002', progressAmount: 1 },
      ];
      const stepWithMultipleProgress = { ...validStepData, questProgress: multipleProgress };
      const result = validatePlanStep(stepWithMultipleProgress);
      expect(result.success).toBe(true);
      expect(result.data?.questProgress).toEqual(multipleProgress);
    });
  });
});