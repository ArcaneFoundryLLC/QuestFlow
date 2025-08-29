import { z } from 'zod';
import { Quest, QuestType } from './quest';
import { QueueType, QueueRewards, getQueueRewardsWithFallback, getAllQueueTypes, PlanStep } from './queue';
import { OptimizedPlan, CreatePlanInput } from './plan';
import { 
  calculateQueueEV, 
  calculateQuestProgressRate, 
  estimateQuestCompletion,
  compareQueuesForQuest,
  EVResult 
} from './ev-calculator';
import { v4 as uuidv4 } from 'uuid';

/**
 * Plan Optimizer for MTGA quest optimization
 * Implements greedy optimization algorithm that prioritizes EV per minute
 */

// Schema for optimization input
export const OptimizationInputSchema = z.object({
  quests: z.array(z.object({
    id: z.string().uuid(),
    type: z.nativeEnum(QuestType),
    description: z.string(),
    remaining: z.number().min(0),
    expiresInDays: z.number().min(0),
    colors: z.array(z.string()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })),
  timeBudget: z.number().min(15).max(180),
  winRate: z.number().min(0.3).max(0.8),
  settings: z.object({
    defaultWinRate: z.number().min(0.3).max(0.8),
    preferredQueues: z.array(z.nativeEnum(QueueType)),
    minutesPerGame: z.number().min(1).max(60),
  }).optional(),
});

export type OptimizationInput = z.infer<typeof OptimizationInputSchema>;

// Schema for user settings
export const UserSettingsSchema = z.object({
  defaultWinRate: z.number().min(0.3).max(0.8).default(0.5),
  preferredQueues: z.array(z.nativeEnum(QueueType)).default([
    QueueType.STANDARD_BO1,
    QueueType.HISTORIC_BO1,
    QueueType.QUICK_DRAFT,
  ]),
  minutesPerGame: z.number().min(1).max(60).default(8),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Interface for queue option with EV calculations
interface QueueOption {
  queueType: QueueType;
  ev: EVResult & { questCompletionBonus: number };
  questProgress: Array<{
    questId: string;
    progressAmount: number;
    estimatedGamesToComplete: number;
  }>;
  estimatedMinutes: number;
  canCompleteInBudget: boolean;
  priority: number; // EV per minute adjusted for quest completion urgency
}

// Interface for optimization result
export interface OptimizationResult {
  success: boolean;
  plan?: OptimizedPlan;
  error?: string;
  warnings?: string[];
}

/**
 * Main plan optimization function
 * Implements greedy algorithm that prioritizes EV per minute while ensuring quest completion
 */
export function optimizePlan(
  quests: Quest[],
  timeBudget: number,
  winRate: number,
  settings?: UserSettings
): OptimizationResult {
  try {
    // Validate inputs
    const validationResult = validateOptimizationInput({
      quests,
      timeBudget,
      winRate,
      settings,
    });
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error || 'Invalid optimization input',
      };
    }

    // Use default settings if not provided
    const userSettings = settings || {
      defaultWinRate: 0.5,
      preferredQueues: [QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1, QueueType.QUICK_DRAFT],
      minutesPerGame: 8,
    };

    // Filter out completed quests
    const activeQuests = quests.filter(quest => quest.remaining > 0);
    
    if (activeQuests.length === 0) {
      return {
        success: false,
        error: 'No active quests to optimize',
        warnings: ['All quests are already completed'],
      };
    }

    // Check if any quests can be completed within time budget
    const feasibleQuests = activeQuests.filter(quest => 
      canQuestBeCompletedInTime(quest, timeBudget, winRate, userSettings.preferredQueues)
    );

    if (feasibleQuests.length === 0) {
      return {
        success: false,
        error: 'Insufficient time to complete any quests',
        warnings: ['Consider increasing time budget or adjusting win rate'],
      };
    }

    // Generate optimized plan using greedy algorithm
    const plan = generateOptimizedPlan(feasibleQuests, timeBudget, winRate, userSettings);
    
    return {
      success: true,
      plan,
      warnings: generateWarnings(activeQuests, feasibleQuests, plan),
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown optimization error',
    };
  }
}

/**
 * Generate optimized plan using greedy algorithm
 */
function generateOptimizedPlan(
  quests: Quest[],
  timeBudget: number,
  winRate: number,
  settings: UserSettings
): OptimizedPlan {
  const steps: PlanStep[] = [];
  let remainingTime = timeBudget;
  const questProgress = new Map<string, number>(); // Track progress on each quest
  const completedQuests = new Set<string>();

  // Initialize quest progress tracking
  quests.forEach(quest => {
    questProgress.set(quest.id, quest.remaining);
  });

  // Greedy optimization loop
  while (remainingTime > 0 && questProgress.size > completedQuests.size) {
    // Get best queue option for current state
    const bestOption = findBestQueueOption(
      quests,
      questProgress,
      completedQuests,
      remainingTime,
      winRate,
      settings
    );

    if (!bestOption || bestOption.estimatedMinutes > remainingTime) {
      break; // No viable options or insufficient time
    }

    // Create plan step
    const step = createPlanStep(bestOption, questProgress, completedQuests);
    steps.push(step);

    // Update remaining time
    remainingTime -= bestOption.estimatedMinutes;

    // Update quest progress
    bestOption.questProgress.forEach(progress => {
      const currentProgress = questProgress.get(progress.questId) || 0;
      const newProgress = Math.max(0, currentProgress - progress.progressAmount);
      questProgress.set(progress.questId, newProgress);
      
      if (newProgress === 0) {
        completedQuests.add(progress.questId);
      }
    });
  }

  // Calculate totals
  const totalEstimatedMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
  const totalExpectedRewards = steps.reduce(
    (sum, step) => ({
      gold: sum.gold + step.expectedRewards.gold,
      gems: sum.gems + step.expectedRewards.gems,
      packs: sum.packs + step.expectedRewards.packs,
    }),
    { gold: 0, gems: 0, packs: 0 }
  );

  return {
    id: uuidv4(),
    steps,
    totalEstimatedMinutes,
    totalExpectedRewards,
    questsCompleted: Array.from(completedQuests),
    timeBudget,
    winRate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Find the best queue option for current optimization state
 */
function findBestQueueOption(
  quests: Quest[],
  questProgress: Map<string, number>,
  completedQuests: Set<string>,
  remainingTime: number,
  winRate: number,
  settings: UserSettings
): QueueOption | null {
  const availableQueues = settings.preferredQueues.length > 0 
    ? settings.preferredQueues 
    : getAllQueueTypes();

  let bestOption: QueueOption | null = null;
  let bestPriority = -Infinity;

  // Evaluate each queue type
  for (const queueType of availableQueues) {
    const option = evaluateQueueOption(
      queueType,
      quests,
      questProgress,
      completedQuests,
      remainingTime,
      winRate
    );

    if (option && option.canCompleteInBudget && option.priority > bestPriority) {
      bestOption = option;
      bestPriority = option.priority;
    }
  }

  return bestOption;
}

/**
 * Evaluate a specific queue option for optimization
 */
function evaluateQueueOption(
  queueType: QueueType,
  quests: Quest[],
  questProgress: Map<string, number>,
  completedQuests: Set<string>,
  remainingTime: number,
  winRate: number
): QueueOption | null {
  const rewards = getQueueRewardsWithFallback(queueType);
  
  // Calculate quest progress for this queue
  const questProgressData: Array<{
    questId: string;
    progressAmount: number;
    estimatedGamesToComplete: number;
  }> = [];

  let totalQuestBonus = 0;
  let urgencyMultiplier = 1;

  // Evaluate progress on each active quest
  for (const quest of quests) {
    if (completedQuests.has(quest.id)) continue;
    
    const remaining = questProgress.get(quest.id) || 0;
    if (remaining <= 0) continue;

    const progressResult = calculateQuestProgressRate(quest, queueType, winRate);
    
    if (progressResult.progressPerGame > 0) {
      const progressAmount = Math.min(progressResult.progressPerGame, remaining);
      questProgressData.push({
        questId: quest.id,
        progressAmount,
        estimatedGamesToComplete: progressResult.estimatedGamesToComplete,
      });

      // Add quest completion bonus (500 gold per quest)
      const questCompletionValue = 500;
      const progressRatio = progressAmount / remaining;
      totalQuestBonus += questCompletionValue * progressRatio;

      // Apply urgency multiplier for quests expiring soon
      if (quest.expiresInDays <= 1) {
        urgencyMultiplier = Math.max(urgencyMultiplier, 2.0); // Double priority for expiring quests
      } else if (quest.expiresInDays <= 2) {
        urgencyMultiplier = Math.max(urgencyMultiplier, 1.5); // 50% bonus for soon-expiring quests
      }
    }
  }

  // Calculate base EV for the queue
  const queueEV = calculateQueueEV(queueType, winRate);
  
  // Estimate games needed (use minimum viable games, typically 1-3)
  const estimatedGames = Math.max(1, Math.min(3, 
    Math.ceil(remainingTime / rewards.averageGameLength / 2)
  ));
  
  const estimatedMinutes = estimatedGames * rewards.averageGameLength;
  
  if (estimatedMinutes > remainingTime) {
    return null; // Cannot fit in remaining time
  }

  // Calculate total expected value including quest bonuses
  const totalEV = (queueEV.netValue * estimatedGames) + totalQuestBonus;
  const evPerMinute = totalEV / estimatedMinutes;
  
  // Apply urgency multiplier to priority
  const priority = evPerMinute * urgencyMultiplier;

  return {
    queueType,
    ev: {
      ...queueEV,
      questCompletionBonus: totalQuestBonus / estimatedGames,
    },
    questProgress: questProgressData,
    estimatedMinutes,
    canCompleteInBudget: estimatedMinutes <= remainingTime,
    priority,
  };
}

/**
 * Create a plan step from a queue option
 */
function createPlanStep(
  option: QueueOption,
  questProgress: Map<string, number>,
  completedQuests: Set<string>
): PlanStep {
  const rewards = getQueueRewardsWithFallback(option.queueType);
  const estimatedGames = Math.ceil(option.estimatedMinutes / rewards.averageGameLength);
  
  // Calculate expected rewards for the estimated games
  const expectedRewards = {
    gold: Math.round(option.ev.expectedGold * estimatedGames),
    gems: Math.round(option.ev.expectedGems * estimatedGames),
    packs: Math.round(option.ev.expectedPacks * estimatedGames),
  };

  return {
    id: uuidv4(),
    queue: option.queueType,
    targetGames: estimatedGames,
    estimatedMinutes: option.estimatedMinutes,
    expectedRewards,
    questProgress: option.questProgress.map(progress => ({
      questId: progress.questId,
      progressAmount: Math.min(progress.progressAmount * estimatedGames, 
        questProgress.get(progress.questId) || 0),
    })),
    completed: false,
  };
}

/**
 * Check if a quest can be completed within the time budget
 */
function canQuestBeCompletedInTime(
  quest: Quest,
  timeBudget: number,
  winRate: number,
  preferredQueues: QueueType[]
): boolean {
  const queuesToCheck = preferredQueues.length > 0 ? preferredQueues : getAllQueueTypes();
  
  return queuesToCheck.some(queueType => {
    const completion = estimateQuestCompletion(quest, queueType, winRate, timeBudget);
    return completion.canComplete;
  });
}

/**
 * Generate warnings for the optimization result
 */
function generateWarnings(
  allQuests: Quest[],
  feasibleQuests: Quest[],
  plan: OptimizedPlan
): string[] {
  const warnings: string[] = [];
  
  // Warn about infeasible quests
  const infeasibleQuests = allQuests.filter(
    quest => !feasibleQuests.some(fq => fq.id === quest.id) && quest.remaining > 0
  );
  
  if (infeasibleQuests.length > 0) {
    warnings.push(
      `${infeasibleQuests.length} quest(s) cannot be completed within time budget`
    );
  }

  // Warn about expiring quests
  const expiringQuests = allQuests.filter(
    quest => quest.expiresInDays <= 1 && quest.remaining > 0
  );
  
  if (expiringQuests.length > 0) {
    warnings.push(
      `${expiringQuests.length} quest(s) expire within 24 hours`
    );
  }

  // Warn about unused time
  const unusedTime = plan.timeBudget - plan.totalEstimatedMinutes;
  if (unusedTime > 15) {
    warnings.push(
      `${unusedTime} minutes of unused time - consider adding more quests or increasing targets`
    );
  }

  return warnings;
}

/**
 * Validate optimization input
 */
function validateOptimizationInput(input: unknown): { 
  success: boolean; 
  data?: OptimizationInput; 
  error?: string 
} {
  try {
    const validated = OptimizationInputSchema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
      };
    }
    return { success: false, error: 'Invalid input format' };
  }
}

/**
 * Create default user settings
 */
export function createDefaultSettings(): UserSettings {
  return {
    defaultWinRate: 0.5,
    preferredQueues: [
      QueueType.STANDARD_BO1,
      QueueType.HISTORIC_BO1,
      QueueType.QUICK_DRAFT,
    ],
    minutesPerGame: 8,
  };
}

/**
 * Update plan with step completion
 */
export function updatePlanProgress(
  plan: OptimizedPlan,
  stepId: string,
  completed: boolean
): OptimizedPlan {
  const updatedSteps = plan.steps.map(step => 
    step.id === stepId ? { ...step, completed } : step
  );

  return {
    ...plan,
    steps: updatedSteps,
    updatedAt: new Date(),
  };
}

/**
 * Recalculate plan with updated quest progress
 */
export function recalculatePlan(
  originalPlan: OptimizedPlan,
  updatedQuests: Quest[],
  settings?: UserSettings
): OptimizationResult {
  // Calculate remaining time based on completed steps
  const completedTime = originalPlan.steps
    .filter(step => step.completed)
    .reduce((sum, step) => sum + step.estimatedMinutes, 0);
  
  const remainingTime = originalPlan.timeBudget - completedTime;
  
  if (remainingTime <= 0) {
    return {
      success: true,
      plan: {
        ...originalPlan,
        updatedAt: new Date(),
      },
      warnings: ['All allocated time has been used'],
    };
  }

  // If remaining time is less than minimum (15 minutes), return current plan
  if (remainingTime < 15) {
    return {
      success: true,
      plan: {
        ...originalPlan,
        updatedAt: new Date(),
      },
      warnings: ['Insufficient remaining time for additional optimization'],
    };
  }

  // Re-optimize with remaining time and updated quests
  return optimizePlan(updatedQuests, remainingTime, originalPlan.winRate, settings);
}