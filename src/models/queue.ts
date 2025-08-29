import { z } from 'zod';

// Enum for MTGA queue types
export enum QueueType {
  STANDARD_BO1 = 'standard_bo1',
  STANDARD_BO3 = 'standard_bo3',
  HISTORIC_BO1 = 'historic_bo1',
  QUICK_DRAFT = 'quick_draft',
  MIDWEEK_MAGIC = 'midweek_magic',
}

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