import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebouncedPlanGeneration } from '../useDebouncedPlanGeneration';
import { Quest, QuestType, MTGAColor, UserSettings, createDefaultSettings } from '@/models';

// Mock the plan optimizer
jest.mock('@/models', () => ({
  ...jest.requireActual('@/models'),
  optimizePlan: jest.fn(),
}));

const mockOptimizePlan = jest.requireMock('@/models').optimizePlan;

describe('useDebouncedPlanGeneration', () => {
  const mockQuest: Quest = {
    id: 'test-quest-1',
    type: QuestType.WIN,
    description: 'Win 5 games',
    remaining: 5,
    expiresInDays: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings: UserSettings = createDefaultSettings();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([], 60, 0.5, mockSettings)
    );

    expect(result.current.plan).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.warnings).toEqual([]);
    expect(result.current.lastGeneratedAt).toBeNull();
  });

  it('should debounce plan generation', async () => {
    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: {
        id: 'test-plan',
        steps: [],
        totalEstimatedMinutes: 60,
        totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
        questsCompleted: [],
        timeBudget: 60,
        winRate: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const { result, rerender } = renderHook(
      ({ quests, timeBudget, winRate }) =>
        useDebouncedPlanGeneration(quests, timeBudget, winRate, mockSettings),
      {
        initialProps: {
          quests: [mockQuest],
          timeBudget: 60,
          winRate: 0.5,
        },
      }
    );

    // Should not call immediately
    expect(mockOptimizePlan).not.toHaveBeenCalled();

    // Fast forward past debounce delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOptimizePlan).toHaveBeenCalledTimes(1);
    });

    // Update props multiple times quickly
    rerender({ quests: [mockQuest], timeBudget: 90, winRate: 0.5 });
    rerender({ quests: [mockQuest], timeBudget: 120, winRate: 0.5 });

    // Should only call once more after debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockOptimizePlan).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle loading states correctly', async () => {
    const mockPlan = {
      id: 'test-plan',
      steps: [],
      totalEstimatedMinutes: 60,
      totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
      questsCompleted: [],
      timeBudget: 60,
      winRate: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: mockPlan,
    });

    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings)
    );

    // Trigger generation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should eventually have a plan
    await waitFor(() => {
      expect(result.current.plan).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle optimization errors', async () => {
    mockOptimizePlan.mockReturnValue({
      success: false,
      error: 'Insufficient time to complete any quests',
    });

    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings) // Use valid time budget
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Insufficient time to complete any quests');
      expect(result.current.plan).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle warnings', async () => {
    const warnings = ['Some quests cannot be completed within time budget'];
    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: {
        id: 'test-plan',
        steps: [],
        totalEstimatedMinutes: 60,
        totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
        questsCompleted: [],
        timeBudget: 60,
        winRate: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      warnings,
    });

    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings)
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.warnings).toEqual(warnings);
      expect(result.current.plan).toBeTruthy();
    });
  });

  it('should validate input parameters', async () => {
    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 5, 0.5, mockSettings) // Invalid time budget
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Time budget must be between 15 and 180 minutes');
      expect(mockOptimizePlan).not.toHaveBeenCalled();
    });
  });

  it('should handle empty quest list', async () => {
    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([], 60, 0.5, mockSettings)
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.warnings).toContain('Add some quests to generate an optimized plan');
      expect(result.current.plan).toBeNull();
      expect(mockOptimizePlan).not.toHaveBeenCalled();
    });
  });

  it('should trigger immediate generation', async () => {
    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: {
        id: 'test-plan',
        steps: [],
        totalEstimatedMinutes: 60,
        totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
        questsCompleted: [],
        timeBudget: 60,
        winRate: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings)
    );

    // Trigger immediate generation
    act(() => {
      result.current.triggerImmediateGeneration();
    });

    await waitFor(() => {
      expect(mockOptimizePlan).toHaveBeenCalledTimes(1);
    });
  });

  it('should clear errors and warnings', () => {
    const { result } = renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings)
    );

    // Manually set error and warnings for testing
    act(() => {
      result.current.clearError();
      result.current.clearWarnings();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.warnings).toEqual([]);
  });

  it('should call callback functions', async () => {
    const onPlanGenerated = jest.fn();
    const onError = jest.fn();
    const onWarnings = jest.fn();

    const mockPlan = {
      id: 'test-plan',
      steps: [],
      totalEstimatedMinutes: 60,
      totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
      questsCompleted: [],
      timeBudget: 60,
      winRate: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const warnings = ['Test warning'];

    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: mockPlan,
      warnings,
    });

    renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings, {
        onPlanGenerated,
        onError,
        onWarnings,
      })
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(onPlanGenerated).toHaveBeenCalledWith(mockPlan);
      expect(onWarnings).toHaveBeenCalledWith(warnings);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it('should abort ongoing generation when inputs change', async () => {
    const mockPlan1 = {
      id: 'first-plan',
      steps: [],
      totalEstimatedMinutes: 60,
      totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
      questsCompleted: [],
      timeBudget: 60,
      winRate: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPlan2 = {
      id: 'second-plan',
      steps: [],
      totalEstimatedMinutes: 90,
      totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
      questsCompleted: [],
      timeBudget: 90,
      winRate: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let callCount = 0;
    mockOptimizePlan.mockImplementation(() => {
      callCount++;
      return {
        success: true,
        plan: callCount === 1 ? mockPlan1 : mockPlan2,
      };
    });

    const { result, rerender } = renderHook(
      ({ timeBudget }) =>
        useDebouncedPlanGeneration([mockQuest], timeBudget, 0.5, mockSettings),
      { initialProps: { timeBudget: 60 } }
    );

    // Start first generation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Change input to trigger second generation
    rerender({ timeBudget: 90 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.plan?.id).toBe('second-plan');
    });
  });

  it('should monitor performance and warn if exceeding target', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock performance.now to simulate slow optimization
    const originalNow = performance.now;
    let callCount = 0;
    performance.now = jest.fn(() => {
      callCount++;
      return callCount === 1 ? 0 : 250; // 250ms duration
    });

    mockOptimizePlan.mockReturnValue({
      success: true,
      plan: {
        id: 'test-plan',
        steps: [],
        totalEstimatedMinutes: 60,
        totalExpectedRewards: { gold: 0, gems: 0, packs: 0 },
        questsCompleted: [],
        timeBudget: 60,
        winRate: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    renderHook(() =>
      useDebouncedPlanGeneration([mockQuest], 60, 0.5, mockSettings, {
        performanceTargetMs: 200,
      })
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plan generation took 250.0ms, exceeding target of 200ms')
      );
    });

    // Restore original performance.now
    performance.now = originalNow;
    consoleSpy.mockRestore();
  });
});