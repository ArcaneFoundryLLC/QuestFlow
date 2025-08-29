'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card } from './atoms';
import { cn } from '@/utils/cn';
import {
  OptimizedPlan,
  QuestProgress,
  Rewards,
  QueueType,
  Quest,
  UpdatePlanInput,
  validateUpdatePlan,
} from '@/models';

export interface PlanDisplayProps {
  plan: OptimizedPlan;
  quests?: Quest[];
  onStepComplete: (stepId: string, completed: boolean) => void;
  onPlanUpdate?: (updatedPlan: OptimizedPlan) => void;
  className?: string;
}

interface StepCompletionState {
  [stepId: string]: boolean;
}

// Queue type display names and descriptions
const QUEUE_DISPLAY_INFO: Record<QueueType, { name: string; description: string; category: string }> = {
  [QueueType.STANDARD_BO1]: {
    name: 'Standard Ranked',
    description: 'Best of 1 matches in Standard format',
    category: 'Ranked'
  },
  [QueueType.STANDARD_BO3]: {
    name: 'Standard Traditional',
    description: 'Best of 3 matches in Standard format',
    category: 'Ranked'
  },
  [QueueType.HISTORIC_BO1]: {
    name: 'Historic Ranked',
    description: 'Best of 1 matches in Historic format',
    category: 'Ranked'
  },
  [QueueType.HISTORIC_BO3]: {
    name: 'Historic Traditional',
    description: 'Best of 3 matches in Historic format',
    category: 'Ranked'
  },
  [QueueType.QUICK_DRAFT]: {
    name: 'Quick Draft',
    description: 'Draft against bots, play against humans',
    category: 'Limited'
  },
  [QueueType.PREMIER_DRAFT]: {
    name: 'Premier Draft',
    description: 'Draft and play against humans',
    category: 'Limited'
  },
  [QueueType.TRADITIONAL_DRAFT]: {
    name: 'Traditional Draft',
    description: 'Best of 3 draft matches',
    category: 'Limited'
  },
  [QueueType.MIDWEEK_MAGIC]: {
    name: 'Midweek Magic',
    description: 'Special weekly event format',
    category: 'Events'
  },
  [QueueType.ALCHEMY_BO1]: {
    name: 'Alchemy Ranked',
    description: 'Best of 1 matches in Alchemy format',
    category: 'Ranked'
  },
  [QueueType.EXPLORER_BO1]: {
    name: 'Explorer Ranked',
    description: 'Best of 1 matches in Explorer format',
    category: 'Ranked'
  },
};

// Helper function to format rewards display
const formatRewards = (rewards: Rewards): string => {
  const parts: string[] = [];
  
  if (rewards.gold > 0) {
    parts.push(`${rewards.gold.toLocaleString()} gold`);
  }
  if (rewards.gems > 0) {
    parts.push(`${rewards.gems.toLocaleString()} gems`);
  }
  if (rewards.packs > 0) {
    parts.push(`${rewards.packs} pack${rewards.packs !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'No rewards';
};

// Helper function to get quest name from quest progress
const getQuestName = (questProgress: QuestProgress, quests?: Quest[]): string => {
  if (!quests) return 'Unknown Quest';
  
  const quest = quests.find(q => q.id === questProgress.questId);
  return quest ? quest.description : 'Unknown Quest';
};

// Helper function to format time duration
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const PlanDisplay: React.FC<PlanDisplayProps> = ({
  plan,
  quests = [],
  onStepComplete,
  onPlanUpdate,
  className,
}) => {
  const [stepCompletionState, setStepCompletionState] = useState<StepCompletionState>(() => {
    const initialState: StepCompletionState = {};
    plan.steps.forEach(step => {
      initialState[step.id] = step.completed;
    });
    return initialState;
  });

  // Handle step completion toggle
  const handleStepToggle = useCallback((stepId: string) => {
    const currentCompleted = stepCompletionState[stepId] || false;
    const newCompleted = !currentCompleted;
    
    // Validate the update
    const updateInput: UpdatePlanInput = {
      stepId,
      completed: newCompleted,
    };
    
    const validation = validateUpdatePlan(updateInput);
    if (!validation.success) {
      console.error('Invalid step update:', validation.errors);
      return;
    }

    // Update local state
    setStepCompletionState(prev => ({
      ...prev,
      [stepId]: newCompleted,
    }));

    // Notify parent component
    onStepComplete(stepId, newCompleted);

    // Update the plan if callback provided
    if (onPlanUpdate) {
      const updatedPlan: OptimizedPlan = {
        ...plan,
        steps: plan.steps.map(step =>
          step.id === stepId
            ? { ...step, completed: newCompleted }
            : step
        ),
        updatedAt: new Date(),
      };
      onPlanUpdate(updatedPlan);
    }
  }, [stepCompletionState, plan, onStepComplete, onPlanUpdate]);

  // Calculate completion statistics
  const completedSteps = plan.steps.filter(step => stepCompletionState[step.id]).length;
  const totalSteps = plan.steps.length;
  const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Calculate remaining time and rewards
  const remainingSteps = plan.steps.filter(step => !stepCompletionState[step.id]);
  const remainingTime = remainingSteps.reduce((total, step) => total + step.estimatedMinutes, 0);
  const remainingRewards = remainingSteps.reduce(
    (total, step) => ({
      gold: total.gold + step.expectedRewards.gold,
      gems: total.gems + step.expectedRewards.gems,
      packs: total.packs + step.expectedRewards.packs,
    }),
    { gold: 0, gems: 0, packs: 0 }
  );

  // Get completed quests
  const completedQuestIds = new Set(
    plan.steps
      .filter(step => stepCompletionState[step.id])
      .flatMap(step => step.questProgress.map(qp => qp.questId))
  );

  if (plan.steps.length === 0) {
    return (
      <Card className={cn('text-center py-8', className)}>
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-2">No Plan Available</p>
          <p className="text-sm">Add some quests and generate a plan to see your optimized schedule.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Plan Header with Summary */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <h2 className="text-lg font-semibold text-gray-900">Tonight's Plan</h2>
          <div className="text-sm text-gray-500">
            {completedSteps} of {totalSteps} steps completed ({completionPercentage}%)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(remainingTime)}</div>
            <div className="text-sm text-blue-800">Time Remaining</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatRewards(remainingRewards)}</div>
            <div className="text-sm text-green-800">Expected Rewards</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{plan.questsCompleted.length}</div>
            <div className="text-sm text-purple-800">Quests to Complete</div>
          </div>
        </div>
      </Card>

      {/* Plan Steps */}
      <Card>
        <h3 className="text-md font-semibold text-gray-900 mb-4">Steps to Follow</h3>
        
        <div className="space-y-4">
          {plan.steps.map((step, index) => {
            const isCompleted = stepCompletionState[step.id] || false;
            const queueInfo = QUEUE_DISPLAY_INFO[step.queue];
            
            return (
              <div
                key={step.id}
                className={cn(
                  'border rounded-lg p-4 transition-all duration-200',
                  isCompleted
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number and Checkbox */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                        isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {index + 1}
                    </div>
                    <button
                      onClick={() => handleStepToggle(step.id)}
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isCompleted
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300 hover:border-gray-400'
                      )}
                      aria-label={`Mark step ${index + 1} as ${isCompleted ? 'incomplete' : 'complete'}`}
                    >
                      {isCompleted && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className={cn(
                          'font-medium',
                          isCompleted ? 'text-green-800 line-through' : 'text-gray-900'
                        )}>
                          Play {step.targetGames} game{step.targetGames !== 1 ? 's' : ''} in {queueInfo.name}
                        </h4>
                        <p className={cn(
                          'text-sm',
                          isCompleted ? 'text-green-600' : 'text-gray-500'
                        )}>
                          {queueInfo.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'text-sm font-medium',
                          isCompleted ? 'text-green-700' : 'text-gray-900'
                        )}>
                          ~{formatDuration(step.estimatedMinutes)}
                        </div>
                        <div className={cn(
                          'text-xs',
                          isCompleted ? 'text-green-600' : 'text-gray-500'
                        )}>
                          {formatRewards(step.expectedRewards)}
                        </div>
                      </div>
                    </div>

                    {/* Quest Progress Indicators */}
                    {step.questProgress.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-2">Quest Progress:</div>
                        <div className="space-y-1">
                          {step.questProgress.map((progress) => {
                            const questName = getQuestName(progress, quests);
                            const isQuestCompleted = completedQuestIds.has(progress.questId);
                            
                            return (
                              <div
                                key={progress.questId}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className={cn(
                                  isQuestCompleted ? 'text-green-700 font-medium' : 'text-gray-600'
                                )}>
                                  {questName}
                                </span>
                                <span className={cn(
                                  'font-medium',
                                  isQuestCompleted ? 'text-green-700' : 'text-blue-600'
                                )}>
                                  +{progress.progressAmount}
                                  {isQuestCompleted && ' ✓'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Plan Actions */}
        {completedSteps < totalSteps && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Next: {QUEUE_DISPLAY_INFO[remainingSteps[0]?.queue]?.name || 'Complete remaining steps'}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const nextStep = remainingSteps[0];
                  if (nextStep) {
                    handleStepToggle(nextStep.id);
                  }
                }}
                disabled={remainingSteps.length === 0}
              >
                Mark Next Step Complete
              </Button>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {completedSteps === totalSteps && totalSteps > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-green-800">
              <div className="text-lg font-semibold mb-1">🎉 Plan Complete!</div>
              <div className="text-sm">
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                You've completed all steps and earned {formatRewards(plan.totalExpectedRewards)}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Quest Completion Status */}
      {quests.length > 0 && (
        <Card>
          <h3 className="text-md font-semibold text-gray-900 mb-4">Quest Status</h3>
          <div className="space-y-2">
            {quests.map((quest) => {
              const isCompleted = completedQuestIds.has(quest.id);
              const willBeCompleted = plan.questsCompleted.includes(quest.id);
              
              return (
                <div
                  key={quest.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    isCompleted
                      ? 'border-green-200 bg-green-50'
                      : willBeCompleted
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        isCompleted
                          ? 'bg-green-600'
                          : willBeCompleted
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      )}
                    />
                    <div>
                      <div className={cn(
                        'font-medium text-sm',
                        isCompleted ? 'text-green-800' : 'text-gray-900'
                      )}>
                        {quest.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {quest.remaining} remaining • Expires in {quest.expiresInDays} day{quest.expiresInDays !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium">
                    {isCompleted ? (
                      <span className="text-green-700">Completed ✓</span>
                    ) : willBeCompleted ? (
                      <span className="text-blue-700">Will Complete</span>
                    ) : (
                      <span className="text-gray-500">Not in Plan</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlanDisplay;