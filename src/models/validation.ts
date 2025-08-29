import { z } from 'zod';
import { QuestSchema, CreateQuestSchema, UpdateQuestSchema } from './quest';
import { OptimizedPlanSchema, CreatePlanSchema, UpdatePlanSchema } from './plan';
import { UserSettingsSchema, UpdateSettingsSchema, UserSettings } from './settings';
import { PlanStepSchema, QuestProgressSchema, RewardsSchema } from './queue';

// Generic validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Generic validation function
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: ValidationError[] = result.error.errors.map((error) => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code,
    }));

    return {
      success: false,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          field: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
        },
      ],
    };
  }
}

// Quest validation functions
export function validateQuest(data: unknown): ValidationResult<z.infer<typeof QuestSchema>> {
  return validateData(QuestSchema, data);
}

export function validateCreateQuest(data: unknown): ValidationResult<z.infer<typeof CreateQuestSchema>> {
  return validateData(CreateQuestSchema, data);
}

export function validateUpdateQuest(data: unknown): ValidationResult<z.infer<typeof UpdateQuestSchema>> {
  return validateData(UpdateQuestSchema, data);
}

// Plan validation functions
export function validatePlan(data: unknown): ValidationResult<z.infer<typeof OptimizedPlanSchema>> {
  return validateData(OptimizedPlanSchema, data);
}

export function validateCreatePlan(data: unknown): ValidationResult<z.infer<typeof CreatePlanSchema>> {
  return validateData(CreatePlanSchema, data);
}

export function validateUpdatePlan(data: unknown): ValidationResult<z.infer<typeof UpdatePlanSchema>> {
  return validateData(UpdatePlanSchema, data);
}

export function validatePlanStep(data: unknown): ValidationResult<z.infer<typeof PlanStepSchema>> {
  return validateData(PlanStepSchema, data);
}

// Settings validation functions
export function validateSettings(data: unknown): ValidationResult<UserSettings> {
  return validateData(UserSettingsSchema, data);
}

export function validateUpdateSettings(data: unknown): ValidationResult<z.infer<typeof UpdateSettingsSchema>> {
  return validateData(UpdateSettingsSchema, data);
}

// Utility validation functions
export function validateQuestProgress(data: unknown): ValidationResult<z.infer<typeof QuestProgressSchema>> {
  return validateData(QuestProgressSchema, data);
}

export function validateRewards(data: unknown): ValidationResult<z.infer<typeof RewardsSchema>> {
  return validateData(RewardsSchema, data);
}

// Batch validation for arrays
export function validateQuestArray(data: unknown[]): ValidationResult<z.infer<typeof QuestSchema>[]> {
  const results = data.map((item, index) => {
    const result = validateQuest(item);
    if (!result.success) {
      return {
        success: false,
        errors: result.errors?.map(error => ({
          ...error,
          field: `[${index}].${error.field}`,
        })) || [],
      };
    }
    return { success: true, data: result.data };
  });

  const errors = results
    .filter(result => !result.success)
    .flatMap(result => result.errors || []);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const validData = results
    .filter(result => result.success)
    .map(result => result.data!);

  return { success: true, data: validData };
}

// Custom validation helpers
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidWinRate(value: number): boolean {
  return value >= 0.3 && value <= 0.8;
}

export function isValidTimeBudget(value: number): boolean {
  return Number.isInteger(value) && value >= 15 && value <= 180;
}

// Error formatting utilities
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join('; ');
}

export function getFieldErrors(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter(error => error.field === field || error.field.startsWith(`${field}.`));
}