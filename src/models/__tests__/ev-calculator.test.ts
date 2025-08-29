import {
  calculateQueueEV,
  calculateQuestProgressRate,
  estimateQuestCompletion,
  calculateCombinedEV,
  compareQueuesForQuest,
  validateEVInput,
  type EVResult,
  type QuestProgressResult,
} from '../ev-calculator';
import { QueueType } from '../queue';
import { Quest, QuestType, MTGAColor } from '../quest';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('EV Calculator', () => {
  // Test quest fixtures
  const winQuest: Quest = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: QuestType.WIN,
    description: 'Win 5 games',
    remaining: 5,
    expiresInDays: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const castQuest: Quest = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    type: QuestType.CAST,
    description: 'Cast 30 spells',
    remaining: 30,
    expiresInDays: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const colorQuest: Quest = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    type: QuestType.PLAY_COLORS,
    description: 'Play 15 red or green spells',
    remaining: 15,
    expiresInDays: 1,
    colors: [MTGAColor.RED, MTGAColor.GREEN],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('calculateQueueEV', () => {
    test('calculates correct EV for Standard BO1 with 50% win rate', () => {
      const result = calculateQueueEV(QueueType.STANDARD_BO1, 0.5);
      
      expect(result.entryCost).toBe(0);
      expect(result.expectedGold).toBeGreaterThan(0);
      expect(result.expectedGems).toBe(0); // Standard BO1 has no gem rewards
      expect(result.expectedPacks).toBe(0); // Standard BO1 has no pack rewards
      expect(result.netValue).toBe(result.expectedValue); // No entry cost
      expect(result.evPerMinute).toBeGreaterThan(0);
    });

    test('calculates correct EV for Quick Draft with 50% win rate', () => {
      const result = calculateQueueEV(QueueType.QUICK_DRAFT, 0.5);
      
      expect(result.entryCost).toBe(5000);
      expect(result.expectedGold).toBeGreaterThan(0);
      expect(result.expectedGems).toBeGreaterThan(0);
      expect(result.expectedPacks).toBeGreaterThan(0);
      expect(result.netValue).toBeLessThan(result.expectedValue); // Has entry cost
    });

    test('handles 0% win rate correctly', () => {
      const result = calculateQueueEV(QueueType.STANDARD_BO1, 0);
      
      expect(result.expectedGold).toBe(0); // Should get 0-win reward
      expect(result.evPerMinute).toBeGreaterThanOrEqual(0);
    });

    test('handles 100% win rate correctly', () => {
      const result = calculateQueueEV(QueueType.STANDARD_BO1, 1);
      
      expect(result.expectedGold).toBe(250); // Should get max reward (7 wins = 250 gold)
      expect(result.evPerMinute).toBeGreaterThan(0);
    });

    test('EV increases with win rate', () => {
      const lowWinRate = calculateQueueEV(QueueType.STANDARD_BO1, 0.3);
      const highWinRate = calculateQueueEV(QueueType.STANDARD_BO1, 0.7);
      
      expect(highWinRate.expectedValue).toBeGreaterThan(lowWinRate.expectedValue);
      expect(highWinRate.evPerMinute).toBeGreaterThan(lowWinRate.evPerMinute);
    });
  });

  describe('calculateQuestProgressRate', () => {
    test('calculates win quest progress correctly', () => {
      const result = calculateQuestProgressRate(winQuest, QueueType.STANDARD_BO1, 0.6);
      
      expect(result.progressPerGame).toBe(0.6); // 60% win rate * 1.0 multiplier
      expect(result.estimatedGamesToComplete).toBe(Math.ceil(5 / 0.6)); // 9 games
      expect(result.estimatedMinutesToComplete).toBe(9 * 8); // 9 games * 8 minutes
    });

    test('calculates cast quest progress correctly', () => {
      const result = calculateQuestProgressRate(castQuest, QueueType.STANDARD_BO1, 0.5);
      
      expect(result.progressPerGame).toBe(10); // 10 spells per game * 1.0 multiplier
      expect(result.estimatedGamesToComplete).toBe(3); // 30 spells / 10 per game
      expect(result.estimatedMinutesToComplete).toBe(24); // 3 games * 8 minutes
    });

    test('calculates color quest progress correctly', () => {
      const result = calculateQuestProgressRate(colorQuest, QueueType.STANDARD_BO1, 0.5);
      
      expect(result.progressPerGame).toBe(1); // 1 progress per game * 1.0 multiplier
      expect(result.estimatedGamesToComplete).toBe(15); // 15 remaining / 1 per game
      expect(result.estimatedMinutesToComplete).toBe(120); // 15 games * 8 minutes
    });

    test('handles different queue multipliers', () => {
      const bo1Result = calculateQuestProgressRate(winQuest, QueueType.STANDARD_BO1, 0.5);
      const bo3Result = calculateQuestProgressRate(winQuest, QueueType.STANDARD_BO3, 0.5);
      
      expect(bo3Result.progressPerGame).toBeGreaterThan(bo1Result.progressPerGame);
      expect(bo3Result.estimatedGamesToComplete).toBeLessThan(bo1Result.estimatedGamesToComplete);
    });

    test('handles draft format multipliers for cast quests', () => {
      const standardResult = calculateQuestProgressRate(castQuest, QueueType.STANDARD_BO1, 0.5);
      const draftResult = calculateQuestProgressRate(castQuest, QueueType.QUICK_DRAFT, 0.5);
      
      // Draft has 0.8 multiplier for cast quests
      expect(draftResult.progressPerGame).toBe(8); // 10 * 0.8
      expect(draftResult.estimatedGamesToComplete).toBeGreaterThan(standardResult.estimatedGamesToComplete);
    });
  });

  describe('estimateQuestCompletion', () => {
    test('determines if quest can be completed within time budget', () => {
      const result = estimateQuestCompletion(winQuest, QueueType.STANDARD_BO1, 0.6, 120);
      
      expect(result.canComplete).toBe(true); // Should complete in ~72 minutes
      expect(result.estimatedMinutes).toBeLessThan(120);
      expect(result.timeRemaining).toBeGreaterThan(0);
    });

    test('determines if quest cannot be completed within time budget', () => {
      const result = estimateQuestCompletion(colorQuest, QueueType.STANDARD_BO1, 0.5, 60);
      
      expect(result.canComplete).toBe(false); // Needs 120 minutes, only have 60
      expect(result.estimatedMinutes).toBeGreaterThan(60);
      expect(result.timeRemaining).toBe(0);
    });

    test('provides accurate game and time estimates', () => {
      const result = estimateQuestCompletion(castQuest, QueueType.STANDARD_BO1, 0.5, 180);
      
      expect(result.estimatedGames).toBe(3);
      expect(result.estimatedMinutes).toBe(24);
      expect(result.progressPerGame).toBe(10);
    });
  });

  describe('calculateCombinedEV', () => {
    test('includes quest completion bonus in EV calculation', () => {
      const queueOnlyEV = calculateQueueEV(QueueType.STANDARD_BO1, 0.5);
      const combinedEV = calculateCombinedEV(winQuest, QueueType.STANDARD_BO1, 0.5);
      
      expect(combinedEV.expectedValue).toBeGreaterThan(queueOnlyEV.expectedValue);
      expect(combinedEV.questCompletionBonus).toBeGreaterThan(0);
      expect(combinedEV.evPerMinute).toBeGreaterThan(queueOnlyEV.evPerMinute);
    });

    test('amortizes quest bonus over completion games', () => {
      const result = calculateCombinedEV(winQuest, QueueType.STANDARD_BO1, 0.6);
      
      // Quest bonus should be 500 gold / 9 games ≈ 55.56 gold per game
      expect(result.questCompletionBonus).toBeCloseTo(500 / 9, 1);
    });

    test('handles different quest types with same bonus', () => {
      const winResult = calculateCombinedEV(winQuest, QueueType.STANDARD_BO1, 0.5);
      const castResult = calculateCombinedEV(castQuest, QueueType.STANDARD_BO1, 0.5);
      
      // Both should have quest completion bonus, but amortized differently
      expect(winResult.questCompletionBonus).toBeGreaterThan(0);
      expect(castResult.questCompletionBonus).toBeGreaterThan(0);
    });
  });

  describe('compareQueuesForQuest', () => {
    test('returns queues sorted by EV per minute', () => {
      const queues = [QueueType.STANDARD_BO1, QueueType.STANDARD_BO3, QueueType.HISTORIC_BO1];
      const results = compareQueuesForQuest(winQuest, queues, 0.5);
      
      expect(results).toHaveLength(3);
      
      // Results should be sorted by EV per minute, descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].ev.evPerMinute).toBeGreaterThanOrEqual(results[i + 1].ev.evPerMinute);
      }
    });

    test('includes progress calculations for each queue', () => {
      const queues = [QueueType.STANDARD_BO1, QueueType.QUICK_DRAFT];
      const results = compareQueuesForQuest(castQuest, queues, 0.5);
      
      results.forEach(result => {
        expect(result.progressResult.progressPerGame).toBeGreaterThan(0);
        expect(result.progressResult.estimatedGamesToComplete).toBeGreaterThan(0);
        expect(result.progressResult.estimatedMinutesToComplete).toBeGreaterThan(0);
      });
    });

    test('considers quest type multipliers in ranking', () => {
      const queues = [QueueType.STANDARD_BO1, QueueType.QUICK_DRAFT];
      
      // Cast quest should favor Standard (1.0 multiplier) over Draft (0.8 multiplier)
      const castResults = compareQueuesForQuest(castQuest, queues, 0.5);
      const standardResult = castResults.find(r => r.queueType === QueueType.STANDARD_BO1);
      const draftResult = castResults.find(r => r.queueType === QueueType.QUICK_DRAFT);
      
      expect(standardResult?.progressResult.progressPerGame).toBeGreaterThan(
        draftResult?.progressResult.progressPerGame || 0
      );
    });
  });

  describe('validateEVInput', () => {
    test('validates correct input', () => {
      const input = {
        queueType: QueueType.STANDARD_BO1,
        winRate: 0.5,
        quest: {
          type: QuestType.WIN,
          remaining: 5,
        },
      };
      
      const result = validateEVInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    test('rejects invalid win rate', () => {
      const input = {
        queueType: QueueType.STANDARD_BO1,
        winRate: 1.5, // Invalid: > 1
      };
      
      const result = validateEVInput(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Win rate must be between 0 and 1');
    });

    test('rejects invalid queue type', () => {
      const input = {
        queueType: 'invalid_queue',
        winRate: 0.5,
      };
      
      const result = validateEVInput(input);
      expect(result.success).toBe(false);
    });

    test('accepts input without quest', () => {
      const input = {
        queueType: QueueType.STANDARD_BO1,
        winRate: 0.5,
      };
      
      const result = validateEVInput(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles quest with 0 remaining progress', () => {
      const completedQuest: Quest = { ...winQuest, remaining: 0 };
      const result = calculateQuestProgressRate(completedQuest, QueueType.STANDARD_BO1, 0.5);
      
      expect(result.progressPerGame).toBe(0);
      expect(result.estimatedGamesToComplete).toBe(0);
      expect(result.estimatedMinutesToComplete).toBe(0);
    });

    test('handles very low win rates', () => {
      const result = calculateQueueEV(QueueType.STANDARD_BO1, 0.01);
      
      expect(result.expectedValue).toBeGreaterThanOrEqual(0);
      expect(result.evPerMinute).toBeGreaterThanOrEqual(0);
    });

    test('handles very high win rates', () => {
      const result = calculateQueueEV(QueueType.STANDARD_BO1, 0.99);
      
      expect(result.expectedValue).toBeLessThanOrEqual(250); // Max possible reward
      expect(result.evPerMinute).toBeGreaterThan(0);
    });

    test('handles draft formats with entry costs correctly', () => {
      const lowWinRate = calculateQueueEV(QueueType.QUICK_DRAFT, 0.2);
      const highWinRate = calculateQueueEV(QueueType.QUICK_DRAFT, 0.8);
      
      // Low win rate should have negative net value due to entry cost
      expect(lowWinRate.netValue).toBeLessThan(0);
      // High win rate should have better net value than low win rate
      expect(highWinRate.netValue).toBeGreaterThan(lowWinRate.netValue);
      // The expected value should increase with win rate
      expect(highWinRate.expectedValue).toBeGreaterThan(lowWinRate.expectedValue);
    });

    test('handles quest with very large remaining count', () => {
      const largeQuest: Quest = { ...castQuest, remaining: 1000 };
      const result = calculateQuestProgressRate(largeQuest, QueueType.STANDARD_BO1, 0.5);
      
      expect(result.estimatedGamesToComplete).toBe(100); // 1000 / 10 per game
      expect(result.estimatedMinutesToComplete).toBe(800); // 100 games * 8 minutes
    });
  });

  describe('Performance and Accuracy', () => {
    test('calculations complete quickly for typical inputs', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        calculateQueueEV(QueueType.STANDARD_BO1, Math.random());
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete 1000 calculations in < 100ms
    });

    test('EV calculations are mathematically consistent', () => {
      // Test that EV increases monotonically with win rate
      const winRates = [0.1, 0.3, 0.5, 0.7, 0.9];
      const evs = winRates.map(wr => calculateQueueEV(QueueType.STANDARD_BO1, wr).expectedValue);
      
      for (let i = 0; i < evs.length - 1; i++) {
        expect(evs[i + 1]).toBeGreaterThanOrEqual(evs[i]);
      }
    });

    test('quest progress calculations are consistent across queue types', () => {
      const queues = [QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1, QueueType.EXPLORER_BO1];
      
      queues.forEach(queue => {
        const result = calculateQuestProgressRate(winQuest, queue, 0.5);
        expect(result.progressPerGame).toBeGreaterThan(0);
        expect(result.estimatedGamesToComplete).toBeGreaterThan(0);
        expect(result.estimatedMinutesToComplete).toBeGreaterThan(0);
      });
    });
  });
});