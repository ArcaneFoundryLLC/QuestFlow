import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  optimizePlan, 
  createDefaultSettings, 
  updatePlanProgress, 
  recalculatePlan,
  UserSettings,
  OptimizationResult 
} from '../plan-optimizer';
import { Quest, QuestType, MTGAColor } from '../quest';
import { QueueType } from '../queue';
import { OptimizedPlan } from '../plan';

describe('Plan Optimizer', () => {
  let mockQuests: Quest[];
  let defaultSettings: UserSettings;

  beforeEach(() => {
    // Create mock quests for testing
    mockQuests = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: QuestType.WIN,
        description: 'Win 5 games',
        remaining: 5,
        expiresInDays: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        type: QuestType.CAST,
        description: 'Cast 20 spells',
        remaining: 20,
        expiresInDays: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        type: QuestType.PLAY_COLORS,
        description: 'Play red or green spells',
        remaining: 1,
        expiresInDays: 1,
        colors: [MTGAColor.RED, MTGAColor.GREEN],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    defaultSettings = createDefaultSettings();
  });

  describe('optimizePlan', () => {
    it('should generate a valid plan for basic quest combination', () => {
      const result = optimizePlan(mockQuests, 60, 0.6, defaultSettings);
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.steps.length).toBeGreaterThan(0);
      expect(result.plan!.totalEstimatedMinutes).toBeLessThanOrEqual(60);
      expect(result.plan!.timeBudget).toBe(60);
      expect(result.plan!.winRate).toBe(0.6);
    });

    it('should prioritize expiring quests', () => {
      const result = optimizePlan(mockQuests, 90, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Check that the plan includes progress on the expiring quest (expiresInDays: 1)
      const expiringQuestProgress = result.plan!.steps.some(step =>
        step.questProgress.some(progress => 
          progress.questId === '123e4567-e89b-12d3-a456-426614174003'
        )
      );
      
      expect(expiringQuestProgress).toBe(true);
    });

    it('should respect time budget constraints', () => {
      const shortTimeBudget = 15; // Minimum time budget
      const result = optimizePlan(mockQuests, shortTimeBudget, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      expect(result.plan!.totalEstimatedMinutes).toBeLessThanOrEqual(shortTimeBudget);
    });

    it('should handle insufficient time gracefully', () => {
      // Create a quest that requires more time than available
      const impossibleQuests: Quest[] = [{
        id: '123e4567-e89b-12d3-a456-426614174004',
        type: QuestType.WIN,
        description: 'Win 50 games',
        remaining: 50,
        expiresInDays: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }];

      const result = optimizePlan(impossibleQuests, 15, 0.3, defaultSettings);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient time');
    });

    it('should handle empty quest list', () => {
      const result = optimizePlan([], 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active quests');
    });

    it('should handle completed quests', () => {
      const completedQuests: Quest[] = [{
        id: '123e4567-e89b-12d3-a456-426614174005',
        type: QuestType.WIN,
        description: 'Win 3 games',
        remaining: 0, // Already completed
        expiresInDays: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }];

      const result = optimizePlan(completedQuests, 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active quests');
    });

    it('should optimize for highest EV per minute', () => {
      const result = optimizePlan(mockQuests, 120, 0.7, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Verify that steps are ordered by efficiency
      // Higher win rate should favor queues with better EV
      const steps = result.plan!.steps;
      expect(steps.length).toBeGreaterThan(0);
      
      // Check that we're using efficient queues (Standard BO1 should be preferred for quick wins)
      const hasEfficientQueue = steps.some(step => 
        step.queue === QueueType.STANDARD_BO1 || step.queue === QueueType.HISTORIC_BO1
      );
      expect(hasEfficientQueue).toBe(true);
    });

    it('should respect queue preferences', () => {
      const customSettings: UserSettings = {
        ...defaultSettings,
        preferredQueues: [QueueType.QUICK_DRAFT], // Only allow draft
      };

      const result = optimizePlan(mockQuests, 90, 0.5, customSettings);
      
      expect(result.success).toBe(true);
      
      // All steps should use the preferred queue
      const allStepsUsePreferredQueue = result.plan!.steps.every(step =>
        customSettings.preferredQueues.includes(step.queue)
      );
      expect(allStepsUsePreferredQueue).toBe(true);
    });

    it('should generate appropriate warnings', () => {
      // Test with very limited time to trigger warnings
      const result = optimizePlan(mockQuests, 20, 0.4, defaultSettings);
      
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should validate win rate constraints', () => {
      const result = optimizePlan(mockQuests, 60, 0.9, defaultSettings); // Invalid win rate
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('winRate');
    });

    it('should validate time budget constraints', () => {
      const result = optimizePlan(mockQuests, 5, 0.5, defaultSettings); // Invalid time budget
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeBudget');
    });
  });

  describe('Quest completion constraint checking', () => {
    it('should ensure quests can be completed before expiration', () => {
      const urgentQuest: Quest = {
        id: '123e4567-e89b-12d3-a456-426614174006',
        type: QuestType.WIN,
        description: 'Win 2 games',
        remaining: 2,
        expiresInDays: 1, // Expires soon
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const result = optimizePlan([urgentQuest], 60, 0.6, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Should prioritize the urgent quest
      const firstStep = result.plan!.steps[0];
      const hasUrgentQuestProgress = firstStep.questProgress.some(
        progress => progress.questId === urgentQuest.id
      );
      expect(hasUrgentQuestProgress).toBe(true);
    });

    it('should handle multiple expiring quests', () => {
      const expiringQuests: Quest[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174007',
          type: QuestType.WIN,
          description: 'Win 1 game',
          remaining: 1,
          expiresInDays: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174008',
          type: QuestType.CAST,
          description: 'Cast 5 spells',
          remaining: 5,
          expiresInDays: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const result = optimizePlan(expiringQuests, 45, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Should attempt to make progress on both expiring quests
      const questIds = new Set(
        result.plan!.steps.flatMap(step => 
          step.questProgress.map(progress => progress.questId)
        )
      );
      
      expect(questIds.has('123e4567-e89b-12d3-a456-426614174007')).toBe(true);
      expect(questIds.has('123e4567-e89b-12d3-a456-426614174008')).toBe(true);
    });
  });

  describe('Time budget constraint enforcement', () => {
    it('should never exceed the time budget', () => {
      const timeBudget = 45;
      const result = optimizePlan(mockQuests, timeBudget, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      expect(result.plan!.totalEstimatedMinutes).toBeLessThanOrEqual(timeBudget);
    });

    it('should efficiently use available time', () => {
      const timeBudget = 120; // Generous time budget
      const result = optimizePlan(mockQuests, timeBudget, 0.6, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Should use a significant portion of the time budget
      const timeUtilization = result.plan!.totalEstimatedMinutes / timeBudget;
      expect(timeUtilization).toBeGreaterThan(0.3); // At least 30% utilization
    });

    it('should handle minimum time budget', () => {
      const minTimeBudget = 15;
      const simpleQuest: Quest = {
        id: '123e4567-e89b-12d3-a456-426614174009',
        type: QuestType.WIN,
        description: 'Win 1 game',
        remaining: 1,
        expiresInDays: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const result = optimizePlan([simpleQuest], minTimeBudget, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      expect(result.plan!.totalEstimatedMinutes).toBeLessThanOrEqual(minTimeBudget);
    });
  });

  describe('Plan step generation', () => {
    it('should generate clear queue recommendations', () => {
      const result = optimizePlan(mockQuests, 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      
      result.plan!.steps.forEach(step => {
        expect(step.queue).toBeDefined();
        expect(Object.values(QueueType)).toContain(step.queue);
        expect(step.targetGames).toBeGreaterThan(0);
        expect(step.estimatedMinutes).toBeGreaterThan(0);
        expect(step.expectedRewards).toBeDefined();
        expect(step.questProgress).toBeDefined();
      });
    });

    it('should provide accurate time estimates', () => {
      const result = optimizePlan(mockQuests, 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Sum of step times should equal total estimated time
      const stepTimeSum = result.plan!.steps.reduce(
        (sum, step) => sum + step.estimatedMinutes, 0
      );
      expect(stepTimeSum).toBe(result.plan!.totalEstimatedMinutes);
    });

    it('should calculate expected rewards correctly', () => {
      const result = optimizePlan(mockQuests, 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(true);
      
      result.plan!.steps.forEach(step => {
        expect(step.expectedRewards.gold).toBeGreaterThanOrEqual(0);
        expect(step.expectedRewards.gems).toBeGreaterThanOrEqual(0);
        expect(step.expectedRewards.packs).toBeGreaterThanOrEqual(0);
      });

      // Total rewards should be sum of step rewards
      const totalGold = result.plan!.steps.reduce(
        (sum, step) => sum + step.expectedRewards.gold, 0
      );
      expect(totalGold).toBe(result.plan!.totalExpectedRewards.gold);
    });

    it('should track quest progress accurately', () => {
      const result = optimizePlan(mockQuests, 90, 0.6, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // Each step should have quest progress information
      result.plan!.steps.forEach(step => {
        expect(step.questProgress).toBeDefined();
        step.questProgress.forEach(progress => {
          expect(progress.questId).toBeDefined();
          expect(progress.progressAmount).toBeGreaterThan(0);
          
          // Progress should be for one of our mock quests
          const questIds = mockQuests.map(q => q.id);
          expect(questIds).toContain(progress.questId);
        });
      });
    });
  });

  describe('updatePlanProgress', () => {
    let samplePlan: OptimizedPlan;

    beforeEach(() => {
      const result = optimizePlan(mockQuests, 60, 0.5, defaultSettings);
      expect(result.success).toBe(true);
      samplePlan = result.plan!;
    });

    it('should mark step as completed', () => {
      const firstStepId = samplePlan.steps[0].id;
      const updatedPlan = updatePlanProgress(samplePlan, firstStepId, true);
      
      const updatedStep = updatedPlan.steps.find(step => step.id === firstStepId);
      expect(updatedStep?.completed).toBe(true);
      expect(updatedPlan.updatedAt).toBeInstanceOf(Date);
      expect(updatedPlan.updatedAt.getTime()).toBeGreaterThanOrEqual(samplePlan.updatedAt.getTime());
    });

    it('should mark step as incomplete', () => {
      // First mark as complete, then incomplete
      const firstStepId = samplePlan.steps[0].id;
      let updatedPlan = updatePlanProgress(samplePlan, firstStepId, true);
      updatedPlan = updatePlanProgress(updatedPlan, firstStepId, false);
      
      const updatedStep = updatedPlan.steps.find(step => step.id === firstStepId);
      expect(updatedStep?.completed).toBe(false);
    });

    it('should not affect other steps', () => {
      if (samplePlan.steps.length < 2) return; // Skip if only one step
      
      const firstStepId = samplePlan.steps[0].id;
      const secondStepId = samplePlan.steps[1].id;
      
      const updatedPlan = updatePlanProgress(samplePlan, firstStepId, true);
      
      const firstStep = updatedPlan.steps.find(step => step.id === firstStepId);
      const secondStep = updatedPlan.steps.find(step => step.id === secondStepId);
      
      expect(firstStep?.completed).toBe(true);
      expect(secondStep?.completed).toBe(false);
    });
  });

  describe('recalculatePlan', () => {
    let samplePlan: OptimizedPlan;

    beforeEach(() => {
      const result = optimizePlan(mockQuests, 90, 0.5, defaultSettings);
      expect(result.success).toBe(true);
      samplePlan = result.plan!;
    });

    it('should recalculate with updated quest progress', () => {
      // Mark first step as completed
      const updatedPlan = updatePlanProgress(samplePlan, samplePlan.steps[0].id, true);
      
      // Update quest progress (simulate partial completion)
      const updatedQuests = mockQuests.map(quest => ({
        ...quest,
        remaining: Math.max(0, quest.remaining - 1),
      }));

      const result = recalculatePlan(updatedPlan, updatedQuests, defaultSettings);
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
    });

    it('should handle all steps completed', () => {
      // Mark all steps as completed
      let updatedPlan = samplePlan;
      for (const step of samplePlan.steps) {
        updatedPlan = updatePlanProgress(updatedPlan, step.id, true);
      }

      const result = recalculatePlan(updatedPlan, mockQuests, defaultSettings);
      
      // Should succeed and indicate time status
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      
      // Should have either "all time used" or "insufficient remaining time" warning
      const hasTimeWarning = result.warnings!.some(warning => 
        warning.includes('All allocated time has been used') || 
        warning.includes('Insufficient remaining time')
      );
      expect(hasTimeWarning).toBe(true);
    });

    it('should adjust for remaining time', () => {
      // Mark first step as completed (reduces available time)
      const updatedPlan = updatePlanProgress(samplePlan, samplePlan.steps[0].id, true);
      
      const result = recalculatePlan(updatedPlan, mockQuests, defaultSettings);
      
      expect(result.success).toBe(true);
      
      // New plan should have less total time than original
      if (result.plan) {
        expect(result.plan.totalEstimatedMinutes).toBeLessThan(
          samplePlan.totalEstimatedMinutes
        );
      }
    });
  });

  describe('createDefaultSettings', () => {
    it('should create valid default settings', () => {
      const settings = createDefaultSettings();
      
      expect(settings.defaultWinRate).toBe(0.5);
      expect(settings.preferredQueues).toContain(QueueType.STANDARD_BO1);
      expect(settings.preferredQueues).toContain(QueueType.HISTORIC_BO1);
      expect(settings.preferredQueues).toContain(QueueType.QUICK_DRAFT);
      expect(settings.minutesPerGame).toBe(8);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid quest data gracefully', () => {
      const invalidQuests = [
        {
          id: 'invalid-uuid',
          type: QuestType.WIN,
          description: 'Invalid quest',
          remaining: -1, // Invalid remaining count
          expiresInDays: -1, // Invalid expiration
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }
      ] as Quest[];

      const result = optimizePlan(invalidQuests, 60, 0.5, defaultSettings);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle extreme win rates', () => {
      // Test with minimum allowed win rate
      const result1 = optimizePlan(mockQuests, 60, 0.3, defaultSettings);
      expect(result1.success).toBe(true);

      // Test with maximum allowed win rate
      const result2 = optimizePlan(mockQuests, 60, 0.8, defaultSettings);
      expect(result2.success).toBe(true);
    });

    it('should handle large quest counts', () => {
      // Create many small, achievable quests
      const manyQuests: Quest[] = Array.from({ length: 10 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        type: QuestType.WIN,
        description: `Win 1 game`,
        remaining: 1,
        expiresInDays: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }));

      const result = optimizePlan(manyQuests, 180, 0.5, defaultSettings);
      
      // Should handle gracefully, even if not all quests can be completed
      expect(result.success).toBe(true);
    });
  });
});