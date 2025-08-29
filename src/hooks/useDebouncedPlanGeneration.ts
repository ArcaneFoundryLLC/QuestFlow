'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Quest, OptimizedPlan, optimizePlan, UserSettings, createDefaultSettings } from '@/models';

export interface PlanGenerationState {
  plan: OptimizedPlan | null;
  isLoading: boolean;
  error: string | null;
  warnings: string[];
  lastGeneratedAt: Date | null;
}

export interface UseDebouncedPlanGenerationOptions {
  debounceMs?: number;
  performanceTargetMs?: number;
  onPlanGenerated?: (plan: OptimizedPlan) => void;
  onError?: (error: string) => void;
  onWarnings?: (warnings: string[]) => void;
}

/**
 * Custom hook for debounced plan generation with performance monitoring
 * Implements real-time plan recalculation with loading states and error handling
 */
export function useDebouncedPlanGeneration(
  quests: Quest[],
  timeBudget: number,
  winRate: number,
  settings?: UserSettings,
  options: UseDebouncedPlanGenerationOptions = {}
) {
  const {
    debounceMs = 300,
    performanceTargetMs = 200,
    onPlanGenerated,
    onError,
    onWarnings,
  } = options;

  const [state, setState] = useState<PlanGenerationState>({
    plan: null,
    isLoading: false,
    error: null,
    warnings: [],
    lastGeneratedAt: null,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const performanceStartRef = useRef<number>(0);

  // Generate plan with performance monitoring
  const generatePlan = useCallback(async (
    questsToOptimize: Quest[],
    budget: number,
    rate: number,
    userSettings?: UserSettings
  ): Promise<void> => {
    // Abort any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this generation
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Start performance monitoring
    performanceStartRef.current = performance.now();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Check if operation was aborted
      if (signal.aborted) {
        return;
      }

      // Validate inputs before optimization
      if (questsToOptimize.length === 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          plan: null,
          error: null,
          warnings: ['Add some quests to generate an optimized plan'],
          lastGeneratedAt: new Date(),
        }));
        return;
      }

      if (budget < 15 || budget > 180) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Time budget must be between 15 and 180 minutes',
          warnings: [],
          lastGeneratedAt: new Date(),
        }));
        onError?.('Time budget must be between 15 and 180 minutes');
        return;
      }

      if (rate < 0.3 || rate > 0.8) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Win rate must be between 30% and 80%',
          warnings: [],
          lastGeneratedAt: new Date(),
        }));
        onError?.('Win rate must be between 30% and 80%');
        return;
      }

      // Use default settings if not provided
      const optimizationSettings = userSettings || createDefaultSettings();

      // Perform optimization in a microtask to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check if operation was aborted after async boundary
      if (signal.aborted) {
        return;
      }

      // Run optimization
      const result = optimizePlan(questsToOptimize, budget, rate, optimizationSettings);

      // Check performance
      const duration = performance.now() - performanceStartRef.current;
      
      if (duration > performanceTargetMs) {
        console.warn(`Plan generation took ${duration.toFixed(1)}ms, exceeding target of ${performanceTargetMs}ms`);
      }

      // Check if operation was aborted after optimization
      if (signal.aborted) {
        return;
      }

      if (result.success && result.plan) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          plan: result.plan!,
          error: null,
          warnings: result.warnings || [],
          lastGeneratedAt: new Date(),
        }));

        onPlanGenerated?.(result.plan);
        if (result.warnings && result.warnings.length > 0) {
          onWarnings?.(result.warnings);
        }
      } else {
        const errorMessage = result.error || 'Failed to generate plan';
        setState(prev => ({
          ...prev,
          isLoading: false,
          plan: null,
          error: errorMessage,
          warnings: result.warnings || [],
          lastGeneratedAt: new Date(),
        }));

        onError?.(errorMessage);
        if (result.warnings && result.warnings.length > 0) {
          onWarnings?.(result.warnings);
        }
      }
    } catch (error) {
      // Check if operation was aborted
      if (signal.aborted) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error during plan generation';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        plan: null,
        error: errorMessage,
        warnings: [],
        lastGeneratedAt: new Date(),
      }));

      onError?.(errorMessage);
      console.error('Plan generation error:', error);
    }
  }, [performanceTargetMs, onPlanGenerated, onError, onWarnings]);

  // Debounced plan generation effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced generation
    debounceTimeoutRef.current = setTimeout(() => {
      generatePlan(quests, timeBudget, winRate, settings);
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [quests, timeBudget, winRate, settings, debounceMs, generatePlan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manual trigger for immediate plan generation (bypasses debounce)
  const triggerImmediateGeneration = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    generatePlan(quests, timeBudget, winRate, settings);
  }, [generatePlan, quests, timeBudget, winRate, settings]);

  // Reset error state
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Reset warnings
  const clearWarnings = useCallback(() => {
    setState(prev => ({
      ...prev,
      warnings: [],
    }));
  }, []);

  return {
    ...state,
    triggerImmediateGeneration,
    clearError,
    clearWarnings,
  };
}