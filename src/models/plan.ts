import { z } from 'zod';
import { PlanStepSchema, RewardsSchema } from './queue';

// Schema for optimized plan
export const OptimizedPlanSchema = z.object({
  id: z.string().uuid('Invalid plan ID format'),
  steps: z
    .array(PlanStepSchema)
    .min(1, 'Plan must have at least one step')
    .max(10, 'Plan cannot have more than 10 steps'),
  totalEstimatedMinutes: z
    .number()
    .min(1, 'Total time must be at least 1 minute')
    .max(300, 'Total time cannot exceed 300 minutes'),
  totalExpectedRewards: RewardsSchema,
  questsCompleted: z
    .array(z.string().uuid())
    .max(20, 'Cannot complete more than 20 quests in one plan'),
  timeBudget: z
    .number()
    .int('Time budget must be a whole number')
    .min(15, 'Time budget must be at least 15 minutes')
    .max(180, 'Time budget cannot exceed 180 minutes'),
  winRate: z
    .number()
    .min(0.3, 'Win rate cannot be less than 30%')
    .max(0.8, 'Win rate cannot exceed 80%'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OptimizedPlan = z.infer<typeof OptimizedPlanSchema>;

// Plan creation input schema
export const CreatePlanSchema = OptimizedPlanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

// Plan update schema for step completion
export const UpdatePlanSchema = z.object({
  stepId: z.string().uuid('Invalid step ID format'),
  completed: z.boolean(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;