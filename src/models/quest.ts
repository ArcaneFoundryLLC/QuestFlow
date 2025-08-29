import { z } from 'zod';

// Enum for quest types
export enum QuestType {
  WIN = 'win',
  CAST = 'cast',
  PLAY_COLORS = 'play_colors',
}

// Enum for MTGA colors
export enum MTGAColor {
  WHITE = 'W',
  BLUE = 'U',
  BLACK = 'B',
  RED = 'R',
  GREEN = 'G',
}

// Zod schema for Quest validation
export const QuestSchema = z.object({
  id: z.string().uuid('Invalid quest ID format'),
  type: z.nativeEnum(QuestType, {
    errorMap: () => ({ message: 'Quest type must be win, cast, or play_colors' }),
  }),
  description: z
    .string()
    .min(1, 'Quest description cannot be empty')
    .max(200, 'Quest description must be 200 characters or less'),
  remaining: z
    .number()
    .int('Remaining count must be a whole number')
    .min(0, 'Remaining count cannot be negative')
    .max(100, 'Remaining count cannot exceed 100'),
  expiresInDays: z
    .number()
    .int('Expiration days must be a whole number')
    .min(0, 'Quest cannot have negative expiration days')
    .max(7, 'Quest expiration cannot exceed 7 days'),
  colors: z
    .array(z.nativeEnum(MTGAColor))
    .optional()
    .refine(
      (colors) => !colors || colors.length <= 5,
      'Cannot have more than 5 colors'
    )
    .refine(
      (colors) => !colors || new Set(colors).size === colors.length,
      'Colors must be unique'
    ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript interface derived from Zod schema
export type Quest = z.infer<typeof QuestSchema>;

// Quest creation input schema (without generated fields)
export const CreateQuestSchema = QuestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateQuestInput = z.infer<typeof CreateQuestSchema>;

// Quest update input schema (partial, excluding generated fields)
export const UpdateQuestSchema = QuestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type UpdateQuestInput = z.infer<typeof UpdateQuestSchema>;