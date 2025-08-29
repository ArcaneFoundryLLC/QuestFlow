import { 
  QueueType, 
  QuestProgressSchema, 
  RewardsSchema, 
  PlanStepSchema,
  QueueRewardsSchema,
  QUEUE_REWARDS,
  getQueueRewards,
  getQueueRewardsWithFallback,
  calculateExpectedGoldReward,
  calculateExpectedGemReward,
  calculateExpectedPackReward,
  getAllQueueTypes,
  isValidQueueType,
  type QueueRewards
} from '../queue';
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

  describe('QueueRewardsSchema validation', () => {
    const validQueueRewards: QueueRewards = {
      entryFee: 0,
      winRewards: [0, 25, 50, 100],
      averageGameLength: 8,
      questMultiplier: { win: 1, cast: 1, play_colors: 1 }
    };

    it('should validate valid queue rewards', () => {
      const result = QueueRewardsSchema.safeParse(validQueueRewards);
      expect(result.success).toBe(true);
    });

    it('should validate queue rewards with gem and pack rewards', () => {
      const rewardsWithExtras = {
        ...validQueueRewards,
        gemRewards: [0, 50, 100],
        packRewards: [1, 2, 3]
      };
      const result = QueueRewardsSchema.safeParse(rewardsWithExtras);
      expect(result.success).toBe(true);
    });

    it('should reject negative entry fee', () => {
      const invalidRewards = { ...validQueueRewards, entryFee: -100 };
      const result = QueueRewardsSchema.safeParse(invalidRewards);
      expect(result.success).toBe(false);
    });

    it('should reject negative win rewards', () => {
      const invalidRewards = { ...validQueueRewards, winRewards: [0, -25, 50] };
      const result = QueueRewardsSchema.safeParse(invalidRewards);
      expect(result.success).toBe(false);
    });

    it('should reject invalid average game length', () => {
      const invalidRewards = { ...validQueueRewards, averageGameLength: 0 };
      const result = QueueRewardsSchema.safeParse(invalidRewards);
      expect(result.success).toBe(false);
    });

    it('should reject negative quest multipliers', () => {
      const invalidRewards = { 
        ...validQueueRewards, 
        questMultiplier: { win: -1, cast: 1, play_colors: 1 }
      };
      const result = QueueRewardsSchema.safeParse(invalidRewards);
      expect(result.success).toBe(false);
    });
  });

  describe('QUEUE_REWARDS static data', () => {
    it('should contain all queue types', () => {
      const allQueueTypes = Object.values(QueueType);
      allQueueTypes.forEach(queueType => {
        expect(QUEUE_REWARDS[queueType]).toBeDefined();
      });
    });

    it('should have valid reward structures for all queues', () => {
      Object.entries(QUEUE_REWARDS).forEach(([queueType, rewards]) => {
        const result = QueueRewardsSchema.safeParse(rewards);
        expect(result.success).toBe(true);
      });
    });

    it('should have Standard BO1 as free entry with gold rewards', () => {
      const standardRewards = QUEUE_REWARDS[QueueType.STANDARD_BO1];
      expect(standardRewards.entryFee).toBe(0);
      expect(standardRewards.winRewards.length).toBeGreaterThan(0);
      expect(standardRewards.averageGameLength).toBeGreaterThan(0);
    });

    it('should have Quick Draft with entry fee and multiple reward types', () => {
      const draftRewards = QUEUE_REWARDS[QueueType.QUICK_DRAFT];
      expect(draftRewards.entryFee).toBeGreaterThan(0);
      expect(draftRewards.winRewards.length).toBeGreaterThan(0);
      expect(draftRewards.gemRewards).toBeDefined();
      expect(draftRewards.packRewards).toBeDefined();
    });

    it('should have BO3 formats with higher quest multipliers', () => {
      const bo3Rewards = QUEUE_REWARDS[QueueType.STANDARD_BO3];
      const bo1Rewards = QUEUE_REWARDS[QueueType.STANDARD_BO1];
      expect(bo3Rewards.questMultiplier.win).toBeGreaterThan(bo1Rewards.questMultiplier.win);
      expect(bo3Rewards.averageGameLength).toBeGreaterThan(bo1Rewards.averageGameLength);
    });
  });

  describe('getQueueRewards function', () => {
    it('should return rewards for valid queue type', () => {
      const rewards = getQueueRewards(QueueType.STANDARD_BO1);
      expect(rewards).toBeDefined();
      expect(rewards?.entryFee).toBe(0);
    });

    it('should return null for invalid queue type', () => {
      // Force invalid queue type for testing
      const rewards = getQueueRewards('invalid_queue' as QueueType);
      expect(rewards).toBeNull();
    });
  });

  describe('getQueueRewardsWithFallback function', () => {
    it('should return rewards for valid queue type', () => {
      const rewards = getQueueRewardsWithFallback(QueueType.QUICK_DRAFT);
      expect(rewards).toBeDefined();
      expect(rewards.entryFee).toBeGreaterThan(0);
    });

    it('should fallback to Standard BO1 for invalid queue type', () => {
      const rewards = getQueueRewardsWithFallback('invalid_queue' as QueueType);
      expect(rewards).toBeDefined();
      expect(rewards.entryFee).toBe(0);
      expect(rewards).toEqual(QUEUE_REWARDS[QueueType.STANDARD_BO1]);
    });
  });

  describe('calculateExpectedGoldReward function', () => {
    it('should calculate correct expected reward for 50% win rate in Standard BO1', () => {
      const expectedReward = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.5);
      expect(expectedReward).toBeGreaterThan(0);
      expect(expectedReward).toBeLessThan(250); // Max reward
    });

    it('should return higher reward for higher win rate', () => {
      const lowWinRate = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.3);
      const highWinRate = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.7);
      expect(highWinRate).toBeGreaterThan(lowWinRate);
    });

    it('should return 0 for 0% win rate in first game', () => {
      const expectedReward = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.0);
      expect(expectedReward).toBe(0);
    });

    it('should handle queue with no rewards gracefully', () => {
      // Mock a queue with empty rewards for testing
      const originalRewards = QUEUE_REWARDS[QueueType.STANDARD_BO1];
      (QUEUE_REWARDS as Record<QueueType, QueueRewards>)[QueueType.STANDARD_BO1] = { ...originalRewards, winRewards: [] };
      
      const expectedReward = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.5);
      expect(expectedReward).toBe(0);
      
      // Restore original rewards
      (QUEUE_REWARDS as Record<QueueType, QueueRewards>)[QueueType.STANDARD_BO1] = originalRewards;
    });

    it('should calculate known values for specific scenarios', () => {
      // Test with known Standard BO1 rewards: [0, 25, 50, 100, 150, 200, 250]
      // With 50% win rate, expected value should be calculable
      const expectedReward = calculateExpectedGoldReward(QueueType.STANDARD_BO1, 0.5);
      
      // Manual calculation for verification:
      // P(0 wins) = 0.5, reward = 0 -> 0.5 * 0 = 0
      // P(1 win) = 0.5 * 0.5 = 0.25, reward = 25 -> 0.25 * 25 = 6.25
      // P(2 wins) = 0.5^2 * 0.5 = 0.125, reward = 50 -> 0.125 * 50 = 6.25
      // P(3 wins) = 0.5^3 * 0.5 = 0.0625, reward = 100 -> 0.0625 * 100 = 6.25
      // P(4 wins) = 0.5^4 * 0.5 = 0.03125, reward = 150 -> 0.03125 * 150 = 4.6875
      // P(5 wins) = 0.5^5 * 0.5 = 0.015625, reward = 200 -> 0.015625 * 200 = 3.125
      // P(6 wins) = 0.5^6 = 0.015625, reward = 250 -> 0.015625 * 250 = 3.90625
      // Total: 0 + 6.25 + 6.25 + 6.25 + 4.6875 + 3.125 + 3.90625 = 30.46875
      expect(expectedReward).toBeCloseTo(30.47, 1); // Corrected expected value
    });
  });

  describe('calculateExpectedGemReward function', () => {
    it('should return 0 for queues without gem rewards', () => {
      const expectedGems = calculateExpectedGemReward(QueueType.STANDARD_BO1, 0.5);
      expect(expectedGems).toBe(0);
    });

    it('should calculate gem rewards for draft queues', () => {
      const expectedGems = calculateExpectedGemReward(QueueType.QUICK_DRAFT, 0.5);
      expect(expectedGems).toBeGreaterThan(0);
    });

    it('should return higher gems for higher win rate in draft', () => {
      const lowWinRate = calculateExpectedGemReward(QueueType.QUICK_DRAFT, 0.3);
      const highWinRate = calculateExpectedGemReward(QueueType.QUICK_DRAFT, 0.7);
      expect(highWinRate).toBeGreaterThan(lowWinRate);
    });
  });

  describe('calculateExpectedPackReward function', () => {
    it('should return 0 for queues without pack rewards', () => {
      const expectedPacks = calculateExpectedPackReward(QueueType.STANDARD_BO1, 0.5);
      expect(expectedPacks).toBe(0);
    });

    it('should calculate pack rewards for draft queues', () => {
      const expectedPacks = calculateExpectedPackReward(QueueType.QUICK_DRAFT, 0.5);
      expect(expectedPacks).toBeGreaterThan(0);
    });

    it('should return at least 1 pack for draft queues (guaranteed)', () => {
      const expectedPacks = calculateExpectedPackReward(QueueType.QUICK_DRAFT, 0.0);
      expect(expectedPacks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getAllQueueTypes function', () => {
    it('should return all queue types', () => {
      const allTypes = getAllQueueTypes();
      const enumValues = Object.values(QueueType);
      expect(allTypes).toEqual(enumValues);
      expect(allTypes.length).toBe(enumValues.length);
    });

    it('should include all expected queue types', () => {
      const allTypes = getAllQueueTypes();
      expect(allTypes).toContain(QueueType.STANDARD_BO1);
      expect(allTypes).toContain(QueueType.QUICK_DRAFT);
      expect(allTypes).toContain(QueueType.MIDWEEK_MAGIC);
    });
  });

  describe('isValidQueueType function', () => {
    it('should return true for valid queue types', () => {
      expect(isValidQueueType('standard_bo1')).toBe(true);
      expect(isValidQueueType('quick_draft')).toBe(true);
      expect(isValidQueueType('midweek_magic')).toBe(true);
    });

    it('should return false for invalid queue types', () => {
      expect(isValidQueueType('invalid_queue')).toBe(false);
      expect(isValidQueueType('')).toBe(false);
      expect(isValidQueueType('STANDARD_BO1')).toBe(false); // Wrong case
    });

    it('should work as type guard', () => {
      const testString: string = 'standard_bo1';
      if (isValidQueueType(testString)) {
        // TypeScript should recognize testString as QueueType here
        const rewards = QUEUE_REWARDS[testString];
        expect(rewards).toBeDefined();
      }
    });
  });
});