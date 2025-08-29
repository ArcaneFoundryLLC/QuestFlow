import { z } from 'zod';
import { Quest, QuestType } from './quest';
import { QueueType, QueueRewards, getQueueRewardsWithFallback } from './queue';

/**
 * EV Calculator for MTGA quest optimization
 * Implements core EV formula: P(win)×reward_win + (1-P)×reward_loss - entry_cost
 */

// Schema for EV calculation input
export const EVCalculationInputSchema = z.object({
  queueType: z.nativeEnum(QueueType),
  winRate: z.number().min(0).max(1, 'Win rate must be between 0 and 1'),
  quest: z.object({
    type: z.nativeEnum(QuestType),
    remaining: z.number().min(0),
  }).optional(),
});

export type EVCalculationInput = z.infer<typeof EVCalculationInputSchema>;

// Schema for EV calculation result
export const EVResultSchema = z.object({
  expectedValue: z.number(),
  expectedGold: z.number(),
  expectedGems: z.number(),
  expectedPacks: z.number(),
  entryCost: z.number(),
  netValue: z.number(),
  evPerMinute: z.number(),
});

export type EVResult = z.infer<typeof EVResultSchema>;

// Schema for quest progress calculation
export const QuestProgressResultSchema = z.object({
  progressPerGame: z.number(),
  estimatedGamesToComplete: z.number(),
  estimatedMinutesToComplete: z.number(),
});

export type QuestProgressResult = z.infer<typeof QuestProgressResultSchema>;

/**
 * Calculate the expected value (EV) for a specific queue and win rate
 * @param queueType - The MTGA queue type
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns EVResult with detailed breakdown
 */
export function calculateQueueEV(queueType: QueueType, winRate: number): EVResult {
  const rewards = getQueueRewardsWithFallback(queueType);
  
  // Calculate expected rewards using the geometric distribution model
  const expectedGold = calculateExpectedReward(rewards.winRewards, winRate);
  const expectedGems = rewards.gemRewards ? calculateExpectedReward(rewards.gemRewards, winRate) : 0;
  const expectedPacks = rewards.packRewards ? calculateExpectedReward(rewards.packRewards, winRate) : 0;
  
  // Convert all rewards to gold equivalent for total EV
  // Standard conversion: 1 gem = 5 gold, 1 pack = 1000 gold
  const goldEquivalent = expectedGold + (expectedGems * 5) + (expectedPacks * 1000);
  
  // Net value after entry cost
  const netValue = goldEquivalent - rewards.entryFee;
  
  // EV per minute based on average game length
  const evPerMinute = netValue / rewards.averageGameLength;
  
  return {
    expectedValue: goldEquivalent,
    expectedGold,
    expectedGems,
    expectedPacks,
    entryCost: rewards.entryFee,
    netValue,
    evPerMinute,
  };
}

/**
 * Calculate expected reward using geometric distribution for win-based rewards
 * @param rewards - Array of rewards for 0, 1, 2, ... wins
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Expected reward value
 */
function calculateExpectedReward(rewards: number[], winRate: number): number {
  if (rewards.length === 0) return 0;
  if (winRate === 0) return rewards[0]; // Always lose first game
  if (winRate === 1) return rewards[rewards.length - 1]; // Always win to max
  
  let expectedReward = 0;
  
  // Calculate probability and reward for each possible outcome
  for (let wins = 0; wins < rewards.length; wins++) {
    let probability: number;
    
    if (wins === 0) {
      // Probability of losing the first game
      probability = 1 - winRate;
    } else if (wins === rewards.length - 1) {
      // Probability of reaching maximum wins (win all games to the end)
      probability = Math.pow(winRate, wins);
    } else {
      // Probability of exactly N wins then a loss
      probability = Math.pow(winRate, wins) * (1 - winRate);
    }
    
    expectedReward += probability * rewards[wins];
  }
  
  return expectedReward;
}

/**
 * Calculate quest progress rate for different quest types and queues
 * @param quest - The quest to calculate progress for
 * @param queueType - The queue type being played
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns QuestProgressResult with progress calculations
 */
export function calculateQuestProgressRate(
  quest: Quest,
  queueType: QueueType,
  winRate: number
): QuestProgressResult {
  const rewards = getQueueRewardsWithFallback(queueType);
  const multiplier = rewards.questMultiplier[quest.type];
  
  let baseProgressPerGame: number;
  
  switch (quest.type) {
    case QuestType.WIN:
      // Win quests: progress = win_rate * multiplier
      baseProgressPerGame = winRate * multiplier;
      break;
      
    case QuestType.CAST:
      // Cast spells quests: progress regardless of win/loss, but varies by format
      // Assume average of 8-12 spells per game, modified by queue multiplier
      baseProgressPerGame = 10 * multiplier;
      break;
      
    case QuestType.PLAY_COLORS:
      // Play colors quests: progress if deck contains required colors
      // Assume 100% progress if playing appropriate colors, modified by multiplier
      baseProgressPerGame = 1 * multiplier;
      break;
      
    default:
      baseProgressPerGame = 1;
  }
  
  // Ensure progress doesn't exceed quest requirements per game
  const progressPerGame = Math.min(baseProgressPerGame, quest.remaining);
  
  // Calculate games needed to complete quest
  const estimatedGamesToComplete = quest.remaining === 0 
    ? 0
    : progressPerGame > 0 
      ? Math.ceil(quest.remaining / progressPerGame)
      : Infinity;
  
  // Calculate time to complete
  const estimatedMinutesToComplete = quest.remaining === 0
    ? 0
    : estimatedGamesToComplete === Infinity
      ? Infinity
      : estimatedGamesToComplete * rewards.averageGameLength;
  
  return {
    progressPerGame,
    estimatedGamesToComplete,
    estimatedMinutesToComplete,
  };
}

/**
 * Calculate completion time estimator based on win rates and queue characteristics
 * @param quest - The quest to estimate completion time for
 * @param queueType - The queue type being played
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @param timeBudgetMinutes - Available time budget in minutes
 * @returns Object with completion estimates and feasibility
 */
export function estimateQuestCompletion(
  quest: Quest,
  queueType: QueueType,
  winRate: number,
  timeBudgetMinutes: number
): {
  canComplete: boolean;
  estimatedMinutes: number;
  estimatedGames: number;
  progressPerGame: number;
  timeRemaining: number;
} {
  const progressResult = calculateQuestProgressRate(quest, queueType, winRate);
  const rewards = getQueueRewardsWithFallback(queueType);
  
  const canComplete = progressResult.estimatedMinutesToComplete <= timeBudgetMinutes;
  const timeRemaining = timeBudgetMinutes - progressResult.estimatedMinutesToComplete;
  
  return {
    canComplete,
    estimatedMinutes: progressResult.estimatedMinutesToComplete,
    estimatedGames: progressResult.estimatedGamesToComplete,
    progressPerGame: progressResult.progressPerGame,
    timeRemaining: Math.max(0, timeRemaining),
  };
}

/**
 * Calculate combined EV for quest completion and queue rewards
 * @param quest - The quest being worked on
 * @param queueType - The queue type being played
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Combined EV including quest completion bonus
 */
export function calculateCombinedEV(
  quest: Quest,
  queueType: QueueType,
  winRate: number
): EVResult & { questCompletionBonus: number } {
  const queueEV = calculateQueueEV(queueType, winRate);
  const progressResult = calculateQuestProgressRate(quest, queueType, winRate);
  
  // Quest completion bonuses (typical MTGA quest rewards)
  const questRewardsByType = {
    [QuestType.WIN]: 500, // 500 gold for win quests
    [QuestType.CAST]: 500, // 500 gold for cast quests  
    [QuestType.PLAY_COLORS]: 500, // 500 gold for color quests
  };
  
  const questCompletionBonus = questRewardsByType[quest.type] || 500;
  
  // Amortize quest bonus over the games needed to complete it
  const questBonusPerGame = progressResult.estimatedGamesToComplete > 0
    ? questCompletionBonus / progressResult.estimatedGamesToComplete
    : 0;
  
  return {
    ...queueEV,
    expectedValue: queueEV.expectedValue + questBonusPerGame,
    netValue: queueEV.netValue + questBonusPerGame,
    evPerMinute: (queueEV.netValue + questBonusPerGame) / getQueueRewardsWithFallback(queueType).averageGameLength,
    questCompletionBonus: questBonusPerGame,
  };
}

/**
 * Compare EV across multiple queues for a given quest and win rate
 * @param quest - The quest to optimize for
 * @param queueTypes - Array of queue types to compare
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Array of results sorted by EV per minute (descending)
 */
export function compareQueuesForQuest(
  quest: Quest,
  queueTypes: QueueType[],
  winRate: number
): Array<{
  queueType: QueueType;
  ev: EVResult & { questCompletionBonus: number };
  progressResult: QuestProgressResult;
}> {
  const results = queueTypes.map(queueType => ({
    queueType,
    ev: calculateCombinedEV(quest, queueType, winRate),
    progressResult: calculateQuestProgressRate(quest, queueType, winRate),
  }));
  
  // Sort by EV per minute, descending
  return results.sort((a, b) => b.ev.evPerMinute - a.ev.evPerMinute);
}

/**
 * Validate EV calculation inputs
 * @param input - The input to validate
 * @returns Validation result
 */
export function validateEVInput(input: unknown): { success: boolean; data?: EVCalculationInput; error?: string } {
  try {
    const validated = EVCalculationInputSchema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: 'Invalid input format' };
  }
}