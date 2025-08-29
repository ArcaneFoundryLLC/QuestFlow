'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { QuestInputForm } from './QuestInputForm';
import { PlanDisplay } from './PlanDisplay';
import { SettingsPanel } from './SettingsPanel';
import { Card } from './atoms';
import { cn } from '@/utils/cn';
import { 
  Quest, 
  OptimizedPlan, 
  UserSettings, 
  createDefaultSettings,
  StorageManager 
} from '@/models';
import { useDebouncedPlanGeneration } from '@/hooks/useDebouncedPlanGeneration';

export interface QuestFlowAppProps {
  className?: string;
}

/**
 * Main QuestFlow application component
 * Integrates quest input, plan optimization, and plan display with real-time updates
 */
export const QuestFlowApp: React.FC<QuestFlowAppProps> = ({ className }) => {
  // Core application state
  const [quests, setQuests] = useState<Quest[]>([]);
  const [timeBudget, setTimeBudget] = useState(60);
  const [winRate, setWinRate] = useState(50);
  const [settings, setSettings] = useState<UserSettings>(createDefaultSettings());
  const [storageManager] = useState(() => new StorageManager());

  // UI state
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(true);

  // Real-time plan generation with debouncing
  const {
    plan,
    isLoading,
    error: planError,
    warnings,
    lastGeneratedAt,
    triggerImmediateGeneration,
    clearError,
    clearWarnings,
  } = useDebouncedPlanGeneration(
    quests,
    timeBudget,
    winRate / 100, // Convert percentage to decimal
    settings,
    {
      debounceMs: 300,
      performanceTargetMs: 200,
      onPlanGenerated: async (generatedPlan) => {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        // Save plan to storage
        try {
          await storageManager.savePlan(generatedPlan);
        } catch (error) {
          console.warn('Failed to save plan to storage:', error);
        }
      },
      onError: (errorMessage) => {
        setLastErrorMessage(errorMessage);
        setTimeout(() => setLastErrorMessage(null), 5000);
      },
      onWarnings: (warningMessages) => {
        console.info('Plan generation warnings:', warningMessages);
      },
    }
  );

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedQuests = await storageManager.loadQuests();
        const savedSettings = await storageManager.loadSettings();
        
        if (savedQuests.length > 0) {
          setQuests(savedQuests);
        }
        
        if (savedSettings) {
          setSettings(savedSettings);
          setWinRate(savedSettings.defaultWinRate * 100); // Convert to percentage
        }
      } catch (error) {
        console.warn('Failed to load data from storage:', error);
      }
    };

    loadData();
  }, [storageManager]);

  // Quest management handlers
  const handleQuestsChange = useCallback(async (updatedQuests: Quest[]) => {
    setQuests(updatedQuests);
    
    // Save to storage
    try {
      await storageManager.saveQuests(updatedQuests);
    } catch (error) {
      console.warn('Failed to save quests to storage:', error);
    }
  }, [storageManager]);

  const handleTimeBudgetChange = useCallback((newTimeBudget: number) => {
    setTimeBudget(newTimeBudget);
  }, []);

  const handleWinRateChange = useCallback(async (newWinRate: number) => {
    setWinRate(newWinRate);
    
    // Update settings with new default win rate
    const updatedSettings = {
      ...settings,
      defaultWinRate: newWinRate / 100,
    };
    setSettings(updatedSettings);
    
    // Save to storage
    try {
      await storageManager.saveSettings(updatedSettings);
    } catch (error) {
      console.warn('Failed to save settings to storage:', error);
    }
  }, [settings, storageManager]);

  // Plan interaction handlers
  const handleStepComplete = useCallback(async (stepId: string, completed: boolean) => {
    if (!plan) return;

    // Update plan with step completion
    const updatedPlan: OptimizedPlan = {
      ...plan,
      steps: plan.steps.map(step =>
        step.id === stepId ? { ...step, completed } : step
      ),
      updatedAt: new Date(),
    };

    // Save updated plan
    try {
      await storageManager.savePlan(updatedPlan);
    } catch (error) {
      console.warn('Failed to save updated plan:', error);
    }

    // If this completion affects quest progress, we might want to recalculate
    // For now, we'll just update the plan locally
    // In a more advanced implementation, we could trigger a recalculation
  }, [plan, storageManager]);

  const handlePlanUpdate = useCallback(async (updatedPlan: OptimizedPlan) => {
    // Save updated plan to storage
    try {
      await storageManager.savePlan(updatedPlan);
    } catch (error) {
      console.warn('Failed to save updated plan:', error);
    }
  }, [storageManager]);

  // Settings management
  const handleSettingsChange = useCallback(async (newSettings: UserSettings) => {
    setSettings(newSettings);
    
    // Update win rate if it changed
    if (newSettings.defaultWinRate !== settings.defaultWinRate) {
      setWinRate(newSettings.defaultWinRate * 100);
    }
    
    // Save to storage
    try {
      await storageManager.saveSettings(newSettings);
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }, [settings.defaultWinRate, storageManager]);

  // Settings panel toggle
  const handleToggleSettings = useCallback(() => {
    setIsSettingsCollapsed(!isSettingsCollapsed);
  }, [isSettingsCollapsed]);

  // Error handling
  const handleErrorDismiss = useCallback(() => {
    clearError();
    setLastErrorMessage(null);
  }, [clearError]);

  const handleWarningsDismiss = useCallback(() => {
    clearWarnings();
  }, [clearWarnings]);

  // Manual plan generation trigger
  const handleManualGeneration = useCallback(() => {
    triggerImmediateGeneration();
  }, [triggerImmediateGeneration]);

  return (
    <div className={cn('max-w-4xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8', className)}>
      {/* App Header */}
      <div className="text-center py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">QuestFlow</h1>
        <p className="text-sm sm:text-base text-gray-600 px-4">
          Optimize your MTGA quest completion for maximum rewards
        </p>
      </div>

      {/* Error Messages */}
      {(planError || lastErrorMessage) && (
        <Card variant="outlined" className="border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Plan Generation Error
                </h3>
                <p className="text-sm text-red-700 break-words">
                  {planError || lastErrorMessage}
                </p>
              </div>
            </div>
            <button
              onClick={handleErrorDismiss}
              className="text-red-600 hover:text-red-800 touch-target flex-shrink-0 p-2 -m-2"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </Card>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <Card variant="outlined" className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Optimization Warnings
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="break-words">• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={handleWarningsDismiss}
              className="text-yellow-600 hover:text-yellow-800 touch-target flex-shrink-0 p-2 -m-2"
              aria-label="Dismiss warnings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <Card variant="outlined" className="border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">
                Plan Generated Successfully
              </h3>
              <p className="text-sm text-green-700">
                Your optimized quest plan is ready!
                {lastGeneratedAt && (
                  <span className="ml-2 text-xs">
                    Generated at {lastGeneratedAt.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Card variant="outlined" className="border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-blue-600 animate-spin">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Generating Optimized Plan
              </h3>
              <p className="text-sm text-blue-700">
                Calculating the best quest completion strategy...
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Quest Input Form */}
      <QuestInputForm
        initialQuests={quests}
        initialTimeBudget={timeBudget}
        initialWinRate={winRate}
        onPlanGenerate={handleManualGeneration}
        onQuestsChange={handleQuestsChange}
        onTimeBudgetChange={handleTimeBudgetChange}
        onWinRateChange={handleWinRateChange}
      />

      {/* Settings Panel */}
      <SettingsPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isCollapsed={isSettingsCollapsed}
        onToggleCollapse={handleToggleSettings}
      />

      {/* Plan Display */}
      {plan && (
        <PlanDisplay
          plan={plan}
          quests={quests}
          onStepComplete={handleStepComplete}
          onPlanUpdate={handlePlanUpdate}
        />
      )}

      {/* Empty State */}
      {!plan && !isLoading && quests.length === 0 && (
        <Card className="text-center py-8 sm:py-12">
          <div className="text-gray-500">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
              Welcome to QuestFlow
            </h3>
            <p className="text-gray-600 mb-4 px-4">
              Add your MTGA daily quests to get started with optimization
            </p>
            <p className="text-sm text-gray-500 px-4">
              The app will automatically generate an optimized plan as you add quests and adjust settings
            </p>
          </div>
        </Card>
      )}

      {/* App Footer */}
      <div className="text-center py-4 text-sm text-gray-500 px-4">
        <p className="break-words">
          QuestFlow helps you maximize your MTGA rewards in minimal time.
          {lastGeneratedAt && (
            <span className="block mt-1 text-xs sm:text-sm">
              Last updated: {lastGeneratedAt.toLocaleString()}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default QuestFlowApp;