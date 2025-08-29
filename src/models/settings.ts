import { z } from 'zod';
import { QueueType } from './queue';

// Schema for user settings
export const UserSettingsSchema = z.object({
  defaultWinRate: z
    .number()
    .min(0.3, 'Default win rate cannot be less than 30%')
    .max(0.8, 'Default win rate cannot exceed 80%')
    .default(0.5),
  preferredQueues: z
    .array(z.nativeEnum(QueueType))
    .min(1, 'Must have at least one preferred queue')
    .max(5, 'Cannot have more than 5 preferred queues')
    .default([QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1]),
  minutesPerGame: z
    .number()
    .min(3, 'Minutes per game cannot be less than 3')
    .max(30, 'Minutes per game cannot exceed 30')
    .default(8),
  enableNotifications: z.boolean().default(false),
  autoSave: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Settings update schema (all fields optional)
export const UpdateSettingsSchema = UserSettingsSchema.partial();

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

// Default settings factory
export const createDefaultSettings = (): UserSettings => {
  return UserSettingsSchema.parse({});
};