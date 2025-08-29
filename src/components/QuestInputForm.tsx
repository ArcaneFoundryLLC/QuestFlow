'use client';

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, Input, Card } from './atoms';
import { cn } from '@/utils/cn';
import {
  Quest,
  QuestType,
  MTGAColor,
  CreateQuestInput,
  UpdateQuestInput,
  validateCreateQuest,
  validateUpdateQuest,
  isValidWinRate,
  isValidTimeBudget,
  formatValidationErrorsAsRecord,
} from '@/models';

export interface QuestInputFormProps {
  initialQuests?: Quest[];
  initialTimeBudget?: number;
  initialWinRate?: number;
  onPlanGenerate: () => void;
  onQuestsChange?: (quests: Quest[]) => void;
  onTimeBudgetChange?: (timeBudget: number) => void;
  onWinRateChange?: (winRate: number) => void;
  className?: string;
}

interface QuestFormData {
  type: QuestType;
  description: string;
  remaining: string;
  expiresInDays: string;
  colors: MTGAColor[];
}

const INITIAL_QUEST_FORM: QuestFormData = {
  type: QuestType.WIN,
  description: '',
  remaining: '',
  expiresInDays: '3',
  colors: [],
};

const QUEST_TYPE_OPTIONS = [
  { value: QuestType.WIN, label: 'Win Games', description: 'Win X games in any format' },
  { value: QuestType.CAST, label: 'Cast Spells', description: 'Cast X spells of specific colors' },
  { value: QuestType.PLAY_COLORS, label: 'Play Colors', description: 'Play X games with specific colors' },
];

const COLOR_OPTIONS = [
  { value: MTGAColor.WHITE, label: 'White', symbol: 'W', color: 'bg-yellow-100 text-yellow-800' },
  { value: MTGAColor.BLUE, label: 'Blue', symbol: 'U', color: 'bg-blue-100 text-blue-800' },
  { value: MTGAColor.BLACK, label: 'Black', symbol: 'B', color: 'bg-gray-100 text-gray-800' },
  { value: MTGAColor.RED, label: 'Red', symbol: 'R', color: 'bg-red-100 text-red-800' },
  { value: MTGAColor.GREEN, label: 'Green', symbol: 'G', color: 'bg-green-100 text-green-800' },
];

const WIN_RATE_TOOLTIPS = {
  30: 'New player or learning new format',
  40: 'Casual player with some experience',
  50: 'Average player (recommended starting point)',
  60: 'Experienced player with good deck',
  70: 'Highly skilled player with optimized deck',
  80: 'Expert player with meta deck',
};

export const QuestInputForm: React.FC<QuestInputFormProps> = ({
  initialQuests = [],
  initialTimeBudget = 60,
  initialWinRate = 50,
  onPlanGenerate,
  onQuestsChange,
  onTimeBudgetChange,
  onWinRateChange,
  className,
}) => {
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [timeBudget, setTimeBudget] = useState(initialTimeBudget);
  const [winRate, setWinRate] = useState(initialWinRate);
  const [questForm, setQuestForm] = useState<QuestFormData>(INITIAL_QUEST_FORM);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isGeneratingPlan] = useState(false);

  // Validation helpers
  const validateTimeBudget = useCallback((value: number): string | null => {
    if (!isValidTimeBudget(value)) {
      return 'Time budget must be between 15 and 180 minutes';
    }
    return null;
  }, []);

  const validateWinRateValue = useCallback((value: number): string | null => {
    if (!isValidWinRate(value / 100)) {
      return 'Win rate must be between 30% and 80%';
    }
    return null;
  }, []);

  // Quest form handlers
  const handleQuestFormChange = useCallback((field: keyof QuestFormData, value: string | QuestType | MTGAColor[]) => {
    setQuestForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleColorToggle = useCallback((color: MTGAColor) => {
    setQuestForm(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color],
    }));
  }, []);

  const validateQuestForm = useCallback((): boolean => {
    const questData: CreateQuestInput = {
      type: questForm.type,
      description: questForm.description.trim(),
      remaining: parseInt(questForm.remaining, 10),
      expiresInDays: parseInt(questForm.expiresInDays, 10),
      colors: questForm.colors.length > 0 ? questForm.colors : undefined,
    };

    const validation = validateCreateQuest(questData);
    
    if (!validation.success) {
      const errors = formatValidationErrorsAsRecord(validation.errors || []);
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  }, [questForm]);

  const handleAddQuest = useCallback(() => {
    if (!validateQuestForm()) return;

    const newQuest: Quest = {
      id: uuidv4(),
      type: questForm.type,
      description: questForm.description.trim(),
      remaining: parseInt(questForm.remaining, 10),
      expiresInDays: parseInt(questForm.expiresInDays, 10),
      colors: questForm.colors.length > 0 ? questForm.colors : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedQuests = [...quests, newQuest];
    setQuests(updatedQuests);
    setQuestForm(INITIAL_QUEST_FORM);
    setShowAddForm(false);
    onQuestsChange?.(updatedQuests);
  }, [quests, questForm, validateQuestForm, onQuestsChange]);

  const handleEditQuest = useCallback((questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    setQuestForm({
      type: quest.type,
      description: quest.description,
      remaining: quest.remaining.toString(),
      expiresInDays: quest.expiresInDays.toString(),
      colors: quest.colors || [],
    });
    setEditingQuestId(questId);
    setShowAddForm(true);
  }, [quests]);

  const handleUpdateQuest = useCallback(() => {
    if (!editingQuestId || !validateQuestForm()) return;

    const updateData: UpdateQuestInput = {
      type: questForm.type,
      description: questForm.description.trim(),
      remaining: parseInt(questForm.remaining, 10),
      expiresInDays: parseInt(questForm.expiresInDays, 10),
      colors: questForm.colors.length > 0 ? questForm.colors : undefined,
    };

    const validation = validateUpdateQuest(updateData);
    if (!validation.success) {
      const errors = formatValidationErrorsAsRecord(validation.errors || []);
      setFormErrors(errors);
      return;
    }

    const updatedQuests = quests.map(quest =>
      quest.id === editingQuestId
        ? { ...quest, ...updateData, updatedAt: new Date() }
        : quest
    );

    setQuests(updatedQuests);
    setQuestForm(INITIAL_QUEST_FORM);
    setEditingQuestId(null);
    setShowAddForm(false);
    onQuestsChange?.(updatedQuests);
  }, [editingQuestId, quests, questForm, validateQuestForm, onQuestsChange]);

  const handleDeleteQuest = useCallback((questId: string) => {
    const updatedQuests = quests.filter(q => q.id !== questId);
    setQuests(updatedQuests);
    onQuestsChange?.(updatedQuests);
  }, [quests, onQuestsChange]);

  const handleCancelEdit = useCallback(() => {
    setQuestForm(INITIAL_QUEST_FORM);
    setEditingQuestId(null);
    setShowAddForm(false);
    setFormErrors({});
  }, []);

  // Time budget handlers
  const handleTimeBudgetChange = useCallback((value: number) => {
    setTimeBudget(value);
    onTimeBudgetChange?.(value);
  }, [onTimeBudgetChange]);

  // Win rate handlers
  const handleWinRateChange = useCallback((value: number) => {
    setWinRate(value);
    onWinRateChange?.(value);
  }, [onWinRateChange]);

  // Plan generation (now handled by parent component)
  const handleGeneratePlan = useCallback(() => {
    onPlanGenerate();
  }, [onPlanGenerate]);

  const getWinRateTooltip = (rate: number): string => {
    const closest = Object.keys(WIN_RATE_TOOLTIPS)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev
      );
    return WIN_RATE_TOOLTIPS[closest as keyof typeof WIN_RATE_TOOLTIPS];
  };

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Quest List Section */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Quests</h2>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            disabled={showAddForm}
            className="w-full sm:w-auto"
          >
            Add Quest
          </Button>
        </div>

        {quests.length === 0 && !showAddForm && (
          <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
            <p className="mb-2">No quests added yet</p>
            <p className="text-sm">Add your MTGA daily quests to get started</p>
          </div>
        )}

        {/* Quest List */}
        {quests.map((quest) => (
          <div
            key={quest.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg mb-3 last:mb-0 gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-600">
                  {QUEST_TYPE_OPTIONS.find(opt => opt.value === quest.type)?.label}
                </span>
                {quest.colors && quest.colors.length > 0 && (
                  <div className="flex gap-1">
                    {quest.colors.map(color => {
                      const colorOption = COLOR_OPTIONS.find(opt => opt.value === color);
                      return (
                        <span
                          key={color}
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded',
                            colorOption?.color
                          )}
                        >
                          {colorOption?.symbol}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-gray-900 mb-1 break-words">{quest.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                <span>{quest.remaining} remaining</span>
                <span>Expires in {quest.expiresInDays} day{quest.expiresInDays !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:flex-col sm:gap-1 lg:flex-row lg:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditQuest(quest.id)}
                className="flex-1 sm:flex-none"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteQuest(quest.id)}
                className="flex-1 sm:flex-none"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}

        {/* Add/Edit Quest Form */}
        {showAddForm && (
          <Card variant="outlined" className="mt-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              {editingQuestId ? 'Edit Quest' : 'Add New Quest'}
            </h3>
            
            <div className="space-y-4">
              {/* Quest Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quest Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {QUEST_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center p-3 border rounded-lg cursor-pointer transition-colors touch-manipulation min-h-[44px]',
                        questForm.type === option.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="questType"
                        value={option.value}
                        checked={questForm.type === option.value}
                        onChange={(e) => handleQuestFormChange('type', e.target.value as QuestType)}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {formErrors.type && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>
                )}
              </div>

              {/* Description */}
              <Input
                label="Quest Description"
                value={questForm.description}
                onChange={(e) => handleQuestFormChange('description', e.target.value)}
                placeholder="e.g., Win 5 games"
                error={formErrors.description}
                maxLength={200}
              />

              {/* Remaining Count */}
              <Input
                label="Remaining Count"
                type="number"
                value={questForm.remaining}
                onChange={(e) => handleQuestFormChange('remaining', e.target.value)}
                placeholder="0"
                min="0"
                max="100"
                error={formErrors.remaining}
              />

              {/* Expiration Days */}
              <Input
                label="Expires in Days"
                type="number"
                value={questForm.expiresInDays}
                onChange={(e) => handleQuestFormChange('expiresInDays', e.target.value)}
                min="0"
                max="7"
                error={formErrors.expiresInDays}
                helperText="Number of days until quest expires"
              />

              {/* Color Selection (for cast/play_colors quests) */}
              {(questForm.type === QuestType.CAST || questForm.type === QuestType.PLAY_COLORS) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colors Required
                  </label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorToggle(color.value)}
                        className={cn(
                          'px-3 py-2 text-sm font-medium rounded-lg border transition-colors touch-manipulation min-h-[44px]',
                          questForm.colors.includes(color.value)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        )}
                      >
                        <span className="sm:hidden">{color.symbol}</span>
                        <span className="hidden sm:inline">{color.symbol} {color.label}</span>
                      </button>
                    ))}
                  </div>
                  {formErrors.colors && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.colors}</p>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
                <Button
                  onClick={editingQuestId ? handleUpdateQuest : handleAddQuest}
                  disabled={!questForm.description.trim() || questForm.remaining === ''}
                  className="flex-1 sm:flex-none"
                >
                  {editingQuestId ? 'Update Quest' : 'Add Quest'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Card>

      {/* Time Budget Section */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Budget</h2>
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="time-budget-slider"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Available Time: <span className="font-semibold">{timeBudget} minutes</span>
            </label>
            <input
              id="time-budget-slider"
              type="range"
              min="15"
              max="180"
              step="5"
              value={timeBudget}
              onChange={(e) => handleTimeBudgetChange(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
              style={{ minHeight: '44px' }}
              aria-label={`Available Time: ${timeBudget} minutes`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>15 min</span>
              <span>90 min</span>
              <span>180 min</span>
            </div>
          </div>
          {validateTimeBudget(timeBudget) && (
            <p className="text-sm text-red-600">{validateTimeBudget(timeBudget)}</p>
          )}
        </div>
      </Card>

      {/* Win Rate Section */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Win Rate</h2>
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="win-rate-slider"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Expected Win Rate: <span className="font-semibold">{winRate}%</span>
            </label>
            <input
              id="win-rate-slider"
              type="range"
              min="30"
              max="80"
              step="5"
              value={winRate}
              onChange={(e) => handleWinRateChange(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
              style={{ minHeight: '44px' }}
              aria-label={`Expected Win Rate: ${winRate}%`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>30%</span>
              <span>50%</span>
              <span>80%</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 break-words">
              <strong>Tip:</strong> {getWinRateTooltip(winRate)}
            </p>
          </div>
          {validateWinRateValue(winRate) && (
            <p className="text-sm text-red-600">{validateWinRateValue(winRate)}</p>
          )}
        </div>
      </Card>

      {/* Generate Plan Button */}
      {quests.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleGeneratePlan}
            loading={isGeneratingPlan}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isGeneratingPlan ? 'Generating Plan...' : 'Generate Optimized Plan'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestInputForm;