// Quest models and types
export {
  QuestType,
  MTGAColor,
  QuestSchema,
  CreateQuestSchema,
  UpdateQuestSchema,
  type Quest,
  type CreateQuestInput,
  type UpdateQuestInput,
} from './quest';

// Queue and plan step models
export {
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
  type QuestProgress,
  type Rewards,
  type PlanStep,
  type QueueRewards,
} from './queue';

// Plan models
export {
  OptimizedPlanSchema,
  CreatePlanSchema,
  UpdatePlanSchema,
  type OptimizedPlan,
  type CreatePlanInput,
  type UpdatePlanInput,
} from './plan';

// Settings models
export {
  UserSettingsSchema,
  UpdateSettingsSchema,
  createDefaultSettings,
  type UserSettings,
  type UpdateSettingsInput,
} from './settings';

// EV Calculator
export {
  EVCalculationInputSchema,
  EVResultSchema,
  QuestProgressResultSchema,
  calculateQueueEV,
  calculateQuestProgressRate,
  estimateQuestCompletion,
  calculateCombinedEV,
  compareQueuesForQuest,
  validateEVInput,
  type EVCalculationInput,
  type EVResult,
  type QuestProgressResult,
} from './ev-calculator';

// Plan Optimizer
export {
  OptimizationInputSchema,
  UserSettingsSchema as PlanOptimizerUserSettingsSchema,
  optimizePlan,
  createDefaultSettings as createDefaultOptimizerSettings,
  updatePlanProgress,
  recalculatePlan,
  type OptimizationInput,
  type UserSettings as PlanOptimizerUserSettings,
  type OptimizationResult,
} from './plan-optimizer';

// Validation utilities
export {
  validateQuest,
  validateCreateQuest,
  validateUpdateQuest,
  validatePlan,
  validateCreatePlan,
  validateUpdatePlan,
  validatePlanStep,
  validateSettings,
  validateUpdateSettings,
  validateQuestProgress,
  validateRewards,
  validateQuestArray,
  isValidUUID,
  isValidWinRate,
  isValidTimeBudget,
  formatValidationErrors,
  getFieldErrors,
  type ValidationResult,
  type ValidationError,
} from './validation';