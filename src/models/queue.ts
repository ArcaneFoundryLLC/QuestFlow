import { z } from 'zod';

// Enum for MTGA queue types
export enum QueueType {
  STANDARD_BO1 = 'standard_bo1',
  STANDARD_BO3 = 'standard_bo3',
  HISTORIC_BO1 = 'historic_bo1',
  HISTORIC_BO3 = 'historic_bo3',
  QUICK_DRAFT = 'quick_draft',
  PREMIER_DRAFT = 'premier_draft',
  TRADITIONAL_DRAFT = 'traditional_draft',
  MIDWEEK_MAGIC = 'midweek_magic',
  ALCHEMY_BO1 = 'alchemy_bo1',
  EXPLORER_BO1 = 'explorer_bo1',
}

// Interface for queue reward structure
export interface QueueRewards {
  entryFee: number; // Cost in gold/gems to enter
  winRewards: number[]; // Gold rewards for 0, 1, 2, 3+ wins
  gemRewards?: number[]; // Gem rewards (for draft formats)
  packRewards?: number[]; // Pack rewards
  averageGameLength: number; // Minutes per game
  questMultiplier: {
    win: number; // Multiplier for "win games" quests
    cast: number; // Multiplier for "cast spells" quests
    play_colors: number; // Multiplier for "play colors" quests
  };
}

// Schema for queue rewards validation
export const QueueRewardsSchema = z.object({
  entryFee: z.number().min(0, 'Entry fee cannot be negative'),
  winRewards: z.array(z.number().min(0, 'Win rewards cannot be negative')),
  gemRewards: z.array(z.number().min(0, 'Gem rewards cannot be negative')).optional(),
  packRewards: z.array(z.number().min(0, 'Pack rewards cannot be negative')).optional(),
  averageGameLength: z.number().min(1, 'Average game length must be at least 1 minute'),
  questMultiplier: z.object({
    win: z.number().min(0, 'Win multiplier cannot be negative'),
    cast: z.number().min(0, 'Cast multiplier cannot be negative'),
    play_colors: z.number().min(0, 'Play colors multiplier cannot be negative'),
  }),
});

// Comprehensive MTGA queue reward data based on current game values
export const QUEUE_REWARDS: Record<QueueType, QueueRewards> = {
  [QueueType.STANDARD_BO1]: {
    entryFee: 0,
    winRewards: [0, 25, 50, 100, 150, 200, 250], // 0-6 wins
    averageGameLength: 8,
    questMultiplier: { win: 1, cast: 1, play_colors: 1 }
  },
  [QueueType.STANDARD_BO3]: {
    entryFee: 0,
    winRewards: [0, 100, 200, 300], // 0-3 match wins
    averageGameLength: 20, // Longer due to best-of-3 format
    questMultiplier: { win: 2, cast: 2.5, play_colors: 2.5 } // Higher multipliers for longer matches
  },
  [QueueType.HISTORIC_BO1]: {
    entryFee: 0,
    winRewards: [0, 25, 50, 100, 150, 200, 250],
    averageGameLength: 7, // Slightly faster due to more efficient decks
    questMultiplier: { win: 1, cast: 1, play_colors: 1 }
  },
  [QueueType.HISTORIC_BO3]: {
    entryFee: 0,
    winRewards: [0, 100, 200, 300],
    averageGameLength: 18,
    questMultiplier: { win: 2, cast: 2.5, play_colors: 2.5 }
  },
  [QueueType.QUICK_DRAFT]: {
    entryFee: 5000, // 5000 gold or 750 gems
    winRewards: [50, 100, 200, 300, 450, 650, 950, 1200], // 0-7 wins
    gemRewards: [0, 50, 100, 200, 300, 450, 650, 950], // Gem rewards
    packRewards: [1, 1, 2, 2, 3, 4, 5, 6], // Pack rewards
    averageGameLength: 12,
    questMultiplier: { win: 1, cast: 0.8, play_colors: 1.2 } // Draft favors color diversity
  },
  [QueueType.PREMIER_DRAFT]: {
    entryFee: 10000, // 10000 gold or 1500 gems
    winRewards: [0, 1000, 1500, 1700, 1900, 2100, 2200, 2500], // 0-7 wins
    gemRewards: [50, 250, 400, 600, 800, 1000, 1200, 1600],
    packRewards: [1, 1, 2, 2, 3, 4, 5, 6],
    averageGameLength: 15, // More competitive, longer games
    questMultiplier: { win: 1, cast: 0.8, play_colors: 1.2 }
  },
  [QueueType.TRADITIONAL_DRAFT]: {
    entryFee: 10000,
    winRewards: [0, 3000, 6000], // 0-2 match wins (best of 3)
    gemRewards: [0, 1000, 3000],
    packRewards: [1, 4, 6],
    averageGameLength: 35, // Much longer due to best-of-3 matches
    questMultiplier: { win: 2, cast: 2.5, play_colors: 2.5 }
  },
  [QueueType.MIDWEEK_MAGIC]: {
    entryFee: 0,
    winRewards: [0, 250, 400, 500], // Special event rewards
    averageGameLength: 10, // Varies by format
    questMultiplier: { win: 1, cast: 1.5, play_colors: 1.5 } // Often features special mechanics
  },
  [QueueType.ALCHEMY_BO1]: {
    entryFee: 0,
    winRewards: [0, 25, 50, 100, 150, 200, 250],
    averageGameLength: 9, // Digital-only mechanics can speed up games
    questMultiplier: { win: 1, cast: 1.2, play_colors: 1 } // Alchemy has more spell-based mechanics
  },
  [QueueType.EXPLORER_BO1]: {
    entryFee: 0,
    winRewards: [0, 25, 50, 100, 150, 200, 250],
    averageGameLength: 8,
    questMultiplier: { win: 1, cast: 1, play_colors: 1 }
  },
};

// Schema for quest progress tracking
export const QuestProgressSchema = z.object({
  questId: z.string().uuid('Invalid quest ID format'),
  progressAmount: z
    .number()
    .min(0, 'Progress amount cannot be negative')
    .max(100, 'Progress amount cannot exceed 100'),
});

export type QuestProgress = z.infer<typeof QuestProgressSchema>;

// Schema for rewards
export const RewardsSchema = z.object({
  gold: z.number().min(0, 'Gold rewards cannot be negative'),
  gems: z.number().min(0, 'Gem rewards cannot be negative'),
  packs: z.number().min(0, 'Pack rewards cannot be negative'),
});

export type Rewards = z.infer<typeof RewardsSchema>;

// Schema for plan steps
export const PlanStepSchema = z.object({
  id: z.string().uuid('Invalid step ID format'),
  queue: z.nativeEnum(QueueType, {
    errorMap: () => ({ message: 'Invalid queue type' }),
  }),
  targetGames: z
    .number()
    .int('Target games must be a whole number')
    .min(1, 'Must target at least 1 game')
    .max(50, 'Cannot target more than 50 games in one step'),
  estimatedMinutes: z
    .number()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(300, 'Estimated time cannot exceed 300 minutes'),
  expectedRewards: RewardsSchema,
  questProgress: z.array(QuestProgressSchema),
  completed: z.boolean(),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

// Reward lookup functions with fallback handling

/**
 * Get queue rewards for a specific queue type
 * @param queueType - The queue type to get rewards for
 * @returns QueueRewards object or null if not found
 */
export function getQueueRewards(queueType: QueueType): QueueRewards | null {
  return QUEUE_REWARDS[queueType] || null;
}

/**
 * Get queue rewards with fallback to Standard BO1 if queue not found
 * @param queueType - The queue type to get rewards for
 * @returns QueueRewards object (never null due to fallback)
 */
export function getQueueRewardsWithFallback(queueType: QueueType): QueueRewards {
  return QUEUE_REWARDS[queueType] || QUEUE_REWARDS[QueueType.STANDARD_BO1];
}

/**
 * Calculate expected gold reward for a given win rate and queue
 * @param queueType - The queue type
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Expected gold reward per game
 */
export function calculateExpectedGoldReward(queueType: QueueType, winRate: number): number {
  const rewards = getQueueRewardsWithFallback(queueType);
  const winRewards = rewards.winRewards;
  
  if (winRewards.length === 0) return 0;
  
  // For formats with limited wins (like 7-win formats), calculate expected value
  // using geometric distribution for number of wins before losses
  let expectedReward = 0;
  const currentWinRate = winRate;
  
  for (let wins = 0; wins < winRewards.length - 1; wins++) {
    const probabilityOfExactlyNWins = wins === 0 
      ? (1 - winRate) // Probability of losing first game
      : Math.pow(winRate, wins) * (1 - winRate); // Probability of exactly N wins then a loss
    
    expectedReward += probabilityOfExactlyNWins * winRewards[wins];
  }
  
  // Add probability of reaching maximum wins
  if (winRewards.length > 1) {
    const maxWins = winRewards.length - 1;
    const probabilityOfMaxWins = Math.pow(winRate, maxWins);
    expectedReward += probabilityOfMaxWins * winRewards[maxWins];
  }
  
  return expectedReward;
}

/**
 * Calculate expected gem reward for a given win rate and queue
 * @param queueType - The queue type
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Expected gem reward per game
 */
export function calculateExpectedGemReward(queueType: QueueType, winRate: number): number {
  const rewards = getQueueRewardsWithFallback(queueType);
  const gemRewards = rewards.gemRewards;
  
  if (!gemRewards || gemRewards.length === 0) return 0;
  
  let expectedReward = 0;
  
  for (let wins = 0; wins < gemRewards.length - 1; wins++) {
    const probabilityOfExactlyNWins = wins === 0 
      ? (1 - winRate)
      : Math.pow(winRate, wins) * (1 - winRate);
    
    expectedReward += probabilityOfExactlyNWins * gemRewards[wins];
  }
  
  if (gemRewards.length > 1) {
    const maxWins = gemRewards.length - 1;
    const probabilityOfMaxWins = Math.pow(winRate, maxWins);
    expectedReward += probabilityOfMaxWins * gemRewards[maxWins];
  }
  
  return expectedReward;
}

/**
 * Calculate expected pack reward for a given win rate and queue
 * @param queueType - The queue type
 * @param winRate - Win rate as decimal (0.0 to 1.0)
 * @returns Expected pack reward per game
 */
export function calculateExpectedPackReward(queueType: QueueType, winRate: number): number {
  const rewards = getQueueRewardsWithFallback(queueType);
  const packRewards = rewards.packRewards;
  
  if (!packRewards || packRewards.length === 0) return 0;
  
  let expectedReward = 0;
  
  for (let wins = 0; wins < packRewards.length - 1; wins++) {
    const probabilityOfExactlyNWins = wins === 0 
      ? (1 - winRate)
      : Math.pow(winRate, wins) * (1 - winRate);
    
    expectedReward += probabilityOfExactlyNWins * packRewards[wins];
  }
  
  if (packRewards.length > 1) {
    const maxWins = packRewards.length - 1;
    const probabilityOfMaxWins = Math.pow(winRate, maxWins);
    expectedReward += probabilityOfMaxWins * packRewards[maxWins];
  }
  
  return expectedReward;
}

/**
 * Get all available queue types
 * @returns Array of all QueueType enum values
 */
export function getAllQueueTypes(): QueueType[] {
  return Object.values(QueueType);
}

/**
 * Check if a queue type is valid
 * @param queueType - String to check
 * @returns True if valid queue type
 */
export function isValidQueueType(queueType: string): queueType is QueueType {
  return Object.values(QueueType).includes(queueType as QueueType);
}